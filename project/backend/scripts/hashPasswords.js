/**
 * ============================================
 * MIDAS INTRANET - Hash All Passwords Migration
 * ============================================
 * Run this script ONCE to hash all plain text passwords.
 * After running, the system will NO LONGER accept plain text passwords.
 * 
 * Usage: node hashPasswords.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12; // Enterprise standard

async function hashAllPasswords() {
    console.log('========================================');
    console.log('MIDAS Password Migration Script');
    console.log('========================================\n');

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'intranet_db',
        port: parseInt(process.env.DB_PORT) || 3306
    });

    try {
        // Get all users with plain text passwords
        const [users] = await pool.query(
            "SELECT id, username, password FROM users WHERE password NOT LIKE '$2a$%' AND password NOT LIKE '$2b$%'"
        );

        console.log(`Found ${users.length} user(s) with plain text passwords.\n`);

        if (users.length === 0) {
            console.log('✅ All passwords are already hashed. Nothing to do.');
            await pool.end();
            return;
        }

        let updated = 0;
        let failed = 0;

        for (const user of users) {
            try {
                console.log(`Hashing password for user: ${user.username}...`);

                const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
                const hashedPassword = await bcrypt.hash(user.password, salt);

                await pool.query(
                    'UPDATE users SET password = ? WHERE id = ?',
                    [hashedPassword, user.id]
                );

                console.log(`  ✓ User ${user.username} updated successfully`);
                updated++;
            } catch (error) {
                console.error(`  ✗ Failed to update ${user.username}: ${error.message}`);
                failed++;
            }
        }

        console.log('\n========================================');
        console.log('Migration Complete');
        console.log('========================================');
        console.log(`✓ Updated: ${updated}`);
        console.log(`✗ Failed: ${failed}`);
        console.log(`Total: ${users.length}`);

        if (failed === 0) {
            console.log('\n✅ All passwords successfully hashed!');
            console.log('The system will now ONLY accept bcrypt hashed passwords.');
        } else {
            console.log('\n⚠️  Some passwords failed to hash. Please review and retry.');
        }

        await pool.end();
    } catch (error) {
        console.error('Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

hashAllPasswords();
