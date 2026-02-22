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

ALTER TABLE knowledge_base_articles ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

INSERT INTO knowledge_base_categories (name, icon, sort_order) VALUES
  ('General', 'Folder', 0),
  ('Getting Started', 'Rocket', 1),
  ('Billing', 'CreditCard', 2),
  ('Technical', 'Settings', 3),
  ('FAQ', 'HelpCircle', 4),
  ('Tutorials', 'GraduationCap', 5),
  ('Troubleshooting', 'Wrench', 6)
ON CONFLICT DO NOTHING;
