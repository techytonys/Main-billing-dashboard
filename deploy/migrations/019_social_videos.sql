CREATE TABLE IF NOT EXISTS social_videos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  hashtags TEXT,
  original_url TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER,
  duration NUMERIC,
  width INTEGER,
  height INTEGER,
  thumbnail_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ready',
  uploaded_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE social_videos ADD COLUMN IF NOT EXISTS hashtags TEXT;

CREATE TABLE IF NOT EXISTS social_video_variants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR NOT NULL,
  platform VARCHAR(30) NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  url TEXT NOT NULL,
  file_size INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_posts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR,
  platform VARCHAR(30) NOT NULL,
  caption TEXT,
  hashtags TEXT,
  scheduled_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
