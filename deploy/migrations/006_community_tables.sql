-- Migration 006: Community Feed tables
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS community_posts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_role TEXT DEFAULT 'admin',
  title TEXT,
  body TEXT NOT NULL,
  image_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  hearts_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_type TEXT NOT NULL DEFAULT 'client',
  customer_id VARCHAR,
  body TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_reactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR NOT NULL,
  comment_id VARCHAR,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  actor_name TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'client',
  customer_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL DEFAULT 'admin',
  recipient_id VARCHAR,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  post_id VARCHAR,
  comment_id VARCHAR,
  actor_name TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
