CREATE TABLE IF NOT EXISTS sms_subscribers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  source VARCHAR(100),
  tags TEXT,
  notes TEXT,
  opted_in_at TIMESTAMP DEFAULT NOW(),
  opted_out_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  message_template TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id VARCHAR,
  subscriber_phone VARCHAR(20) NOT NULL,
  subscriber_name VARCHAR(200),
  event_id VARCHAR,
  event_name VARCHAR(200),
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  direction VARCHAR(10) NOT NULL DEFAULT 'outbound',
  twilio_sid VARCHAR(50),
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_subscribers_phone ON sms_subscribers(phone) WHERE deleted_at IS NULL AND status != 'deleted';
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_status ON sms_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_sms_events_slug ON sms_events(slug);
CREATE INDEX IF NOT EXISTS idx_sms_messages_subscriber ON sms_messages(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created ON sms_messages(created_at DESC);

INSERT INTO sms_events (name, slug, description, message_template, is_system) VALUES
('New Community Member', 'community_signup', 'Triggered when a new user signs up for the community', 'Hey {{name}}! Welcome to the AI Powered Sites community. We''re glad to have you! Check out the latest posts: {{link}}', true),
('Invoice Created', 'invoice_created', 'Triggered when a new invoice is generated', 'Hi {{name}}, a new invoice (#{{invoiceNumber}}) for ${{amount}} has been created. View it here: {{link}}', true),
('Payment Received', 'payment_received', 'Triggered when a payment is received', 'Payment of ${{amount}} received! Thank you, {{name}}. View your receipt: {{link}}', true),
('Payment Plan Started', 'payment_plan_started', 'Triggered when a client accepts a payment plan', 'Hi {{name}}, your payment plan has been activated. First payment of ${{amount}} is scheduled. Details: {{link}}', true),
('Project Update', 'project_update', 'Triggered when a project milestone is reached', 'Hi {{name}}, there''s a new update on your project "{{projectName}}". Check it out: {{link}}', true),
('Support Ticket Reply', 'support_reply', 'Triggered when a support ticket gets a reply', 'Hi {{name}}, we''ve replied to your support ticket. View the response: {{link}}', true),
('Invoice Overdue', 'invoice_overdue', 'Triggered when an invoice becomes overdue', 'Hi {{name}}, your invoice (#{{invoiceNumber}}) for ${{amount}} is overdue. Please make a payment: {{link}}', true),
('Quote Ready', 'quote_ready', 'Triggered when a new quote is ready for review', 'Hi {{name}}, your project quote is ready for review! Take a look: {{link}}', true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS sms_lists (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_list_members (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id VARCHAR NOT NULL,
  subscriber_id VARCHAR NOT NULL,
  added_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_list_members_unique ON sms_list_members(list_id, subscriber_id);
CREATE INDEX IF NOT EXISTS idx_sms_list_members_list ON sms_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_sms_list_members_sub ON sms_list_members(subscriber_id);

ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS consent_text TEXT;
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS consent_ip VARCHAR(50);
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS consent_user_agent TEXT;
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS company VARCHAR(200);
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS interests TEXT;
