ALTER TABLE customers ADD COLUMN IF NOT EXISTS website_domain TEXT;

ALTER TABLE project_client_files ADD COLUMN IF NOT EXISTS customer_id VARCHAR;
ALTER TABLE project_client_files ADD COLUMN IF NOT EXISTS object_path TEXT;
ALTER TABLE project_client_files ADD COLUMN IF NOT EXISTS uploaded_by TEXT DEFAULT 'client';
ALTER TABLE project_client_files ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE project_client_files ADD COLUMN IF NOT EXISTS content_type TEXT;
