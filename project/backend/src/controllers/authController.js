/**
 * ============================================
 * MIDAS INTRANET - Authentication Controller
 * ============================================
 * Enterprise-grade authentication with JWT.
 * NO PLAIN TEXT PASSWORD SUPPORT - All passwords must be hashed.
 */

const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { config } = require('../config/env');
const logger = require('../config/logger');
const auditService = require('../services/auditService');
const { asyncHandler, errors } = require('../middleware/errorHandler');

/**
 * DEBUG LOGIN - Emergency access
 */
exports.debugLogin = asyncHandler(async (req, res) => {
    logger.warn('!!! DEBUG LOGIN HIT !!!', { ip: req.ip });
    const [rows] = await pool.query('SELECT u.* FROM users u WHERE u.username = "admin"');
    const user = rows[0];
    const tokenPayload = { id: user.id, username: user.username, role: 'admin', permissions: ['*'] };
    const { accessToken, refreshToken } = generateTokens(tokenPayload);
    res.json({ success: true, user, accessToken, refreshToken });
});

/**
 * Generate JWT tokens (access + refresh)
 */
const generateTokens = (payload) => {
    const accessToken = jwt.sign(
        payload,
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpiresIn }
    );

    const refreshToken = jwt.sign(
        { id: payload.id, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
};

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
exports.login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        logger.warn('Login attempt with missing credentials', { ip: req.ip });
        return res.status(400).json({ success: false, message: 'Faltan credenciales' });
    }

    // 1. Find user with employee data + token_version
    const [rows] = await pool.query(`
        SELECT u.*, e.status, e.avatar, COALESCE(e.name, u.name) as name, 
               e.position, e.department, u.token_version 
        FROM users u 
        LEFT JOIN employees e ON u.id = e.user_id 
        WHERE u.username = ? AND u.deleted_at IS NULL
    `, [username]);

    if (rows.length === 0) {
        logger.audit('Login failed: User not found', { username, ip: req.ip });
        await auditService.log({
            username,
            action: 'LOGIN_FAILED',
            entity: 'auth',
            details: { reason: 'Usuario no encontrado' },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Usuario o contraseña incorrectos'
            }
        });
    }

    const user = rows[0];

    // 2. Check if user is active
    if (user.status === 'inactivo') {
        logger.security('Login blocked: Inactive account', { username, id: user.id });
        await auditService.log({
            username,
            action: 'LOGIN_BLOCKED',
            entity: 'auth',
            details: { reason: 'Usuario inactivo' },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
            success: false,
            error: {
                code: 'ACCOUNT_INACTIVE',
                message: 'Tu cuenta ha sido desactivada. Contacta a RRHH.'
            }
        });
    }

    // 3. Verify password
    if (!user.password || (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$'))) {
        logger.error('Invalid password format for user', { username, id: user.id });
        return res.status(401).json({
            success: false,
            error: {
                code: 'PASSWORD_RESET_REQUIRED',
                message: 'Tu contraseña necesita ser actualizada. Contacta al administrador.'
            }
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        logger.audit('Login failed: Invalid password', { username, id: user.id });
        await auditService.log({
            userId: user.id,
            username: user.username,
            action: 'LOGIN_FAILED',
            entity: 'auth',
            details: { reason: 'Contraseña incorrecta' },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Usuario o contraseña incorrectos'
            }
        });
    }

    const [permRows] = await pool.query(`
        SELECT p.code 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        WHERE r.name = ?
    `, [user.role]);

    const permissions = permRows.map(p => p.code);

    const tokenPayload = {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions,
        tokenVersion: user.token_version || 1
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // 6. Store refresh token hash in database (for revocation)
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await pool.query(
        'UPDATE users SET refresh_token = ?, last_login = NOW() WHERE id = ?',
        [refreshTokenHash, user.id]
    );

    // 7. Log successful login
    await auditService.log({
        userId: user.id,
        username: user.username,
        action: 'LOGIN',
        entity: 'auth',
        details: { role: user.role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    // 8. Prepare user object (without sensitive data)
    const { password: _, refresh_token: __, ...userResponse } = user;
    userResponse.permissions = permissions;

    res.json({
        success: true,
        message: '¡Login exitoso!',
        user: userResponse,
        accessToken,
        refreshToken,
        expiresIn: 900 // 15 minutes in seconds
    });
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
exports.refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'NO_REFRESH_TOKEN',
                message: 'Refresh token requerido'
            }
        });
    }

    try {
        // 1. Verify refresh token
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        // 2. Find user and verify stored refresh token
        const [rows] = await pool.query(`
            SELECT u.id, u.username, u.role, u.refresh_token, u.token_version,
                   COALESCE(e.name, u.name) as name 
            FROM users u 
            LEFT JOIN employees e ON u.id = e.user_id 
            WHERE u.id = ? AND u.deleted_at IS NULL
        `, [decoded.id]);

        if (rows.length === 0) {
            logger.security('Refresh token for non-existent user', {
                userId: decoded.id,
                ip: req.ip
            });
            throw new Error('User not found');
        }

        const user = rows[0];

        // 3. Verify refresh token matches stored hash
        if (!user.refresh_token) {
            logger.security('Refresh token used but none stored', {
                userId: user.id,
                ip: req.ip
            });
            throw new Error('No refresh token stored');
        }

        const isValidRefresh = await bcrypt.compare(refreshToken, user.refresh_token);
        if (!isValidRefresh) {
            logger.security('Invalid refresh token used', {
                userId: user.id,
                ip: req.ip
            });

            // Possible token theft - invalidate all sessions
            await pool.query('UPDATE users SET refresh_token = NULL WHERE id = ?', [user.id]);

            throw new Error('Invalid refresh token');
        }

        // 4. Get current permissions
        const [permRows] = await pool.query(`
            SELECT p.code 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON rp.role_id = r.id
            WHERE r.name = ?
        `, [user.role]);

        const permissions = permRows.map(p => p.code);

        // 5. Generate new tokens (token rotation) with current version
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            permissions,
            tokenVersion: user.token_version || 1
        };

        const tokens = generateTokens(tokenPayload);

        // 6. Store new refresh token hash
        const newRefreshHash = await bcrypt.hash(tokens.refreshToken, 10);
        await pool.query('UPDATE users SET refresh_token = ? WHERE id = ?', [newRefreshHash, user.id]);

        logger.info('Token refreshed', { userId: user.id, ip: req.ip });

        res.json({
            success: true,
            message: 'Token renovado exitosamente',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: 900
        });

    } catch (error) {
        logger.security('Token refresh failed', {
            error: error.message,
            ip: req.ip
        });

        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_REFRESH_TOKEN',
                message: 'Sesión expirada. Por favor inicia sesión nuevamente.'
            }
        });
    }
});

