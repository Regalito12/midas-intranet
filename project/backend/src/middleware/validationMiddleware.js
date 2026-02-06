/**
 * ============================================
 * MIDAS INTRANET - Input Validation Middleware
 * ============================================
 * Express-validator based input validation.
 * Prevents injection attacks and ensures data integrity.
 */

const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

// Common validation rules
const rules = {
    // User-related
    username: body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be 3-50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),

    password: body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain lowercase, uppercase, and number'),

    newPassword: body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain lowercase, uppercase, and number'),

    email: body('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),

    name: body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be 2-100 characters')
        .escape(),

    phone: body('phone')
        .optional()
        .trim()
        .matches(/^[\d\s\-\+\(\)]+$/)
        .withMessage('Invalid phone format'),

    // ID parameters
    idParam: param('id')
        .isInt({ min: 1 })
        .withMessage('Invalid ID'),

    // Generic text content
    title: body('title')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be 1-200 characters')
        .escape(),

    content: body('content')
        .trim()
        .isLength({ min: 1, max: 50000 })
        .withMessage('Content must be 1-50000 characters'),

    description: body('description')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Description must be 1-2000 characters'),

    // Enums
    role: body('role')
        .isIn(['admin', 'rrhh', 'soporte', 'employee', 'gerente'])
        .withMessage('Invalid role'),

    status: body('status')
        .isIn(['activo', 'inactivo', 'pendiente', 'aprobado', 'rechazado'])
        .withMessage('Invalid status'),

    priority: body('priority')
        .optional()
        .isIn(['baja', 'media', 'alta', 'urgente'])
        .withMessage('Invalid priority'),

    // Numbers
    amount: body('total')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),

    quantity: body('quantity')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),

    // Pagination
    page: query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be positive integer'),

    limit: query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be 1-100')
};

// Validation result handler
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        logger.security('Input validation failed', {
            path: req.path,
            errors: errors.array(),
            ip: req.ip
        });

        return res.status(400).json({
            message: 'Validación fallida',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

// Pre-built validation chains for common endpoints
const validators = {
    // Login
    login: [
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required'),
        validate
    ],

    // Create user
    createUser: [
        rules.username,
        rules.password,
        rules.name,
        rules.email,
        body('role').optional().isIn(['admin', 'rrhh', 'soporte', 'employee', 'gerente']),
        validate
    ],

    // Update user
    updateUser: [
        rules.idParam,
        body('name').optional().trim().isLength({ min: 2, max: 100 }).escape(),
        body('email').optional().isEmail().normalizeEmail(),
        body('phone').optional().trim(),
        validate
    ],

    // Change password
    changePassword: [
        rules.idParam,
        body('currentPassword').notEmpty().withMessage('Current password required'),
        rules.newPassword,
        validate
    ],

    // Create news
    createNews: [
        rules.title,
        rules.content,
        body('category').optional().isIn(['general', 'rrhh', 'it', 'eventos', 'logros']),
        validate
    ],

    // Create request
    createRequest: [
        body('type').notEmpty().withMessage('Request type is required'),
        rules.description,
        rules.priority,
        validate
    ],

    // Create ticket
    createTicket: [
        body('subject').trim().notEmpty().withMessage('Subject is required'),
        rules.description,
        body('category').notEmpty().withMessage('Category is required'),
        rules.priority,
        validate
    ],

    // Generic ID param
    requireId: [
        rules.idParam,
        validate
    ],

    // Pagination
    pagination: [
        rules.page,
        rules.limit,
        validate
    ]
};

// Sanitize object (remove dangerous fields)
const sanitizeObject = (obj, allowedFields) => {
    const sanitized = {};
    for (const field of allowedFields) {
        if (obj[field] !== undefined) {
            sanitized[field] = obj[field];
        }
    }
    return sanitized;
};

module.exports = {
    rules,
    validate,
    validators,
    sanitizeObject,
    body,
    param,
    query,
    validationResult
};
