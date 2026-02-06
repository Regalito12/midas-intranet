const pool = require('../config/db');
const logger = require('../config/logger');

/**
 * Controller for managing dynamic Roles and Permissions (RBAC)
 */

// Self-healing database initialization for roles
const ensureRoleTablesExist = async () => {
    try {
        // 1. Roles table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description VARCHAR(255),
                is_system BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        // 2. Permissions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                module VARCHAR(50) NOT NULL,
                description VARCHAR(255)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        // 3. Role-Permissions Junction table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INT NOT NULL,
                permission_id INT NOT NULL,
                PRIMARY KEY (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);

        // 4. Seed initial permissions if empty
        const [perms] = await pool.query('SELECT COUNT(*) as count FROM permissions');
        if (perms[0].count === 0) {
            const initialPermissions = [
                ['view_news', 'Ver Noticias', 'news', 'Ver noticias y avisos'],
                ['manage_news', 'Gestionar Noticias', 'news', 'Crear, editar y borrar noticias'],
                ['create_request', 'Crear Solicitudes', 'requests', 'Crear nuevas solicitudes'],
                ['view_own_requests', 'Ver Propias Solicitudes', 'requests', 'Ver el historial de solicitudes propias'],
                ['approve_requests', 'Aprobar Solicitudes', 'requests', 'Poder aprobar solicitudes en flujo'],
                ['view_payroll', 'Ver Propia Nómina', 'payroll', 'Ver volantes de pago propios'],
                ['manage_payroll', 'Gestionar Nóminas', 'payroll', 'Subir y gestionar volantes de pago'],
                ['view_directory', 'Ver Directorio', 'directory', 'Acceso al directorio de empleados'],
                ['view_attendance', 'Ver Asistencia', 'attendance', 'Ver registros de asistencia'],
                ['manage_attendance', 'Gestionar Asistencia', 'attendance', 'Editar o validar registros de asistencia'],
                ['view_helpdesk', 'Ver Helpdesk', 'helpdesk', 'Acceso a la mesa de ayuda'],
                ['manage_tickets', 'Gestionar Tickets IT', 'helpdesk', 'Atender y cerrar tickets de soporte'],
                ['view_policies', 'Ver Políticas', 'policies', 'Acceso a normativas y políticas'],
                ['manage_policies', 'Gestionar Políticas', 'policies', 'Subir y actualizar políticas'],
                ['view_analytics', 'Ver Analytics', 'analytics', 'Acceso a panel de métricas'],
                ['admin_users', 'Gestionar Usuarios', 'admin', 'CRUD completo de usuarios'],
                ['admin_roles', 'Gestionar Roles', 'admin', 'Crear y asignar permisos dinámicos'],
                ['manage_matrix', 'Gestionar Matriz de Aprobación', 'requests', 'Configurar reglas de aprobación y niveles'],
                ['view_budgets', 'Ver Presupuestos', 'finance', 'Ver estado de presupuestos y saldos'],
                ['manage_budgets', 'Gestionar Presupuestos', 'finance', 'Configurar presupuestos y centros de costo']
            ];

            await pool.query('INSERT INTO permissions (code, name, module, description) VALUES ?', [initialPermissions]);
            logger.audit('[RBAC] Initial permissions seeded');
        }

        // 5. Seed initial roles if empty
        const [roles] = await pool.query('SELECT COUNT(*) as count FROM roles');
        if (roles[0].count === 0) {
            await pool.query(`
                INSERT INTO roles (name, description, is_system) VALUES 
                ('admin', 'Administrador Total', true),
                ('rrhh', 'Recursos Humanos', true),
                ('soporte', 'Soporte IT', true),
                ('supervisor', 'Supervisor de Área', true),
                ('manager', 'Gerente de Departamento', true),
                ('vp', 'Vicepresidente / Director', true),
                ('ceo', 'Director General', true),
                ('empleado', 'Empleado General', true)
            `);

            // Assign all permissions to admin
            const [adminRole] = await pool.query('SELECT id FROM roles WHERE name = "admin"');
            const [allPerms] = await pool.query('SELECT id FROM permissions');
            const rolePerms = allPerms.map(p => [adminRole[0].id, p.id]);
            await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [rolePerms]);

            logger.audit('[RBAC] Initial roles and admin permissions seeded');
        }

        // 6. Force sync permissions for system roles (Ensures they always have what they need)
        const [allPermissions] = await pool.query('SELECT id, code FROM permissions');
        logger.info(`[RBAC] System sync: Total permissions in DB: ${allPermissions.length}`);
        const permMap = allPermissions.reduce((acc, p) => ({ ...acc, [p.code]: p.id }), {});

        const roleDefaults = {
            'admin': allPermissions.map(p => p.id),
            'rrhh': [
                'view_news', 'manage_news', 'create_request', 'view_own_requests',
                'view_payroll', 'manage_payroll', 'view_directory', 'view_attendance',
                'manage_attendance', 'view_policies', 'manage_policies'
            ].map(code => permMap[code]).filter(Boolean),
            'soporte': [
                'view_news', 'create_request', 'view_own_requests', 'view_directory',
                'view_helpdesk', 'manage_tickets', 'view_policies'
            ].map(code => permMap[code]).filter(Boolean),
            'empleado': [
                'view_news', 'create_request', 'view_own_requests', 'view_payroll',
                'view_directory', 'view_helpdesk', 'view_policies'
            ].map(code => permMap[code]).filter(Boolean)
        };

        for (const [roleName, permissionIds] of Object.entries(roleDefaults)) {
            const [role] = await pool.query('SELECT id FROM roles WHERE name = ?', [roleName]);
            if (role.length > 0) {
                const roleId = role[0].id;
                // Add permissions that are not already assigned
                if (permissionIds.length > 0) {
                    const [existing] = await pool.query('SELECT permission_id FROM role_permissions WHERE role_id = ?', [roleId]);
                    const existingIds = existing.map(e => e.permission_id);
                    const missingIds = permissionIds.filter(id => !existingIds.includes(id));

                    if (missingIds.length > 0) {
                        const values = missingIds.map(pId => [roleId, pId]);
                        await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
                        logger.audit(`[RBAC] ${missingIds.length} new permissions assigned to role: ${roleName}`);
                    }
                }
            }
        }

    } catch (error) {
        logger.error('Error in RBAC initialization', { error: error.message });
    }
};

