/**
 * Middleware: Filter by Department Access
 * Filtra automáticamente consultas por departamento del usuario
 * Excepciones: admin, alta_gerencia, auditoria, finanzas
 */

const pool = require('../config/db');
const logger = require('../config/logger');

async function filterByDepartmentAccess(req, res, next) {
    try {
        const user = req.user;

        // Roles con acceso global (pueden ver todos los departamentos)
        const globalRoles = ['admin', 'alta_gerencia', 'auditoria', 'finanzas'];

        if (globalRoles.includes(user.role)) {
            // Puede ver todo - no aplicar filtro
            req.departmentFilter = null;
            return next();
        }

        // Obtener departamento del usuario
        const [users] = await pool.query(
            'SELECT department_id FROM users WHERE id = ?',
            [user.id]
        );

        if (users.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (!users[0].department_id) {
            return res.status(403).json({
                success: false,
                message: 'Usuario no tiene departamento asignado. Contacte al administrador.'
            });
        }

        // Inyectar filtro de departamento en el request
        req.departmentFilter = users[0].department_id;

        logger.info(`Department filter applied: User ${user.id} restricted to department ${req.departmentFilter}`);

        next();

    } catch (error) {
        logger.error('Error in filterByDepartmentAccess middleware:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando permisos de departamento'
        });
    }
}

module.exports = filterByDepartmentAccess;
