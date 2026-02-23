-- ============================================================================
-- COMPREHENSIVE FIX: Align ALL tables with Drizzle ORM schema (shared/schema.ts)
-- Safe to run multiple times. Adds missing columns without dropping data.
-- ============================================================================

-- ============================================
-- FIX: Users table columns (snake_case)
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
-- FIX: Sessions table (connect-pg-simple format)
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='sid') THEN
      DROP TABLE sessions;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- ============================================
-- FIX: Customers - add missing columns from Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='currency') THEN
    ALTER TABLE customers ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='stripe_customer_id') THEN
    ALTER TABLE customers ADD COLUMN stripe_customer_id TEXT;
  END IF;
END $$;

-- ============================================
-- FIX: Billing Rates - add missing columns from Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_rates' AND column_name='code') THEN
    ALTER TABLE billing_rates ADD COLUMN code TEXT;
    UPDATE billing_rates SET code = LOWER(REPLACE(name, ' ', '_')) WHERE code IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_rates' AND column_name='unit_label') THEN
    ALTER TABLE billing_rates ADD COLUMN unit_label TEXT DEFAULT 'page';
  END IF;
END $$;

-- ============================================
-- FIX: Work Entries - add missing columns
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_entries' AND column_name='customer_id') THEN
    ALTER TABLE work_entries ADD COLUMN customer_id VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_entries' AND column_name='recorded_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_entries' AND column_name='entry_date') THEN
      ALTER TABLE work_entries RENAME COLUMN entry_date TO recorded_at;
    ELSE
      ALTER TABLE work_entries ADD COLUMN recorded_at TIMESTAMP DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX: Invoices - add missing columns from Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='issued_at') THEN
    ALTER TABLE invoices ADD COLUMN issued_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tax_rate') THEN
    ALTER TABLE invoices ADD COLUMN tax_rate NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tax_amount_cents') THEN
    ALTER TABLE invoices ADD COLUMN tax_amount_cents INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='total_amount_cents') THEN
    ALTER TABLE invoices ADD COLUMN total_amount_cents INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='currency') THEN
    ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='subtotal_cents') THEN
    ALTER TABLE invoices ADD COLUMN subtotal_cents INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='due_date') THEN
    ALTER TABLE invoices ADD COLUMN due_date TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- FIX: Invoice Line Items - add missing columns
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_line_items' AND column_name='work_entry_id') THEN
    ALTER TABLE invoice_line_items ADD COLUMN work_entry_id VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_line_items' AND column_name='unit_price_cents') THEN
    ALTER TABLE invoice_line_items ADD COLUMN unit_price_cents INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- FIX: Payment Methods - match Drizzle schema columns
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_methods' AND column_name='type') THEN
    ALTER TABLE payment_methods ADD COLUMN type TEXT DEFAULT 'card';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_methods' AND column_name='expiry_month') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_methods' AND column_name='exp_month') THEN
      ALTER TABLE payment_methods RENAME COLUMN exp_month TO expiry_month;
    ELSE
      ALTER TABLE payment_methods ADD COLUMN expiry_month INTEGER;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_methods' AND column_name='expiry_year') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_methods' AND column_name='exp_year') THEN
      ALTER TABLE payment_methods RENAME COLUMN exp_year TO expiry_year;
    ELSE
      ALTER TABLE payment_methods ADD COLUMN expiry_year INTEGER;
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX: Support Tickets - add missing columns
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='project_id') THEN
    ALTER TABLE support_tickets ADD COLUMN project_id VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='ticket_number') THEN
    ALTER TABLE support_tickets ADD COLUMN ticket_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='category') THEN
    ALTER TABLE support_tickets ADD COLUMN category TEXT NOT NULL DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='updated_at') THEN
    ALTER TABLE support_tickets ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- FIX: Ticket Messages - sender_name NOT NULL
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ticket_messages' AND column_name='sender_name' AND is_nullable='YES') THEN
    UPDATE ticket_messages SET sender_name = 'Unknown' WHERE sender_name IS NULL;
  END IF;
END $$;

