ALTER TABLE purchase_requests ADD INDEX idx_planned_project (planned_project_id);
ALTER TABLE purchase_requests ADD INDEX idx_status (status);
ALTER TABLE purchase_requests ADD INDEX idx_company_id (company_id);
ALTER TABLE purchase_requests ADD INDEX idx_created_at (created_at);
