-- Migration 008: Community Friends & Groups
-- Adds friendships, groups, and group membership tables
-- Also adds group_id column to community_posts

CREATE TABLE IF NOT EXISTS community_friendships (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id VARCHAR NOT NULL,
  addressee_id VARCHAR NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_groups (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'users',
  color TEXT DEFAULT 'blue',
  is_private BOOLEAN DEFAULT false,
  created_by VARCHAR,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_group_members (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS group_id VARCHAR;

ALTER TABLE community_users ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE community_users ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE community_users ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE community_users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE community_users ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE community_users ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE community_users ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE community_users ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE community_users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE community_users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