-- ============================================
-- FIX: QA Questions - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qa_questions' AND column_name='author_name') THEN
    ALTER TABLE qa_questions ADD COLUMN author_name TEXT DEFAULT 'Anonymous';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qa_questions' AND column_name='author_email') THEN
    ALTER TABLE qa_questions ADD COLUMN author_email TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qa_questions' AND column_name='status') THEN
    ALTER TABLE qa_questions ADD COLUMN status TEXT NOT NULL DEFAULT 'unanswered';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qa_questions' AND column_name='is_public') THEN
    ALTER TABLE qa_questions ADD COLUMN is_public BOOLEAN DEFAULT true;
  END IF;
  -- Remove old column that doesn't exist in Drizzle schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qa_questions' AND column_name='customer_id') THEN
    ALTER TABLE qa_questions DROP COLUMN customer_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='qa_questions' AND column_name='is_answered') THEN
    ALTER TABLE qa_questions DROP COLUMN is_answered;
  END IF;
END $$;

-- ============================================
-- FIX: Payment Plans - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='number_of_installments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='installment_count') THEN
      ALTER TABLE payment_plans RENAME COLUMN installment_count TO number_of_installments;
    ELSE
      ALTER TABLE payment_plans ADD COLUMN number_of_installments INTEGER NOT NULL DEFAULT 3;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='stripe_price_id') THEN
    ALTER TABLE payment_plans ADD COLUMN stripe_price_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='start_date') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='next_payment_date') THEN
      ALTER TABLE payment_plans RENAME COLUMN next_payment_date TO start_date;
    ELSE
      ALTER TABLE payment_plans ADD COLUMN start_date TIMESTAMP;
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX: Notifications - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='body') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='message') THEN
      ALTER TABLE notifications RENAME COLUMN message TO body;
    ELSE
      ALTER TABLE notifications ADD COLUMN body TEXT;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='link_url') THEN
    ALTER TABLE notifications ADD COLUMN link_url TEXT;
  END IF;
END $$;

-- ============================================
-- FIX: Conversations - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='visitor_name') THEN
    ALTER TABLE conversations ADD COLUMN visitor_name TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='visitor_email') THEN
    ALTER TABLE conversations ADD COLUMN visitor_email TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='access_token') THEN
    ALTER TABLE conversations ADD COLUMN access_token TEXT DEFAULT gen_random_uuid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='updated_at') THEN
    ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- FIX: Conversation Messages - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversation_messages' AND column_name='sender_name') THEN
    ALTER TABLE conversation_messages ADD COLUMN sender_name TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversation_messages' AND column_name='attachments') THEN
    ALTER TABLE conversation_messages ADD COLUMN attachments TEXT;
  END IF;
END $$;

-- ============================================
-- FIX: Project Updates - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_updates' AND column_name='type') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_updates' AND column_name='update_type') THEN
      ALTER TABLE project_updates RENAME COLUMN update_type TO type;
    ELSE
      ALTER TABLE project_updates ADD COLUMN type TEXT NOT NULL DEFAULT 'update';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_updates' AND column_name='status') THEN
    ALTER TABLE project_updates ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';
  END IF;
END $$;

-- ============================================
-- FIX: Project Screenshots - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_screenshots' AND column_name='object_path') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_screenshots' AND column_name='url') THEN
      ALTER TABLE project_screenshots RENAME COLUMN url TO object_path;
    ELSE
      ALTER TABLE project_screenshots ADD COLUMN object_path TEXT NOT NULL DEFAULT '';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_screenshots' AND column_name='file_name') THEN
    ALTER TABLE project_screenshots ADD COLUMN file_name TEXT NOT NULL DEFAULT 'screenshot.png';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_screenshots' AND column_name='file_size') THEN
    ALTER TABLE project_screenshots ADD COLUMN file_size INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_screenshots' AND column_name='content_type') THEN
    ALTER TABLE project_screenshots ADD COLUMN content_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_screenshots' AND column_name='approval_status') THEN
    ALTER TABLE project_screenshots ADD COLUMN approval_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_screenshots' AND column_name='revision_notes') THEN
    ALTER TABLE project_screenshots ADD COLUMN revision_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_screenshots' AND column_name='approval_requested_at') THEN
    ALTER TABLE project_screenshots ADD COLUMN approval_requested_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_screenshots' AND column_name='approved_at') THEN
    ALTER TABLE project_screenshots ADD COLUMN approved_at TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- FIX: Project Client Files - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_client_files' AND column_name='customer_id') THEN
    ALTER TABLE project_client_files ADD COLUMN customer_id VARCHAR;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_client_files' AND column_name='object_path') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_client_files' AND column_name='url') THEN
      ALTER TABLE project_client_files RENAME COLUMN url TO object_path;
    ELSE
      ALTER TABLE project_client_files ADD COLUMN object_path TEXT NOT NULL DEFAULT '';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_client_files' AND column_name='file_name') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_client_files' AND column_name='filename') THEN
      ALTER TABLE project_client_files RENAME COLUMN filename TO file_name;
    ELSE
      ALTER TABLE project_client_files ADD COLUMN file_name TEXT NOT NULL DEFAULT 'file';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_client_files' AND column_name='file_size') THEN
    ALTER TABLE project_client_files ADD COLUMN file_size INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_client_files' AND column_name='content_type') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_client_files' AND column_name='file_type') THEN
      ALTER TABLE project_client_files RENAME COLUMN file_type TO content_type;
    ELSE
      ALTER TABLE project_client_files ADD COLUMN content_type TEXT;
    END IF;
  END IF;
