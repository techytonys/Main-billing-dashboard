-- Migration 009: Add admin_user_id to community_users and ensure all columns exist
-- This links community accounts to admin accounts for bidirectional sync

ALTER TABLE community_users ADD COLUMN IF NOT EXISTS admin_user_id TEXT;

-- Ensure community_posts has author_type column (some deployments may be missing it)
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS author_type TEXT DEFAULT 'admin';

-- Ensure sessions table exists for admin auth
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire);
