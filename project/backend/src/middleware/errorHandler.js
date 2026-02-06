/**
 * ============================================
 * MIDAS INTRANET - Error Handler Middleware
 * ============================================
 * Centralized error handling for all routes.
 * Prevents information leakage in production.
 */

const logger = require('../config/logger');
const { config } = require('../config/env');

// Custom error class for operational errors
class AppError extends Error {
    constructor(message, statusCode, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error factories
const errors = {
    badRequest: (message = 'Solicitud inválida') =>
        new AppError(message, 400, 'BAD_REQUEST'),

    unauthorized: (message = 'No autorizado') =>
        new AppError(message, 401, 'UNAUTHORIZED'),

    forbidden: (message = 'Acceso denegado') =>
        new AppError(message, 403, 'FORBIDDEN'),

    notFound: (resource = 'Recurso') =>
        new AppError(`${resource} no encontrado`, 404, 'NOT_FOUND'),

    conflict: (message = 'Conflicto con el estado actual') =>
        new AppError(message, 409, 'CONFLICT'),

    tooManyRequests: (message = 'Demasiadas solicitudes') =>
        new AppError(message, 429, 'TOO_MANY_REQUESTS'),

    internal: (message = 'Error interno del servidor') =>
        new AppError(message, 500, 'INTERNAL_ERROR'),

    database: (message = 'Error de base de datos') =>
        new AppError(message, 500, 'DATABASE_ERROR'),

    validation: (errors) => {
        const err = new AppError('Error de validación', 400, 'VALIDATION_ERROR');
        err.validationErrors = errors;
        return err;
    }
};

// Not found handler (404)
const notFoundHandler = (req, res, next) => {
    const error = errors.notFound(`Ruta ${req.originalUrl}`);
    next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
    // Default values
    err.statusCode = err.statusCode || 500;
    err.code = err.code || 'INTERNAL_ERROR';

    // Log error
    const errorLog = {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent')
    };

    if (err.statusCode >= 500) {
        errorLog.stack = err.stack;
        logger.error('Server error', errorLog);
    } else if (err.statusCode >= 400) {
        logger.warn('Client error', errorLog);
    }

    // Response object
    const response = {
        success: false,
        error: {
            code: err.code,
            message: err.message
        }
    };

    // Add validation errors if present
    if (err.validationErrors) {
        response.error.details = err.validationErrors;
    }

    // Add stack trace only in development
    if (!config.isProduction && err.stack) {
        response.error.stack = err.stack;
    }

    // Send response
    res.status(err.statusCode).json(response);
};

// Async handler wrapper (eliminates try-catch in controllers)
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    errors,
    notFoundHandler,
    errorHandler,
    asyncHandler
};
