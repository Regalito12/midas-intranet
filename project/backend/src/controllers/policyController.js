const pool = require('../config/db');

// Asegurar que la tabla existe (Self-healing)
const ensureTableExists = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS policies (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100) DEFAULT 'politica',
                version VARCHAR(20) DEFAULT '1.0',
                file_url VARCHAR(500) NOT NULL,
                file_type VARCHAR(50) DEFAULT 'pdf',
                file_size INT DEFAULT 0,
                uploaded_by INT,
                uploaded_by_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
    } catch (error) {
        console.error('Error creating policies table:', error);
    }
};

ensureTableExists();


// Obtener todas las políticas activas
exports.getAllPolicies = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM policies WHERE is_active = 1 ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error buscando políticas:', error);
        res.status(500).json({ message: 'Error buscando políticas', error: error.message });
    }
};

// Obtener políticas por categoría
exports.getPoliciesByCategory = async (req, res) => {
    const { category } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM policies WHERE category = ? AND is_active = 1 ORDER BY created_at DESC',
            [category]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error buscando políticas por categoría:', error);
        res.status(500).json({ message: 'Error buscando políticas', error: error.message });
    }
};

// Obtener una política por ID
exports.getPolicyById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM policies WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Política no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error buscando política:', error);
        res.status(500).json({ message: 'Error buscando política', error: error.message });
    }
};

// Crear una política (Admin/RRHH)
exports.createPolicy = async (req, res) => {
    const {
        title, description, category, version, file_url, file_type, file_size,
        uploaded_by, uploaded_by_name
    } = req.body;

    const { randomUUID } = require('crypto');
    const policyId = `pol_${randomUUID()}`;
    const createdAt = new Date();

    try {
        await pool.query(
            `INSERT INTO policies 
            (id, title, description, category, version, file_url, file_type, file_size,
             uploaded_by, uploaded_by_name, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [policyId, title, description, category || 'politica', version || '1.0',
                file_url, file_type || 'pdf', file_size || 0, uploaded_by, uploaded_by_name, createdAt]
        );

        res.status(201).json({
            message: 'Política creada exitosamente',
            id: policyId
        });
    } catch (error) {
        console.error('Error creando política:', error);
        res.status(500).json({ message: 'Error creando política', error: error.message });
    }
};

// Actualizar una política
exports.updatePolicy = async (req, res) => {
    const { id } = req.params;
    const { title, description, version, file_url } = req.body;
    const updatedAt = new Date();

    try {
        await pool.query(
            `UPDATE policies SET title = ?, description = ?, version = ?, file_url = ?, updated_at = ?
             WHERE id = ?`,
            [title, description, version, file_url, updatedAt, id]
        );
        res.json({ message: 'Política actualizada' });
    } catch (error) {
        console.error('Error actualizando política:', error);
        res.status(500).json({ message: 'Error actualizando política', error: error.message });
    }
};

// Desactivar una política (soft delete)
exports.deletePolicy = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE policies SET is_active = 0 WHERE id = ?', [id]);
        res.json({ message: 'Política desactivada' });
    } catch (error) {
        console.error('Error desactivando política:', error);
        res.status(500).json({ message: 'Error desactivando política', error: error.message });
    }
};

// Buscar políticas
exports.searchPolicies = async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ message: 'Parámetro de búsqueda requerido' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT * FROM policies 
             WHERE is_active = 1 AND (title LIKE ? OR description LIKE ?)
             ORDER BY created_at DESC`,
            [`%${query}%`, `%${query}%`]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error buscando políticas:', error);
        res.status(500).json({ message: 'Error en búsqueda', error: error.message });
    }
};
