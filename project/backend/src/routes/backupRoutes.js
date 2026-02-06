const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);
const authorize = verifyToken.authorize;

// Solo admins pueden gestionar backups
router.get('/', authorize('admin'), backupController.getBackups);
router.post('/create', authorize('admin'), backupController.createBackup);
router.get('/download/:filename', authorize('admin'), backupController.downloadBackup);

module.exports = router;
