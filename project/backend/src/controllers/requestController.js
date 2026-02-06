const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que las tablas existen (Self-healing)
const ensureTableExists = async () => {
    try {
        // ... previous table creation queries ...
        await pool.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id VARCHAR(255) PRIMARY KEY,
                requester_id VARCHAR(255) NOT NULL,
                requester_name VARCHAR(255) NOT NULL,
                requester_avatar VARCHAR(500),
                department VARCHAR(100),
                type VARCHAR(100) NOT NULL,
                total DECIMAL(15,2) DEFAULT 0,
                justification TEXT,
                priority VARCHAR(50) DEFAULT 'media',
                status VARCHAR(50) DEFAULT 'pendiente',
                internal_status VARCHAR(50) DEFAULT 'INITIAL',
                date DATETIME NOT NULL,
                items_count INT DEFAULT 0,
                cost_center_id INT NULL,
                workflow_id INT NULL,
                current_step_id INT NULL,
                deleted_at TIMESTAMP NULL DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS request_items (
                id VARCHAR(255) PRIMARY KEY,
                request_id VARCHAR(255) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                description TEXT,
                quantity INT NOT NULL,
                unit_price DECIMAL(15,2) NOT NULL,
                total_price DECIMAL(15,2) NOT NULL,
                FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS request_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_id VARCHAR(255) NOT NULL,
                action VARCHAR(50) NOT NULL,
                actor_id INT,
                actor_name VARCHAR(255),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
    } catch (error) {
        logger.error('Error creating requests tables', { error: error.message });
    }
};

ensureTableExists();


// Obtener todas las solicitudes
exports.getAllRequests = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM requests ORDER BY date DESC');
        res.json(rows);
    } catch (error) {
        logger.error('Error searching requests', { error: error.message });
        res.status(500).json({ message: 'Error buscando solicitudes', error: error.message });
    }
};

// Obtener solicitudes por usuario
exports.getRequestsByUser = async (req, res) => {
    const { userId } = req.params;
    try {
        let targetId = userId;
        // Resolver Employee ID si viene un User ID numérico
        if (!isNaN(userId)) {
            const [emp] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
            if (emp.length > 0) {
                targetId = emp[0].id;
            }
        }

        const [rows] = await pool.query('SELECT * FROM requests WHERE requester_id = ? ORDER BY date DESC', [targetId]);
        res.json(rows);
    } catch (error) {
        logger.error('Error searching user requests', { error: error.message, userId });
        res.status(500).json({ message: 'Error buscando solicitudes', error: error.message });
    }
};

// Obtener items de una solicitud específica
exports.getRequestItems = async (req, res) => {
    const { requestId } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM request_items WHERE request_id = ?', [requestId]);
        res.json(rows);
    } catch (error) {
        logger.error('Error searching request items', { error: error.message, requestId });
        res.status(500).json({ message: 'Error buscando items', error: error.message });
    }
};

const workflowService = require('../services/workflowService');
const budgetService = require('../services/budgetService');

