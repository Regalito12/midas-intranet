const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que la tabla existe (Self-healing)
const ensureTableExists = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS news (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                excerpt TEXT DEFAULT NULL,
                category VARCHAR(50) DEFAULT 'general',
                date DATETIME NOT NULL,
                author VARCHAR(255) NOT NULL,
                image VARCHAR(255) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
    } catch (error) {
        logger.error('Error creating news table:', error);
    }
};

ensureTableExists();


// Obtener todas las noticias
exports.getAllNews = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM news ORDER BY date DESC');
        res.json(rows);
    } catch (error) {
        logger.error('Error buscando noticias:', error);
        res.status(500).json({ message: 'Error buscando las noticias', error: error.message });
    }
};

// Crear una noticia
// Crear una noticia
exports.createNews = async (req, res) => {
    const { id, title, content, excerpt, category, author, image } = req.body;

    // Si no mandan ID, deberíamos generarlo, pero por ahora asumimos que el frontend lo manda o usamos timestamp
    const { randomUUID } = require('crypto');
    const newsId = id || randomUUID();
    const date = new Date(); // Fecha actual

    try {
        await pool.query(
            'INSERT INTO news (id, title, content, excerpt, category, date, author, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [newsId, title, content, excerpt || '', category || 'general', date, author || 'Sistema', image]
        );
        res.status(201).json({ message: 'Noticia creada nítida', id: newsId });
    } catch (error) {
        logger.error('Error creando noticia:', error);
        res.status(500).json({ message: 'Error creando la noticia', error: error.message });
    }
};

// Actualizar una noticia
exports.updateNews = async (req, res) => {
    const { id } = req.params;
    const { title, content, excerpt, category, image } = req.body;

    try {
        await pool.query(
            'UPDATE news SET title = ?, content = ?, excerpt = ?, category = ?, image = ? WHERE id = ?',
            [title, content, excerpt, category, image, id]
        );
        res.json({ message: 'Noticia actualizada' });
    } catch (error) {
        logger.error('Error actualizando noticia:', error);
        res.status(500).json({ message: 'Error actualizando la noticia', error: error.message });
    }
};

// Eliminar una noticia
exports.deleteNews = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM news WHERE id = ?', [id]);
        res.json({ message: 'Noticia borrada' });
    } catch (error) {
        logger.error('Error borrando noticia:', error);
        res.status(500).json({ message: 'Error borrando la noticia', error: error.message });
    }
};
