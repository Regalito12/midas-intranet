const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};

async function createSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database at ' + dbConfig.host);

        // 1. Table: budget_project_planning (Headers)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS budget_project_planning (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_code VARCHAR(50) NOT NULL UNIQUE,
                project_name VARCHAR(255) NOT NULL,
                project_type VARCHAR(100) NOT NULL,
                area_id INT NOT NULL,
                cost_center_id INT NOT NULL,
                responsible_user_id INT NOT NULL,
                description TEXT,
                project_objective TEXT,
                institutional_objective TEXT,
                expected_roi TEXT,
                budgeted_amount DECIMAL(15,2) DEFAULT 0.00,
                committed_amount DECIMAL(15,2) DEFAULT 0.00,
                spent_amount DECIMAL(15,2) DEFAULT 0.00,
                start_date DATE,
                end_date DATE,
                execution_quarter VARCHAR(10),
                fiscal_year INT,
                status VARCHAR(50) DEFAULT 'BORRADOR',
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                submitted_at TIMESTAMP NULL,
                approved_at TIMESTAMP NULL,
                approved_by INT,
                approval_notes TEXT,
                rejected_at TIMESTAMP NULL,
                rejected_by INT,
                rejection_reason TEXT,
                FOREIGN KEY (responsible_user_id) REFERENCES users(id),
                FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table created: budget_project_planning');

        // 2. Table: budget_project_items (Granular Template)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS budget_project_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                phase VARCHAR(50) DEFAULT 'Q1',
                FOREIGN KEY (project_id) REFERENCES budget_project_planning(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table created: budget_project_items');

        // 3. Table: budget_project_approvals (Workflow)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS budget_project_approvals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                approval_level INT NOT NULL,
                required_role VARCHAR(50) NOT NULL,
                approver_id INT,
                approval_status VARCHAR(50) DEFAULT 'PENDIENTE',
                approval_date TIMESTAMP NULL,
                notes TEXT,
                FOREIGN KEY (project_id) REFERENCES budget_project_planning(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table created: budget_project_approvals');

        process.exit(0);

    } catch (error) {
        console.error('Schema creation failed:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

createSchema();
