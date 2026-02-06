/**
 * ============================================
 * MIDAS INTRANET - Enterprise Logger (Winston)
 * ============================================
 * Structured logging for production environments.
 * Outputs JSON in production, pretty format in development.
 */

const winston = require('winston');
const path = require('path');

// Custom format for development
const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

// JSON format for production (ELK/CloudWatch compatible)
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const isProduction = process.env.NODE_ENV === 'production';

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: isProduction ? prodFormat : devFormat,
    defaultMeta: {
        service: 'midas-intranet',
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
        // Console output
        new winston.transports.Console(),

        // Error log file
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // Combined log file
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ],
    // Don't exit on handled exceptions
    exitOnError: false
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Utility methods for structured logging
logger.security = (message, meta = {}) => {
    logger.warn(message, { category: 'SECURITY', ...meta });
};

logger.audit = (message, meta = {}) => {
    logger.info(message, { category: 'AUDIT', ...meta });
};

logger.performance = (message, meta = {}) => {
    logger.info(message, { category: 'PERFORMANCE', ...meta });
};

module.exports = logger;
