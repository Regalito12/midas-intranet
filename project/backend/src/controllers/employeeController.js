const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que la tabla existe (Self-healing)
const ensureTableExists = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id VARCHAR(255) PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                department VARCHAR(100),
                position VARCHAR(100),
                phone VARCHAR(50),
                avatar VARCHAR(500),
                status VARCHAR(50) DEFAULT 'activo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL DEFAULT NULL,
                UNIQUE(user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
    } catch (error) {
        logger.error('Error creating employees table:', error);
    }
};

ensureTableExists();


// Obtener todos los empleados
exports.getAllEmployees = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM employees ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        logger.error('Error buscando empleados:', error);
        res.status(500).json({ message: 'Error buscando empleados', error: error.message });
    }
};

// Obtener un empleado por ID
exports.getEmployeeById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        logger.error('Error buscando empleado:', error);
        res.status(500).json({ message: 'Error buscando empleado', error: error.message });
    }
};
