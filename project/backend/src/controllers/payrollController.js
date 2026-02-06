const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que la tabla existe (Self-healing)
const ensureTableExists = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payroll_slips (
                id VARCHAR(255) PRIMARY KEY,
                employee_id VARCHAR(255) NOT NULL,
                employee_name VARCHAR(255) NOT NULL,
                employee_position VARCHAR(100),
                employee_department VARCHAR(100),
                month INT NOT NULL,
                year INT NOT NULL,
                period VARCHAR(50),
                base_salary DECIMAL(15,2) NOT NULL,
                bonuses DECIMAL(15,2) DEFAULT 0,
                overtime DECIMAL(15,2) DEFAULT 0,
                gross_salary DECIMAL(15,2) NOT NULL,
                afp DECIMAL(15,2) DEFAULT 0,
                sfs DECIMAL(15,2) DEFAULT 0,
                isr DECIMAL(15,2) DEFAULT 0,
                other_deductions DECIMAL(15,2) DEFAULT 0,
                total_deductions DECIMAL(15,2) NOT NULL,
                net_salary DECIMAL(15,2) NOT NULL,
                payment_date DATE,
                payment_method VARCHAR(50) DEFAULT 'Transferencia'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
    } catch (error) {
        logger.error('Error creating payroll table:', error);
    }
};

ensureTableExists();


// Obtener todos los volantes de pago
exports.getAllPayrollSlips = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM payroll_slips ORDER BY year DESC, month DESC');
        res.json(rows);
    } catch (error) {
        logger.error('Error buscando volantes:', error);
        res.status(500).json({ message: 'Error buscando volantes', error: error.message });
    }
};

// Obtener volantes por empleado
exports.getPayrollSlipsByEmployee = async (req, res) => {
    const { employeeId } = req.params;
    try {
        let targetId = employeeId;

        // Si el ID parece numérico (User ID), buscar el Employee ID correspondiente
        // Asumimos que los IDs de empleados generados son tipo 'emp_X'
        if (!isNaN(employeeId)) {
            const [emp] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [employeeId]);
            if (emp.length > 0) {
                targetId = emp[0].id;
            }
        }

        const [rows] = await pool.query(
            'SELECT * FROM payroll_slips WHERE employee_id = ? ORDER BY year DESC, month DESC',
            [targetId]
        );
        res.json(rows);
    } catch (error) {
        logger.error('Error buscando volantes del empleado:', error);
        res.status(500).json({ message: 'Error buscando volantes', error: error.message });
    }
};

// Obtener un volante específico
exports.getPayrollSlipById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM payroll_slips WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Volante no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        logger.error('Error buscando volante:', error);
        res.status(500).json({ message: 'Error buscando volante', error: error.message });
    }
};

// Crear un volante de pago (RRHH/Admin)
exports.createPayrollSlip = async (req, res) => {
    const {
        id, employee_id, employee_name, employee_position, employee_department,
        month, year, period, base_salary, bonuses, overtime, gross_salary,
        afp, sfs, isr, other_deductions, total_deductions, net_salary,
        payment_date, payment_method
    } = req.body;

    const { randomUUID } = require('crypto');
    const slipId = id || randomUUID();

    try {
        await pool.query(
            `INSERT INTO payroll_slips 
            (id, employee_id, employee_name, employee_position, employee_department, month, year, period,
             base_salary, bonuses, overtime, gross_salary, afp, sfs, isr, other_deductions, 
             total_deductions, net_salary, payment_date, payment_method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [slipId, employee_id, employee_name, employee_position, employee_department, month, year, period,
                base_salary, bonuses || 0, overtime || 0, gross_salary, afp || 0, sfs || 0, isr || 0,
                other_deductions || 0, total_deductions, net_salary, payment_date, payment_method || 'Transferencia']
        );
        res.status(201).json({ message: 'Volante creado', id: slipId });
    } catch (error) {
        logger.error('Error creando volante:', error);
        res.status(500).json({ message: 'Error creando volante', error: error.message });
    }
};

// Eliminar volante
exports.deletePayrollSlip = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM payroll_slips WHERE id = ?', [id]);
        res.json({ message: 'Volante eliminado' });
    } catch (error) {
        logger.error('Error eliminando volante:', error);
        res.status(500).json({ message: 'Error eliminando volante', error: error.message });
    }
};
