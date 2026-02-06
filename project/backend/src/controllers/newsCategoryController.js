const pool = require('../config/db');
const { randomUUID } = require('crypto');

exports.getAllCategories = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM news_categories ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error buscando categorías', error: error.message });
    }
};

exports.createCategory = async (req, res) => {
    const { name, color } = req.body;
    const id = `cat_${randomUUID()}`;
    try {
        await pool.query('INSERT INTO news_categories (id, name, color) VALUES (?, ?, ?)', [id, name, color || '#00B74F']);
        res.status(201).json({ message: 'Categoría creada', id });
    } catch (error) {
        res.status(500).json({ message: 'Error creando categoría', error: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        // Warning: In a real system we should check if news use this category
        await pool.query('DELETE FROM news_categories WHERE id = ?', [id]);
        res.json({ message: 'Categoría eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando categoría', error: error.message });
    }
};
