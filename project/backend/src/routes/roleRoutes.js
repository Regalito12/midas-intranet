const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = verifyToken;

// Role management
router.get('/', verifyToken, verifyToken.hasPermission('admin_roles'), roleController.getAllRoles);
router.post('/', verifyToken, verifyToken.hasPermission('admin_roles'), roleController.createRole);
router.put('/:id', verifyToken, verifyToken.hasPermission('admin_roles'), roleController.updateRole);
router.delete('/:id', verifyToken, verifyToken.hasPermission('admin_roles'), roleController.deleteRole);

// EXIT READINESS: Custom permission management for 100% admin autonomy
router.get('/permissions', verifyToken, verifyToken.hasPermission('admin_roles'), roleController.getPermissions);
router.post('/permissions', verifyToken, verifyToken.hasPermission('admin_roles'), roleController.createPermission);
router.put('/permissions/:id', verifyToken, verifyToken.hasPermission('admin_roles'), roleController.updatePermission);
router.delete('/permissions/:id', verifyToken, verifyToken.hasPermission('admin_roles'), roleController.deletePermission);

module.exports = router;
