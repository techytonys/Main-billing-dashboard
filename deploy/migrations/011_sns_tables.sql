-- ============================================================================
-- SNS Notification System: Topics, Subscribers, Messages, and Custom Triggers
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================================

CREATE TABLE IF NOT EXISTS sns_topics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  topic_arn TEXT,
  triggers TEXT,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sns_subscribers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subscription_arn TEXT,
  unsubscribe_token VARCHAR DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE sns_subscribers ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR DEFAULT gen_random_uuid();
UPDATE sns_subscribers SET unsubscribe_token = gen_random_uuid() WHERE unsubscribe_token IS NULL;

CREATE TABLE IF NOT EXISTS sns_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id VARCHAR,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'broadcast',
  recipient_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sns_triggers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'zap',
  color TEXT DEFAULT 'text-violet-500',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed default system triggers if they don't already exist
INSERT INTO sns_triggers (name, slug, description, icon, color)
SELECT 'Invoice Created', 'invoice_created', 'When a new invoice is generated', 'send', 'text-blue-500'
WHERE NOT EXISTS (SELECT 1 FROM sns_triggers WHERE slug = 'invoice_created');

INSERT INTO sns_triggers (name, slug, description, icon, color)
SELECT 'Invoice Paid', 'invoice_paid', 'When an invoice is marked as paid', 'zap', 'text-emerald-500'
WHERE NOT EXISTS (SELECT 1 FROM sns_triggers WHERE slug = 'invoice_paid');

INSERT INTO sns_triggers (name, slug, description, icon, color)
SELECT 'Invoice Overdue', 'invoice_overdue', 'When an invoice becomes overdue', 'alert', 'text-red-500'
WHERE NOT EXISTS (SELECT 1 FROM sns_triggers WHERE slug = 'invoice_overdue');

INSERT INTO sns_triggers (name, slug, description, icon, color)
SELECT 'Payment Received', 'payment_received', 'When a Stripe payment completes', 'zap', 'text-green-500'
WHERE NOT EXISTS (SELECT 1 FROM sns_triggers WHERE slug = 'payment_received');

INSERT INTO sns_triggers (name, slug, description, icon, color)
SELECT 'Project Status Change', 'project_status', 'When a project status is updated', 'activity', 'text-violet-500'
WHERE NOT EXISTS (SELECT 1 FROM sns_triggers WHERE slug = 'project_status');

INSERT INTO sns_triggers (name, slug, description, icon, color)
SELECT 'Support Ticket Created', 'support_ticket', 'When a new support ticket comes in', 'bell', 'text-amber-500'
WHERE NOT EXISTS (SELECT 1 FROM sns_triggers WHERE slug = 'support_ticket');

INSERT INTO sns_triggers (name, slug, description, icon, color)
SELECT 'New Customer Added', 'new_customer', 'When a new customer is created', 'users', 'text-cyan-500'
WHERE NOT EXISTS (SELECT 1 FROM sns_triggers WHERE slug = 'new_customer');

CREATE TABLE IF NOT EXISTS sns_scheduled_notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_slug TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  html_message TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_type TEXT DEFAULT 'visitor',
  created_at TIMESTAMP DEFAULT NOW()
);
