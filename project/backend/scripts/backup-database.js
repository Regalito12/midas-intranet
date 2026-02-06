require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Script de Backup Automático de Base de Datos
 * 
 * USO:
 * node backup-database.js
 * 
 * O con cron (Linux):
 * 0 2 * * * cd /path/to/backend && node backup-database.js
 * 
 * O con Task Scheduler (Windows):
 * Acción: node backup-database.js
 * Carpeta: C:\path\to\backend
 */

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'intranet_db';

// Directorio de backups
const BACKUP_DIR = path.join(__dirname, 'backups');

// Crear directorio si no existe
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generar nombre de archivo con timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
const backupFile = path.join(BACKUP_DIR, `backup_${DB_NAME}_${timestamp}_${time}.sql`);

// Comando mysqldump
const command = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} ${DB_PASS ? `-p${DB_PASS}` : ''} ${DB_NAME} > "${backupFile}"`;

console.log('🗄️  Iniciando backup de base de datos...');
console.log(`📁 Archivo: ${backupFile}`);

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Error en backup:', error.message);
        return;
    }

    if (stderr) {
        console.warn('⚠️  Advertencia:', stderr);
    }

    // Verificar que el archivo se creó
    if (fs.existsSync(backupFile)) {
        const stats = fs.statSync(backupFile);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Backup completado exitosamente!`);
        console.log(`📊 Tamaño: ${fileSizeInMB} MB`);

        // Limpiar backups antiguos (mantener últimos 7)
        cleanOldBackups();
    } else {
        console.error('❌ El archivo de backup no se creó');
    }
});

/**
 * Eliminar backups antiguos, mantener solo los últimos 7
 */
function cleanOldBackups() {
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
        .map(file => ({
            name: file,
            path: path.join(BACKUP_DIR, file),
            time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

    // Eliminar archivos viejos (mantener 7 más recientes)
    if (files.length > 7) {
        const toDelete = files.slice(7);
        toDelete.forEach(file => {
            fs.unlinkSync(file.path);
            console.log(`🗑️  Backup antiguo eliminado: ${file.name}`);
        });
    }

    console.log(`📦 Total de backups: ${Math.min(files.length, 7)}`);
}
