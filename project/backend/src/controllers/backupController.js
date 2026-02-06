const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('../config/logger');

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Asegurar que existe el directorio
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Configuración DB
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'intranet_db';

// Listar backups
exports.getBackups = (req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.sql'))
            .map(file => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    created_at: stats.birthtime,
                    path: filePath
                };
            })
            .sort((a, b) => b.created_at - a.created_at);

        res.json(files);
    } catch (error) {
        logger.error('Error listing backups:', error);
        res.status(500).json({ message: 'Error listando backups' });
    }
};

// Crear backup manualmente
exports.createBackup = (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `backup_${DB_NAME}_${timestamp}_${time}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const command = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} ${DB_PASS ? `-p${DB_PASS}` : ''} ${DB_NAME} > "${filepath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            logger.error('Backup error:', error);
            return res.status(500).json({ message: 'Error generando backup', error: error.message });
        }

        // Verificar creación
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            res.json({
                message: 'Backup generado exitosamente',
                file: {
                    name: filename,
                    size: stats.size,
                    created_at: stats.birthtime
                }
            });
        } else {
            res.status(500).json({ message: 'El archivo de backup no se genero' });
        }
    });
};

// Descargar backup
exports.downloadBackup = (req, res) => {
    const { filename } = req.params;
    const filepath = path.join(BACKUP_DIR, filename);

    // Valida path traversal
    if (!filepath.startsWith(BACKUP_DIR)) {
        return res.status(403).json({ message: 'Acceso denegado' });
    }

    if (fs.existsSync(filepath)) {
        res.download(filepath);
    } else {
        res.status(404).json({ message: 'Archivo no encontrado' });
    }
};
