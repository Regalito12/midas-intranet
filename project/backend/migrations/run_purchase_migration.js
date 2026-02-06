/**
 * Script de migración ejecutable para el Módulo de Compras
 * Ejecuta la migración SQL y verifica la creación de tablas
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

async function runMigration() {
    let connection;

    try {
        console.log(`${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.cyan}  FASE 1: MIGRACIÓN DEL MÓDULO DE COMPRAS EMPRESARIAL${colors.reset}`);
        console.log(`${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

        // Configuración de conexión
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'midas_intranet',
            multipleStatements: true // Permitir múltiples statements SQL
        };

        console.log(`${colors.blue}📡 Conectando a base de datos...${colors.reset}`);
        console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`   Database: ${dbConfig.database}\n`);

        // Crear conexión
        connection = await mysql.createConnection(dbConfig);
        console.log(`${colors.green}✓ Conexión establecida${colors.reset}\n`);

        // Leer archivo SQL
        const sqlFilePath = path.join(__dirname, '001_create_purchase_module.sql');
        console.log(`${colors.blue}📄 Leyendo migración: ${path.basename(sqlFilePath)}${colors.reset}`);

        const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
        console.log(`${colors.green}✓ Archivo leído correctamente${colors.reset}\n`);

        // Ejecutar migración
        console.log(`${colors.blue}⚙️  Ejecutando migración...${colors.reset}`);
        await connection.query(sqlContent);
        console.log(`${colors.green}✓ Migración ejecutada exitosamente${colors.reset}\n`);

        // Verificar tablas creadas
        console.log(`${colors.blue}🔍 Verificando tablas creadas...${colors.reset}\n`);

        const tablesToCheck = [
            'companies',
            'cost_centers',
            'budgets',
            'purchase_requests',
            'purchase_request_attachments',
            'approval_matrix',
            'purchase_approvals',
            'purchase_orders',
            'purchase_serials'
        ];

        const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, TABLE_COMMENT
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN (?)
      ORDER BY TABLE_NAME
    `, [dbConfig.database, tablesToCheck]);

        console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║  TABLAS CREADAS                                            ║${colors.reset}`);
        console.log(`${colors.cyan}╠════════════════════════════════════════════════════════════╣${colors.reset}`);

        if (tables.length === 0) {
            console.log(`${colors.red}  ✗ No se encontraron tablas creadas${colors.reset}`);
            throw new Error('No se crearon las tablas esperadas');
        }

        tables.forEach((table, index) => {
            const checkmark = table.TABLE_ROWS !== null ? '✓' : '○';
            console.log(`${colors.green}  ${checkmark} ${table.TABLE_NAME.padEnd(35)}${colors.reset} ${colors.yellow}${table.TABLE_ROWS || 0} rows${colors.reset}`);
        });

        console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        // Verificar datos iniciales
        console.log(`${colors.blue}📊 Verificando datos iniciales...${colors.reset}\n`);

        // Verificar empresas
        const [companies] = await connection.query('SELECT * FROM companies');
        console.log(`${colors.green}  ✓ Empresas: ${companies.length}${colors.reset}`);
        companies.forEach(c => {
            console.log(`    - ${c.code}: ${c.name}`);
        });

        // Verificar matriz de aprobación
        const [matrix] = await connection.query('SELECT * FROM approval_matrix');
        console.log(`\n${colors.green}  ✓ Reglas de matriz de aprobación: ${matrix.length}${colors.reset}`);
        matrix.forEach((rule, i) => {
            const maxAmount = rule.max_amount ? `${rule.max_amount.toLocaleString()}` : 'Sin límite';
            console.log(`    ${i + 1}. RD$${rule.min_amount.toLocaleString()} - ${maxAmount}`);
        });

        // Verificar seriales
        const [serials] = await connection.query('SELECT * FROM purchase_serials');
        console.log(`\n${colors.green}  ✓ Seriales inicializados: ${serials.length}${colors.reset}`);
        serials.forEach(s => {
            console.log(`    - ${s.serial_type}-${s.fiscal_year}: Último número = ${s.last_number}`);
        });

        console.log(`\n${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.green}✓ MIGRACIÓN COMPLETADA EXITOSAMENTE${colors.reset}`);
        console.log(`${colors.cyan}═════════════════════════════════════════════════════════════${colors.reset}\n`);

        console.log(`${colors.yellow}📋 Siguientes pasos:${colors.reset}`);
        console.log(`   1. Implementar servicios backend (PurchaseRequestService, etc.)`);
        console.log(`   2. Crear endpoints API`);
        console.log(`   3. Desarrollar componentes frontend`);
        console.log(`   4. Configurar permisos RBAC\n`);

    } catch (error) {
        console.error(`\n${colors.red}═════════════════════════════════════════════════════════════${colors.reset}`);
        console.error(`${colors.red}✗ ERROR EN MIGRACIÓN${colors.reset}`);
        console.error(`${colors.red}═════════════════════════════════════════════════════════════${colors.reset}\n`);
        console.error(`${colors.red}${error.message}${colors.reset}\n`);

        if (error.sql) {
            console.error(`${colors.yellow}SQL que falló:${colors.reset}`);
            console.error(error.sql.substring(0, 200) + '...\n');
        }

        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log(`${colors.blue}🔌 Conexión cerrada${colors.reset}\n`);
        }
    }
}

// Ejecutar migración
if (require.main === module) {
    runMigration().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { runMigration };
