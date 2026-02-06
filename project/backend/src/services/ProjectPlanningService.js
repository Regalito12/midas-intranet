/**
 * Project Planning Service
 * Servicio para gestionar la matriz de planificación presupuestaria
 */

const pool = require('../config/db');
const AuditService = require('./auditService');
const logger = require('../config/logger');

class ProjectPlanningService {

    /**
     * Generar código automático de proyecto
     * Formato: {AREA_CODE}-{YEAR}-{QUARTER}-{SEQUENTIAL}
     */
    static async generateProjectCode(areaId, fiscalYear, quarter) {
        try {
            // Obtener código del área (simplificado, ajustar según estructura real)
            const areaCode = `AREA${areaId}`;

            // Obtener último número secuencial del trimestre
            const [projects] = await pool.query(`
                SELECT project_code 
                FROM budget_project_planning 
                WHERE fiscal_year = ? 
                  AND execution_quarter = ?
                  AND deleted_at IS NULL
                ORDER BY project_code DESC 
                LIMIT 1
            `, [fiscalYear, quarter]);

            let sequential = 1;
            if (projects.length > 0) {
                const lastCode = projects[0].project_code;
                const parts = lastCode.split('-');
                sequential = parseInt(parts[parts.length - 1]) + 1;
            }

            return `${areaCode}-${fiscalYear}-${quarter}-${String(sequential).padStart(3, '0')}`;

        } catch (error) {
            logger.error('Error generating project code:', error);
            throw error;
        }
    }

    /**
     * Crear nuevo proyecto
     */
    async createProject(projectData, userId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Validar que existan Ítems (Plantilla Estándar)
            if (!projectData.items || !Array.isArray(projectData.items) || projectData.items.length === 0) {
                throw new Error('El proyecto debe incluir al menos una partida presupuestaria (Ítems)');
            }

            // 2. Calcular total desde los ítems (Seguridad Financiera)
            let calculatedTotal = 0;
            for (const item of projectData.items) {
                if (!item.item_name || !item.quantity || !item.unit_price) {
                    throw new Error('Todos los ítems deben tener Nombre, Cantidad y Precio Unitario');
                }
                const subtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
                calculatedTotal += subtotal;
                item.subtotal = subtotal; // Assign for DB insertion
            }

            // Generar código automático si no se proporciona
            if (!projectData.project_code) {
                projectData.project_code = await this.generateProjectCode(
                    projectData.area_id,
                    projectData.fiscal_year,
                    projectData.execution_quarter
                );
            }

            // Insertar proyecto (Cabecera)
            const [result] = await connection.query(`
                INSERT INTO budget_project_planning (
                    project_code, project_name, project_type, area_id, cost_center_id,
                    responsible_user_id, description, project_objective, institutional_objective,
                    expected_roi, budgeted_amount, start_date, end_date, execution_quarter,
                    fiscal_year, status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                projectData.project_code,
                projectData.project_name,
                projectData.project_type,
                projectData.area_id,
                projectData.cost_center_id,
                projectData.responsible_user_id || userId,
                projectData.description,
                projectData.project_objective,
                projectData.institutional_objective,
                projectData.expected_roi || null,
                calculatedTotal, // USE CALCULATED TOTAL
                projectData.start_date,
                projectData.end_date,
                projectData.execution_quarter,
                projectData.fiscal_year,
                'BORRADOR',
                userId
            ]);

            const projectId = result.insertId;

            // 3. Insertar Ítems (Detalle)
            for (const item of projectData.items) {
                await connection.query(`
                    INSERT INTO budget_project_items (
                        project_id, item_name, quantity, unit_price, subtotal, phase
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    projectId,
                    item.item_name,
                    item.quantity,
                    item.unit_price,
                    item.subtotal,
                    item.phase || 'Q1'
                ]);
            }

            // Auditoría
            if (AuditService && AuditService.log) {
                await AuditService.log({
                    user_id: userId,
                    action: 'PROJECT_CREATED',
                    entity: 'budget_project',
                    entityId: projectId,
                    old_values: null,
                    new_values: JSON.stringify({ ...projectData, budgeted_amount: calculatedTotal }),
                    ip_address: null
                }, connection);
            }

            await connection.commit();

