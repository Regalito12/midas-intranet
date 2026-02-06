-- ============================================================================
-- FASE 1: MÓDULO DE COMPRAS EMPRESARIAL - Versión Mínima
-- Crea las tablas SIN foreign keys para evitar problemas de dependencia
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. EMPRESAS
CREATE TABLE IF NOT EXISTS companies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  tax_id VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO companies (code, name, legal_name) VALUES
('MIDAS-DOM', 'Midas Dominicana', 'Midas Dominicana SRL'),
('MIDAS-SEG', 'Midas Seguros', 'Midas Seguros SA');

-- 2. CENTROS DE COSTO
CREATE TABLE IF NOT EXISTS cost_centers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_id INT NOT NULL,
  department_id INT,
  manager_id INT,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. PRESUPUESTOS
CREATE TABLE IF NOT EXISTS budgets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cost_center_id INT NOT NULL,
  fiscal_year INT NOT NULL,
  fiscal_period VARCHAR(10),
  allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  spent_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  committed_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  available_amount DECIMAL(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount - committed_amount) STORED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_budget (cost_center_id, fiscal_year, fiscal_period),
  INDEX idx_cost_center (cost_center_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. SOLICITUDES DE COMPRA
CREATE TABLE IF NOT EXISTS purchase_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_number VARCHAR(20) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  company_id INT NOT NULL,
  cost_center_id INT NOT NULL,
  assignment_type ENUM('PROYECTO', 'RECURRENTE', 'TAREA_INTERNA') NOT NULL,
  assignment_reference VARCHAR(100),
  product_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  estimated_price DECIMAL(12,2),
  total_estimated DECIMAL(12,2) GENERATED ALWAYS AS (quantity * IFNULL(estimated_price, 0)) STORED,
  status ENUM('SOLICITADO', 'LIBERADO', 'APROBADO', 'RECHAZADO', 'EN_COMPRAS', 'ORDEN_GENERADA', 'CERRADO') NOT NULL DEFAULT 'SOLICITADO',
  released_by INT,
  released_at DATETIME,
  released_notes TEXT,
  approved_by INT,
  approved_at DATETIME,
  approved_notes TEXT,
  rejected_by INT,
  rejected_at DATETIME,
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_request_number (request_number),
  INDEX idx_status (status),
  INDEX idx_user (user_id),
  INDEX idx_company (company_id),
  INDEX idx_cost_center (cost_center_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. ADJUNTOS
CREATE TABLE IF NOT EXISTS purchase_request_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_request_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  uploaded_by INT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_request (purchase_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. MATRIZ DE APROBACIÓN
CREATE TABLE IF NOT EXISTS approval_matrix (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT,
  min_amount DECIMAL(12,2) NOT NULL,
  max_amount DECIMAL(12,2),
  approval_levels JSON NOT NULL,
  require_all_levels BOOLEAN DEFAULT TRUE,
  parallel_approval BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_id),
  INDEX idx_amount_range (min_amount, max_amount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO approval_matrix (company_id, min_amount, max_amount, approval_levels, require_all_levels) VALUES
(NULL, 0, 49999.99, '[{"level": 1, "role_name": "GERENTE"}]', TRUE),
(NULL, 50000, 199999.99, '[{"level": 1, "role_name": "DIRECTOR"}, {"level": 2, "role_name": "VP"}]', TRUE),
(NULL, 200000, NULL, '[{"level": 1, "role_name": "DIRECTOR"}, {"level": 2, "role_name": "VP"}, {"level": 3, "role_name": "FINANZAS"}, {"level": 4, "role_name": "GERENTE_GENERAL"}]', TRUE);

-- 7. HISTORIAL DE APROBACIONES
CREATE TABLE IF NOT EXISTS purchase_approvals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_request_id INT NOT NULL,
  approval_level INT NOT NULL,
  required_role_name VARCHAR(50) NOT NULL,
  approver_id INT,
  approval_status ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') DEFAULT 'PENDIENTE',
  approval_date DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_approval (purchase_request_id, approval_level, required_role_name),
  INDEX idx_request (purchase_request_id),
  INDEX idx_approver (approver_id),
  INDEX idx_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. ÓRDENES DE COMPRA
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  po_number VARCHAR(20) UNIQUE NOT NULL,
  purchase_request_id INT NOT NULL,
  final_supplier VARCHAR(255) NOT NULL,
  final_unit_price DECIMAL(12,2) NOT NULL,
  final_quantity DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  digital_signature TEXT,
  signed_by INT NOT NULL,
  signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('GENERADA', 'ENVIADA', 'RECIBIDA', 'CERRADA', 'CANCELADA') DEFAULT 'GENERADA',
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_po_number (po_number),
  INDEX idx_request (purchase_request_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. SERIALES
CREATE TABLE IF NOT EXISTS purchase_serials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serial_type ENUM('PR', 'PO') NOT NULL,
  fiscal_year INT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_serial (serial_type, fiscal_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO purchase_serials (serial_type, fiscal_year, last_number) VALUES
('PR', 2026, 0),
('PO', 2026, 0);

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Migration completed successfully!' AS status;
