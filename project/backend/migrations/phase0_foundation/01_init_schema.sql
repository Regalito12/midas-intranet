-- =================================================================
-- PHASE 0: FOUNDATION LAYER (SAFE DEPLOYMENT)
-- =================================================================
-- Description: Creates structural tables for Audit, RBAC, and Rules.
-- Status: Safe to run on Production. No data modification.
-- =================================================================

-- 1. AUDIT LOGS (Historial Inalterable)
-- ======================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL COMMENT 'ID del usuario que hizo la acción (Null si es sistema)',
  `user_email` VARCHAR(150) NULL COMMENT 'Email redundante por si borran el usuario',
  `action` VARCHAR(100) NOT NULL COMMENT 'Código de acción: CREATE, UPDATE, DELETE, LOGIN, APPROVE',
  `entity` VARCHAR(100) NOT NULL COMMENT 'Tabla afectada: requests, budgets, users',
  `entity_id` VARCHAR(255) NULL COMMENT 'ID del registro afectado',
  `old_values` JSON NULL COMMENT 'Snapshot antes del cambio',
  `new_values` JSON NULL COMMENT 'Snapshot después del cambio',
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `status` VARCHAR(20) DEFAULT 'SUCCESS' COMMENT 'SUCCESS, FAILURE, ATTEMPT',
  `error_details` TEXT NULL COMMENT 'Si falló, por qué',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_entity` (`entity`, `entity_id`),
  INDEX `idx_audit_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. PERMISSIONS (Granularidad)
-- ==============================
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(100) NOT NULL COMMENT 'Clave única: budget.view, project.create',
  `description` VARCHAR(255) NOT NULL,
  `module` VARCHAR(50) NOT NULL COMMENT 'Categoría: FINANCE, HR, SYSTEM',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_perm_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. ROLES_PERMISSIONS (Puente Compatible)
-- =========================================
-- Mapea los roles existentes (strings) a permisos granulares
CREATE TABLE IF NOT EXISTS `roles_permissions` (
  `role_name` VARCHAR(50) NOT NULL COMMENT 'Coincide con users.role (admin, rrhh, etc)',
  `permission_id` INT UNSIGNED NOT NULL,
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_name`, `permission_id`),
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. BUSINESS RULES (Motor de Lógica)
-- ====================================
CREATE TABLE IF NOT EXISTS `business_rules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Ej: RULE_MAX_BUDGET_01',
  `description` VARCHAR(255) NOT NULL,
  `entity` VARCHAR(50) NOT NULL COMMENT 'Contexto: REQUEST, PAYROLL',
  `conditions` JSON NOT NULL COMMENT 'Lógica en JSON para el motor',
  `actions` JSON NOT NULL COMMENT 'Qué pasa si se cumple',
  `is_active` TINYINT(1) DEFAULT 1,
  `priority` INT DEFAULT 0 COMMENT 'Orden de ejecución',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_rule_entity` (`entity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- SEED INICIAL (SOLO ESTRUCTURA, NO DATOS DE USUARIO)
-- Insertar permisos básicos para que la tabla no esté vacía
INSERT IGNORE INTO `permissions` (`code`, `description`, `module`) VALUES
('system.login', 'Acceso al sistema', 'SYSTEM'),
('backoffice.audit.view', 'Ver logs de auditoría', 'SYSTEM'),
('backoffice.access', 'Entrar al panel Backoffice', 'SYSTEM');
