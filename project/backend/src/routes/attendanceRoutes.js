const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', verifyToken.hasPermission('view_attendance'), attendanceController.getAllAttendance);
router.get('/employee/:employeeId', verifyToken.hasPermission('view_attendance'), attendanceController.getAttendanceByEmployee);
router.get('/today/:employeeId', verifyToken.hasPermission('view_attendance'), attendanceController.getTodayStatus);
router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.delete('/:id', verifyToken.hasPermission('manage_attendance'), attendanceController.deleteAttendance);

module.exports = router;
