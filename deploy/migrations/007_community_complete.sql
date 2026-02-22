-- Migration 007: Complete community tables (users, sessions, messages + missing columns)
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS community_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  customer_id VARCHAR,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  admin_reply TEXT,
  replied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to community_posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS author_user_id VARCHAR;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS author_type TEXT DEFAULT 'admin';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS haha_count INTEGER DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS angry_count INTEGER DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS mentions TEXT[];

-- Add missing columns to community_comments
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS author_user_id VARCHAR;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS mentions TEXT[];

-- Add missing columns to community_reactions
ALTER TABLE community_reactions ADD COLUMN IF NOT EXISTS actor_user_id VARCHAR;

-- Add missing columns to community_notifications
ALTER TABLE community_notifications ADD COLUMN IF NOT EXISTS recipient_user_id VARCHAR;
