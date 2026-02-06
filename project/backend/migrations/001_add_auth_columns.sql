-- ============================================
-- MIDAS INTRANET - Schema Updates for Enterprise
-- ============================================
-- Run this migration to add required columns for:
-- - Refresh token storage (for revocation)
-- - Last login tracking
-- - Deleted at for soft delete
-- ============================================

-- Add refresh_token column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS last_login DATETIME NULL,
ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD INDEX IF NOT EXISTS idx_deleted_at (deleted_at),
ADD INDEX IF NOT EXISTS idx_username_deleted (username, deleted_at);

-- Add status to users if not exists
-- This is for account status (active/inactive/suspended)

-- Verify changes
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'users' 
AND TABLE_SCHEMA = DATABASE()
ORDER BY ORDINAL_POSITION;
