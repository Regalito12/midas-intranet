const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que la tabla existe (Self-healing)
const ensureTableExists = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id VARCHAR(255) PRIMARY KEY,
                employee_id VARCHAR(255) NOT NULL,
                employee_name VARCHAR(255) NOT NULL,
                employee_department VARCHAR(100),
                date DATE NOT NULL,
                check_in TIME,
                check_out TIME,
                hours_worked DECIMAL(5,2),
                status VARCHAR(50) DEFAULT 'presente'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
    } catch (error) {
        logger.error('Error creating attendance table', { error: error.message });
    }
};

ensureTableExists();


// Obtener toda la asistencia
exports.getAllAttendance = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM attendance ORDER BY date DESC, check_in DESC');
        res.json(rows);
    } catch (error) {
        logger.error('Error searching attendance', { error: error.message });
        res.status(500).json({ message: 'Error buscando asistencia', error: error.message });
    }
};

// Obtener asistencia por empleado
exports.getAttendanceByEmployee = async (req, res) => {
    const { employeeId } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC',
            [employeeId]
        );
        res.json(rows);
    } catch (error) {
        logger.error('Error searching employee attendance', { error: error.message, employeeId });
        res.status(500).json({ message: 'Error buscando asistencia', error: error.message });
    }
};

// Marcar entrada (Check-in)
exports.checkIn = async (req, res) => {
    const { employee_id, employee_name, employee_department } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    const { randomUUID } = require('crypto');
    const recordId = `att_${employee_id}_${randomUUID()}`;

    try {
        // 1. Validar IP de red local if configured
        const [settings] = await pool.query('SELECT allowed_ip_range FROM system_settings WHERE id = 1');
        const allowedRange = settings[0]?.allowed_ip_range;

        if (allowedRange) {
            const clientIp = req.ip || req.connection.remoteAddress;
            // Basic validation: check if the configured range (e.g., '192.168.1') is a prefix of the client IP
            // or if they are identical.
            const isAllowed = clientIp.includes(allowedRange) || allowedRange === 'any';

            if (!isAllowed) {
                logger.security('Attendance check-in blocked: Unauthorized IP', { clientIp, employee_id });
                return res.status(403).json({
                    message: 'Solo se permite marcar asistencia desde la red local de la empresa.'
                });
            }
        }

        // 2. Verificar si ya marcó entrada hoy
        const [existing] = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
            [employee_id, today]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Ya marcaste entrada hoy' });
        }

        await pool.query(
            `INSERT INTO attendance (id, employee_id, employee_name, employee_department, date, check_in, status)
             VALUES (?, ?, ?, ?, ?, ?, 'presente')`,
            [recordId, employee_id, employee_name, employee_department, today, currentTime]
        );

        res.status(201).json({
            message: 'Entrada registrada correctamente',
            check_in: currentTime,
            date: today
        });
    } catch (error) {
        logger.error('Error in check-in', { error: error.message, employee_id });
        res.status(500).json({ message: 'Error registrando entrada', error: error.message });
    }
};

// Marcar salida (Check-out)
exports.checkOut = async (req, res) => {
    const { employee_id } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    try {
        // Buscar registro de entrada de hoy
        const [records] = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND check_in IS NOT NULL',
            [employee_id, today]
        );

        if (records.length === 0) {
            return res.status(400).json({ message: 'No has marcado entrada hoy' });
        }

        const record = records[0];

        if (record.check_out) {
            return res.status(400).json({ message: 'Ya marcaste salida hoy' });
        }

        // Calcular horas trabajadas
        const checkInTime = new Date(`2000-01-01T${record.check_in}`);
        const checkOutTime = new Date(`2000-01-01T${currentTime}`);
        const hoursWorked = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);

        await pool.query(
            'UPDATE attendance SET check_out = ?, hours_worked = ? WHERE id = ?',
            [currentTime, hoursWorked, record.id]
        );

        res.json({
            message: 'Salida registrada correctamente',
            check_out: currentTime,
            hours_worked: hoursWorked
        });
    } catch (error) {
        logger.error('Error in check-out', { error: error.message, employee_id });
        res.status(500).json({ message: 'Error registrando salida', error: error.message });
    }
};

// Obtener estado de asistencia de hoy
exports.getTodayStatus = async (req, res) => {
    const { employeeId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
        const [records] = await pool.query(
            'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
            [employeeId, today]
        );

        if (records.length === 0) {
            return res.json({
                hasCheckedIn: false,
                hasCheckedOut: false
            });
        }

        const record = records[0];
        res.json({
            hasCheckedIn: !!record.check_in,
            hasCheckedOut: !!record.check_out,
            check_in: record.check_in,
            check_out: record.check_out,
            hours_worked: record.hours_worked
        });
    } catch (error) {
        logger.error('Error getting today status', { error: error.message, employeeId });
        res.status(500).json({ message: 'Error obteniendo estado', error: error.message });
    }
};

// Eliminar registro de asistencia
exports.deleteAttendance = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM attendance WHERE id = ?', [id]);
        res.json({ message: 'Registro eliminado' });
    } catch (error) {
        logger.error('Error deleting attendance record', { error: error.message, id });
        res.status(500).json({ message: 'Error eliminando registro', error: error.message });
    }
};
