-- ============================================================================
-- MIGRACIÓN: MATRIZ DE PLANIFICACIÓN PRESUPUESTARIA
-- Versión: 1.0
-- Fecha: 2026-02-01
-- Descripción: Implementa sistema de planificación de proyectos presupuestarios
--              con integración al módulo de compras existente
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. TABLA PRINCIPAL: PROYECTOS PLANIFICADOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_project_planning (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Identificación
  project_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Ej: TECH-2026-Q1-001',
  project_name VARCHAR(255) NOT NULL,
  project_type ENUM(
    'INFRAESTRUCTURA',
    'TECNOLOGÍA', 
    'OPERATIVO',
    'MARKETING',
    'CAPACITACIÓN',
    'MANTENIMIENTO',
    'OTRO'
  ) NOT NULL,
  
  -- Asignación organizacional
  area_id INT NOT NULL COMMENT 'FK a departments',
  cost_center_id INT NOT NULL COMMENT 'FK a cost_centers',
  responsible_user_id INT NOT NULL COMMENT 'Usuario responsable del proyecto',
  
  -- Descripción
  description TEXT NOT NULL,
  project_objective TEXT NOT NULL COMMENT 'Objetivo específico del proyecto',
  institutional_objective TEXT NOT NULL COMMENT 'Objetivo institucional alineado',
  expected_roi TEXT COMMENT 'ROI esperado (cuantitativo o cualitativo)',
  
  -- Presupuesto
  budgeted_amount DECIMAL(12,2) NOT NULL,
  committed_amount DECIMAL(12,2) DEFAULT 0 COMMENT 'Fondos reservados en solicitudes aprobadas',
  spent_amount DECIMAL(12,2) DEFAULT 0 COMMENT 'Fondos ejecutados en órdenes de compra',
  available_amount DECIMAL(12,2) GENERATED ALWAYS AS (
    budgeted_amount - committed_amount - spent_amount
  ) STORED,
  
  -- Planificación temporal
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  execution_quarter ENUM('Q1', 'Q2', 'Q3', 'Q4') NOT NULL,
  fiscal_year INT NOT NULL,
  
  -- Estado y aprobación
  status ENUM(
    'BORRADOR',              -- Creado pero no enviado
    'PENDIENTE_APROBACION',  -- Esperando revisión
    'APROBADO',              -- Aprobado por gerencia
    'RECHAZADO',             -- No aprobado
    'EN_EJECUCION',          -- Tiene compras activas
    'COMPLETADO',            -- Cerrado y completado
    'CANCELADO'              -- Cancelado después de aprobación
  ) DEFAULT 'BORRADOR',
  
  -- Flujo de aprobación
  submitted_at DATETIME NULL,
  approved_by INT NULL,
  approved_at DATETIME NULL,
  approval_notes TEXT NULL,
  rejected_by INT NULL,
  rejected_at DATETIME NULL,
  rejection_reason TEXT NULL,
  
  -- Auditoría
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL COMMENT 'Soft delete',
  
  -- Versionado
  schema_version INT DEFAULT 1,
  
  -- Índices
  INDEX idx_project_code (project_code),
  INDEX idx_area (area_id),
  INDEX idx_cost_center (cost_center_id),
  INDEX idx_status (status),
  INDEX idx_quarter (execution_quarter, fiscal_year),
  INDEX idx_responsible (responsible_user_id),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Matriz de planificación presupuestaria - Proyectos aprobados por gerencia';

-- =============================================================================
-- 2. TABLA DE VERSIONADO DE ESQUEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_planning_schema_versions (
  version INT PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  schema_definition JSON NOT NULL COMMENT 'Metadata de campos requeridos',
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_effective (effective_from, effective_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COMMENT='Control de versiones del esquema de planificación';

-- Versión inicial
INSERT INTO budget_planning_schema_versions (version, description, schema_definition, effective_from)
VALUES (
  1,
  'Versión inicial de matriz de planificación',
  JSON_OBJECT(
    'required_fields', JSON_ARRAY(
      'project_code', 'project_name', 'project_type', 'area_id', 
      'cost_center_id', 'budgeted_amount', 'start_date', 'end_date', 
      'execution_quarter', 'fiscal_year'
    ),
    'optional_fields', JSON_ARRAY(
      'expected_roi', 'approval_notes', 'rejection_reason'
    )
  ),
  '2026-01-01'
) ON DUPLICATE KEY UPDATE version = version;

-- =============================================================================
-- 3. TABLA DE HISTORIAL DE APROBACIONES DE PROYECTOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_project_approvals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  approval_level INT NOT NULL COMMENT '1=Gerente de Área, 2=Director, 3=Alta Gerencia',
  required_role VARCHAR(50) NOT NULL,
  approver_id INT NULL,
  approval_status ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') DEFAULT 'PENDIENTE',
  approval_date DATETIME NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_project_approval (project_id, approval_level),
  INDEX idx_project (project_id),
  INDEX idx_approver (approver_id),
  INDEX idx_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COMMENT='Historial de aprobaciones multi-nivel de proyectos';

-- =============================================================================
-- 4. MODIFICACIONES A TABLA EXISTENTE: purchase_requests
-- =============================================================================

-- Verificar si las columnas ya existen antes de agregarlas
SET @dbname = DATABASE();
SET @tablename = 'purchase_requests';

-- Columna: planned_project_id
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'planned_project_id';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE purchase_requests ADD COLUMN planned_project_id INT NULL COMMENT ''FK a budget_project_planning''',
  'SELECT ''Column planned_project_id already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Columna: is_unplanned
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'is_unplanned';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE purchase_requests ADD COLUMN is_unplanned BOOLEAN DEFAULT FALSE COMMENT ''Indica si es compra no planificada''',
  'SELECT ''Column is_unplanned already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Columna: unplanned_justification
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'unplanned_justification';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE purchase_requests ADD COLUMN unplanned_justification TEXT NULL COMMENT ''Justificación obligatoria si is_unplanned=TRUE''',
  'SELECT ''Column unplanned_justification already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar índice
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND INDEX_NAME = 'idx_planned_project';

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE purchase_requests ADD INDEX idx_planned_project (planned_project_id)',
  'SELECT ''Index idx_planned_project already exists'' AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- 5. MIGRACIÓN DE DATOS HISTÓRICOS
-- =============================================================================

-- Marcar todas las solicitudes existentes sin proyecto como "no planificadas"
UPDATE purchase_requests 
SET is_unplanned = TRUE,
    unplanned_justification = 'Solicitud creada antes de implementar matriz de planificación'
WHERE planned_project_id IS NULL 
  AND status NOT IN ('BORRADOR', 'RECHAZADO')
  AND is_unplanned = FALSE;

-- =============================================================================
-- 6. PERMISOS RBAC
-- =============================================================================

-- Agregar nuevos permisos al sistema
INSERT IGNORE INTO permissions (code, description, module) VALUES
('project.planning.view', 'Ver proyectos planificados', 'FINANCE'),
('project.planning.create', 'Crear proyectos planificados', 'FINANCE'),
('project.planning.edit', 'Editar proyectos propios', 'FINANCE'),
('project.planning.approve', 'Aprobar proyectos', 'FINANCE'),
('project.planning.view_all', 'Ver todos los proyectos (cross-department)', 'FINANCE'),
('project.planning.manage_matrix', 'Administrar matriz de planificación', 'SYSTEM');

-- Asignar permisos a roles existentes

-- Admin: Todos los permisos
INSERT IGNORE INTO roles_permissions (role_name, permission_id) 
SELECT 'admin', id FROM permissions WHERE code LIKE 'project.planning.%';

-- Alta Gerencia: Ver todo, aprobar
INSERT IGNORE INTO roles_permissions (role_name, permission_id) 
SELECT 'alta_gerencia', id FROM permissions WHERE code IN (
  'project.planning.view',
  'project.planning.view_all',
  'project.planning.approve'
);

-- Gerente: Ver, crear, editar, aprobar (nivel 1)
INSERT IGNORE INTO roles_permissions (role_name, permission_id) 
SELECT 'gerente', id FROM permissions WHERE code IN (
  'project.planning.view',  
  'project.planning.create',
  'project.planning.edit',
  'project.planning.approve'
);

-- Director: Ver, crear, editar (nivel 2)
INSERT IGNORE INTO roles_permissions (role_name, permission_id) 
SELECT 'director', id FROM permissions WHERE code IN (
  'project.planning.view',
  'project.planning.create',
  'project.planning.edit'
);

-- Finanzas: Ver todo
INSERT IGNORE INTO roles_permissions (role_name, permission_id) 
SELECT 'finanzas', id FROM permissions WHERE code IN (
  'project.planning.view',
  'project.planning.view_all'
);

-- =============================================================================
-- 7. DATOS DE EJEMPLO (OPCIONAL - COMENTAR EN PRODUCCIÓN)
-- =============================================================================

-- Descomentar solo para ambiente de desarrollo/testing
/*
INSERT INTO budget_project_planning (
  project_code, project_name, project_type, area_id, cost_center_id,
  responsible_user_id, description, project_objective, institutional_objective,
  expected_roi, budgeted_amount, start_date, end_date, execution_quarter,
  fiscal_year, status, created_by
) VALUES (
  'TECH-2026-Q1-001',
  'Upgrade Infraestructura IT',
  'TECNOLOGÍA',
  1, -- Ajustar según tu BD
  1, -- Ajustar según tu BD
  1, -- Ajustar según tu BD
  'Actualización de servidores y equipos de red para mejorar performance',
  'Mejorar tiempo de respuesta del sistema en 50%',
  'Transformación Digital 2026',
  'Reducción 30% en costos operativos anuales',
  250000.00,
  '2026-01-01',
  '2026-03-31',
  'Q1',
  2026,
  'BORRADOR',
  1 -- Ajustar según tu BD
);
*/

-- =============================================================================
-- 8. AUDITORÍA: Registrar migración
-- =============================================================================

INSERT INTO audit_logs (
  user_id, 
  action, 
  entity, 
  entity_id,
  new_values,
  ip_address,
  status
) VALUES (
  NULL,
  'MIGRATION_EXECUTED',
  'budget_project_planning',
  '002',
  JSON_OBJECT(
    'migration', '002_budget_planning_matrix.sql',
    'description', 'Implementación de matriz de planificación presupuestaria',
    'timestamp', NOW()
  ),
  '127.0.0.1',
  'SUCCESS'
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================

SELECT 'Migration 002_budget_planning_matrix.sql completed successfully!' AS status;

-- Mostrar tablas creadas
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'budget_project_planning',
    'budget_planning_schema_versions',
    'budget_project_approvals'
  );

-- Mostrar columnas agregadas a purchase_requests
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'purchase_requests'
  AND COLUMN_NAME IN ('planned_project_id', 'is_unplanned', 'unplanned_justification');

-- Mostrar permisos agregados
SELECT 
  p.code,
  p.description,
  COUNT(rp.role_name) as roles_assigned
FROM permissions p
LEFT JOIN roles_permissions rp ON p.id = rp.permission_id
WHERE p.code LIKE 'project.planning.%'
GROUP BY p.id, p.code, p.description;
