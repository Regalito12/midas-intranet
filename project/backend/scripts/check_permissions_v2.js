
const pool = require('../src/config/db');

async function checkPermissions() {
    try {
        console.log('\n--- PERMISOS DEFINIDOS ---');
        const [permissions] = await pool.query('SELECT * FROM permissions ORDER BY module, code');
        console.table(permissions);

        console.log('\n--- ASIGNACIÓN DE ROLES (Roles -> Permisos) ---');
        // Joining tables to make it readable
        const [rolePerms] = await pool.query(`
            SELECT r.name as role, p.code as permission, p.module
            FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            JOIN permissions p ON rp.permission_id = p.id
            ORDER BY r.name, p.module
        `);
        console.table(rolePerms);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkPermissions();
