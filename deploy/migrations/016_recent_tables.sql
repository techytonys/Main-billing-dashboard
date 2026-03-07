CREATE TABLE IF NOT EXISTS dns_zones (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  customer_id VARCHAR,
  server_id VARCHAR,
  linode_domain_id INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS directory_submissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_name TEXT NOT NULL,
  directory_url TEXT,
  category TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  submitted_at TIMESTAMP,
  notes TEXT,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_keywords (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  domain TEXT,
  position INTEGER,
  previous_position INTEGER,
  search_volume INTEGER,
  cpc TEXT,
  status TEXT DEFAULT 'tracking',
  tags TEXT,
  notes TEXT,
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_keyword_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id VARCHAR NOT NULL,
  position INTEGER,
  checked_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_questionnaires (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  fields TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_responses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id VARCHAR NOT NULL,
  customer_id VARCHAR NOT NULL,
  project_id VARCHAR,
  responses TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_client_files (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL,
  customer_id VARCHAR NOT NULL,
  object_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by TEXT DEFAULT 'client',
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
