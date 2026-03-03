CREATE TABLE IF NOT EXISTS "analytics_page_views" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" varchar NOT NULL,
  "visitor_id" varchar NOT NULL,
  "url" text NOT NULL,
  "path" text NOT NULL,
  "title" text,
  "referrer" text,
  "source" text,
  "medium" text,
  "campaign" text,
  "social_platform" text,
  "social_detail" text,
  "device" text,
  "browser" text,
  "os" text,
  "country" text,
  "screen_width" integer,
  "screen_height" integer,
  "duration" integer,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" varchar NOT NULL,
  "visitor_id" varchar NOT NULL,
  "event_type" text NOT NULL,
  "element_tag" text,
  "element_text" text,
  "element_id" text,
  "element_class" text,
  "href" text,
  "url" text NOT NULL,
  "path" text NOT NULL,
  "metadata" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "analytics_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "visitor_id" varchar NOT NULL,
  "started_at" timestamp DEFAULT now(),
  "ended_at" timestamp,
  "page_count" integer DEFAULT 0,
  "event_count" integer DEFAULT 0,
  "source" text,
  "medium" text,
  "campaign" text,
  "social_platform" text,
  "social_detail" text,
  "referrer" text,
  "device" text,
  "browser" text,
  "os" text,
  "country" text,
  "entry_page" text,
  "exit_page" text,
  "duration" integer,
  "is_unique" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_pv_session" ON "analytics_page_views" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_pv_visitor" ON "analytics_page_views" ("visitor_id");
CREATE INDEX IF NOT EXISTS "idx_pv_created" ON "analytics_page_views" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_pv_social" ON "analytics_page_views" ("social_platform");
CREATE INDEX IF NOT EXISTS "idx_ev_session" ON "analytics_events" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_ev_type" ON "analytics_events" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_ev_created" ON "analytics_events" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_sess_visitor" ON "analytics_sessions" ("visitor_id");
CREATE INDEX IF NOT EXISTS "idx_sess_created" ON "analytics_sessions" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_sess_social" ON "analytics_sessions" ("social_platform");
