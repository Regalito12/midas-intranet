const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', departmentController.getAllDepartments);
router.post('/', verifyToken.hasPermission('admin_users'), departmentController.createDepartment);
router.put('/:id', verifyToken.hasPermission('admin_users'), departmentController.updateDepartment);
router.delete('/:id', verifyToken.hasPermission('admin_users'), departmentController.deleteDepartment);

module.exports = router;
