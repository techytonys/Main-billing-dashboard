-- Comprehensive migration to fix all tables for production deployment
-- This handles both fresh installs and fixing existing databases

-- ============================================
-- FIX 1: Users table - ensure snake_case columns
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='firstName') THEN
    ALTER TABLE users RENAME COLUMN "firstName" TO first_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='lastName') THEN
    ALTER TABLE users RENAME COLUMN "lastName" TO last_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profileImageUrl') THEN
    ALTER TABLE users RENAME COLUMN "profileImageUrl" TO profile_image_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='createdAt') THEN
    ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updatedAt') THEN
    ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- ============================================
-- FIX 2: Sessions table - must match connect-pg-simple format
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='sid') THEN
      DROP TABLE sessions;
      CREATE TABLE sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX "IDX_session_expire" ON sessions (expire);
    END IF;
  ELSE
    CREATE TABLE sessions (
      sid VARCHAR NOT NULL PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);
  END IF;
END $$;

-- ============================================
-- CORE TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  portal_token TEXT UNIQUE,
  stripe_customer_id TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  preview_url TEXT,
  progress_url TEXT,
  github_repo_url TEXT,
  deploy_platform TEXT,
  netlify_site_id TEXT,
  netlify_site_url TEXT,
  vercel_project_id TEXT,
  vercel_project_url TEXT,
  railway_project_id TEXT,
  railway_project_url TEXT,
  railway_service_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_rates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rate_cents INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'page',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL,
  rate_id VARCHAR NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  description TEXT,
  entry_date TIMESTAMP DEFAULT NOW(),
  is_billed BOOLEAN DEFAULT false,
  invoice_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  project_id VARCHAR,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id VARCHAR NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'admin',
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'client',
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qa_questions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  is_answered BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  answered_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  invoice_id VARCHAR NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  installment_count INTEGER NOT NULL DEFAULT 3,
  installments_paid INTEGER NOT NULL DEFAULT 0,
  installment_amount_cents INTEGER NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'pending',
  next_payment_date TIMESTAMP,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  brand TEXT,
  last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  plan_name TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  price_cents INTEGER NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_updates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'progress',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_screenshots (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_client_files (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by TEXT NOT NULL DEFAULT 'client',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR,
  quote_number TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  valid_until TIMESTAMP,
  client_name TEXT,
  client_email TEXT,
  client_company TEXT,
  approved_at TIMESTAMP,
  denied_at TIMESTAMP,
  denial_reason TEXT,
  portal_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS knowledge_base_categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Folder',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_base_tags (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Tag',
  color TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS usage_records (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  subscription_id VARCHAR,
  metric_name TEXT NOT NULL,
  metric_code TEXT NOT NULL,
  units NUMERIC NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS quote_line_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id VARCHAR NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id VARCHAR NOT NULL,
  sender_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- COMMUNITY TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS community_posts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_role TEXT DEFAULT 'admin',
  author_user_id VARCHAR,
  author_type TEXT DEFAULT 'admin',
  title TEXT,
  body TEXT NOT NULL,
  image_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  hearts_count INTEGER DEFAULT 0,
  haha_count INTEGER DEFAULT 0,
  angry_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  mentions TEXT[],
  group_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_type TEXT NOT NULL DEFAULT 'client',
  author_user_id VARCHAR,
  customer_id VARCHAR,
  body TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  mentions TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_reactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR NOT NULL,
  comment_id VARCHAR,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  actor_name TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'client',
  actor_user_id VARCHAR,
  customer_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL DEFAULT 'admin',
  recipient_id VARCHAR,
  recipient_user_id VARCHAR,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  post_id VARCHAR,
  comment_id VARCHAR,
  actor_name TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

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
  created_at TIMESTAMP DEFAULT NOW(),
  website_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  github_url TEXT,
  tiktok_url TEXT,
  totp_secret TEXT,
  two_factor_enabled BOOLEAN DEFAULT false,
  admin_user_id TEXT
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
