const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');
const authorize = verifyToken.authorize;
const auditService = require('../services/auditService');
const workflowService = require('../services/workflowService');
const budgetService = require('../services/budgetService');
const logger = require('../config/logger');

// Todas estas rutas requieren ser ADMIN o RRHH/FINANZAS (Backoffice Role)
router.use(verifyToken);
// Eliminamos el authorize('admin') global para permitir granularidad por ruta

// =======================
// REGLAS DE NEGOCIO
// =======================
router.get('/rules', authorize('admin'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM business_rules');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/rules', async (req, res) => {
    const { name, code, rule_type, entity_target, conditions_json, actions_json } = req.body;
    try {
        await pool.query(
            'INSERT INTO business_rules (name, code, rule_type, entity_target, conditions_json, actions_json) VALUES (?, ?, ?, ?, ?, ?)',
            [name, code, rule_type, entity_target, JSON.stringify(conditions_json), JSON.stringify(actions_json)]
        );
        res.status(201).json({ message: 'Regla creada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =======================
// WORKFLOWS
// =======================
router.get('/workflows', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM workflows');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/workflows', async (req, res) => {
    const { name, code } = req.body;
    try {
        await pool.query('INSERT INTO workflows (name, code) VALUES (?, ?)', [name, code]);
        res.status(201).json({ message: 'Workflow creado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pasos de workflow
router.get('/workflows/steps/:workflowId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order', [req.params.workflowId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/workflows/steps', async (req, res) => {
    const { workflow_id, step_order, step_name, approver_role } = req.body;
    try {
        await pool.query(
            'INSERT INTO workflow_steps (workflow_id, step_order, step_name, approver_role) VALUES (?, ?, ?, ?)',
            [workflow_id, step_order, step_name, approver_role]
        );
        res.status(201).json({ message: 'Paso añadido' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CENTROS DE COSTO (Requiere manage_budgets o admin)
router.get('/cost-centers', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM cost_centers WHERE `active` = TRUE');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/cost-centers', verifyToken.hasPermission('manage_budgets'), async (req, res) => {
    const { code, name } = req.body;
    try {
        await pool.query('INSERT INTO cost_centers (code, name) VALUES (?, ?)', [code, name]);
        res.status(201).json({ message: 'Centro de costo creado' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: `El código "${code}" ya está en uso por otro centro de costo.` });
        }
        res.status(500).json({ error: error.message });
    }
});

router.put('/cost-centers/:id', verifyToken.hasPermission('manage_budgets'), async (req, res) => {
    const { id } = req.params;
    const { code, name, active } = req.body;
    try {
        await pool.query(
            'UPDATE cost_centers SET code = ?, name = ?, active = ? WHERE id = ?',
            [code, name, active ?? true, id]
        );
        res.json({ message: 'Centro de costo actualizado' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: `El código "${code}" ya está en uso por otro centro de costo.` });
        }
        res.status(500).json({ error: error.message });
    }
});

router.delete('/cost-centers/:id', verifyToken.hasPermission('manage_budgets'), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE cost_centers SET active = FALSE WHERE id = ?', [id]);
        res.json({ message: 'Centro de costo desactivado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/budgets', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT b.*, cc.name as cost_center_name 
            FROM budgets b
            JOIN cost_centers cc ON b.cost_center_id = cc.id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/budgets', verifyToken.hasPermission('manage_budgets'), async (req, res) => {
    const { cost_center_id, year, total_amount } = req.body;
    try {
        // Verificar si ya existe un presupuesto para ese centro y año
        const [existing] = await pool.query('SELECT id FROM budgets WHERE cost_center_id = ? AND year = ?', [cost_center_id, year]);
        if (existing.length > 0) {
            return res.status(400).json({ message: `Ya existe un presupuesto asignado para el Centro de Costo #${cost_center_id} en el año ${year}.` });
        }

        await pool.query(
            'INSERT INTO budgets (cost_center_id, year, total_amount) VALUES (?, ?, ?)',
            [cost_center_id, year, total_amount]
        );

        // EXIT READINESS: Audit log
        await auditService.log({
            userId: req.user.id,
            username: req.user.username,
            action: 'CREATE',
            entity: 'budget',
            entityId: String(cost_center_id),
            details: { cost_center_id, year, total_amount },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({ message: 'Presupuesto asignado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/budgets/:id', async (req, res) => {
    const { id } = req.params;
    const { total_amount } = req.body;
    try {
        // Get old value for audit
        const [oldData] = await pool.query('SELECT total_amount, cost_center_id, year FROM budgets WHERE id = ?', [id]);

        await pool.query('UPDATE budgets SET total_amount = ? WHERE id = ?', [total_amount, id]);

        // EXIT READINESS: Audit log
        await auditService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action: 'UPDATE',
            entity: 'budget',
            entityId: String(id),
            oldValues: oldData[0],
            newValues: { total_amount },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Presupuesto actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/budgets/:id', verifyToken.hasPermission('manage_budgets'), async (req, res) => {
    try {
        // Get budget data for audit
        const [budgetData] = await pool.query('SELECT * FROM budgets WHERE id = ?', [req.params.id]);

        await pool.query('DELETE FROM budgets WHERE id = ?', [req.params.id]);

        // EXIT READINESS: Audit log
        await auditService.log({
            userId: req.user.id,
            username: req.user.username,
            action: 'DELETE',
            entity: 'budget',
            entityId: String(req.params.id),
            oldValues: budgetData[0],
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Presupuesto eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// (Ya definidos arriba en la sección unificada de Centros de Costo y Presupuestos)


// =======================
// MATRIZ DE APROBACIÓN
// =======================
router.get('/matrix', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.*, l.name as level_name 
            FROM approval_matrix m
            JOIN approval_levels l ON m.approval_level_id = l.id
            ORDER BY l.rank, m.min_amount
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/matrix', verifyToken.hasPermission('manage_matrix'), async (req, res) => {
    const { department, min_amount, max_amount, approval_level_id, approver_role } = req.body;
    try {
        await pool.query(
            'INSERT INTO approval_matrix (department, min_amount, max_amount, approval_level_id, approver_role) VALUES (?, ?, ?, ?, ?)',
            [department, min_amount, max_amount, approval_level_id, approver_role]
        );
        res.status(201).json({ message: 'Regla de matriz creada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/matrix/:id', verifyToken.hasPermission('manage_matrix'), async (req, res) => {
    const { id } = req.params;
    const { department, min_amount, max_amount, approval_level_id, approver_role, is_active } = req.body;
    try {
        await pool.query(
            'UPDATE approval_matrix SET department = ?, min_amount = ?, max_amount = ?, approval_level_id = ?, approver_role = ?, is_active = ? WHERE id = ?',
            [department, min_amount, max_amount, approval_level_id, approver_role, is_active ?? true, id]
        );
        res.json({ message: 'Regla de matriz actualizada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/matrix/:id', verifyToken.hasPermission('manage_matrix'), async (req, res) => {
    try {
        await pool.query('DELETE FROM approval_matrix WHERE id = ?', [req.params.id]);
        res.json({ message: 'Regla de matriz eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/levels', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM approval_levels ORDER BY rank');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/levels', verifyToken.hasPermission('manage_matrix'), async (req, res) => {
    const { name, rank, description } = req.body;
    try {
        await pool.query('INSERT INTO approval_levels (name, rank, description) VALUES (?, ?, ?)', [name, rank, description]);
        res.status(201).json({ message: 'Nivel creado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/levels/:id', verifyToken.hasPermission('manage_matrix'), async (req, res) => {
    const { id } = req.params;
    const { name, rank, description } = req.body;
    try {
        await pool.query('UPDATE approval_levels SET name = ?, rank = ?, description = ? WHERE id = ?', [name, rank, description, id]);
        res.json({ message: 'Nivel actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/levels/:id', verifyToken.hasPermission('manage_matrix'), async (req, res) => {
    try {
        await pool.query('DELETE FROM approval_levels WHERE id = ?', [req.params.id]);
        res.json({ message: 'Nivel eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =======================
// SUPERVISIÓN GERENCIAL
// =======================

/**
 * Endpoint de Cuellos de Botella (Bottlenecks)
 * Analiza qué solicitudes están tardando más y quién es el responsable hoy.
 */
router.get('/analytics/bottlenecks', async (req, res) => {
    try {
        // Buscamos solicitudes que no estén en estado final (aprobado/rechazado/cancelado/completado)
        const query = `
            SELECT 
                r.id, r.type, r.total, r.status, r.date as created_at,
                r.department,
                TIMESTAMPDIFF(HOUR, r.date, NOW()) as hours_waiting,
                w.name as workflow_name
            FROM requests r
            LEFT JOIN workflows w ON r.workflow_id = w.id
            WHERE r.status NOT IN ('aprobado', 'rechazado', 'cancelado', 'completado')
            AND r.deleted_at IS NULL
            ORDER BY hours_waiting DESC
        `;
        const [rows] = await pool.query(query);

        // Enriquecer con el Aprobador Pendiente actual
        const enrichedRows = await Promise.all(rows.map(async (row) => {
            const currentStep = await workflowService.getCurrentStep(row.id);
            return {
                ...row,
                pending_approver: currentStep ? currentStep.step_name : 'N/A',
                approver_role: currentStep ? currentStep.approver_role : 'N/A'
            };
        }));

        res.json(enrichedRows);
    } catch (error) {
        logger.error('Error in bottlenecks analytics:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint de Decisión Excepcional (Admin Override)
 * Permite a un Admin forzar la aprobación de una solicitud estancada.
 */
router.post('/requests/:id/override', async (req, res) => {
    const { id } = req.params;
    const { reason, target_status } = req.body; // target_status suele ser 'aprobado'
    const user = req.user;

    if (!reason) {
        return res.status(400).json({ message: 'Se requiere una justificación para el override administrativo.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Obtener info de la solicitud
        const [reqData] = await connection.query('SELECT type, total, cost_center_id, status FROM requests WHERE id = ?', [id]);
        if (reqData.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }
        const request = reqData[0];

        // 2. Forzar estado
        const finalStatus = target_status || 'aprobado';
        const internalStatus = 'ADMIN_OVERRIDE'; // Marca especial de excepción
        await connection.query('UPDATE requests SET status = ?, internal_status = ?, current_step_id = NULL WHERE id = ?', [finalStatus, internalStatus, id]);

        // 3. Si es de compra y se forzó aprobación, comprometer fondos
        if (finalStatus === 'aprobado' && request.type === 'Compras' && request.cost_center_id) {
            // Nota: Aquí lo llamamos manual con la conexión si fuera posible, o vía servicio.
            // Por simplicidad del MVP usamos el servicio directamente (pool interno).
            await budgetService.commitFunds(request.cost_center_id, request.total || 0);
        }

        // 4. Auditoría Especial
        await connection.query(
            `INSERT INTO request_history (request_id, action, actor_id, actor_name, comment, created_at) 
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [id, 'ADMIN_OVERRIDE', user.id, user.username, `Override forzado por administrador. Razón: ${reason}`]
        );

        await connection.commit();
        res.json({ message: 'Decisión forzada con éxito. Se ha registrado en la auditoría.', status: finalStatus });
    } catch (error) {
        logger.error('Error in Admin Override:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * Reporte de Historial de Auditoría (Supervisión)
 */
router.get('/audit/history', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT h.*, r.type as request_type, r.requester_name
            FROM request_history h
            JOIN requests r ON h.request_id = r.id
            ORDER BY h.created_at DESC
            LIMIT 100
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
