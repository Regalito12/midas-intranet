const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const auditService = require('../services/auditService');
const logger = require('../config/logger');

// =============================================
// GET ALL USERS (Admin only)
// =============================================
// Obtener todos los usuarios (activos)
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.username, e.email, u.role, u.created_at, e.name, e.department, e.position, e.status, e.avatar 
            FROM users u 
            LEFT JOIN employees e ON u.id = e.user_id
            WHERE u.deleted_at IS NULL
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// =============================================
// CREATE USER (Admin only)
// =============================================
exports.createUser = async (req, res) => {
    const { username, password, name, email, role, department, position, phone, status } = req.body;

    try {
        // Verificar si el usuario ya existe (Username en users)
        const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'El nombre de usuario ya existe' });
        }

        // Verificar si el email ya existe (Email en employees)
        const [existingEmail] = await pool.query('SELECT id FROM employees WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }

        // Hash de contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar usuario
        const [result] = await pool.query(
            `INSERT INTO users (username, password, role) 
             VALUES (?, ?, ?)`,
            [username, hashedPassword, role || 'employee']
        );

        // Generar ID de empleado único (UUID)
        const { randomUUID } = require('crypto');
        const employeeId = `emp_${randomUUID()}`;

        // Insertar empleado con el status correcto
        await pool.query(
            `INSERT INTO employees (id, user_id, name, email, department, position, phone, avatar, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [employeeId, result.insertId, name, email, department || '', position || '', phone || '', '', status || 'activo']
        );

        // Audit log
        await auditService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action: 'CREATE',
            entity: 'user',
            entityId: String(result.insertId),
            details: { username, name, role },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            userId: result.insertId
        });

    } catch (error) {
        logger.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creando usuario', error: error.message });
    }
};

// =============================================
// UPDATE USER
// =============================================
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, role, department, position, status } = req.body;
    let avatarUrl = req.body.avatar;

    try {
        // Optimizar avatar si se sube
        if (req.file) {
            const optimizedFilename = `optimized-${req.file.filename}`;
            const optimizedPath = path.join('uploads', optimizedFilename);

            await sharp(req.file.path)
                .resize(400, 400, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 80 })
                .toFile(optimizedPath);

            fs.unlinkSync(req.file.path);

            const protocol = req.protocol;
            const host = req.get('host');
            avatarUrl = `${protocol}://${host}/uploads/${optimizedFilename}`;
        }

        // 1. Actualizar tabla users (Si el rol cambia)
        if (role) {
            // EXIT READINESS: Increment token_version to invalidate all active sessions
            await pool.query(
                'UPDATE users SET role = ?, token_version = token_version + 1 WHERE id = ?',
                [role, id]
            );
        }

        // 2. Actualizar tabla employees (Solo campos proporcionados)
        const updateFields = [];
        const updateParams = [];

        if (name !== undefined) { updateFields.push('name = ?'); updateParams.push(name); }
        if (phone !== undefined) { updateFields.push('phone = ?'); updateParams.push(phone); }
        if (email !== undefined) { updateFields.push('email = ?'); updateParams.push(email); }
        if (avatarUrl !== undefined) { updateFields.push('avatar = ?'); updateParams.push(avatarUrl); }
        if (status !== undefined) { updateFields.push('status = ?'); updateParams.push(status); }
        if (department !== undefined) { updateFields.push('department = ?'); updateParams.push(department); }
        if (position !== undefined) { updateFields.push('position = ?'); updateParams.push(position); }

        if (updateFields.length > 0) {
            let empQuery = `UPDATE employees SET ${updateFields.join(', ')} WHERE user_id = ?`;
            updateParams.push(id);
            await pool.query(empQuery, updateParams);
        }

        // Devolver usuario actualizado con sus permisos
        const [permRows] = await pool.query(`
            SELECT p.code 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON rp.role_id = r.id
            WHERE r.name = ?
        `, [updatedUser.role]);

        updatedUser.permissions = permRows.map(p => p.code);

        // 3. Audit Log
        await auditService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action: 'UPDATE',
            entity: 'user',
            entityId: String(id),
            details: {
                username: updatedUser.username,
                changes: req.body
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json(updatedUser);
    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({ message: 'Error actualizando usuario' });
    }
};

// =============================================
// DELETE USER (Admin only)
// =============================================
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user && req.user.id === parseInt(id)) {
            return res.status(400).json({ message: 'No puedes eliminarte a ti mismo.' });
        }

        const [userInfo] = await pool.query('SELECT username, name FROM users WHERE id = ?', [id]);

        if (userInfo.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // SOFT DELETE: Marcar como inactivo y setear fecha de borrado
        await pool.query('UPDATE employees SET status = ? WHERE user_id = ?', ['inactivo', id]);
        await pool.query('UPDATE users SET deleted_at = NOW(), status = ? WHERE id = ?', ['inactive', id]);

        // Audit Log Manual (Confirmación de negocio)
        await auditService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action: 'SOFT_DELETE_USER',
            entity: 'user',
            entityId: String(id),
            details: { deletedUser: userInfo[0].username },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Usuario desactivado exitosamente (Soft Delete)' });

    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error eliminando usuario' });
    }
};

// =============================================
// CHANGE PASSWORD
// =============================================
exports.changePassword = async (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    try {
        const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const validPassword = await bcrypt.compare(currentPassword, rows[0].password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Contraseña actual incorrecta' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        logger.error('Error changing password:', error);
        res.status(500).json({ message: 'Error cambiando contraseña' });
    }
};

// =============================================
// RESET PASSWORD (Admin only)
// =============================================
exports.resetPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

        await auditService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action: 'RESET_PASSWORD',
            entity: 'user',
            entityId: String(id),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Contraseña reseteada exitosamente' });
    } catch (error) {
        logger.error('Error resetting password:', error);
        res.status(500).json({ message: 'Error reseteando contraseña' });
    }
};