ensureRoleTablesExist();

exports.getAllRoles = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT r.*, 
            (SELECT GROUP_CONCAT(p.code) 
             FROM role_permissions rp 
             JOIN permissions p ON rp.permission_id = p.id 
             WHERE rp.role_id = r.id) as permissions
            FROM roles r
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo roles' });
    }
};

exports.getPermissions = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM permissions ORDER BY module ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo permisos' });
    }
};

exports.createRole = async (req, res) => {
    const { name, description, permissions } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO roles (name, description) VALUES (?, ?)',
            [name, description]
        );
        const roleId = result.insertId;

        if (permissions && permissions.length > 0) {
            const [permRows] = await pool.query('SELECT id FROM permissions WHERE code IN (?)', [permissions]);
            const rolePerms = permRows.map(p => [roleId, p.id]);
            await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [rolePerms]);
        }

        res.status(201).json({ id: roleId, message: 'Rol creado exitosamente' });
    } catch (error) {
        res.status(400).json({ message: 'Error creando rol (posible duplicado)' });
    }
};

exports.updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    try {
        const [role] = await pool.query('SELECT id, is_system FROM roles WHERE id = ?', [id]);
        if (role.length === 0) return res.status(404).json({ message: 'Rol no encontrado' });

        // No permitir cambiar nombre de roles de sistema para evitar romper lógica dura si existe
        if (role[0].is_system) {
            await pool.query('UPDATE roles SET description = ? WHERE id = ?', [description, id]);
        } else {
            await pool.query('UPDATE roles SET name = ?, description = ? WHERE id = ?', [name, description, id]);
        }

        // Update permissions
        await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
        if (permissions && permissions.length > 0) {
            const [permRows] = await pool.query('SELECT id FROM permissions WHERE code IN (?)', [permissions]);
            if (permRows.length > 0) {
                const rolePerms = permRows.map(p => [id, p.id]);
                await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [rolePerms]);
            }
        }

        res.json({ message: 'Rol actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando rol' });
    }
};

exports.deleteRole = async (req, res) => {
    const { id } = req.params;
    try {
        const [role] = await pool.query('SELECT is_system FROM roles WHERE id = ?', [id]);
        if (role[0].is_system) return res.status(400).json({ message: 'No se pueden eliminar roles de sistema' });

        await pool.query('DELETE FROM roles WHERE id = ?', [id]);
        res.json({ message: 'Rol eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando rol' });
    }
};

/**
 * EXIT READINESS: Custom Permission Management
 * Allow admin to create new permissions from UI without code changes
 */
exports.createPermission = async (req, res) => {
    const { code, name, module, description } = req.body;

    // Validate permission code format: module.action or module.action.scope
    const codeRegex = /^[a-z_]+\.[a-z_]+(\.[a-z_]+)?$/;
    if (!codeRegex.test(code)) {
        return res.status(400).json({
            message: 'Formato de código inválido. Use: modulo.accion o modulo.accion.alcance (minúsculas, guiones bajos)'
        });
    }

    try {
        await pool.query(
            'INSERT INTO permissions (code, name, module, description) VALUES (?, ?, ?, ?)',
            [code, name, module, description || '']
        );

        // Audit log
        const auditService = require('../services/auditService');
        await auditService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action: 'CREATE',
            entity: 'permission',
            entityId: code,
            details: { code, name, module },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        logger.audit(`[RBAC] New permission created: ${code}`, { userId: req.user?.id });

        res.status(201).json({ message: 'Permiso creado exitosamente', code });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El código de permiso ya existe' });
        }
        res.status(500).json({ message: 'Error creando permiso' });
    }
};

exports.updatePermission = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    try {
        const [oldData] = await pool.query('SELECT * FROM permissions WHERE id = ?', [id]);
        if (oldData.length === 0) {
            return res.status(404).json({ message: 'Permiso no encontrado' });
        }

        await pool.query(
            'UPDATE permissions SET name = ?, description = ? WHERE id = ?',
            [name, description || '', id]
        );

        // Audit log
        const auditService = require('../services/auditService');
        await auditService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action: 'UPDATE',
            entity: 'permission',
            entityId: String(id),
            oldValues: oldData[0],
            newValues: { name, description },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Permiso actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando permiso' });
    }
};

exports.deletePermission = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if permission is in use
        const [usage] = await pool.query(
            'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ?',
            [id]
        );

        if (usage[0].count > 0) {
            return res.status(400).json({
                message: 'No se puede eliminar: el permiso está asignado a uno o más roles'
            });
        }

        const [permData] = await pool.query('SELECT * FROM permissions WHERE id = ?', [id]);
        await pool.query('DELETE FROM permissions WHERE id = ?', [id]);

        // Audit log
        const auditService = require('../services/auditService');
        await auditService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action: 'DELETE',
            entity: 'permission',
            entityId: String(id),
            oldValues: permData[0],
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Permiso eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando permiso' });
    }
};
