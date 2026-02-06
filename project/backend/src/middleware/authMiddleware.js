/**
 * ============================================
 * MIDAS INTRANET - Authentication Middleware
 * ============================================
 * Enterprise-grade JWT authentication.
 * NO FALLBACKS - Requires proper configuration.
 */

const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const logger = require('../config/logger');
const { errors } = require('./errorHandler');
const pool = require('../config/db'); // EXIT READINESS: For token version validation

/**
 * Verify JWT access token
 * Attaches decoded user to req.user
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        logger.security('Request without token', {
            path: req.path,
            ip: req.ip
        });
        return res.status(403).json({
            success: false,
            error: {
                code: 'NO_TOKEN',
                message: 'Token de acceso requerido'
            }
        });
    }

    try {
        // Use JWT_SECRET from validated config (no fallback!)
        const decoded = jwt.verify(token, config.jwt.secret);

        // EXIT READINESS: Validate token version for session invalidation
        // If admin changes user role/permissions, token_version increments
        if (decoded.tokenVersion) {
            const [rows] = await pool.query(
                'SELECT token_version FROM users WHERE id = ?',
                [decoded.id]
            );

            if (rows.length === 0 || rows[0].token_version !== decoded.tokenVersion) {
                logger.security('Token version mismatch - session invalidated', {
                    userId: decoded.id,
                    tokenVersion: decoded.tokenVersion,
                    currentVersion: rows[0]?.token_version,
                    path: req.path,
                    ip: req.ip
                });

                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'SESSION_INVALIDATED',
                        message: 'Tu sesión ha sido invalidada. Por favor inicia sesión nuevamente.'
                    }
                });
            }
        }

        req.user = decoded;
        next();
    } catch (error) {
        logger.security('Invalid token attempt', {
            path: req.path,
            ip: req.ip,
            error: error.name
        });

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Token expirado. Por favor renueva tu sesión.'
                }
            });
        }

        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Token inválido'
            }
        });
    }
};

/**
 * Role-based authorization
 * @param {string|string[]} allowedRoles - Roles that can access the route
 */
const authorize = (allowedRoles = []) => {
    if (typeof allowedRoles === 'string') {
        allowedRoles = [allowedRoles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'NOT_AUTHENTICATED',
                    message: 'Autenticación requerida'
                }
            });
        }

        if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
            logger.security('Unauthorized role access attempt', {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                path: req.path
            });

            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_ROLE',
                    message: 'No tienes el rol necesario para esta acción'
                }
            });
        }

        next();
    };
};

/**
 * Permission-based authorization
 * @param {string} permissionCode - Required permission code
 */
const hasPermission = (permissionCode) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'NOT_AUTHENTICATED',
                    message: 'Autenticación requerida'
                }
            });
        }

        // Admin bypass - admins have all permissions
        if (req.user.role === 'admin') {
            return next();
        }

        const userPermissions = req.user.permissions || [];

        if (!userPermissions.includes(permissionCode)) {
            logger.security('Unauthorized permission access attempt', {
                userId: req.user.id,
                requiredPermission: permissionCode,
                userPermissions,
                path: req.path
            });

            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSION',
                    message: `Permiso requerido: ${permissionCode}`
                }
            });
        }

        next();
    };
};

/**
 * Admin-only middleware
 */
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'NOT_AUTHENTICATED',
                message: 'Autenticación requerida'
            }
        });
    }

    if (req.user.role !== 'admin') {
        logger.security('Non-admin access to admin route', {
            userId: req.user.id,
            userRole: req.user.role,
            path: req.path
        });

        return res.status(403).json({
            success: false,
            error: {
                code: 'ADMIN_REQUIRED',
                message: 'Acceso restringido a administradores'
            }
        });
    }

    next();
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for public routes that behave differently for logged users
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
    } catch (error) {
        req.user = null;
    }

    next();
};

// Attach additional methods to verifyToken for backward compatibility
verifyToken.authorize = authorize;
verifyToken.hasPermission = hasPermission;
verifyToken.isAdmin = isAdmin;
verifyToken.optional = optionalAuth;

module.exports = verifyToken;