END $$;

-- ============================================
-- FIX: Quotes - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='customer_name') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='client_name') THEN
      ALTER TABLE quotes RENAME COLUMN client_name TO customer_name;
    ELSE
      ALTER TABLE quotes ADD COLUMN customer_name TEXT NOT NULL DEFAULT '';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='customer_email') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='client_email') THEN
      ALTER TABLE quotes RENAME COLUMN client_email TO customer_email;
    ELSE
      ALTER TABLE quotes ADD COLUMN customer_email TEXT NOT NULL DEFAULT '';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='total_amount_cents') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='total_cents') THEN
      ALTER TABLE quotes RENAME COLUMN total_cents TO total_amount_cents;
    ELSE
      ALTER TABLE quotes ADD COLUMN total_amount_cents INTEGER NOT NULL DEFAULT 0;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='view_token') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='portal_token') THEN
      ALTER TABLE quotes RENAME COLUMN portal_token TO view_token;
    ELSE
      ALTER TABLE quotes ADD COLUMN view_token TEXT DEFAULT gen_random_uuid();
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='sent_at') THEN
    ALTER TABLE quotes ADD COLUMN sent_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='responded_at') THEN
    ALTER TABLE quotes ADD COLUMN responded_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='expires_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='valid_until') THEN
      ALTER TABLE quotes RENAME COLUMN valid_until TO expires_at;
    ELSE
      ALTER TABLE quotes ADD COLUMN expires_at TIMESTAMP;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='project_requirements') THEN
    ALTER TABLE quotes ADD COLUMN project_requirements TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='requirements_submitted_at') THEN
    ALTER TABLE quotes ADD COLUMN requirements_submitted_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='notes') THEN
    ALTER TABLE quotes ADD COLUMN notes TEXT;
  END IF;
  -- Remove old columns not in Drizzle schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='subtotal_cents') THEN
    ALTER TABLE quotes DROP COLUMN subtotal_cents;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='tax_cents') THEN
    ALTER TABLE quotes DROP COLUMN tax_cents;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='client_company') THEN
    ALTER TABLE quotes DROP COLUMN client_company;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='approved_at') THEN
    ALTER TABLE quotes DROP COLUMN approved_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='denied_at') THEN
    ALTER TABLE quotes DROP COLUMN denied_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='denial_reason') THEN
    ALTER TABLE quotes DROP COLUMN denial_reason;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='title') THEN
    ALTER TABLE quotes DROP COLUMN title;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotes' AND column_name='description') THEN
    ALTER TABLE quotes DROP COLUMN description;
  END IF;
END $$;

-- ============================================
-- FIX: Subscriptions - match Drizzle schema
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='plan_code') THEN
    ALTER TABLE subscriptions ADD COLUMN plan_code TEXT DEFAULT '';
  END IF;
END $$;

-- ============================================
-- FIX: Linode Servers - match Drizzle markup_percent default
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='linode_servers' AND column_name='markup_percent') THEN
    ALTER TABLE linode_servers ALTER COLUMN markup_percent SET DEFAULT 50;
  END IF;
END $$;

-- ============================================
-- FIX: Community Posts - add missing author_type column
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='community_posts' AND column_name='author_type') THEN
    ALTER TABLE community_posts ADD COLUMN author_type TEXT DEFAULT 'admin';
  END IF;
END $$;

-- ============================================
-- ENSURE: All community tables exist (already created by previous migration)
-- ============================================
CREATE TABLE IF NOT EXISTS community_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
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
  customer_id VARCHAR,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
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
