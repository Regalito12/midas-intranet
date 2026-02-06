const express = require('express');
const router = express.Router();
const budgetService = require('../services/budgetService');
const verifyToken = require('../middleware/authMiddleware');
const logger = require('../config/logger');

router.use(verifyToken);

// Get budget dashboard for supervision
router.get('/dashboard', async (req, res) => {
    try {
        const dashboard = await budgetService.getBudgetDashboard();
        res.json(dashboard);
    } catch (error) {
        logger.error('Error fetching budget dashboard:', error);
        res.status(500).json({ message: 'Error cargando dashboard de presupuesto' });
    }
});

module.exports = router;
