/**
 * Script de Backup Automático para MySQL
 * 
 * Uso manual: node backup.js
 * Con cron (Linux): 0 2 * * * cd /path/to/backend && node backup.js
 * Con Task Scheduler (Windows): Crear tarea que ejecute este script diariamente
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || '3306',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'intranet_db',
    backupDir: path.join(__dirname, 'backups'),
    keepDays: 7 // Mantener backups de los últimos 7 días
};

// Crear directorio de backups si no existe
if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
}

// Nombre del archivo con fecha
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename = `backup_${config.database}_${timestamp}.sql`;
const filepath = path.join(config.backupDir, filename);

// Comando mysqldump
const command = `mysqldump -h ${config.host} -P ${config.port} -u ${config.user} ${config.password ? `-p${config.password}` : ''} ${config.database} > "${filepath}"`;

console.log('💾 Iniciando backup de la base de datos...');
console.log(`   Base de datos: ${config.database}`);
console.log(`   Destino: ${filepath}`);

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Error durante el backup:', error.message);
        process.exit(1);
    }

    if (stderr && !stderr.includes('Warning')) {
        console.error('⚠️  Advertencia:', stderr);
    }

    // Verificar que el archivo se creó
    if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        console.log(`✅ Backup completado exitosamente!`);
        console.log(`   Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);

        // Limpiar backups antiguos
        cleanOldBackups();
    } else {
        console.error('❌ El archivo de backup no se creó');
        process.exit(1);
    }
});

function cleanOldBackups() {
    const files = fs.readdirSync(config.backupDir);
    const now = Date.now();
    const maxAge = config.keepDays * 24 * 60 * 60 * 1000;

    let deleted = 0;
    files.forEach(file => {
        const filePath = path.join(config.backupDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            deleted++;
        }
    });

    if (deleted > 0) {
        console.log(`🗑️  Se eliminaron ${deleted} backup(s) antiguos (> ${config.keepDays} días)`);
    }
}
