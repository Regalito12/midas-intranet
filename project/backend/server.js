/**
 * ============================================
 * MIDAS INTRANET - Enterprise Backend Server
 * ============================================
 */

require('dotenv').config();
const { validateEnv, config } = require('./src/config/env');
validateEnv();

const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./src/config/logger');
const securityMiddleware = require('./src/middleware/securityMiddleware');
const corsMiddleware = require('./src/middleware/corsMiddleware');
const auditMiddleware = require('./src/middleware/auditMiddleware');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const newsRoutes = require('./src/routes/newsRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const requestRoutes = require('./src/routes/requestRoutes');
const payrollRoutes = require('./src/routes/payrollRoutes');
const newsCategoryRoutes = require('./src/routes/newsCategoryRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');
const policyRoutes = require('./src/routes/policyRoutes');
const interactionRoutes = require('./src/routes/interactionRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const userRoutes = require('./src/routes/userRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');
const configRoutes = require('./src/routes/configRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const searchRoutes = require('./src/routes/searchRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const backupRoutes = require('./src/routes/backupRoutes');
const eventsRoutes = require('./src/routes/eventsRoutes');
const backofficeRoutes = require('./src/routes/backofficeRoutes');
const purchaseRequestRoutes = require('./src/routes/purchaseRequests');
const companyRoutes = require('./src/routes/companies');
const costCenterRoutes = require('./src/routes/costCenters');
const purchaseOrderRoutes = require('./src/routes/purchaseOrders');
const auditRoutes = require('./src/routes/auditRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const supervisionRoutes = require('./src/routes/supervisionRoutes');
const projectPlanningRoutes = require('./src/routes/projectPlanningRoutes');

const app = express();

if (config.isProduction) {
    app.set('trust proxy', 1);
}

securityMiddleware(app);
app.use(corsMiddleware());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(auditMiddleware);

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(`${req.method} ${req.originalUrl}`, {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip
        });
    });
    next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), environment: config.nodeEnv });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/config', configRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/backoffice', backofficeRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/cost-centers', costCenterRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/supervision', supervisionRoutes);
app.use('/api/budget/projects', projectPlanningRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`🚀 MIDAS Intranet Backend started on port ${config.port}`);
    if (!config.isProduction) {
        console.log(`🔗 API: http://localhost:${config.port}/api`);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

module.exports = app;