// Crear una solicitud
exports.createRequest = async (req, res) => {
    const {
        id, requester_id, requester_name, requester_avatar, department,
        type, description, quantity, price, total, justification, priority, items,
        cost_center_id // Extraer centro de costo
    } = req.body;

    const { randomUUID } = require('crypto');
    const requestId = id || randomUUID();
    const date = new Date();
    // Estado inicial controlado por workflow, por defecto 'pendiente' si falla
    let status = 'pendiente';

    const auditService = require('../services/auditService');

    let realRequesterId = requester_id;

    try {
        // Resolver requester_id si es numérico
        if (!isNaN(requester_id)) {
            const [emp] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [requester_id]);
            if (emp.length > 0) {
                realRequesterId = emp[0].id;
            }
        }

        // VALIDACIÓN DE PRESUPUESTO (Solo para compras)
        if (type === 'Compras' && cost_center_id) {
            const budgetCheck = await budgetService.checkAvailability(cost_center_id, total || 0);
            if (!budgetCheck.available) {
                return res.status(400).json({
                    message: 'Presupuesto insuficiente',
                    error: budgetCheck.message
                });
            }
        }

        await pool.query(
            `INSERT INTO requests (id, requester_id, requester_name, requester_avatar, department, type, 
             total, justification, priority, status, internal_status, date, items_count, cost_center_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [requestId, realRequesterId, requester_name, requester_avatar, department, type,
                total || 0, justification, priority || 'media', status, 'INITIAL', date, items ? items.length : 0, cost_center_id]
        );

        // RESERVA DE FONDOS (Si es compra)
        if (type === 'Compras' && cost_center_id) {
            await budgetService.reserveFunds(cost_center_id, total || 0);
            logger.info('Funds reserved', { total, costCenterId: cost_center_id });
        }

        // Insertar items si existen
        if (items && Array.isArray(items) && items.length > 0) {
            const { randomUUID } = require('crypto');
            for (const item of items) {
                const itemId = `item_${randomUUID()}`;
                await pool.query(
                    `INSERT INTO request_items (id, request_id, product_name, description, quantity, unit_price, total_price)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [itemId, requestId, item.product_name, item.description || '', item.quantity, item.unit_price, item.total_price]
                );
            }
        }

        // INICIAR WORKFLOW (Backoffice Engine)
        // Esto asignará el primer paso y actualizará el estado si aplica
        await workflowService.startWorkflow(requestId, type, req.body);

        // Audit Log
        await auditService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action: 'CREATE_REQUEST',
            entity: 'request',
            entityId: requestId,
            details: { type, total, department },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({ message: 'Solicitud creada, presupuesto reservado e iniciada en workflow', id: requestId, total: total });
    } catch (error) {
        logger.error('Error creating request', { error: error.message, requester_id });
        res.status(500).json({ message: 'Error creando solicitud', error: error.message });
    }
};