            // Retornar proyecto creado
            return await this.getProjectById(projectId, userId, 'admin'); // Bypass role check for immediate return

        } catch (error) {
            await connection.rollback();
            logger.error('Error creating project:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Listar proyectos con filtros
     */
    async listProjects(filters = {}, userId, userRole) {
        try {
            let query = `
                SELECT 
                    bpp.*,
                    u.name as responsible_name,
                    cc.name as cost_center_name,
                    COALESCE(d.name, 'Sin área') as area_name
                FROM budget_project_planning bpp
                LEFT JOIN users u ON bpp.responsible_user_id = u.id
                LEFT JOIN cost_centers cc ON bpp.cost_center_id = cc.id
                LEFT JOIN departments d ON bpp.area_id = d.id
                WHERE bpp.deleted_at IS NULL
            `;

            const params = [];

            // Filtro por área/departamento (solo si no es rol global)
            const globalRoles = ['admin', 'alta_gerencia', 'auditoria', 'finanzas'];
            if (!globalRoles.includes(userRole) && filters.departmentFilter) {
                query += ' AND bpp.area_id = ?';
                params.push(filters.departmentFilter);
            }

            // Filtros adicionales
            if (filters.status) {
                query += ' AND bpp.status = ?';
                params.push(filters.status);
            }

            if (filters.fiscal_year) {
                query += ' AND bpp.fiscal_year = ?';
                params.push(filters.fiscal_year);
            }

            if (filters.execution_quarter) {
                query += ' AND bpp.execution_quarter = ?';
                params.push(filters.execution_quarter);
            }

            if (filters.project_type) {
                query += ' AND bpp.project_type = ?';
                params.push(filters.project_type);
            }

            if (filters.cost_center_id) {
                query += ' AND bpp.cost_center_id = ?';
                params.push(filters.cost_center_id);
            }

            query += ' ORDER BY bpp.created_at DESC';

            const [projects] = await pool.query(query, params);

            return projects;

        } catch (error) {
            logger.error('Error listing projects:', error);
            throw error;
        }
    }

    /**
     * Obtener proyecto por ID
     */
    async getProjectById(projectId, userId, userRole) {
        try {
            const [projects] = await pool.query(`
                SELECT 
                    bpp.*,
                    u.name as responsible_name,
                    cc.name as cost_center_name,
                    cc.code as cost_center_code,
                    d.name as area_name,
                    creator.name as created_by_name
                FROM budget_project_planning bpp
                LEFT JOIN users u ON bpp.responsible_user_id = u.id
                LEFT JOIN cost_centers cc ON bpp.cost_center_id = cc.id
                LEFT JOIN departments d ON bpp.area_id = d.id
                LEFT JOIN users creator ON bpp.created_by = creator.id
                WHERE bpp.id = ? AND bpp.deleted_at IS NULL
            `, [projectId]);

            if (projects.length === 0) {
                throw new Error('Proyecto no encontrado');
            }

            const project = projects[0];

            // Fetch Items
            const [items] = await pool.query(
                'SELECT * FROM budget_project_items WHERE project_id = ?',
                [projectId]
            );
            project.items = items;

            return project;

        } catch (error) {
            logger.error('Error getting project by ID:', error);
            throw error;
        }
    }

    /**
     * Actualizar proyecto
     */
    async updateProject(projectId, updates, userId, userRole) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Obtener proyecto actual
            const [projects] = await connection.query(
                'SELECT * FROM budget_project_planning WHERE id = ? AND deleted_at IS NULL',
                [projectId]
            );

            if (projects.length === 0) {
                throw new Error('Proyecto no encontrado');
            }

            const currentProject = projects[0];

            // Validar que el proyecto está en estado editable
            if (['COMPLETADO', 'CANCELADO'].includes(currentProject.status)) {
                throw new Error('No se puede editar un proyecto completado o cancelado');
            }

            // Construir query de actualización
            const allowedFields = [
                'project_name', 'description', 'project_objective',
                'institutional_objective', 'expected_roi', 'budgeted_amount',
                'start_date', 'end_date', 'execution_quarter'
            ];

            const updateFields = [];
            const updateValues = [];

            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    updateFields.push(`${field} = ?`);
                    updateValues.push(updates[field]);
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No hay campos para actualizar');
            }

            updateValues.push(projectId);

            await connection.query(`
                UPDATE budget_project_planning 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            // Auditoría
            if (AuditService && AuditService.log) {
                await AuditService.log({
                    user_id: userId,
                    action: 'PROJECT_UPDATED',
                    entity: 'budget_project',
                    entityId: projectId,
                    old_values: JSON.stringify(currentProject),
                    new_values: JSON.stringify(updates),
                    ip_address: null
                }, connection);
            }

            await connection.commit();

            // Retornar proyecto actualizado
            return await this.getProjectById(projectId, userId, userRole);

        } catch (error) {
            await connection.rollback();
            logger.error('Error updating project:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Enviar proyecto a aprobación
     */
    async submitForApproval(projectId, userId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Obtener proyecto
            const [projects] = await connection.query(
                'SELECT * FROM budget_project_planning WHERE id = ? AND deleted_at IS NULL',
                [projectId]
            );

            if (projects.length === 0) {
                throw new Error('Proyecto no encontrado');
            }

            const project = projects[0];

            if (project.status !== 'BORRADOR') {
                throw new Error('Solo se pueden enviar proyectos en estado BORRADOR');
            }

            // Actualizar estado
            await connection.query(`
                UPDATE budget_project_planning 
                SET status = 'PENDIENTE_APROBACION', submitted_at = NOW()
                WHERE id = ?
            `, [projectId]);

            // Crear registros de aprobación requeridos
            // Nivel 1: Gerente de Área
            await connection.query(`
                INSERT INTO budget_project_approvals (project_id, approval_level, required_role)
                VALUES (?, 1, 'gerente')
            `, [projectId]);

            // Si el monto supera threshold, agregar más niveles
            if (project.budgeted_amount > 100000) {
                // Nivel 2: Director
                await connection.query(`
                    INSERT INTO budget_project_approvals (project_id, approval_level, required_role)
                    VALUES (?, 2, 'director')
                `, [projectId]);
            }

            if (project.budgeted_amount > 500000) {
                // Nivel 3: Alta Gerencia
                await connection.query(`
                    INSERT INTO budget_project_approvals (project_id, approval_level, required_role)
                    VALUES (?, 3, 'alta_gerencia')
                `, [projectId]);
            }

            // Auditoría
            if (AuditService && AuditService.log) {
                await AuditService.log({
                    user_id: userId,
                    action: 'PROJECT_SUBMITTED',
                    entity: 'budget_project',
                    entityId: projectId,
                    old_values: JSON.stringify({ status: 'BORRADOR' }),
                    new_values: JSON.stringify({ status: 'PENDIENTE_APROBACION' }),
                    ip_address: null
                }, connection);
            }

            await connection.commit();

            return { success: true, message: 'Proyecto enviado a aprobación' };

        } catch (error) {
            await connection.rollback();
            logger.error('Error submitting project:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Aprobar proyecto
     */
    async approveProject(projectId, approverId, notes = null) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Obtener rol del aprobador
            const [approver] = await connection.query(
                'SELECT role FROM users WHERE id = ?',
                [approverId]
            );

            if (approver.length === 0) {
                throw new Error('Aprobador no encontrado');
            }

            const approverRole = approver[0].role;

            // Buscar aprobación pendiente para este rol
            const [approvals] = await connection.query(`
                SELECT * FROM budget_project_approvals
                WHERE project_id = ? 
                  AND required_role = ?
                  AND approval_status = 'PENDIENTE'
                ORDER BY approval_level
                LIMIT 1
            `, [projectId, approverRole]);

            if (approvals.length === 0) {
                throw new Error('No hay aprobaciones pendientes para su rol');
            }

            const approval = approvals[0];

            // Marcar como aprobada
            await connection.query(`
                UPDATE budget_project_approvals
                SET approval_status = 'APROBADO',
                    approver_id = ?,
                    approval_date = NOW(),
                    notes = ?
                WHERE id = ?
            `, [approverId, notes, approval.id]);

            // Verificar si todas las aprobaciones están completas
            const [pendingApprovals] = await connection.query(`
                SELECT COUNT(*) as pending_count
                FROM budget_project_approvals
                WHERE project_id = ? AND approval_status = 'PENDIENTE'
            `, [projectId]);

            // Si no quedan aprobaciones pendientes, marcar proyecto como APROBADO
            if (pendingApprovals[0].pending_count === 0) {
                await connection.query(`
                    UPDATE budget_project_planning
                    SET status = 'APROBADO',
                        approved_by = ?,
                        approved_at = NOW(),
                        approval_notes = ?
                    WHERE id = ?
                `, [approverId, notes, projectId]);

                // Auditoría de aprobación final
                if (AuditService && AuditService.log) {
                    await AuditService.log({
                        user_id: approverId,
                        action: 'PROJECT_APPROVED',
                        entity: 'budget_project',
                        entityId: projectId,
                        old_values: JSON.stringify({ status: 'PENDIENTE_APROBACION' }),
                        new_values: JSON.stringify({ status: 'APROBADO' }),
                        ip_address: null
                    }, connection);
                }
            }

            await connection.commit();

            return {
                success: true,
                message: pendingApprovals[0].pending_count === 0
                    ? 'Proyecto aprobado completamente'
                    : 'Aprobación registrada, pendiente otros niveles'
            };

        } catch (error) {
            await connection.rollback();
            logger.error('Error approving project:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Rechazar proyecto
     */
    async rejectProject(projectId, rejectorId, reason) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            if (!reason || reason.length < 10) {
                throw new Error('Debe proporcionar un motivo de rechazo detallado');
            }

            // Actualizar proyecto
            await connection.query(`
                UPDATE budget_project_planning
                SET status = 'RECHAZADO',
                    rejected_by = ?,
                    rejected_at = NOW(),
                    rejection_reason = ?
                WHERE id = ?
            `, [rejectorId, reason, projectId]);

            // Marcar todas las aprobaciones como rechazadas
            await connection.query(`
                UPDATE budget_project_approvals
                SET approval_status = 'RECHAZADO'
                WHERE project_id = ? AND approval_status = 'PENDIENTE'
            `, [projectId]);

            // Auditoría
            if (AuditService && AuditService.log) {
                await AuditService.log({
                    user_id: rejectorId,
                    action: 'PROJECT_REJECTED',
                    entity: 'budget_project',
                    entityId: projectId,
                    old_values: JSON.stringify({ status: 'PENDIENTE_APROBACION' }),
                    new_values: JSON.stringify({ status: 'RECHAZADO', reason }),
                    ip_address: null
                }, connection);
            }

            await connection.commit();

            return { success: true, message: 'Proyecto rechazado' };

        } catch (error) {
            await connection.rollback();
            logger.error('Error rejecting project:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Verificar presupuesto disponible del proyecto
     */
    async checkProjectBudget(projectId, amount) {
        try {
            const [projects] = await pool.query(`
                SELECT 
                    id,
                    project_name,
                    budgeted_amount,
                    committed_amount,
                    spent_amount,
                    available_amount,
                    status
                FROM budget_project_planning
                WHERE id = ? AND deleted_at IS NULL
            `, [projectId]);

            if (projects.length === 0) {
                return {
                    hasProject: false,
                    available: 0,
                    sufficient: false,
                    project: null
                };
            }

            const project = projects[0];

            if (project.status !== 'APROBADO') {
                return {
                    hasProject: true,
                    available: 0,
                    sufficient: false,
                    warning: 'El proyecto no está aprobado'
                };
            }

            return {
                hasProject: true,
                available: available,
                sufficient: sufficient,
                projectId: project.id,
                projectName: project.project_name,
                totalBudget: project.budgeted_amount,
                committed: project.committed_amount,
                spent: project.spent_amount,
                warning: sufficient
                    ? null
                    : `Presupuesto insuficiente en el proyecto. Disponible: RD$${available.toLocaleString()}, Requerido: RD$${amount.toLocaleString()}`
            };

        } catch (error) {
            logger.error('Error checking project budget:', error);
            return {
                hasProject: false,
                available: 0,
                sufficient: false,
                warning: 'Error verificando presupuesto del proyecto'
            };
        }
    }

    /**
     * Comprometer fondos del proyecto (al aprobar solicitud de compra)
     */
    async commitProjectBudget(projectId, amount, requestId, userId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Verificar disponibilidad
            const budgetCheck = await this.checkProjectBudget(projectId, amount);
            if (!budgetCheck.sufficient) {
                throw new Error(budgetCheck.warning);
            }

            // Actualizar presupuesto comprometido
            await connection.query(`
                UPDATE budget_project_planning
                SET committed_amount = committed_amount + ?,
                    status = CASE 
                        WHEN status = 'APROBADO' THEN 'EN_EJECUCION' 
                        ELSE status 
                    END
                WHERE id = ?
            `, [amount, projectId]);

            // Auditoría
            if (AuditService && AuditService.log) {
                await AuditService.log({
                    user_id: userId,
                    action: 'PROJECT_BUDGET_COMMITTED',
                    entity: 'budget_project',
                    entityId: projectId,
                    old_values: JSON.stringify({ committed_amount: budgetCheck.committed }),
                    new_values: JSON.stringify({
                        committed_amount: budgetCheck.committed + amount,
                        request_id: requestId
                    }),
                    ip_address: null
                }, connection);
            }

            await connection.commit();

            return { success: true, message: 'Presupuesto del proyecto comprometido correctamente' };

        } catch (error) {
            await connection.rollback();
            logger.error('Error committing project budget:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Gastar del presupuesto del proyecto (al finalizar orden de compra)
     */
    async spendFromProject(projectId, amount, orderId, userId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Mover de "comprometido" a "gastado"
            await connection.query(`
                UPDATE budget_project_planning
                SET committed_amount = GREATEST(0, committed_amount - ?),
                    spent_amount = spent_amount + ?
                WHERE id = ?
            `, [amount, amount, projectId]);

            // Auditoría
            if (AuditService && AuditService.log) {
                await AuditService.log({
                    user_id: userId,
                    action: 'PROJECT_BUDGET_SPENT',
                    entity: 'budget_project',
                    entityId: projectId,
                    old_values: null,
                    new_values: JSON.stringify({
                        spent_amount: amount,
                        order_id: orderId
                    }),
                    ip_address: null
                }, connection);
            }

            await connection.commit();

            return { success: true, message: 'Presupuesto del proyecto actualizado correctamente' };

        } catch (error) {
            await connection.rollback();
            logger.error('Error spending from project:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtener resumen ejecutivo de proyecto
     */
    async getProjectSummary(projectId) {
        try {
            const project = await this.getProjectById(projectId, null, 'admin'); // Bypass access check for summary

            // Obtener solicitudes de compra vinculadas
            const [purchaseRequests] = await pool.query(`
                SELECT 
                    request_number,
                    product_name,
                    total_estimated,
                    status,
                    created_at
                FROM purchase_requests
                WHERE planned_project_id = ?
                ORDER BY created_at DESC
            `, [projectId]);

            // Calcular utilization percentage
            const utilizationPercentage = project.budgeted_amount > 0
                ? ((project.committed_amount + project.spent_amount) / project.budgeted_amount * 100).toFixed(2)
                : 0;

            return {
                project: {
                    id: project.id,
                    code: project.project_code,
                    name: project.project_name,
                    status: project.status,
                    budgeted_amount: project.budgeted_amount,
                    committed_amount: project.committed_amount,
                    spent_amount: project.spent_amount,
                    available_amount: project.available_amount,
                    utilization_percentage: parseFloat(utilizationPercentage)
                },
                purchase_requests: purchaseRequests,
                totals: {
                    total_requests: purchaseRequests.length,
                    total_committed: purchaseRequests
                        .filter(pr => ['APROBADO', 'EN_COMPRAS', 'ORDEN_GENERADA'].includes(pr.status))
                        .reduce((sum, pr) => sum + parseFloat(pr.total_estimated || 0), 0),
                    total_spent: purchaseRequests
                        .filter(pr => pr.status === 'CERRADO')
                        .reduce((sum, pr) => sum + parseFloat(pr.total_estimated || 0), 0)
                }
            };

        } catch (error) {
            logger.error('Error getting project summary:', error);
            throw error;
        }
    }

    /**
     * Obtener proyectos pendientes de aprobación para un usuario
     */
    async getPendingApprovals(userId, userRole) {
        try {
            const [approvals] = await pool.query(`
                SELECT 
                    bpp.*,
                    bpa.approval_level,
                    bpa.notes as approval_notes,
                    u.name as created_by_name,
                    d.name as area_name
                FROM budget_project_approvals bpa
                INNER JOIN budget_project_planning bpp ON bpa.project_id = bpp.id
                LEFT JOIN users u ON bpp.created_by = u.id
                LEFT JOIN departments d ON bpp.area_id = d.id
                WHERE bpa.required_role = ?
                  AND bpa.approval_status = 'PENDIENTE'
                  AND bpp.deleted_at IS NULL
                ORDER BY bpp.submitted_at ASC
            `, [userRole]);

            return approvals;

        } catch (error) {
            logger.error('Error getting pending approvals:', error);
            throw error;
        }
    }

    /**
     * Eliminar proyecto (Solo borradores)
     */
    async deleteProject(id, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar estado
            const [projects] = await connection.query(
                'SELECT status, project_code FROM budget_project_planning WHERE id = ?',
                [id]
            );

            if (projects.length === 0) {
                throw new Error('Proyecto no encontrado');
            }

            if (projects[0].status !== 'BORRADOR') {
                throw new Error('Solo se pueden eliminar proyectos en estado BORRADOR');
            }

            // Soft delete
            await connection.query(
                `UPDATE budget_project_planning 
                 SET deleted_at = NOW() 
                 WHERE id = ?`,
                [id]
            );

            // Audit
            if (AuditService && AuditService.logAction) {
                await AuditService.logAction({
                    userId,
                    actionType: 'PROJECT_DELETED',
                    entityType: 'budget_project',
                    entityId: id,
                    oldValue: JSON.stringify({ project_code: projects[0].project_code }),
                    newValue: JSON.stringify({ deleted_at: new Date(), deleted_by: userId })
                }, connection);
            }

            await connection.commit();
            return { success: true, message: 'Proyecto eliminado correctamente' };

        } catch (error) {
            await connection.rollback();
            logger.error('Error deleting project:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async duplicateProject(id, userId) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Get original project
            const [projects] = await connection.query(
                'SELECT * FROM budget_project_planning WHERE id = ?', // Changed table name from budget_projects to budget_project_planning
                [id]
            );

            if (projects.length === 0) {
                throw new Error('Proyecto no encontrado');
            }

            const originalProject = projects[0];
            const newProjectCode = await this.generateProjectCode(
                originalProject.area_id,
                originalProject.fiscal_year,
                originalProject.execution_quarter
            );

            // 2. Create new project
            const [projectResult] = await connection.query(
                `INSERT INTO budget_project_planning 
                (project_code, project_name, description, project_type, 
                area_id, cost_center_id, execution_quarter, start_date, end_date, 
                project_objective, institutional_objective, status, created_by, fiscal_year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR', ?, ?)`,
                [
                    newProjectCode,
                    originalProject.project_name + ' - Copia',
                    originalProject.description,
                    originalProject.project_type,
                    originalProject.area_id,
                    originalProject.cost_center_id,
                    originalProject.execution_quarter,
                    originalProject.start_date,
                    originalProject.end_date,
                    originalProject.project_objective,
                    originalProject.institutional_objective,
                    userId,
                    originalProject.fiscal_year
                ]
            );

            const newProjectId = projectResult.insertId;

            // 3. Get original items
            const [items] = await connection.query(
                'SELECT * FROM budget_project_items WHERE project_id = ?',
                [id]
            );

            // 4. Duplicate items
            let totalAmount = 0;
            for (const item of items) {
                await connection.query(
                    `INSERT INTO budget_project_items 
                    (project_id, item_name, quantity, unit_price, subtotal, phase)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        newProjectId,
                        item.item_name,
                        item.quantity,
                        item.unit_price,
                        item.subtotal,
                        item.phase
                    ]
                );
                totalAmount += Number(item.subtotal);
            }

            // 5. Update total budget on NEW project
            await connection.query(
                'UPDATE budget_project_planning SET budgeted_amount = ? WHERE id = ?', // Changed table name
                [totalAmount, newProjectId]
            );

            // Guardar log de auditoría
            if (AuditService && AuditService.logAction) {
                await AuditService.logAction({
                    userId,
                    actionType: 'PROJECT_DUPLICATED',
                    entityType: 'budget_project',
                    entityId: newProjectId,
                    newValue: JSON.stringify({
                        original_project_id: id,
                        new_project_code: newProjectCode
                    })
                }, connection);
            }

            await connection.commit();
            return { id: newProjectId, project_code: newProjectCode };

        } catch (error) {
            if (connection) await connection.rollback();
            logger.error('Error duplicating project:', error); // Added logger for consistency
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Completar proyecto
     * Solo proyectos APROBADOS o EN_EJECUCION pueden completarse
     */
    async completeProject(projectId, userId, completionNotes = null) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Verificar proyecto y estado actual
            const [projects] = await connection.query(
                `SELECT id, status, project_code, project_name 
                 FROM budget_project_planning 
                 WHERE id = ? AND deleted_at IS NULL`,
                [projectId]
            );

            if (projects.length === 0) {
                throw new Error('Proyecto no encontrado');
            }

            const project = projects[0];

            // Validar estado
            if (!['APROBADO', 'EN_EJECUCION'].includes(project.status)) {
                throw new Error(
                    `No se puede completar un proyecto en estado ${project.status}. ` +
                    `Solo proyectos APROBADOS o EN_EJECUCION pueden completarse.`
                );
            }

            // Actualizar a COMPLETADO
            await connection.query(
                `UPDATE budget_project_planning 
                 SET status = 'COMPLETADO',
                     completion_notes = ?,
                     completed_at = NOW(),
                     completed_by = ?
                 WHERE id = ?`,
                [completionNotes, userId, projectId]
            );

            // Auditoría
            if (AuditService && AuditService.log) {
                await AuditService.log({
                    user_id: userId,
                    action: 'PROJECT_COMPLETED',
                    entity: 'budget_project',
                    entityId: projectId,
                    old_values: JSON.stringify({ status: project.status }),
                    new_values: JSON.stringify({
                        status: 'COMPLETADO',
                        notes: completionNotes
                    }),
                    ip_address: null
                }, connection);
            }

            await connection.commit();

            return {
                success: true,
                message: 'Proyecto marcado como COMPLETADO exitosamente'
            };

        } catch (error) {
            await connection.rollback();
            logger.error('Error completing project:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Cancelar proyecto
     * Solo proyectos BORRADOR, APROBADOS o EN_EJECUCION pueden cancelarse
     */
    async cancelProject(projectId, userId, cancellationReason) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Validar razón
            if (!cancellationReason || cancellationReason.length < 20) {
                throw new Error('Debe proporcionar una razón detallada de cancelación (mínimo 20 caracteres)');
            }

            // Verificar proyecto y estado actual
            const [projects] = await connection.query(
                `SELECT id, status, project_code, project_name 
                 FROM budget_project_planning 
                 WHERE id = ? AND deleted_at IS NULL`,
                [projectId]
            );

            if (projects.length === 0) {
                throw new Error('Proyecto no encontrado');
            }

            const project = projects[0];

            // Validar estado
            if (['COMPLETADO', 'CANCELADO'].includes(project.status)) {
                throw new Error(
                    `No se puede cancelar un proyecto en estado ${project.status}`
                );
            }

            // Verificar si tiene purchase requests activas
            const [activePurchases] = await connection.query(
                `SELECT COUNT(*) as active_count 
                 FROM purchase_requests 
                 WHERE planned_project_id = ? 
                   AND status IN ('SOLICITADO', 'LIBERADO', 'PENDIENTE_APROBACION', 'APROBADO')`,
                [projectId]
            );

            if (activePurchases[0].active_count > 0) {
                throw new Error(
                    `No se puede cancelar el proyecto porque tiene ${activePurchases[0].active_count} ` +
                    `solicitud(es) de compra activas. Debe cancelarlas primero.`
                );
            }

            // Actualizar a CANCELADO
            await connection.query(
                `UPDATE budget_project_planning 
                 SET status = 'CANCELADO',
                     cancellation_reason = ?,
                     cancelled_at = NOW(),
                     cancelled_by = ?
                 WHERE id = ?`,
                [cancellationReason, userId, projectId]
            );

            // Auditoría
            if (AuditService && AuditService.log) {
                await AuditService.log({
                    user_id: userId,
                    action: 'PROJECT_CANCELLED',
                    entity: 'budget_project',
                    entityId: projectId,
                    old_values: JSON.stringify({ status: project.status }),
                    new_values: JSON.stringify({
                        status: 'CANCELADO',
                        reason: cancellationReason
                    }),
                    ip_address: null
                }, connection);
            }

            await connection.commit();

            return {
                success: true,
                message: 'Proyecto cancelado exitosamente'
            };

        } catch (error) {
            await connection.rollback();
            logger.error('Error cancelling project:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

}

module.exports = new ProjectPlanningService();
