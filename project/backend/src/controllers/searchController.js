const pool = require('../config/db');
const logger = require('../config/logger');

exports.search = async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) {
        return res.json([]);
    }

    try {
        const searchTerm = `%${q}%`;
        const results = [];

        // 1. Search Employees (Directory)
        const [employees] = await pool.query(`
            SELECT id, name, position, department, avatar, 'employee' as type 
            FROM employees 
            WHERE (name LIKE ? OR position LIKE ? OR department LIKE ?) 
            LIMIT 5
        `, [searchTerm, searchTerm, searchTerm]);

        employees.forEach(e => results.push({
            id: e.id,
            title: e.name,
            subtitle: `${e.position || 'Empleado'} • ${e.department || 'General'}`,
            avatar: e.avatar,
            type: 'employee',
            url: 'directory'
        }));

        // 2. Search News
        const [news] = await pool.query(`
            SELECT id, title, category, image, 'news' as type 
            FROM news 
            WHERE (title LIKE ? OR content LIKE ?) 
            LIMIT 5
        `, [searchTerm, searchTerm]);

        news.forEach(n => results.push({
            id: n.id,
            title: n.title,
            subtitle: `Noticia • ${n.category || 'General'}`,
            avatar: n.image,
            type: 'news',
            url: 'news'
        }));

        // 3. Search Policies
        try {
            const [policies] = await pool.query(`
                SELECT id, title, category, 'policy' as type 
                FROM policies 
                WHERE (title LIKE ? OR category LIKE ?) 
                LIMIT 5
            `, [searchTerm, searchTerm]);

            policies.forEach(p => results.push({
                id: p.id,
                title: p.title,
                subtitle: `Documento • ${p.category || 'Política'}`,
                avatar: null,
                type: 'policy',
                url: 'policies'
            }));
        } catch (err) {
            // Table might not exist yet
        }

        res.json(results.slice(0, 15));

    } catch (error) {
        logger.error('Search error', { error: error.message, query: q });
        res.status(500).json({ message: 'Error en la búsqueda' });
    }
};
