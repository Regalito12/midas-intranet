const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', verifyToken.hasPermission('manage_payroll'), payrollController.getAllPayrollSlips);
router.get('/employee/:employeeId', verifyToken.hasPermission('view_payroll'), payrollController.getPayrollSlipsByEmployee);
router.get('/:id', verifyToken.hasPermission('view_payroll'), payrollController.getPayrollSlipById);
router.post('/', verifyToken.hasPermission('manage_payroll'), payrollController.createPayrollSlip);
router.delete('/:id', verifyToken.hasPermission('manage_payroll'), payrollController.deletePayrollSlip);

module.exports = router;
