
const pool = require('../src/config/db');

async function checkPermissions() {
    try {
        console.log('\n--- PERMISOS DEFINIDOS ---');
        const [permissions] = await pool.query('SELECT * FROM permissions ORDER BY module, code');
        console.table(permissions);

        console.log('\n--- ASIGNACIÓN DE ROLES ---');
        const [rolePerms] = await pool.query('SELECT * FROM roles_permissions ORDER BY role_name');
        console.table(rolePerms);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkPermissions();
