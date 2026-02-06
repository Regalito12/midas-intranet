/**
 * ============================================
 * MIDAS INTRANET - Secure File Upload Middleware
 * ============================================
 * Enterprise-grade file upload security:
 * - MIME type validation
 * - File size limits
 * - Filename sanitization
 * - Path traversal prevention
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { config } = require('../config/env');
const logger = require('../config/logger');
const { errors } = require('./errorHandler');

// Allowed MIME types
const ALLOWED_MIME_TYPES = config.uploads.allowedMimeTypes;

// File filter function
const fileFilter = (req, file, cb) => {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        logger.security('Blocked file upload - invalid MIME type', {
            filename: file.originalname,
            mimetype: file.mimetype,
            ip: req.ip,
            userId: req.user?.id
        });

        return cb(
            new Error(`Tipo de archivo no permitido: ${file.mimetype}`),
            false
        );
    }

    // Additional extension check (defense in depth)
    const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx'
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        logger.security('Blocked file upload - invalid extension', {
            filename: file.originalname,
            extension: ext,
            ip: req.ip
        });

        return cb(new Error(`Extensión no permitida: ${ext}`), false);
    }

    cb(null, true);
};

// Generate secure filename
const generateSecureFilename = (originalName) => {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `${timestamp}-${randomBytes}${ext}`;
};

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        // Use secure filename instead of original
        const secureFilename = generateSecureFilename(file.originalname);
        cb(null, secureFilename);
    }
});

// Create multer instance with security settings
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config.uploads.maxFileSize, // 10MB default
        files: 5, // Max 5 files per request
        fields: 10 // Max 10 non-file fields
    }
});

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        logger.warn('Multer upload error', {
            code: err.code,
            field: err.field,
            ip: req.ip
        });

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: `El archivo excede el límite de ${config.uploads.maxFileSize / 1024 / 1024}MB`
                }
            });
        }

        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TOO_MANY_FILES',
                    message: 'Demasiados archivos en la solicitud'
                }
            });
        }

        return res.status(400).json({
            success: false,
            error: {
                code: 'UPLOAD_ERROR',
                message: err.message
            }
        });
    }

    if (err) {
        logger.warn('File upload validation error', {
            message: err.message,
            ip: req.ip
        });

        return res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_FILE',
                message: err.message
            }
        });
    }

    next();
};

// Convenience methods
const uploadSingle = (fieldName = 'file') => [
    upload.single(fieldName),
    handleUploadError
];

const uploadMultiple = (fieldName = 'files', maxCount = 5) => [
    upload.array(fieldName, maxCount),
    handleUploadError
];

const uploadFields = (fields) => [
    upload.fields(fields),
    handleUploadError
];

module.exports = {
    upload,
    uploadSingle,
    uploadMultiple,
    uploadFields,
    handleUploadError,
    generateSecureFilename
};
