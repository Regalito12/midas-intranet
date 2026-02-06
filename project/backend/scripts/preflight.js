/**
 * ============================================
 * MIDAS INTRANET - Production Startup Script
 * ============================================
 * Pre-flight checks before starting the server.
 * Validates all critical components.
 */

require('dotenv').config();
const { validateEnv, config } = require('../src/config/env');
const pool = require('../src/config/db');
const logger = require('../src/config/logger');

async function preflightChecks() {
    console.log('========================================');
    console.log('MIDAS Intranet - Pre-flight Checks');
    console.log('========================================\n');

    let allPassed = true;

    // 1. Environment Variables
    console.log('1. Checking environment variables...');
    try {
        validateEnv();
        console.log('   ✓ Environment configuration valid\n');
    } catch (error) {
        console.error('   ✗ Environment validation failed');
        allPassed = false;
    }

    // 2. Database Connection
    console.log('2. Checking database connection...');
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1');
        connection.release();
        console.log('   ✓ Database connection successful\n');
    } catch (error) {
        console.error('   ✗ Database connection failed:', error.message);
        allPassed = false;
    }

    // 3. Required Tables
    console.log('3. Checking required tables...');
    const requiredTables = ['users', 'employees', 'news', 'requests', 'tickets'];
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);

        for (const table of requiredTables) {
            if (tableNames.includes(table)) {
                console.log(`   ✓ Table '${table}' exists`);
            } else {
                console.log(`   ✗ Table '${table}' missing!`);
                allPassed = false;
            }
        }
        console.log('');
    } catch (error) {
        console.error('   ✗ Could not check tables:', error.message);
        allPassed = false;
    }

    // 4. Check for unhashed passwords
    console.log('4. Checking password security...');
    try {
        const [users] = await pool.query(
            "SELECT COUNT(*) as count FROM users WHERE password NOT LIKE '$2a$%' AND password NOT LIKE '$2b$%'"
        );
        if (users[0].count > 0) {
            console.log(`   ⚠️  WARNING: ${users[0].count} user(s) have unhashed passwords!`);
            console.log('      Run: node hashPasswords.js');
        } else {
            console.log('   ✓ All passwords are properly hashed');
        }
        console.log('');
    } catch (error) {
        console.error('   ✗ Could not check passwords:', error.message);
    }

    // 5. Check logs directory
    console.log('5. Checking logs directory...');
    const fs = require('fs');
    const path = require('path');
    const logsDir = path.join(__dirname, 'logs');
    if (fs.existsSync(logsDir)) {
        console.log('   ✓ Logs directory exists\n');
    } else {
        console.log('   ✗ Logs directory missing, creating...');
        fs.mkdirSync(logsDir, { recursive: true });
        console.log('   ✓ Logs directory created\n');
    }

    // 6. Check uploads directory
    console.log('6. Checking uploads directory...');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
        console.log('   ✓ Uploads directory exists\n');
    } else {
        console.log('   ✗ Uploads directory missing, creating...');
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('   ✓ Uploads directory created\n');
    }

    // Summary
    console.log('========================================');
    if (allPassed) {
        console.log('✅ All pre-flight checks PASSED');
        console.log('   Ready to start in', config.nodeEnv, 'mode');
        console.log('========================================\n');
        return true;
    } else {
        console.log('❌ Some pre-flight checks FAILED');
        console.log('   Please fix the issues above before starting');
        console.log('========================================\n');
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    preflightChecks()
        .then(passed => {
            process.exit(passed ? 0 : 1);
        })
        .catch(error => {
            console.error('Pre-flight check error:', error);
            process.exit(1);
        });
}

module.exports = preflightChecks;
