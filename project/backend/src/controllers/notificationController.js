const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que la tabla existe
const ensureNotificationsTableExists = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                related_id VARCHAR(100) DEFAULT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (error) {
        logger.error('Error creating notifications table:', error);
    }
};

ensureNotificationsTableExists();


// Obtener notificaciones del usuario
exports.getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json(rows);
    } catch (error) {
        logger.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error obteniendo notificaciones' });
    }
};

// Marcar una notificación como leída
exports.markAsRead = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        res.json({ message: 'Notificación marcada como leída' });
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error actualizando notificación' });
    }
};

// Marcar todas como leídas
exports.markAllAsRead = async (req, res) => {
    const userId = req.user.id;
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [userId]
        );
        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        logger.error('Error marking all as read:', error);
        res.status(500).json({ message: 'Error actualizando notificaciones' });
    }
};

// Función interna para crear notificaciones
exports.createNotification = async (userId, type, title, message, relatedId = null) => {
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?)',
            [userId, type, title, message, relatedId]
        );
        return true;
    } catch (error) {
        logger.error('Error creating notification:', error);
        return false;
    }
};
