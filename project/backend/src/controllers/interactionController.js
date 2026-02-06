const pool = require('../config/db');

// Asegurar que las tablas existen (Self-healing)
const ensureTableExists = async () => {
    try {
        // 1. Reacciones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS news_reactions (
                id VARCHAR(255) PRIMARY KEY,
                news_id VARCHAR(255) NOT NULL,
                user_id INT NOT NULL,
                user_name VARCHAR(255),
                reaction_type VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        // 2. Comentarios
        await pool.query(`
            CREATE TABLE IF NOT EXISTS news_comments (
                id VARCHAR(255) PRIMARY KEY,
                news_id VARCHAR(255) NOT NULL,
                user_id INT NOT NULL,
                user_name VARCHAR(255) NOT NULL,
                user_avatar VARCHAR(500),
                comment_text TEXT NOT NULL,
                parent_id VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
    } catch (error) {
        console.error('Error creating interaction tables:', error);
    }
};

ensureTableExists();


// ============ REACCIONES ============

// Agregar o cambiar reacción
exports.addReaction = async (req, res) => {
    const { news_id, user_id, user_name, reaction_type } = req.body;
    const reactionId = `react_${Date.now()}`;
    const createdAt = new Date();

    try {
        // Verificar si ya existe una reacción de este usuario
        const [existing] = await pool.query(
            'SELECT * FROM news_reactions WHERE news_id = ? AND user_id = ?',
            [news_id, user_id]
        );

        if (existing.length > 0) {
            // Actualizar reacción existente
            await pool.query(
                'UPDATE news_reactions SET reaction_type = ? WHERE news_id = ? AND user_id = ?',
                [reaction_type, news_id, user_id]
            );
            res.json({ message: 'Reacción actualizada', reaction_type });
        } else {
            // Crear nueva reacción
            await pool.query(
                'INSERT INTO news_reactions (id, news_id, user_id, user_name, reaction_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                [reactionId, news_id, user_id, user_name, reaction_type, createdAt]
            );
            res.status(201).json({ message: 'Reacción agregada', reaction_type });
        }
    } catch (error) {
        console.error('Error con reacción:', error);
        res.status(500).json({ message: 'Error procesando reacción', error: error.message });
    }
};

// Eliminar reacción
exports.removeReaction = async (req, res) => {
    const { news_id, user_id } = req.body;

    try {
        await pool.query(
            'DELETE FROM news_reactions WHERE news_id = ? AND user_id = ?',
            [news_id, user_id]
        );
        res.json({ message: 'Reacción eliminada' });
    } catch (error) {
        console.error('Error eliminando reacción:', error);
        res.status(500).json({ message: 'Error eliminando reacción', error: error.message });
    }
};

// Obtener reacciones de una noticia
exports.getReactionsByNews = async (req, res) => {
    const { newsId } = req.params;

    try {
        const [reactions] = await pool.query(
            'SELECT * FROM news_reactions WHERE news_id = ? ORDER BY created_at DESC',
            [newsId]
        );

        // Contar por tipo
        const counts = {
            like: 0,
            love: 0,
            haha: 0,
            wow: 0,
            sad: 0,
            angry: 0,
            total: reactions.length
        };

        reactions.forEach(r => {
            if (counts[r.reaction_type] !== undefined) {
                counts[r.reaction_type]++;
            }
        });

        res.json({ reactions, counts });
    } catch (error) {
        console.error('Error obteniendo reacciones:', error);
        res.status(500).json({ message: 'Error obteniendo reacciones', error: error.message });
    }
};

// ============ COMENTARIOS ============

// Agregar comentario
exports.addComment = async (req, res) => {
    const { news_id, user_id, user_name, user_avatar, comment_text, parent_id } = req.body;
    const commentId = `comm_${Date.now()}`;
    const createdAt = new Date();

    try {
        await pool.query(
            'INSERT INTO news_comments (id, news_id, user_id, user_name, user_avatar, comment_text, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [commentId, news_id, user_id, user_name, user_avatar, comment_text, parent_id || null, createdAt]
        );

        res.status(201).json({
            message: 'Comentario agregado',
            comment: {
                id: commentId,
                news_id,
                user_id,
                user_name,
                user_avatar,
                user_avatar,
                comment_text,
                parent_id: parent_id || null,
                created_at: createdAt
            }
        });
    } catch (error) {
        console.error('Error agregando comentario:', error);
        res.status(500).json({ message: 'Error agregando comentario', error: error.message });
    }
};

// Obtener comentarios de una noticia
exports.getCommentsByNews = async (req, res) => {
    const { newsId } = req.params;

    try {
        const [comments] = await pool.query(
            'SELECT * FROM news_comments WHERE news_id = ? ORDER BY created_at ASC',
            [newsId]
        );
        res.json(comments);
    } catch (error) {
        console.error('Error obteniendo comentarios:', error);
        res.status(500).json({ message: 'Error obteniendo comentarios', error: error.message });
    }
};

// Eliminar comentario
exports.deleteComment = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM news_comments WHERE id = ?', [id]);
        res.json({ message: 'Comentario eliminado' });
    } catch (error) {
        console.error('Error eliminando comentario:', error);
        res.status(500).json({ message: 'Error eliminando comentario', error: error.message });
    }
};
