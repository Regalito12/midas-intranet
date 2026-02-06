const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);
const authorize = verifyToken.authorize;

// Solo administradores pueden ver logs de auditoría
router.get('/logs', authorize('admin'), async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            userId,
            actionType,
            entityType,
            severity,
            limit = 100,
            offset = 0
        } = req.query;

        const logs = await auditService.getLogs({
            startDate,
            endDate,
            userId,
            actionType,
            entityType,
            severity,
            limit,
            offset
        });

        res.json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Error cargando logs de auditoría' });
    }
});

// Estadísticas de auditoría
router.get('/stats', authorize('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const stats = await auditService.getStats({ startDate, endDate });
        res.json(stats);
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({ message: 'Error cargando estadísticas' });
    }
});

module.exports = router;
