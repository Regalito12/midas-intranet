const pool = require('../config/db');
const logger = require('../config/logger');

// Asegurar que la tabla existe (Self-healing)
const ensureTableExists = async () => {
    try {
        // 1. Tickets table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS it_tickets (
                id VARCHAR(255) PRIMARY KEY,
                ticket_number VARCHAR(50) UNIQUE NOT NULL,
                requester_id VARCHAR(255) NOT NULL,
                requester_name VARCHAR(255) NOT NULL,
                requester_department VARCHAR(100),
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(50) DEFAULT 'hardware',
                priority VARCHAR(50) DEFAULT 'media',
                status VARCHAR(50) DEFAULT 'abierto',
                assigned_to_id INT DEFAULT NULL,
                assigned_to_name VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        // Migration: Add columns if they don't exist
        const [columns] = await pool.query('SHOW COLUMNS FROM it_tickets');
        const hasAssignedToId = columns.some(c => c.Field === 'assigned_to_id');
        if (!hasAssignedToId) {
            logger.info('[Soporte] Migrando tabla it_tickets...');
            try {
                await pool.query('ALTER TABLE it_tickets ADD COLUMN assigned_to_id INT AFTER status');
                await pool.query('ALTER TABLE it_tickets ADD COLUMN assigned_to_name VARCHAR(255) AFTER assigned_to_id');
            } catch (err) {
                logger.warn('Columnas ya existen o error en alter', { error: err.message });
            }
        }

        // 2. Ticket Comments table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id VARCHAR(255) NOT NULL,
                author_id VARCHAR(255) NOT NULL,
                author_name VARCHAR(255) NOT NULL,
                author_avatar VARCHAR(255),
                text TEXT NOT NULL,
                is_internal BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES it_tickets(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
    } catch (error) {
        logger.error('Error in IT Support schema initialization', { error: error.message });
    }
};

ensureTableExists();


// Obtener todos los tickets
exports.getAllTickets = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *, 
            CASE 
                WHEN status = 'resuelto' AND resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
                ELSE NULL 
            END as resolution_time_hours
            FROM it_tickets 
            ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Error searching tickets', { error: error.message });
        res.status(500).json({ message: 'Error buscando tickets', error: error.message });
    }
};

// Obtener tickets por usuario
exports.getTicketsByUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT *, 
            CASE 
                WHEN status = 'resuelto' AND resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
                ELSE NULL 
            END as resolution_time_hours
            FROM it_tickets 
            WHERE requester_id = ? 
            ORDER BY created_at DESC
        `, [userId]);
        res.json(rows);
    } catch (error) {
        logger.error('Error searching user tickets', { error: error.message, userId });
        res.status(500).json({ message: 'Error buscando tickets', error: error.message });
    }
};

// Obtener un ticket por ID
exports.getTicketById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT *, 
            CASE 
                WHEN status = 'resuelto' AND resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
                ELSE NULL 
            END as resolution_time_hours
            FROM it_tickets 
            WHERE id = ?
        `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Ticket no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        logger.error('Error searching ticket', { error: error.message, id });
        res.status(500).json({ message: 'Error buscando ticket', error: error.message });
    }
};

