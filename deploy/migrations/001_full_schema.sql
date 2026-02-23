CREATE TABLE IF NOT EXISTS "agent_cost_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar,
	"customer_id" varchar,
	"description" text NOT NULL,
	"agent_cost_cents" integer NOT NULL,
	"markup_percent" integer DEFAULT 50 NOT NULL,
	"client_charge_cents" integer NOT NULL,
	"session_date" timestamp DEFAULT now(),
	"invoice_id" varchar,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"customer_id" varchar,
	"scopes" text DEFAULT 'read' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);

CREATE TABLE IF NOT EXISTS "billing_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_label" text NOT NULL,
	"rate_cents" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "billing_rates_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "community_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"author_name" text NOT NULL,
	"author_avatar" text,
	"author_type" text DEFAULT 'client' NOT NULL,
	"author_user_id" varchar,
	"customer_id" varchar,
	"body" text NOT NULL,
	"likes_count" integer DEFAULT 0,
	"mentions" text[],
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "community_friendships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" varchar NOT NULL,
	"addressee_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "community_group_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "community_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text DEFAULT 'users',
	"color" text DEFAULT 'blue',
	"is_private" boolean DEFAULT false,
	"created_by" varchar,
	"member_count" integer DEFAULT 0,
	"post_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "community_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_reply" text,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "community_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_type" text DEFAULT 'admin' NOT NULL,
	"recipient_id" varchar,
	"recipient_user_id" varchar,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"post_id" varchar,
	"comment_id" varchar,
	"actor_name" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "community_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_name" text NOT NULL,
	"author_avatar" text,
	"author_role" text DEFAULT 'admin',
	"author_user_id" varchar,
	"title" text,
	"body" text NOT NULL,
	"image_url" text,
	"is_pinned" boolean DEFAULT false,
	"likes_count" integer DEFAULT 0,
	"hearts_count" integer DEFAULT 0,
	"haha_count" integer DEFAULT 0,
	"angry_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"shares_count" integer DEFAULT 0,
	"mentions" text[],
	"group_id" varchar,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "community_reactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"comment_id" varchar,
	"reaction_type" text DEFAULT 'like' NOT NULL,
	"actor_name" text NOT NULL,
	"actor_type" text DEFAULT 'client' NOT NULL,
	"actor_user_id" varchar,
	"customer_id" varchar,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "community_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"last_seen_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "community_sessions_session_token_unique" UNIQUE("session_token")
);

CREATE TABLE IF NOT EXISTS "community_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"website_url" text,
	"facebook_url" text,
	"twitter_url" text,
	"linkedin_url" text,
	"instagram_url" text,
	"youtube_url" text,
	"github_url" text,
	"tiktok_url" text,
	"totp_secret" text,
	"two_factor_enabled" boolean DEFAULT false,
	"customer_id" varchar,
	"is_active" boolean DEFAULT true,
	"last_seen_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "community_users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_type" text NOT NULL,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"attachments" text,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_name" text NOT NULL,
	"visitor_email" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"access_token" text DEFAULT gen_random_uuid(),
	"customer_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"currency" text DEFAULT 'USD',
	"notes" text,
	"portal_token" text DEFAULT gen_random_uuid(),
	"stripe_customer_id" text,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "git_backup_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"github_token" text,
	"github_username" text,
	"github_repo" text,
	"github_branch" text DEFAULT 'main',
	"autopilot_enabled" boolean DEFAULT false,
	"autopilot_frequency" text DEFAULT 'daily',
	"last_push_at" timestamp,
	"next_scheduled_at" timestamp,
	"is_connected" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "git_backup_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" varchar NOT NULL,
	"project_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"commit_sha" text,
	"commit_message" text,
	"files_count" integer,
	"error_message" text,
	"triggered_by" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "invoice_line_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"work_entry_id" varchar,
	"description" text NOT NULL,
	"quantity" numeric NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"total_cents" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"project_id" varchar,
	"invoice_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issued_at" timestamp,
	"due_date" timestamp,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"tax_rate" numeric DEFAULT '0',
	"tax_amount_cents" integer DEFAULT 0,
	"total_amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);

