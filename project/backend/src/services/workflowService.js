const pool = require('../config/db');
const matrixService = require('./matrixService');
const logger = require('../config/logger');

/**
 * Servicio de Flujos de Trabajo (Orquestador)
 */
const workflowService = {
    /**
     * Iniciar un flujo para una nueva solicitud
     */
    async startWorkflow(requestId, requestType, requestData) {
        // ... previous code ...
        let workflowCode = 'GENERIC';
        if (requestType === 'Compras') workflowCode = 'PURCHASE_FLOW';
        if (requestType === 'Vacaciones') workflowCode = 'VACATION_FLOW';

        const [wfs] = await pool.query('SELECT * FROM workflows WHERE code = ? AND is_active = TRUE', [workflowCode]);

        if (wfs.length === 0) return;

        const workflow = wfs[0];

        if (workflow.use_matrix) {
            const requiredLevels = await matrixService.getRequiredLevels(requestData.total || 0, requestData.department);

            let requesterRank = 0;
            const [emp] = await pool.query('SELECT position, department FROM employees WHERE user_id = ? OR id = ?', [requestData.requester_id, requestData.requester_id]);

            if (emp.length > 0) {
                const position = emp[0].position;
                const [level] = await pool.query('SELECT rank FROM approval_levels WHERE name = ?', [position]);
                if (level.length > 0) requesterRank = level[0].rank;
            }

            const neededLevels = requiredLevels.filter(r => r.rank > requesterRank);

            if (neededLevels.length > 0) {
                let effectiveStep = neededLevels[0];
                let stepIndex = 0;

                const [potentialApprover] = await pool.query(
                    `SELECT id FROM employees WHERE position = ? AND department = ? LIMIT 1`,
                    [effectiveStep.level_name, requestData.department]
                );

                while (stepIndex < neededLevels.length &&
                    potentialApprover.length > 0 &&
                    potentialApprover[0].id == requestData.requester_id) {

                    logger.audit('SoD Skip detected', {
                        requestId,
                        level: effectiveStep.level_name,
                        requesterId: requestData.requester_id
                    });

                    stepIndex++;
                    if (stepIndex < neededLevels.length) {
                        effectiveStep = neededLevels[stepIndex];
                        const [nextApprover] = await pool.query(
                            `SELECT id FROM employees WHERE position = ? AND department = ? LIMIT 1`,
                            [effectiveStep.level_name, requestData.department]
                        );
                        if (nextApprover.length > 0) {
                            potentialApprover[0] = nextApprover[0];
                        }
                    }
                }

                if (stepIndex >= neededLevels.length) {
                    logger.audit('Auto-approving: All levels matched requester (SoD)', { requestId });
                    await pool.query(
                        'UPDATE requests SET status = ?, internal_status = ?, workflow_id = ? WHERE id = ?',
                        ['aprobado', 'APPROVED', workflow.id, requestId]
                    );
                    return { completed: true, auto_approved: true, reason: 'SOD_ALL_SELF' };
                }

                const internalStatus = `PENDING_${effectiveStep.level_name.toUpperCase().replace(/\s+/g, '_')}`;

                await pool.query(
                    'UPDATE requests SET workflow_id = ?, status = ?, internal_status = ?, current_step_id = NULL WHERE id = ?',
                    [workflow.id, 'en_progreso', internalStatus, requestId]
                );

                logger.info('Workflow started', {
                    requestId,
                    firstApprover: effectiveStep.level_name,
                    sodEscalation: stepIndex > 0
                });

                await this.notifyCurrentApprover(requestId, effectiveStep.approver_role, requestData.department);

                return { step_name: effectiveStep.level_name, approver_role: effectiveStep.approver_role, sod_escalation: stepIndex > 0 };
            }
            else {
                logger.info('Auto-approved by rank (SmartSkip)', { requestId, requesterRank });
                await pool.query(
                    'UPDATE requests SET status = ?, internal_status = ?, workflow_id = ? WHERE id = ?',
                    ['aprobado', 'APPROVED', workflow.id, requestId]
                );
                return { completed: true, auto_approved: true };
            }
        }

        // LOGICA ESTÁTICA (Legacy):
        const [steps] = await pool.query(
            'SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC LIMIT 1',
            [workflow.id]
        );

        if (steps.length > 0) {
            const firstStep = steps[0];
            await pool.query(
                'UPDATE requests SET workflow_id = ?, current_step_id = ?, status = ?, internal_status = ? WHERE id = ?',
                [workflow.id, firstStep.id, 'en_progreso', 'PENDING_APPROVAL', requestId]
            );
            return firstStep;
        }
    },

    /**
     * Avanzar al siguiente paso del flujo
     */
    async nextStep(requestId) {
        // Obtenemos datos de la solicitud y del workflow asociado
        const [reqs] = await pool.query(`
            SELECT r.*, w.use_matrix
            FROM requests r
            JOIN workflows w ON r.workflow_id = w.id
            WHERE r.id = ?
        `, [requestId]);

        if (reqs.length === 0) return null;
        const currentReq = reqs[0];

        // --- CAMINO 1: MATRIZ DINÁMICA (SMART SKIP) ---
        if (currentReq.use_matrix) {
            // 1. Obtener niveles requeridos base (Monto + Depto)
            const requiredLevels = await matrixService.getRequiredLevels(currentReq.total || 0, currentReq.department);

            // 2. Determinar Rango del Solicitante (Para mantener consistencia del Skip)
            let requesterRank = 0;
            // Necesitamos el requester_id de la solicitud
            // currentReq ya tiene requester_id
            let empQuery = 'SELECT position FROM employees WHERE id = ?';
            if (!isNaN(currentReq.requester_id)) empQuery = 'SELECT position FROM employees WHERE user_id = ?';
            const [emp] = await pool.query(empQuery, [currentReq.requester_id]);
            if (emp.length > 0) {
                const [level] = await pool.query('SELECT rank FROM approval_levels WHERE name = ?', [emp[0].position]);
                if (level.length > 0) requesterRank = level[0].rank;
            }

            // 3. Filtrar los que realmente se necesitan (Skip logic)
            const neededLevels = requiredLevels.filter(r => r.rank > requesterRank);

            // 4. Calcular progreso (Cuántos de estos 'needed' ya aprobaron)
            // Buscamos aprobaciones válidas en history
            const [history] = await pool.query(
                `SELECT actor_id FROM request_history WHERE request_id = ? AND action = 'APROBADO'`,
                [requestId]
            );
            const approvalCount = history.length;

            // 5. Determinar siguiente paso
            if (approvalCount >= neededLevels.length) {
                // Ya completó todos los niveles necesarios
                await pool.query(
                    'UPDATE requests SET status = ?, internal_status = ?, current_step_id = NULL WHERE id = ?',
                    ['aprobado', 'APPROVED', requestId]
                );
                return { completed: true };
            } else {
                // 🛡️ SEGREGATION OF DUTIES: Verify next approver is not the requester
                let effectiveStep = neededLevels[approvalCount];
                let skipCount = 0;

                const [potentialApprover] = await pool.query(
                    `SELECT id FROM employees WHERE position = ? AND department = ? LIMIT 1`,
                    [effectiveStep.level_name, currentReq.department]
                );

                while ((approvalCount + skipCount) < neededLevels.length &&
                    potentialApprover.length > 0 &&
                    potentialApprover[0].id == currentReq.requester_id) {

                    logger.audit('SoD Skip detected on advancement', {
                        requestId,
                        level: effectiveStep.level_name,
                        requesterId: currentReq.requester_id
                    });

                    skipCount++;
                    if ((approvalCount + skipCount) < neededLevels.length) {
                        effectiveStep = neededLevels[approvalCount + skipCount];
                        const [nextApprover] = await pool.query(
                            `SELECT id FROM employees WHERE position = ? AND department = ? LIMIT 1`,
                            [effectiveStep.level_name, currentReq.department]
                        );
                        if (nextApprover.length > 0) {
                            potentialApprover[0] = nextApprover[0];
                        }
                    }
                }

                if ((approvalCount + skipCount) >= neededLevels.length) {
                    // Completed all needed approvals
                    await pool.query(
                        'UPDATE requests SET status = ?, internal_status = ?, current_step_id = NULL WHERE id = ?',
                        ['aprobado', 'APPROVED', requestId]
                    );
                    logger.audit('Request fully approved - all levels completed', { requestId });
                    return { completed: true };
                }

                const internalStatus = `PENDING_${effectiveStep.level_name.toUpperCase().replace(/\s+/g, '_')}`;

                await pool.query(
                    'UPDATE requests SET internal_status = ? WHERE id = ?',
                    [internalStatus, requestId]
                );

                logger.info('Request advanced', {
                    requestId,
                    nextLevel: effectiveStep.level_name,
                    skipCount
                });

                // NOTIFICAR AL SIGUIENTE APROBADOR
                await this.notifyCurrentApprover(requestId, effectiveStep.approver_role, currentReq.department);

                return {
                    step_id: effectiveStep.id,
                    step_name: effectiveStep.level_name,
                    approver_role: effectiveStep.approver_role,
                    completed: false,
                    sod_escalation: skipCount > 0
                };
            }
        }

        // --- CAMINO 2: PROCESO ESTÁTICO (Legacy) ---
        const [currentStepInfo] = await pool.query('SELECT step_order FROM workflow_steps WHERE id = ?', [currentReq.current_step_id]);
        if (currentStepInfo.length === 0) return null;

        const currentOrder = currentStepInfo[0].step_order;
        const [nextSteps] = await pool.query(
            'SELECT * FROM workflow_steps WHERE workflow_id = ? AND step_order > ? ORDER BY step_order ASC LIMIT 1',
            [currentReq.workflow_id, currentOrder]
        );

        if (nextSteps.length > 0) {
            const nextStep = nextSteps[0];
            await pool.query(
                'UPDATE requests SET current_step_id = ?, internal_status = ? WHERE id = ?',
                [nextStep.id, 'PENDING_APPROVAL', requestId]
            );
            return nextStep;
        } else {
            await pool.query(
                'UPDATE requests SET status = ?, internal_status = ?, current_step_id = NULL WHERE id = ?',
                ['aprobado', 'APPROVED', requestId]
            );
            return { completed: true };
        }
    },

    // ... getCurrentStep implementation ...
    async getCurrentStep(requestId) {
        const [reqs] = await pool.query(`
            SELECT r.*, w.use_matrix 
            FROM requests r
            JOIN workflows w ON r.workflow_id = w.id
            WHERE r.id = ?
        `, [requestId]);

        if (reqs.length === 0) return null;
        const req = reqs[0];

        if (req.use_matrix) {
            // Lógica dinámica para saber cuál toca
            // (Replica lógica de nextStep para saber el pending)
            const [history] = await pool.query(
                `SELECT actor_id FROM request_history WHERE request_id = ? AND action = 'APROBADO'`,
                [requestId]
            );
            const approvalCount = history.length;
            const query = `
                SELECT m.*, l.name as level_name, l.rank
                FROM approval_matrix m
                JOIN approval_levels l ON m.approval_level_id = l.id
                WHERE (m.department = ? OR m.department = 'GLOBAL')
                AND ? >= m.min_amount 
                AND ? <= m.max_amount
                AND m.is_active = TRUE
                ORDER BY l.rank ASC
            `;
            const [requiredSteps] = await pool.query(query, [req.department, req.total, req.total]);

            if (approvalCount < requiredSteps.length) {
                const next = requiredSteps[approvalCount];
                return { step_name: next.level_name, approver_role: next.approver_role };
            }
            return { step_name: 'Completado', approver_role: 'N/A' };

        } else {
            // Estático
            const [rows] = await pool.query(`
                SELECT s.* 
                FROM requests r
                JOIN workflow_steps s ON r.current_step_id = s.id
                WHERE r.id = ?
            `, [requestId]);
            return rows[0];
        }
    },

    /**
     * Notificar al aprobador actual
     */
    async notifyCurrentApprover(requestId, role, department) {
        const notificationController = require('../controllers/notificationController');
        try {
            let approverIds = [];
            if (role.toLowerCase() === 'manager' || role.toLowerCase() === 'gerente') {
                const [dept] = await pool.query('SELECT manager_id FROM departments WHERE name = ? OR id = ?', [department, department]);
                if (dept.length > 0 && dept[0].manager_id) approverIds.push(dept[0].manager_id);
            }
            if (approverIds.length === 0) {
                const [emps] = await pool.query('SELECT user_id FROM employees WHERE position LIKE ?', [`%${role}%`]);
                approverIds = emps.map(e => e.user_id);
            }
            for (const userId of approverIds) {
                await notificationController.createNotification(userId, 'request_pending', 'Acción Requerida', `Solicitud de ${department} pendiente.`, requestId);
            }
        } catch (error) {
            logger.error('Error sending approver notifications', { error: error.message, requestId, role });
        }
    },

    /**
     * Obtener acciones disponibles para un usuario sobre una solicitud
     */
    async getAvailableActions(requestId, userId) {
        // 1. Verificar si es una purchase_request
        const [purchaseReqs] = await pool.query('SELECT * FROM purchase_requests WHERE id = ?', [requestId]);

        if (purchaseReqs.length > 0) {
            const request = purchaseReqs[0];
            // Buscar el nivel pendiente más bajo
            const [approvals] = await pool.query(
                'SELECT * FROM purchase_approvals WHERE purchase_request_id = ? AND approval_status = \'PENDIENTE\' ORDER BY approval_level ASC LIMIT 1',
                [requestId]
            );

            if (approvals.length === 0) return []; // Ya aprobado o rechazado

            const currentLevel = approvals[0];

            // Verificar si el usuario tiene el rol requerido o la posición requerida
            const [userRoles] = await pool.query(
                'SELECT r.name FROM roles r INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?',
                [userId]
            );
            const [employees] = await pool.query('SELECT position FROM employees WHERE user_id = ?', [userId]);

            const roleNames = userRoles.map(r => r.name.toLowerCase());
            const userPosition = employees.length > 0 ? employees[0].position.toLowerCase() : '';
            const requiredRole = currentLevel.required_role_name.toLowerCase();

            // Admin puede todo. Los demás deben coincidir en rol o posición.
            if (roleNames.includes('admin') ||
                roleNames.includes(requiredRole) ||
                userPosition.includes(requiredRole)) {
                return [
                    { id: 'approve', label: 'Aprobar', color: 'primary', icon: 'check' },
                    { id: 'reject', label: 'Rechazar', color: 'danger', icon: 'times' }
                ];
            }
            return [];
        }

        // 3. Fallback a tabla requests antigua (legacy)
        return [
            { id: 'approve', label: 'Aprobar (Legacy)', color: 'primary' },
            { id: 'reject', label: 'Rechazar (Legacy)', color: 'danger' }
        ];
    },

    /**
     * Aprobar una solicitud de compra
     */
    async approveRequest(requestId, userId, notes) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Encontrar el nivel pendiente actual
            const [approvals] = await connection.query(
                'SELECT * FROM purchase_approvals WHERE purchase_request_id = ? AND approval_status = \'PENDIENTE\' ORDER BY approval_level ASC LIMIT 1 FOR UPDATE',
                [requestId]
            );

            if (approvals.length === 0) throw new Error('No hay niveles de aprobación pendientes');

            const level = approvals[0];

            // 2. Marcar como aprobado este nivel
            await connection.query(
                'UPDATE purchase_approvals SET approval_status = \'APROBADO\', approver_id = ?, approval_date = NOW(), notes = ? WHERE id = ?',
                [userId, notes, level.id]
            );

            // 3. Verificar si era el último nivel
            const [remaining] = await connection.query(
                'SELECT count(*) as count FROM purchase_approvals WHERE purchase_request_id = ? AND approval_status = \'PENDIENTE\'',
                [requestId]
            );

            let allApproved = false;
            if (remaining[0].count === 0) {
                // Finalizar solicitud
                await connection.query('UPDATE purchase_requests SET status = \'APROBADO\' WHERE id = ?', [requestId]);
                allApproved = true;
            }

            // 4. Auditoría
            const AuditService = require('./auditService');
            await AuditService.log({
                userId, action: 'PURCHASE_APPROVAL', entityType: 'purchase_request', entityId: requestId,
                newValue: JSON.stringify({ level: level.approval_level, status: 'APROBADO', notes }),
                connection
            });

            await connection.commit();
            return { message: allApproved ? 'Solicitud aprobada completamente' : 'Aprobación registrada correctamente', allApproved };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Rechazar una solicitud
     */
    async rejectRequest(requestId, userId, reason) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            await connection.query('UPDATE purchase_requests SET status = \'RECHAZADO\' WHERE id = ?', [requestId]);
            await connection.query(
                'UPDATE purchase_approvals SET approval_status = \'RECHAZADO\', approver_id = ?, approval_date = NOW(), notes = ? WHERE purchase_request_id = ? AND approval_status = \'PENDIENTE\'',
                [userId, reason, requestId]
            );

            const AuditService = require('./auditService');
            await AuditService.log({
                userId, action: 'PURCHASE_REJECTION', entityType: 'purchase_request', entityId: requestId,
                newValue: JSON.stringify({ reason }),
                connection
            });

            await connection.commit();
            return { message: 'Solicitud rechazada correctamente' };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Liberar solicitud (Release)
     */
    async releaseRequest(requestId, userId, notes) {
        // En nuestro flujo, release es equivalente a la primera aprobación (Supervisor)
        return this.approveRequest(requestId, userId, notes || 'Solicitud liberada para proceso de compra');
    }
};

module.exports = workflowService;
