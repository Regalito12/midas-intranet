# Budget Planning Matrix - Installation Guide

## Pre-requisites

- MySQL/MariaDB database running
- Node.js backend server stopped
- Database backup created (recommended)

## Installation Steps

### 1. Database Migration

Run the migration SQL file to create all required tables and permissions:

```bash
# Option 1: From command line
mysql -u root -p intranet_db < migrations/002_budget_planning_matrix.sql

# Option 2: From phpMyAdmin
# - Open phpMyAdmin
# - Select your database (e.g., intranet_db)
# - Go to SQL tab
# - Copy and paste the contents of migrations/002_budget_planning_matrix.sql
# - Click "Go"
```

### 2. Verify Migration

After running the migration, verify that the tables were created:

```sql
-- Check new tables
SHOW TABLES LIKE 'budget%';

-- Expected output:
-- budget_planning_schema_versions
-- budget_project_approvals
-- budget_project_planning

-- Check modified table
DESCRIBE purchase_requests;

-- Verify new columns exist:
-- - planned_project_id
-- - is_unplanned  
-- - unplanned_justification

-- Check permissions
SELECT code, description FROM permissions WHERE code LIKE 'project.planning.%';

-- Expected output: 6 new permissions
```

### 3. Start Backend Server

No code changes are required to existing deployed code - just restart the server:

```bash
cd project/backend
npm start
```

The new routes will be automatically registered at `/api/budget/projects`.

### 4. Verify API Endpoints

Test that the API is responding:

```bash
# Get your auth token first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@midas.com","password":"your_password"}'

# Test project planning endpoint
curl -X GET http://localhost:5000/api/budget/projects \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {"success": true, "data": [], "total": 0}
```

### 5. Test Project Creation

Create a test project to verify functionality:

```bash
curl -X POST http://localhost:5000/api/budget/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Test Project",
    "project_type": "TECNOLOGÍA",
    "area_id": 1,
    "cost_center_id": 1,
    "description": "Test project for validation",
    "project_objective": "Test objective",
    "institutional_objective": "Align with strategic goals",
    "budgeted_amount": 10000.00,
    "start_date": "2026-02-01",
    "end_date": "2026-03-31",
    "execution_quarter": "Q1",
    "fiscal_year": 2026
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "project_code": "AREA1-2026-Q1-001",
    "status": "BORRADOR",
    "available_amount": 10000.00
  },
  "message": "Proyecto creado exitosamente"
}
```

## Post-Installation

### Update Existing Purchase Requests

Existing purchase requests without a planned project have been automatically marked as "unplanned":

```sql
SELECT 
  request_number,
  is_unplanned,
  unplanned_justification 
FROM purchase_requests 
WHERE is_unplanned = TRUE 
LIMIT 10;
```

### Assign Permissions to Users

Make sure users have the appropriate permissions to use the new module:

```sql
-- Example: Give all gerentes the ability to create and approve projects
INSERT IGNORE INTO roles_permissions (role_name, permission_id) 
SELECT 'gerente', id FROM permissions 
WHERE code IN ('project.planning.create', 'project.planning.approve');
```

## Rollback (if needed)

If you need to rollback the changes:

```sql
-- Remove new tables
DROP TABLE IF EXISTS budget_project_approvals;
DROP TABLE IF EXISTS budget_planning_schema_versions;
DROP TABLE IF EXISTS budget_project_planning;

-- Remove columns from purchase_requests
ALTER TABLE purchase_requests 
  DROP COLUMN IF EXISTS planned_project_id,
  DROP COLUMN IF EXISTS is_unplanned,
  DROP COLUMN IF EXISTS unplanned_justification;

-- Remove permissions
DELETE FROM roles_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE code LIKE 'project.planning.%'
);
DELETE FROM permissions WHERE code LIKE 'project.planning.%';
```

## Troubleshooting

### Issue: "Column already exists" error

**Solution:** The migration script checks if columns exist before adding them. If you see this error, the column is already present and you can safely ignore it.

### Issue: "Foreign key constraint fails"

**Solution:** Make sure `area_id` and `cost_center_id` exist in your `departments` and `cost_centers` tables respectively.

### Issue: "Permission denied"

**Solution:** Make sure your user has the correct permissions:

```sql
SELECT rp.*, p.code 
FROM roles_permissions rp 
JOIN permissions p ON rp.permission_id = p.id 
WHERE rp.role_name = 'YOUR_ROLE';
```

## Next Steps

1. **Frontend Integration** - Update the frontend to include project selection in purchase request form
2. **User Training** - Train users on the new planning workflow
3. **Data Migration** - If you have existing projects in spreadsheets, migrate them to the system
4. **Reports** - Create dashboard views for project budget monitoring

## Support

For issues or questions, check the implementation plan document or contact the development team.
