const pool = require('./src/config/db');
const projectService = require('./src/services/ProjectPlanningService');
const logger = require('./src/config/logger');
require('dotenv').config();

async function testBudgetFlow() {
    try {
        console.log('--- STARTING BUDGET FLOW TEST ---');

        // 1. Test: Create Project WITHOUT Items (Should Fail)
        console.log('\n[TEST 1] Creating Project WITHOUT Items...');
        try {
            await projectService.createProject({
                project_name: 'Test Project Fail',
                area_id: 1, // Assumes Department 1 exists
                cost_center_id: 1, // Assumes CC 1 exists
                fiscal_year: 2026,
                execution_quarter: 'Q1',
                items: []
            }, 1); // User 1
            console.error('❌ FAILED: Should have thrown error for missing items');
        } catch (error) {
            console.log('✅ PASS: Caught expected error:', error.message);
        }

        // 2. Test: Create Project WITH Items (Should Succeed)
        console.log('\n[TEST 2] Creating Project WITH Items...');
        const newProject = await projectService.createProject({
            project_name: 'Audit Validated Project',
            project_type: 'Inversión',
            area_id: 1,
            cost_center_id: 1,
            responsible_user_id: 1,
            description: 'Automated Test Project',
            project_objective: 'Obj',
            institutional_objective: 'Inst',
            start_date: '2026-01-01',
            end_date: '2026-03-31',
            fiscal_year: 2026,
            execution_quarter: 'Q1',
            items: [
                { item_name: 'Server Rack', quantity: 2, unit_price: 5000, phase: 'Q1' },
                { item_name: 'Cables', quantity: 10, unit_price: 100, phase: 'Q1' }
            ]
        }, 1);

        console.log('✅ Project Created ID:', newProject.id);
        console.log('   Total Budgeted:', newProject.budgeted_amount);

        if (parseFloat(newProject.budgeted_amount) === 11000) {
            console.log('✅ PASS: Total calculated correctly (2*5000 + 10*100 = 11000)');
        } else {
            console.error('❌ FAILED: Calculation mismatch');
        }

        // 3. Test: Verify Items in DB
        const [items] = await pool.query('SELECT * FROM budget_project_items WHERE project_id = ?', [newProject.id]);
        console.log(`✅ Items found in DB: ${items.length}`);
        if (items.length === 2) console.log('✅ PASS: Item count matches');

        // Clean up
        // await pool.query('DELETE FROM budget_project_planning WHERE id = ?', [newProject.id]);

    } catch (error) {
        console.error('❌ GENERAL ERROR:', error);
    } finally {
        process.exit(0);
    }
}

testBudgetFlow();