// Actualizar estado de una solicitud (con Workflow y Trazabilidad)
exports.updateRequestStatus = async (req, res) => {
    const { id } = req.params;
    const { status, comment } = req.body;
    const user = req.user;

    try {
        // 1. Validar estado actual
        const [rows] = await pool.query('SELECT status, requester_id, type, workflow_id FROM requests WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }
        const request = rows[0];
        const currentStatus = request.status;

        // Máquina de estados base
        const transitions = {
            'pendiente': ['aprobado', 'rechazado', 'en_progreso'], // Added en_progreso
            'en_progreso': ['aprobado', 'rechazado', 'completado', 'en_progreso'], // Self loop for steps
            'aprobado': ['completado', 'cancelado'],
            'rechazado': [],
            'completado': [],
            'cancelado': []
        };

        if (transitions[currentStatus] && !transitions[currentStatus].includes(status)) {
            return res.status(400).json({
                message: `Transición de estado ilegal: No se puede pasar de '${currentStatus}' a '${status}'.`
            });
        }

        let newStatus = status;
        let internalStatus = status.toUpperCase();
        if (status === 'aprobado') internalStatus = 'APPROVED';
        if (status === 'rechazado') internalStatus = 'REJECTED';
        if (status === 'completado') internalStatus = 'COMPLETED';

        let workflowMessage = '';

        // 2. CHECK AUTHORIZATION (Who is approving?)
        // If it's a rejection, we usually allow it if they are admin or if they are the current required approver.
        // For approval, it's more strict.
        if (status === 'aprobado' || status === 'rechazado') {
            // Get current required step from matrix/workflow
            const currentStep = await workflowService.getCurrentStep(id);

            if (currentStep && currentStep.approver_role) {
                // Determine if user has the role.
                // We check the employee's position.
                const [actingEmp] = await pool.query('SELECT position FROM employees WHERE user_id = ?', [user.id]);
                const userPosition = actingEmp.length > 0 ? actingEmp[0].position : null;

                // Admin can always override, but let's log it.
                const isAdmin = user.role === 'admin';
                const hasCorrectRole = userPosition && userPosition.toLowerCase().includes(currentStep.approver_role.toLowerCase());

                if (!isAdmin && !hasCorrectRole) {
                    return res.status(403).json({
                        message: `No estás autorizado para esta acción. Se requiere el rol: ${currentStep.approver_role}. Tu posición actual es: ${userPosition || 'N/A'}`
                    });
                }

                if (isAdmin && !hasCorrectRole) {
                    workflowMessage += ' (Acción de Administrador)';
                }
            }
        }

        // WORKFLOW ENGINE LOGIC
        // Si se intenta Aprobar y hay un workflow activo, intentamos avanzar el paso
        if (status === 'aprobado' && request.workflow_id) {
            const result = await workflowService.nextStep(id);

            if (result && !result.completed) {
                // Si el workflow retornó un paso, significa que NO ha terminado.
                // Mantenemos el estado en 'en_progreso' o 'pendiente'
                newStatus = 'en_progreso';
                workflowMessage = ` (Avanzado al paso: ${result.step_name})`;

                // Actualizamos el status en la BD por si nextStep no lo hizo (nextStep solo actualiza current_step_id)
                await pool.query('UPDATE requests SET status = ? WHERE id = ?', [newStatus, id]);
            } else if (result && result.completed) {
                // Workflow completado, permitimos el estado 'aprobado'
                newStatus = 'aprobado';
                internalStatus = 'APPROVED';
                workflowMessage = ' (Workflow Completado)';

                // EJECUTAR COMPROMISO DE FONDOS (Commit) si es compra
                const [rData] = await pool.query('SELECT total, cost_center_id, type FROM requests WHERE id = ?', [id]);
                if (rData.length > 0 && rData[0].type === 'Compras' && rData[0].cost_center_id) {
                    await budgetService.commitFunds(rData[0].cost_center_id, rData[0].total || 0);
                    logger.audit('Funds committed', { requestId: id, total: rData[0].total });
                }

                await pool.query('UPDATE requests SET status = ?, internal_status = ? WHERE id = ?', [newStatus, internalStatus, id]);
            }
        } else {
            // Actualización manual estándar (Rechazo o sin workflow)
            await pool.query('UPDATE requests SET status = ?, internal_status = ? WHERE id = ?', [status, internalStatus, id]);
        }

        // 3. Registrar en Historial
        await pool.query(
            `INSERT INTO request_history (request_id, action, actor_id, actor_name, comment, created_at) 
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [id, status.toUpperCase(), user.id, user.username, (comment || 'Cambio de estado') + workflowMessage]
        );

        // 4. Notificar
        const notificationController = require('./notificationController');
        let title = 'Actualización de Solicitud';
        let message = `Tu solicitud de ${request.type} ha cambiado de estado.`;

        if (newStatus === 'aprobado') {
            title = '¡Solicitud Aprobada! 🎉';
            message = `Tu solicitud ha completado el flujo de aprobación.`;
        } else if (newStatus === 'rechazado') {
            title = 'Solicitud Rechazada ❌';
            message = `Tu solicitud ha sido rechazada.`;
        } else if (newStatus === 'en_progreso') {
            title = 'Aprobación Parcial ✅';
            message = `Tu solicitud avanzó al siguiente paso de aprobación.`;
        }

        await notificationController.createNotification(
            request.requester_id,
            'request_update',
            title,
            message,
            id
        );

        res.json({ message: `Solicitud procesada: ${newStatus}${workflowMessage}` });
    } catch (error) {
        logger.error('Error updating request', { error: error.message, id });
        res.status(500).json({ message: 'Error actualizando solicitud', error: error.message });
    }
};

// Eliminar una solicitud
exports.deleteRequest = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM requests WHERE id = ?', [id]);
        res.json({ message: 'Solicitud eliminada' });
    } catch (error) {
        logger.error('Error deleting request', { error: error.message, id });
        res.status(500).json({ message: 'Error eliminando solicitud', error: error.message });
    }
};
