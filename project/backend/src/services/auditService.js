const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Servicio de Auditoría Empresarial (Alineado con DB Real)
 */
const auditService = {
    /**
     * Registrar una acción en el log de auditoría
     */
    async logAction({
        userId,
        userName,
        userIp = null,
        userAgent = null,
        actionType,
        entityType,
        entityId = null,
        oldValue = null,
        newValue = null,
        description = ''
    }) {
        try {
            const auditId = uuidv4();

            // Combinar old/new/description en el campo 'details'
            const details = JSON.stringify({
                old: oldValue,
                new: newValue,
                comment: description
            });

            await pool.query(
                `INSERT INTO audit_logs 
                (id, user_id, username, action, entity, entity_id, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    auditId, userId, userName || 'Sistema',
                    actionType, entityType, entityId,
                    details, userIp, userAgent
                ]
            );

            return auditId;
        } catch (error) {
            console.error('Error logging audit action:', error);
        }
    },

    /**
     * Alias log para compatibilidad con otros servicios
     */
    async log(data, connection = null) {
        const p = connection || pool;
        const auditId = uuidv4();
        try {
            const {
                userId, user_id, username, user_name,
                action, action_type, actionType,
                entity, entity_type, entityType,
                entityId, entity_id,
                oldValue, old_values,
                newValue, new_values,
                description, details: detailsParam
            } = data;

            const uid = userId || user_id;
            const uname = username || user_name || 'Sistema';
            const act = action || action_type || actionType;
            const ent = entity || entity_type || entityType;
            const eid = entityId || entity_id;

            const details = detailsParam || JSON.stringify({
                old: oldValue || old_values,
                new: newValue || new_values,
                comment: description
            });

            await p.query(
                `INSERT INTO audit_logs 
                (id, user_id, username, action, entity, entity_id, details)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [auditId, uid, uname, act, ent, eid, details]
            );
            return auditId;
        } catch (error) {
            console.error('Error in audit log alias:', error);
        }
    },

    /**
     * Obtener logs de auditoría con filtros
     */
    async getLogs({
        startDate = null,
        endDate = null,
        userId = null,
        actionType = null,
        entityType = null,
        limit = 100,
        offset = 0
    }) {
        try {
            let query = `
                SELECT al.*, e.avatar, COALESCE(e.name, al.username) as full_name
                FROM audit_logs al
                LEFT JOIN employees e ON al.user_id = e.user_id
                WHERE 1=1
            `;
            const params = [];

            if (startDate) {
                query += ' AND al.created_at >= ?';
                params.push(startDate);
            }
            if (endDate) {
                query += ' AND al.created_at <= ?';
                params.push(endDate);
            }
            if (userId) {
                query += ' AND al.user_id = ?';
                params.push(userId);
            }
            if (actionType) {
                query += ' AND al.action = ?';
                params.push(actionType);
            }
            if (entityType) {
                query += ' AND al.entity = ?';
                params.push(entityType);
            }

            query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [logs] = await pool.query(query, params);
            return logs;
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            throw error;
        }
    },

    /**
     * Obtener estadísticas de auditoría
     */
    async getStats({ startDate = null, endDate = null }) {
        try {
            let dateFilter = '';
            const params = [];

            if (startDate && endDate) {
                dateFilter = 'WHERE created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }

            const [stats] = await pool.query(`
                SELECT 
                    COUNT(*) as total_actions,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(CASE WHEN action = 'APPROVE' THEN 1 END) as approvals,
                    COUNT(CASE WHEN action = 'REJECT' THEN 1 END) as rejections
                FROM audit_logs
                ${dateFilter}
            `, params);

            const [topUsers] = await pool.query(`
                SELECT username as user_name, COUNT(*) as action_count
                FROM audit_logs
                ${dateFilter}
                GROUP BY user_id, username
                ORDER BY action_count DESC
                LIMIT 10
            `, params);

            const [actionDistribution] = await pool.query(`
                SELECT action as action_type, COUNT(*) as count
                FROM audit_logs
                ${dateFilter}
                GROUP BY action
                ORDER BY count DESC
            `, params);

            return {
                summary: {
                    ...stats[0],
                    critical_count: 0,  // Placeholder: audit_logs doesn't have severity yet
                    warning_count: 0     // Placeholder: audit_logs doesn't have severity yet
                },
                topUsers,
                actionDistribution
            };
        } catch (error) {
            console.error('Error fetching audit stats:', error);
            throw error;
        }
    }
};

module.exports = auditService;
