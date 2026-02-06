/**
 * ============================================
 * MIDAS INTRANET - Authentication Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const { validators } = require('../middleware/validationMiddleware');

// Public routes
router.post('/login', validators.login, authController.login);
router.post('/debug-login', authController.debugLogin);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.me);

module.exports = router;
