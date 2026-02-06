-- =============================================================================
-- Migration: Add completion and cancellation fields to budget_project_planning
-- Date: 2026-02-06
-- Description: Agregar campos para completar y cancelar proyectos
-- =============================================================================

USE intranet_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Agregar columnas para completar proyecto
ALTER TABLE budget_project_planning
ADD COLUMN IF NOT EXISTS completed_by INT NULL COMMENT 'Usuario que completó el proyecto',
ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL COMMENT 'Fecha en que se completó',
ADD COLUMN IF NOT EXISTS completion_notes TEXT NULL COMMENT 'Notas de cierre del proyecto';

-- Agregar columnas para cancelar proyecto
ALTER TABLE budget_project_planning
ADD COLUMN IF NOT EXISTS cancelled_by INT NULL COMMENT 'Usuario que canceló el proyecto',
ADD COLUMN IF NOT EXISTS cancelled_at DATETIME NULL COMMENT 'Fecha de cancelación',
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL COMMENT 'Razón de la cancelación';

-- Crear índices para búsquedas
ALTER TABLE budget_project_planning
ADD INDEX IF NOT EXISTS idx_completed_by (completed_by),
ADD INDEX IF NOT EXISTS idx_cancelled_by (cancelled_by);

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Migration completed: completion and cancellation fields added successfully!' AS status;
