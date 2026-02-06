const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', verifyToken.hasPermission('view_directory'), employeeController.getAllEmployees);
router.get('/:id', verifyToken.hasPermission('view_directory'), employeeController.getEmployeeById);

module.exports = router;
