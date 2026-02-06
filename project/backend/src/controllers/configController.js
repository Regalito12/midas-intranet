const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que tabla de config existe
const ensureConfigTableExists = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id INT PRIMARY KEY DEFAULT 1,
                company_name VARCHAR(100) DEFAULT 'MIDAS Intranet',
                company_logo VARCHAR(500) DEFAULT '',
                primary_color VARCHAR(20) DEFAULT '#00B74F',
                secondary_color VARCHAR(20) DEFAULT '#0F172A',
                allowed_ip_range VARCHAR(255) DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Insertar registro default si no existe
        const [rows] = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        if (rows.length === 0) {
            await pool.query(`
                INSERT INTO system_settings (id, company_name, company_logo, primary_color, secondary_color)
                VALUES (1, 'MIDAS Intranet', '', '#00B74F', '#0F172A')
            `);
        }
    } catch (error) {
        logger.error('Error creating settings table:', error);
    }
};

ensureConfigTableExists();

// Obtener configuración
exports.getConfig = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        res.json(rows[0]);
    } catch (error) {
        logger.error('Error buscando config:', error);
        res.status(500).json({ message: 'Error cargando configuración' });
    }
};

// Actualizar configuración
exports.updateConfig = async (req, res) => {
    const { company_name, company_logo, primary_color, secondary_color, allowed_ip_range } = req.body;

    try {
        await pool.query(`
            UPDATE system_settings 
            SET company_name = ?, company_logo = ?, primary_color = ?, secondary_color = ?, allowed_ip_range = ?
            WHERE id = 1
        `, [company_name, company_logo, primary_color, secondary_color, allowed_ip_range]);

        res.json({ message: 'Configuración actualizada' });
    } catch (error) {
        logger.error('Error actualizando config:', error);
        res.status(500).json({ message: 'Error guardando configuración' });
    }
};
