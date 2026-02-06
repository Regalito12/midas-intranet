
const pool = require('../src/config/db');

async function listTables() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listTables();
