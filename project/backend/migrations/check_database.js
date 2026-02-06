/**
 * Verificación de la base de datos antes de migración
 * Comprueba que existan las tablas de Fase 0 necesarias
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

async function checkDatabase() {
    let connection;

    try {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'midas_intranet'
        };

        console.log(`${colors.cyan}Conectando a base de datos...${colors.reset}`);
        console.log(`  Host: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`  Database: ${dbConfig.database}`);
        console.log(`  User: ${dbConfig.user}\n`);

        connection = await mysql.createConnection(dbConfig);
        console.log(`${colors.green}✓ Conexión establecida${colors.reset}\n`);

        // Verificar tablas existentes
        const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);

        console.log(`${colors.blue}Tablas existentes (${tables.length}):${colors.reset}`);
        tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));

        // Verificar tablas requeridas de Fase 0
        const requiredTables = ['users', 'departments', 'roles'];
        console.log(`\n${colors.yellow}Verificando tablas requeridas de Fase 0:${colors.reset}`);

        const existingTableNames = tables.map(t => t.TABLE_NAME);
        let allPresent = true;

        requiredTables.forEach(table => {
            const exists = existingTableNames.includes(table);
            const symbol = exists ? '✓' : '✗';
            const color = exists ? colors.green : colors.red;
            console.log(`  ${color}${symbol} ${table}${colors.reset}`);
            if (!exists) allPresent = false;
        });

        if (allPresent) {
            console.log(`\n${colors.green}✓ Todas las tablas requeridas están presentes${colors.reset}`);
            console.log(`${colors.green}✓ Puedes proceder con la migración${colors.reset}\n`);
        } else {
            console.log(`\n${colors.yellow}⚠ Algunas tablas requeridas faltan${colors.reset}`);
            console.log(`${colors.yellow}⚠ La migración se ejecutará pero puede tener advertencias${colors.reset}\n`);
        }

    } catch (error) {
        console.error(`\n${colors.red}✗ Error: ${error.message}${colors.reset}\n`);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDatabase();
