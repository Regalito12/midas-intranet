/**
 * Test MySQL connection and execute simple query
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    try {
        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'intranet_db'
        };

        console.log('Connecting to:', `${config.host}:${config.port}/${config.database}`);

        const connection = await mysql.createConnection(config);
        console.log('✓ Connected successfully\n');

        // Test simple query
        const [result] = await connection.query('SELECT DATABASE() as db, VERSION() as version');
        console.log('Current database:', result[0].db);
        console.log('MySQL version:', result[0].version);

        // List existing tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`\nExisting tables (${tables.length}):`);
        tables.forEach(t => console.log(`  - ${Object.values(t)[0]}`));

        await connection.end();
        console.log('\n✓ Connection closed');

    } catch (error) {
        console.error('✗ Error:', error.message);
        process.exit(1);
    }
}

testConnection();
