const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que la tabla existe (Self-healing)
const ensureTableExists = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                manager_id VARCHAR(50),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);
    } catch (error) {
        logger.error('Error creating departments table:', error);
    }
};

// Llamar a esto al iniciar (o al primer request)
ensureTableExists();

// Obtener todos los departamentos
exports.getAllDepartments = async (req, res) => {
    try {
        // Hacemos un JOIN para traer el nombre del gerente si existe
        const [rows] = await pool.query(`
            SELECT d.*, e.name as manager_name 
            FROM departments d 
            LEFT JOIN employees e ON d.manager_id = e.user_id 
            WHERE d.is_active = 1 
            ORDER BY d.name ASC
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Error buscando departamentos:', error);
        res.status(500).json({ message: 'Error buscando departamentos', error: error.message });
    }
};

// Crear departamento
exports.createDepartment = async (req, res) => {
    const { name, manager_id, description } = req.body;
    const { randomUUID } = require('crypto');
    const id = `dept_${randomUUID()}`;

    try {
        await pool.query(
            'INSERT INTO departments (id, name, manager_id, description, is_active) VALUES (?, ?, ?, ?, 1)',
            [id, name, manager_id || null, description || '']
        );
        res.status(201).json({ message: 'Departamento creado', id });
    } catch (error) {
        logger.error('Error creando departamento:', error);
        res.status(500).json({ message: 'Error creando departamento', error: error.message });
    }
};

// Actualizar departamento
exports.updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { name, manager_id, description } = req.body;

    try {
        await pool.query(
            'UPDATE departments SET name = ?, manager_id = ?, description = ? WHERE id = ?',
            [name, manager_id || null, description, id]
        );
        res.json({ message: 'Departamento actualizado' });
    } catch (error) {
        logger.error('Error actualizando departamento:', error);
        res.status(500).json({ message: 'Error actualizando departamento', error: error.message });
    }
};

// Eliminar (soft delete)
exports.deleteDepartment = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE departments SET is_active = 0 WHERE id = ?', [id]);
        res.json({ message: 'Departamento eliminado' });
    } catch (error) {
        logger.error('Error eliminando departamento:', error);
        res.status(500).json({ message: 'Error eliminando departamento', error: error.message });
    }
};