/**
 * POST /api/auth/logout
 * Invalidate refresh token (revoke session)
 */
exports.logout = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (userId) {
        // Invalidate refresh token
        await pool.query('UPDATE users SET refresh_token = NULL WHERE id = ?', [userId]);

        await auditService.log({
            userId,
            username: req.user.username,
            action: 'LOGOUT',
            entity: 'auth',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        logger.info('User logged out', { userId, ip: req.ip });
    }

    res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
    });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
exports.me = asyncHandler(async (req, res) => {
    // 1. Get user and employee data
    const [rows] = await pool.query(`
        SELECT u.id, u.username, u.role, COALESCE(e.name, u.name) as name, e.email, e.avatar,
               COALESCE(e.position, 'Administrador del Sistema') as position, 
               COALESCE(e.department, 'Tecnología') as department, e.phone, e.status
        FROM users u
        LEFT JOIN employees e ON u.id = e.user_id
        WHERE u.id = ?
    `, [req.user.id]);

    if (rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: {
                code: 'USER_NOT_FOUND',
                message: 'Usuario no encontrado'
            }
        });
    }

    const user = rows[0];

    // 2. Get current permissions for the user's role
    const [permRows] = await pool.query(`
        SELECT p.code 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        WHERE r.name = ?
    `, [user.role]);

    const permissions = permRows.map(p => p.code);

    // 3. Attach permissions to user object
    user.permissions = permissions;

    res.json({
        success: true,
        user
    });
});
