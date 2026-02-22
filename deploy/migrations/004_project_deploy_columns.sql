ALTER TABLE projects ADD COLUMN IF NOT EXISTS deploy_platform TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS netlify_site_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS netlify_site_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS vercel_project_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS vercel_project_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS railway_project_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS railway_project_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS railway_service_id TEXT;
