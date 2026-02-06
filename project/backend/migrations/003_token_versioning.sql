-- ============================================
-- EXIT READINESS: Session Security Enhancement
-- ============================================
-- Add token versioning to users table for session invalidation
-- When admin changes user role/permissions, increment token_version
-- to invalidate all active JWT tokens

-- Add token_version column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1 COMMENT 'Increment to invalidate all user sessions';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_token_version ON users(id, token_version);

-- USAGE:
-- When admin changes user role: UPDATE users SET token_version = token_version + 1 WHERE id = ?
-- JWT will include token_version in payload
-- authMiddleware will verify token_version matches DB value