// Crear un ticket
exports.createTicket = async (req, res) => {
    const {
        requester_id, requester_name, requester_department,
        title, description, category, priority
    } = req.body;

    const { randomUUID } = require('crypto');
    const ticketId = `tick_${randomUUID()}`;
    const ticketNumber = `TK-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const createdAt = new Date();

    try {
        await pool.query(
            `INSERT INTO it_tickets 
            (id, ticket_number, requester_id, requester_name, requester_department, 
             title, description, category, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'abierto', ?)`,
            [ticketId, ticketNumber, requester_id, requester_name, requester_department,
                title, description, category || 'hardware', priority || 'media', createdAt]
        );

        res.status(201).json({
            message: 'Ticket creado exitosamente',
            id: ticketId,
            ticket_number: ticketNumber
        });
    } catch (error) {
        logger.error('Error creating ticket', { error: error.message, requester_id });
        res.status(500).json({ message: 'Error creando ticket', error: error.message });
    }
};

// Actualizar estado del ticket
exports.updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status, assigned_to_id, assigned_to_name } = req.body;
    const updatedAt = new Date();
    const resolvedAt = status === 'resuelto' ? updatedAt : null;

    try {
        let query = 'UPDATE it_tickets SET status = ?, updated_at = ?';
        let params = [status, updatedAt];

        if (assigned_to_id !== undefined) {
            query += ', assigned_to_id = ?, assigned_to_name = ?';
            params.push(assigned_to_id, assigned_to_name);
        }

        if (resolvedAt) {
            query += ', resolved_at = ?';
            params.push(resolvedAt);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);

        // Notificar al usuario si el estado cambió
        if (status) {
            const [ticketRows] = await pool.query('SELECT requester_id, ticket_number, title FROM it_tickets WHERE id = ?', [id]);
            if (ticketRows.length > 0) {
                const ticket = ticketRows[0];
                const notificationController = require('./notificationController');

                let title = 'Actualización de Ticket';
                let message = `Tu ticket ${ticket.ticket_number} ha sido actualizado a: ${status.replace('_', ' ')}`;

                if (status === 'resuelto') {
                    title = `Ticket Resuelto #${ticket.ticket_number} ✅`;
                    message = `Tu ticket "${ticket.title}" ha sido marcado como resuelto.`;
                } else if (status === 'en_progreso') {
                    title = `Ticket en Proceso #${ticket.ticket_number} 👨‍💻`;
                    message = `Un técnico ha comenzado a trabajar en tu ticket "${ticket.title}".`;
                }

                await notificationController.createNotification(
                    ticket.requester_id,
                    'ticket_update',
                    title,
                    message,
                    id
                );
            }
        }
        res.json({ message: 'Ticket actualizado' });
    } catch (error) {
        logger.error('Error updating ticket', { error: error.message, id });
        res.status(500).json({ message: 'Error actualizando ticket', error: error.message });
    }
};

// Comentarios de los tickets
exports.getTicketComments = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC',
            [id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo comentarios' });
    }
};

exports.addComment = async (req, res) => {
    const { id } = req.params;
    const { author_id, author_name, author_avatar, text, is_internal } = req.body;
    try {
        await pool.query(
            'INSERT INTO ticket_comments (ticket_id, author_id, author_name, author_avatar, text, is_internal) VALUES (?, ?, ?, ?, ?, ?)',
            [id, author_id, author_name, author_avatar, text, is_internal || false]
        );

        // Notificar a la otra parte
        const [ticket] = await pool.query('SELECT requester_id, assigned_to_id, ticket_number FROM it_tickets WHERE id = ?', [id]);
        if (ticket.length > 0) {
            const notificationController = require('./notificationController');
            const targetId = author_id == ticket[0].requester_id ? ticket[0].assigned_to_id : ticket[0].requester_id;

            if (targetId) {
                await notificationController.createNotification(
                    targetId,
                    'ticket_comment',
                    `Nuevo mensaje en Ticket #${ticket[0].ticket_number}`,
                    `${author_name} dice: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
                    id
                );
            }
        }

        res.status(201).json({ message: 'Comentario agregado' });
    } catch (error) {
        logger.error('Error adding comment', { error: error.message, id });
        res.status(500).json({ message: 'Error agregando comentario' });
    }
};

// Eliminar ticket
exports.deleteTicket = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM it_tickets WHERE id = ?', [id]);
        res.json({ message: 'Ticket eliminado' });
    } catch (error) {
        logger.error('Error deleting ticket', { error: error.message, id });
        res.status(500).json({ message: 'Error eliminando ticket', error: error.message });
    }
};
