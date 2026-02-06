/**
 * ============================================
 * MIDAS INTRANET - Enterprise Environment Config
 * ============================================
 * Validates ALL required environment variables at startup.
 * Application will FAIL FAST if any required variable is missing.
 */

const requiredEnvVars = [
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'DB_PORT',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'NODE_ENV'
];

const optionalEnvVars = [
    'PORT',
    'DB_PASSWORD',  // Optional for local development without password
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'RECAPTCHA_SECRET_KEY',
    'ALLOWED_ORIGINS'
];

function validateEnv() {
    const missing = [];
    const warnings = [];

    // Check required variables
    for (const varName of requiredEnvVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        warnings.push('JWT_SECRET should be at least 32 characters for security');
    }

    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
        warnings.push('JWT_REFRESH_SECRET should be at least 32 characters for security');
    }

    // Validate NODE_ENV
    const validEnvs = ['development', 'production', 'test'];
    if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
        warnings.push(`NODE_ENV should be one of: ${validEnvs.join(', ')}`);
    }

    // Check optional but recommended
    for (const varName of optionalEnvVars) {
        if (!process.env[varName]) {
            warnings.push(`Optional variable ${varName} is not set`);
        }
    }

    // Report warnings
    if (warnings.length > 0) {
        console.warn('\n⚠️  Environment Configuration Warnings:');
        warnings.forEach(w => console.warn(`   - ${w}`));
    }

    // Fail fast if missing required
    if (missing.length > 0) {
        console.error('\n❌ FATAL: Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        console.error('\nPlease check your .env file and ensure all required variables are set.');
        console.error('See .env.example for reference.\n');
        process.exit(1);
    }

    console.log('✅ Environment configuration validated successfully');
}

// Export configuration object
const config = {
    // Server
    port: parseInt(process.env.PORT) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // Database
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 3306,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiresIn: '15m',  // Short-lived access token
        refreshExpiresIn: '7d'   // Longer-lived refresh token
    },

    // CORS
    cors: {
        allowedOrigins: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
            : ['http://localhost:5173']
    },

    // SMTP
    smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },

    // Security
    security: {
        bcryptRounds: 12,
        rateLimitWindowMs: 60 * 1000,  // 1 minute
        rateLimitMax: 100,
        loginRateLimitMax: 5,
        loginRateLimitWindowMs: 15 * 60 * 1000  // 15 minutes
    },

    // File uploads
    uploads: {
        maxFileSize: 10 * 1024 * 1024,  // 10MB
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
    },

    // reCAPTCHA
    recaptcha: {
        secretKey: process.env.RECAPTCHA_SECRET_KEY
    }
};

module.exports = { validateEnv, config };
