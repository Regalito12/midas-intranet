/**
 * ============================================
 * MIDAS INTRANET - Database Configuration
 * ============================================
 * MySQL connection pool with enterprise settings.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('./logger');

// Note: We access process.env directly here because this file
// may be loaded before env.js validation in some migration scripts
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // Timezone handling
    timezone: 'local',
    // Character set
    charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

// Verify connection on startup
pool.getConnection()
    .then(connection => {
        logger.info('✅ Database connection established', {
            host: dbConfig.host,
            database: dbConfig.database,
            connectionLimit: dbConfig.connectionLimit
        });
        connection.release();
    })
    .catch(error => {
        logger.error('❌ Database connection failed', {
            host: dbConfig.host,
            database: dbConfig.database,
            error: error.message
        });
        // Don't exit - let the application handle DB errors gracefully
    });

// Add pool events for monitoring
pool.on('acquire', function (connection) {
    logger.debug('Connection acquired', { threadId: connection.threadId });
});

pool.on('release', function (connection) {
    logger.debug('Connection released', { threadId: connection.threadId });
});

pool.on('enqueue', function () {
    logger.warn('Waiting for available connection slot');
});

module.exports = pool;
