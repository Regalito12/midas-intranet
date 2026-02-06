const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);
const authorize = verifyToken.authorize;

// Obtener cuellos de botella (solicitudes estancadas)
router.get('/bottlenecks', authorize('admin'), async (req, res) => {
    try {
        // Consultar purchase_requests que llevan más de 48h sin aprobación final
        const [rows] = await pool.query(`
            SELECT 
                pr.id,
                'Compra' as type,
                pr.total_estimated as total,
                pr.status,
                pr.created_at,
                TIMESTAMPDIFF(HOUR, pr.created_at, NOW()) as hours_waiting,
                c.name as department,
                'Solicitud de Compra' as workflow_name,
                COALESCE(u.name, 'Asignando...') as pending_approver,
                'Aprobador' as approver_role
            FROM purchase_requests pr
            LEFT JOIN companies c ON pr.company_id = c.id
            LEFT JOIN users u ON pr.user_id = u.id
            WHERE pr.status NOT IN ('APROBADO', 'RECHAZADO', 'CANCELADO')
            AND TIMESTAMPDIFF(HOUR, pr.created_at, NOW()) > 24
            ORDER BY hours_waiting DESC
            LIMIT 50
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching bottlenecks:', error);
        res.status(500).json({ message: 'Error cargando cuellos de botella', error: error.message });
    }
});

// Obtener historial de auditoría de requests (Consolidado de audit_logs)
router.get('/audit-history', authorize('admin'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                id,
                entity_id as request_id,
                action as action,
                username as actor_name,
                details as comment,
                created_at as created_at,
                entity as request_type,
                username as requester_name
            FROM audit_logs
            WHERE entity IN ('purchase_request', 'request', 'purchase_order')
            ORDER BY created_at DESC
            LIMIT 100
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching audit history:', error);
        res.status(500).json({ message: 'Error cargando historial de auditoría', error: error.message });
    }
});

// Force override (aprobar solicitudes estancadas)
router.post('/force-override/:id', authorize('admin'), async (req, res) => {
    const { id } = req.params;
    const { status, reason, entity_type } = req.body;
    const userId = req.user.id;

    try {
        if (entity_type === 'purchase_request' || entity_type === 'Compra') {
            const PurchaseRequestService = require('../services/PurchaseRequestService');
            await PurchaseRequestService.forceOverride(id, userId, status, reason);
            return res.json({ message: 'Salto administrativo completado con éxito' });
        }

        // Fallback for legacy requests table if still in use
        await pool.query(
            'UPDATE requests SET status = ?, override_reason = ? WHERE id = ?',
            [status, reason, id]
        );

        res.json({ success: true, message: 'Override exitoso' });
    } catch (error) {
        console.error('Error in force override:', error);
        res.status(500).json({ message: 'Error aplicando override', error: error.message });
    }
});

module.exports = router;
