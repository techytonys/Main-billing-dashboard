CREATE TABLE IF NOT EXISTS tracked_links (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  label VARCHAR(200),
  custom_domain VARCHAR(255),
  total_clicks INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracked_link_clicks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id VARCHAR NOT NULL,
  visitor_id VARCHAR(100),
  ip VARCHAR(45),
  user_agent TEXT,
  device VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100),
  referrer TEXT,
  is_unique BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracked_links_slug ON tracked_links(slug);
CREATE INDEX IF NOT EXISTS idx_tracked_link_clicks_link_id ON tracked_link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_tracked_link_clicks_created_at ON tracked_link_clicks(created_at);
