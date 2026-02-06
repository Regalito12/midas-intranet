/**
 * ============================================
 * MIDAS INTRANET - CORS Configuration
 * ============================================
 * Strict CORS policy with explicit whitelist.
 * No wildcards allowed in production.
 */

const cors = require('cors');
const { config } = require('../config/env');
const logger = require('../config/logger');

const corsMiddleware = () => {
    const corsOptions = {
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, curl, Postman)
            // In production, you might want to block these too
            if (!origin) {
                if (config.isProduction) {
                    logger.security('Request without origin blocked in production');
                    return callback(new Error('Origin required'), false);
                }
                return callback(null, true);
            }

            // Check against whitelist OR wildcard
            if (config.cors.allowedOrigins.includes('*') || config.cors.allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // Log blocked request
            logger.security('CORS blocked request from unauthorized origin', {
                origin,
                allowedOrigins: config.cors.allowedOrigins
            });

            return callback(new Error('Not allowed by CORS'), false);
        },

        // Allow credentials (cookies, authorization headers)
        credentials: true,

        // Allowed HTTP methods
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

        // Allowed headers
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-CSRF-Token'
        ],

        // Expose these headers to the client
        exposedHeaders: [
            'X-Total-Count',
            'X-Page-Count',
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining'
        ],

        // Preflight cache time (24 hours)
        maxAge: 86400,

        // Success status for legacy browsers
        optionsSuccessStatus: 200
    };

    return cors(corsOptions);
};

module.exports = corsMiddleware;
