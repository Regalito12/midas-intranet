const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const verifyToken = require('../middleware/authMiddleware');


router.use(verifyToken);

// Basic stats accessible to all authenticated users
router.get('/stats', analyticsController.getSystemStats);
router.get('/attendance-chart', analyticsController.getAttendanceChart);
router.get('/tickets-distribution', analyticsController.getTicketsDistribution);

// Advanced analytics only for users with view_analytics permission
router.get('/requests-chart', verifyToken.hasPermission('view_analytics'), analyticsController.getRequestsChart);
router.get('/recent-activity', verifyToken.hasPermission('view_analytics'), analyticsController.getRecentActivity);
router.get('/health', verifyToken.hasPermission('view_analytics'), analyticsController.getSystemHealth);

module.exports = router;
