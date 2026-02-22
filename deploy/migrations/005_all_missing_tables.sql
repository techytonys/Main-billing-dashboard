-- Knowledge base articles table
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'draft',
  notion_page_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}'
);

-- Knowledge base categories table
CREATE TABLE IF NOT EXISTS knowledge_base_categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Folder',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge base tags table
CREATE TABLE IF NOT EXISTS knowledge_base_tags (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Tag',
  color TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  license_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  max_activations INTEGER DEFAULT 0,
  activation_count INTEGER DEFAULT 0,
  last_activated_at TIMESTAMP,
  last_activated_ip TEXT,
  last_activated_hostname TEXT,
  expires_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- License activations table
CREATE TABLE IF NOT EXISTS license_activations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id VARCHAR NOT NULL,
  server_id VARCHAR,
  server_ip TEXT,
  hostname TEXT,
  activated_at TIMESTAMP DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  released_at TIMESTAMP
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  domain TEXT,
  email_guess TEXT,
  google_place_id TEXT,
  google_rating NUMERIC,
  google_review_count INTEGER,
  category TEXT,
  zip_code TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  last_contacted_at TIMESTAMP,
  audit_score INTEGER,
  audit_data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Linode servers table
CREATE TABLE IF NOT EXISTS linode_servers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  linode_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  customer_id VARCHAR,
  region TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  plan_label TEXT,
  status TEXT NOT NULL DEFAULT 'provisioning',
  ipv4 TEXT,
  ipv6 TEXT,
  vcpus INTEGER,
  memory INTEGER,
  disk INTEGER,
  monthly_price_cents INTEGER,
  markup_percent INTEGER DEFAULT 20,
  last_stats_at TIMESTAMP,
  network_in NUMERIC,
  network_out NUMERIC,
  cpu_usage NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  last_invoice_at TIMESTAMP,
  ssh_user TEXT,
  ssh_port INTEGER,
  ssh_public_key TEXT,
  server_setup_complete BOOLEAN DEFAULT false
);

-- Usage records table
CREATE TABLE IF NOT EXISTS usage_records (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  subscription_id VARCHAR,
  metric_name TEXT NOT NULL,
  metric_code TEXT NOT NULL,
  units NUMERIC NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Git backup configs table
CREATE TABLE IF NOT EXISTS git_backup_configs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL,
  customer_id VARCHAR NOT NULL,
  github_token TEXT,
  github_username TEXT,
  github_repo TEXT,
  github_branch TEXT DEFAULT 'main',
  autopilot_enabled BOOLEAN DEFAULT false,
  autopilot_frequency TEXT DEFAULT 'daily',
  last_push_at TIMESTAMP,
  next_scheduled_at TIMESTAMP,
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Git backup logs table
CREATE TABLE IF NOT EXISTS git_backup_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id VARCHAR NOT NULL,
  project_id VARCHAR NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  commit_sha TEXT,
  commit_message TEXT,
  files_count INTEGER,
  error_message TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW()
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  customer_id VARCHAR,
  scopes TEXT NOT NULL DEFAULT 'read',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent cost entries table
CREATE TABLE IF NOT EXISTS agent_cost_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR,
  customer_id VARCHAR,
  description TEXT NOT NULL,
  agent_cost_cents INTEGER NOT NULL,
  markup_percent INTEGER NOT NULL DEFAULT 50,
  client_charge_cents INTEGER NOT NULL,
  session_date TIMESTAMP DEFAULT NOW(),
  invoice_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quote requests table
CREATE TABLE IF NOT EXISTS quote_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  project_type TEXT NOT NULL,
  budget TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quote line items table
CREATE TABLE IF NOT EXISTS quote_line_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id VARCHAR NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL
);

-- Quote comments table
CREATE TABLE IF NOT EXISTS quote_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id VARCHAR NOT NULL,
  sender_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure all project columns exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deploy_platform TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS netlify_site_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS netlify_site_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS vercel_project_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS vercel_project_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS railway_project_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS railway_project_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS railway_service_id TEXT;

-- Ensure knowledge base article tags column exists
ALTER TABLE knowledge_base_articles ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