CREATE TABLE IF NOT EXISTS "knowledge_base_articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[],
	"status" text DEFAULT 'draft' NOT NULL,
	"notion_page_id" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "knowledge_base_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'Folder' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "knowledge_base_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'Tag' NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"address" text,
	"phone" text,
	"website" text,
	"domain" text,
	"email_guess" text,
	"google_place_id" text,
	"google_rating" numeric,
	"google_review_count" integer,
	"category" text,
	"zip_code" text,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"last_contacted_at" timestamp,
	"audit_score" integer,
	"audit_data" text,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "license_activations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" varchar NOT NULL,
	"server_id" varchar,
	"server_ip" text,
	"hostname" text,
	"status" text DEFAULT 'active' NOT NULL,
	"activated_at" timestamp DEFAULT now(),
	"released_at" timestamp
);

CREATE TABLE IF NOT EXISTS "licenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"license_key" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"max_activations" integer DEFAULT 0,
	"activation_count" integer DEFAULT 0,
	"last_activated_at" timestamp,
	"last_activated_ip" text,
	"last_activated_hostname" text,
	"expires_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "licenses_license_key_unique" UNIQUE("license_key")
);

CREATE TABLE IF NOT EXISTS "linode_servers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"linode_id" integer NOT NULL,
	"label" text NOT NULL,
	"customer_id" varchar,
	"region" text NOT NULL,
	"plan_type" text NOT NULL,
	"plan_label" text,
	"status" text DEFAULT 'provisioning' NOT NULL,
	"ipv4" text,
	"ipv6" text,
	"vcpus" integer,
	"memory" integer,
	"disk" integer,
	"monthly_price_cents" integer,
	"markup_percent" integer DEFAULT 50,
	"last_stats_at" timestamp,
	"network_in" numeric,
	"network_out" numeric,
	"cpu_usage" numeric,
	"last_invoice_at" timestamp,
	"ssh_user" text,
	"ssh_port" integer,
	"ssh_public_key" text,
	"server_setup_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payment_methods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"type" text NOT NULL,
	"brand" text,
	"last4" text,
	"expiry_month" integer,
	"expiry_year" integer,
	"is_default" boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS "payment_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"installment_amount_cents" integer NOT NULL,
	"number_of_installments" integer NOT NULL,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"installments_paid" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "project_client_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"object_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"content_type" text,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "project_screenshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"object_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"content_type" text,
	"approval_status" text,
	"revision_notes" text,
	"approval_requested_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "project_updates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'update' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"preview_url" text,
	"progress_url" text,
	"netlify_site_id" text,
	"netlify_site_url" text,
	"github_repo_url" text,
	"vercel_project_id" text,
	"vercel_project_url" text,
	"railway_project_id" text,
	"railway_service_id" text,
	"railway_project_url" text,
	"deploy_platform" text,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "qa_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_name" text NOT NULL,
	"author_email" text NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"status" text DEFAULT 'unanswered' NOT NULL,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"answered_at" timestamp
);

CREATE TABLE IF NOT EXISTS "quote_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" varchar NOT NULL,
	"sender_type" text NOT NULL,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "quote_line_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" varchar NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"total_cents" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "quote_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"project_type" text NOT NULL,
	"budget" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "quotes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"quote_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_amount_cents" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"view_token" text DEFAULT gen_random_uuid(),
	"sent_at" timestamp,
	"responded_at" timestamp,
	"expires_at" timestamp,
	"project_requirements" text,
	"requirements_submitted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "quotes_quote_number_unique" UNIQUE("quote_number")
);

CREATE TABLE IF NOT EXISTS "support_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"project_id" varchar,
	"ticket_number" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);

CREATE TABLE IF NOT EXISTS "ticket_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"sender_type" text NOT NULL,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "work_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"rate_id" varchar NOT NULL,
	"quantity" numeric NOT NULL,
	"description" text,
	"invoice_id" varchar,
	"recorded_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");