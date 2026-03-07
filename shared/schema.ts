import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  currency: text("currency").default("USD"),
  notes: text("notes"),
  portalToken: text("portal_token").default(sql`gen_random_uuid()`),
  stripeCustomerId: text("stripe_customer_id"),
  websiteDomain: text("website_domain"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  previewUrl: text("preview_url"),
  progressUrl: text("progress_url"),
  netlifySiteId: text("netlify_site_id"),
  netlifySiteUrl: text("netlify_site_url"),
  githubRepoUrl: text("github_repo_url"),
  vercelProjectId: text("vercel_project_id"),
  vercelProjectUrl: text("vercel_project_url"),
  railwayProjectId: text("railway_project_id"),
  railwayServiceId: text("railway_service_id"),
  railwayProjectUrl: text("railway_project_url"),
  deployPlatform: text("deploy_platform"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const billingRates = pgTable("billing_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  unitLabel: text("unit_label").notNull(),
  rateCents: integer("rate_cents").notNull(),
  isActive: boolean("is_active").default(true),
});

export const workEntries = pgTable("work_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  rateId: varchar("rate_id").notNull(),
  quantity: numeric("quantity").notNull(),
  description: text("description"),
  invoiceId: varchar("invoice_id"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  projectId: varchar("project_id"),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").notNull().default("draft"),
  issuedAt: timestamp("issued_at"),
  dueDate: timestamp("due_date"),
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  taxRate: numeric("tax_rate").default("0"),
  taxAmountCents: integer("tax_amount_cents").default(0),
  totalAmountCents: integer("total_amount_cents").notNull().default(0),
  currency: text("currency").default("USD"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  workEntryId: varchar("work_entry_id"),
  description: text("description").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: integer("unit_price_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  type: text("type").notNull(),
  brand: text("brand"),
  last4: text("last4"),
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),
  isDefault: boolean("is_default").default(false),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertBillingRateSchema = createInsertSchema(billingRates).omit({ id: true });
export const insertWorkEntrySchema = createInsertSchema(workEntries).omit({ id: true, recordedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({ id: true });
export const quoteRequests = pgTable("quote_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  projectType: text("project_type").notNull(),
  budget: text("budget"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true });
export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({ id: true, createdAt: true, status: true });

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  projectId: varchar("project_id"),
  ticketNumber: text("ticket_number").notNull().unique(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true, ticketNumber: true });
export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({ id: true, createdAt: true });

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type BillingRate = typeof billingRates.$inferSelect;
export type InsertBillingRate = z.infer<typeof insertBillingRateSchema>;
export type WorkEntry = typeof workEntries.$inferSelect;
export type InsertWorkEntry = z.infer<typeof insertWorkEntrySchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;

export const qaQuestions = pgTable("qa_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  status: text("status").notNull().default("unanswered"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  answeredAt: timestamp("answered_at"),
});

export const insertQaQuestionSchema = createInsertSchema(qaQuestions).omit({ id: true, createdAt: true, answeredAt: true });

export type QaQuestion = typeof qaQuestions.$inferSelect;
export type InsertQaQuestion = z.infer<typeof insertQaQuestionSchema>;

export const paymentPlans = pgTable("payment_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  totalAmountCents: integer("total_amount_cents").notNull(),
  installmentAmountCents: integer("installment_amount_cents").notNull(),
  numberOfInstallments: integer("number_of_installments").notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  status: text("status").notNull().default("pending"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  installmentsPaid: integer("installments_paid").notNull().default(0),
  startDate: timestamp("start_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentPlanSchema = createInsertSchema(paymentPlans).omit({ id: true, createdAt: true });

export type PaymentPlan = typeof paymentPlans.$inferSelect;
export type InsertPaymentPlan = z.infer<typeof insertPaymentPlanSchema>;

export const projectUpdates = pgTable("project_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("update"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectUpdateSchema = createInsertSchema(projectUpdates).omit({ id: true, createdAt: true });

export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type InsertProjectUpdate = z.infer<typeof insertProjectUpdateSchema>;

export const projectScreenshots = pgTable("project_screenshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  contentType: text("content_type"),
  approvalStatus: text("approval_status"),
  revisionNotes: text("revision_notes"),
  approvalRequestedAt: timestamp("approval_requested_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectScreenshotSchema = createInsertSchema(projectScreenshots).omit({ id: true, createdAt: true, approvedAt: true, approvalRequestedAt: true });

export type ProjectScreenshot = typeof projectScreenshots.$inferSelect;
export type InsertProjectScreenshot = z.infer<typeof insertProjectScreenshotSchema>;

export const projectClientFiles = pgTable("project_client_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  objectPath: text("object_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  contentType: text("content_type"),
  uploadedBy: text("uploaded_by").default("client"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectClientFileSchema = createInsertSchema(projectClientFiles).omit({ id: true, createdAt: true });

export type ProjectClientFile = typeof projectClientFiles.$inferSelect;
export type InsertProjectClientFile = z.infer<typeof insertProjectClientFileSchema>;

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  quoteNumber: text("quote_number").notNull().unique(),
  status: text("status").notNull().default("draft"),
  totalAmountCents: integer("total_amount_cents").notNull().default(0),
  notes: text("notes"),
  viewToken: text("view_token").default(sql`gen_random_uuid()`),
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
  projectRequirements: text("project_requirements"),
  requirementsSubmittedAt: timestamp("requirements_submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quoteLineItems = pgTable("quote_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
});

export const quoteComments = pgTable("quote_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull(),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true, viewToken: true });
export const insertQuoteLineItemSchema = createInsertSchema(quoteLineItems).omit({ id: true });
export const insertQuoteCommentSchema = createInsertSchema(quoteComments).omit({ id: true, createdAt: true });

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type InsertQuoteLineItem = z.infer<typeof insertQuoteLineItemSchema>;
export type QuoteComment = typeof quoteComments.$inferSelect;
export type InsertQuoteComment = z.infer<typeof insertQuoteCommentSchema>;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const agentCostEntries = pgTable("agent_cost_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id"),
  customerId: varchar("customer_id"),
  description: text("description").notNull(),
  agentCostCents: integer("agent_cost_cents").notNull(),
  markupPercent: integer("markup_percent").notNull().default(50),
  clientChargeCents: integer("client_charge_cents").notNull(),
  sessionDate: timestamp("session_date").defaultNow(),
  invoiceId: varchar("invoice_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentCostEntrySchema = createInsertSchema(agentCostEntries).omit({ id: true, createdAt: true });

export type AgentCostEntry = typeof agentCostEntries.$inferSelect;
export type InsertAgentCostEntry = z.infer<typeof insertAgentCostEntrySchema>;

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorName: text("visitor_name").notNull(),
  visitorEmail: text("visitor_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("active"),
  accessToken: text("access_token").default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  attachments: text("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true, accessToken: true });
export const insertConversationMessageSchema = createInsertSchema(conversationMessages).omit({ id: true, createdAt: true });

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  customerId: varchar("customer_id"),
  scopes: text("scopes").notNull().default("read"),
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true, lastUsedAt: true });

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export const gitBackupConfigs = pgTable("git_backup_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  githubToken: text("github_token"),
  githubUsername: text("github_username"),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch").default("main"),
  autopilotEnabled: boolean("autopilot_enabled").default(false),
  autopilotFrequency: text("autopilot_frequency").default("daily"),
  lastPushAt: timestamp("last_push_at"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  isConnected: boolean("is_connected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gitBackupLogs = pgTable("git_backup_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configId: varchar("config_id").notNull(),
  projectId: varchar("project_id").notNull(),
  status: text("status").notNull().default("pending"),
  commitSha: text("commit_sha"),
  commitMessage: text("commit_message"),
  filesCount: integer("files_count"),
  errorMessage: text("error_message"),
  triggeredBy: text("triggered_by").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGitBackupConfigSchema = createInsertSchema(gitBackupConfigs).omit({ id: true, createdAt: true, lastPushAt: true, nextScheduledAt: true });
export const insertGitBackupLogSchema = createInsertSchema(gitBackupLogs).omit({ id: true, createdAt: true });

export type GitBackupConfig = typeof gitBackupConfigs.$inferSelect;
export type InsertGitBackupConfig = z.infer<typeof insertGitBackupConfigSchema>;
export type GitBackupLog = typeof gitBackupLogs.$inferSelect;
export type InsertGitBackupLog = z.infer<typeof insertGitBackupLogSchema>;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id"),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userType: text("user_type").default("visitor"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  domain: text("domain"),
  emailGuess: text("email_guess"),
  googlePlaceId: text("google_place_id"),
  googleRating: numeric("google_rating"),
  googleReviewCount: integer("google_review_count"),
  category: text("category"),
  zipCode: text("zip_code"),
  status: text("status").notNull().default("new"),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  auditScore: integer("audit_score"),
  auditData: text("audit_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export const linodeServers = pgTable("linode_servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linodeId: integer("linode_id").notNull(),
  label: text("label").notNull(),
  customerId: varchar("customer_id"),
  region: text("region").notNull(),
  planType: text("plan_type").notNull(),
  planLabel: text("plan_label"),
  status: text("status").notNull().default("provisioning"),
  ipv4: text("ipv4"),
  ipv6: text("ipv6"),
  vcpus: integer("vcpus"),
  memory: integer("memory"),
  disk: integer("disk"),
  monthlyPriceCents: integer("monthly_price_cents"),
  markupPercent: integer("markup_percent").default(50),
  lastStatsAt: timestamp("last_stats_at"),
  networkIn: numeric("network_in"),
  networkOut: numeric("network_out"),
  cpuUsage: numeric("cpu_usage"),
  lastInvoiceAt: timestamp("last_invoice_at"),
  sshUser: text("ssh_user"),
  sshPort: integer("ssh_port"),
  sshPublicKey: text("ssh_public_key"),
  serverSetupComplete: boolean("server_setup_complete").default(false),
  serverType: text("server_type").default("standard"),
  wordpressDomain: text("wordpress_domain"),
  wordpressSiteTitle: text("wordpress_site_title"),
  wordpressAdminUser: text("wordpress_admin_user"),
  wordpressAdminPass: text("wordpress_admin_pass"),
  wordpressReady: boolean("wordpress_ready").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLinodeServerSchema = createInsertSchema(linodeServers).omit({ id: true, createdAt: true });

export type LinodeServer = typeof linodeServers.$inferSelect;
export type InsertLinodeServer = z.infer<typeof insertLinodeServerSchema>;

export const licenses = pgTable("licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  licenseKey: text("license_key").notNull().unique(),
  status: text("status").notNull().default("active"),
  maxActivations: integer("max_activations").default(0),
  activationCount: integer("activation_count").default(0),
  lastActivatedAt: timestamp("last_activated_at"),
  lastActivatedIp: text("last_activated_ip"),
  lastActivatedHostname: text("last_activated_hostname"),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({ id: true, createdAt: true, activationCount: true, lastActivatedAt: true, lastActivatedIp: true, lastActivatedHostname: true });

export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;

export const dnsZones = pgTable("dns_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id"),
  serverId: varchar("server_id"),
  linodeDomainId: integer("linode_domain_id"),
  domain: text("domain").notNull(),
  soaEmail: text("soa_email"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDnsZoneSchema = createInsertSchema(dnsZones).omit({ id: true, createdAt: true });
export type DnsZone = typeof dnsZones.$inferSelect;
export type InsertDnsZone = z.infer<typeof insertDnsZoneSchema>;

export const licenseActivations = pgTable("license_activations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").notNull(),
  serverId: varchar("server_id"),
  serverIp: text("server_ip"),
  hostname: text("hostname"),
  status: text("status").notNull().default("active"),
  activatedAt: timestamp("activated_at").defaultNow(),
  releasedAt: timestamp("released_at"),
});

export const insertLicenseActivationSchema = createInsertSchema(licenseActivations).omit({ id: true, activatedAt: true, releasedAt: true });

export type LicenseActivation = typeof licenseActivations.$inferSelect;
export type InsertLicenseActivation = z.infer<typeof insertLicenseActivationSchema>;

export const knowledgeBaseCategories = pgTable("knowledge_base_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("Folder"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertKnowledgeBaseCategorySchema = createInsertSchema(knowledgeBaseCategories).omit({ id: true, createdAt: true });
export type KnowledgeBaseCategory = typeof knowledgeBaseCategories.$inferSelect;
export type InsertKnowledgeBaseCategory = z.infer<typeof insertKnowledgeBaseCategorySchema>;

export const knowledgeBaseTags = pgTable("knowledge_base_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("Tag"),
  color: text("color").notNull().default("gray"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertKnowledgeBaseTagSchema = createInsertSchema(knowledgeBaseTags).omit({ id: true, createdAt: true });
export type KnowledgeBaseTag = typeof knowledgeBaseTags.$inferSelect;
export type InsertKnowledgeBaseTag = z.infer<typeof insertKnowledgeBaseTagSchema>;

export const knowledgeBaseArticles = pgTable("knowledge_base_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  content: text("content").notNull().default(""),
  category: text("category").notNull().default("General"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("draft"),
  notionPageId: text("notion_page_id"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeBaseArticleSchema = createInsertSchema(knowledgeBaseArticles).omit({ id: true, createdAt: true, updatedAt: true });

export type KnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferSelect;
export type InsertKnowledgeBaseArticle = z.infer<typeof insertKnowledgeBaseArticleSchema>;

export const communityUsers = pgTable("community_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  websiteUrl: text("website_url"),
  facebookUrl: text("facebook_url"),
  twitterUrl: text("twitter_url"),
  linkedinUrl: text("linkedin_url"),
  instagramUrl: text("instagram_url"),
  youtubeUrl: text("youtube_url"),
  githubUrl: text("github_url"),
  tiktokUrl: text("tiktok_url"),
  totpSecret: text("totp_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  customerId: varchar("customer_id"),
  isActive: boolean("is_active").default(true),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  adminUserId: text("admin_user_id"),
});

export const insertCommunityUserSchema = createInsertSchema(communityUsers).omit({ id: true, createdAt: true, lastSeenAt: true });
export type CommunityUser = typeof communityUsers.$inferSelect;
export type InsertCommunityUser = z.infer<typeof insertCommunityUserSchema>;

export const communitySessions = pgTable("community_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CommunitySession = typeof communitySessions.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const communityMessages = pgTable("community_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("new"),
  adminReply: text("admin_reply"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunityMessageSchema = createInsertSchema(communityMessages).omit({ id: true, createdAt: true, status: true, adminReply: true, repliedAt: true });
export type CommunityMessage = typeof communityMessages.$inferSelect;
export type InsertCommunityMessage = z.infer<typeof insertCommunityMessageSchema>;

export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar"),
  authorRole: text("author_role").default("admin"),
  authorUserId: varchar("author_user_id"),
  title: text("title"),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  isPinned: boolean("is_pinned").default(false),
  likesCount: integer("likes_count").default(0),
  heartsCount: integer("hearts_count").default(0),
  hahaCount: integer("haha_count").default(0),
  angryCount: integer("angry_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  mentions: text("mentions").array(),
  groupId: varchar("group_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, createdAt: true, likesCount: true, heartsCount: true, hahaCount: true, angryCount: true, commentsCount: true, sharesCount: true });
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;

export const communityComments = pgTable("community_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar"),
  authorType: text("author_type").notNull().default("client"),
  authorUserId: varchar("author_user_id"),
  customerId: varchar("customer_id"),
  body: text("body").notNull(),
  likesCount: integer("likes_count").default(0),
  mentions: text("mentions").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunityCommentSchema = createInsertSchema(communityComments).omit({ id: true, createdAt: true, likesCount: true });
export type CommunityComment = typeof communityComments.$inferSelect;
export type InsertCommunityComment = z.infer<typeof insertCommunityCommentSchema>;

export const communityReactions = pgTable("community_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  commentId: varchar("comment_id"),
  reactionType: text("reaction_type").notNull().default("like"),
  actorName: text("actor_name").notNull(),
  actorType: text("actor_type").notNull().default("client"),
  actorUserId: varchar("actor_user_id"),
  customerId: varchar("customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunityReactionSchema = createInsertSchema(communityReactions).omit({ id: true, createdAt: true });
export type CommunityReaction = typeof communityReactions.$inferSelect;
export type InsertCommunityReaction = z.infer<typeof insertCommunityReactionSchema>;

export const communityNotifications = pgTable("community_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientType: text("recipient_type").notNull().default("admin"),
  recipientId: varchar("recipient_id"),
  recipientUserId: varchar("recipient_user_id"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  postId: varchar("post_id"),
  commentId: varchar("comment_id"),
  actorName: text("actor_name").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunityNotificationSchema = createInsertSchema(communityNotifications).omit({ id: true, createdAt: true });
export type CommunityNotification = typeof communityNotifications.$inferSelect;
export type InsertCommunityNotification = z.infer<typeof insertCommunityNotificationSchema>;

export const communityFriendships = pgTable("community_friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull(),
  addresseeId: varchar("addressee_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCommunityFriendshipSchema = createInsertSchema(communityFriendships).omit({ id: true, createdAt: true, updatedAt: true });
export type CommunityFriendship = typeof communityFriendships.$inferSelect;
export type InsertCommunityFriendship = z.infer<typeof insertCommunityFriendshipSchema>;

export const communityBlocks = pgTable("community_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull(),
  blockedId: varchar("blocked_id").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunityBlockSchema = createInsertSchema(communityBlocks).omit({ id: true, createdAt: true });
export type CommunityBlock = typeof communityBlocks.$inferSelect;
export type InsertCommunityBlock = z.infer<typeof insertCommunityBlockSchema>;

export const communityGroups = pgTable("community_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").default("users"),
  color: text("color").default("blue"),
  isPrivate: boolean("is_private").default(false),
  createdBy: varchar("created_by"),
  memberCount: integer("member_count").default(0),
  postCount: integer("post_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunityGroupSchema = createInsertSchema(communityGroups).omit({ id: true, createdAt: true, memberCount: true, postCount: true });
export type CommunityGroup = typeof communityGroups.$inferSelect;
export type InsertCommunityGroup = z.infer<typeof insertCommunityGroupSchema>;

export const communityGroupMembers = pgTable("community_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunityGroupMemberSchema = createInsertSchema(communityGroupMembers).omit({ id: true, createdAt: true });
export type CommunityGroupMember = typeof communityGroupMembers.$inferSelect;
export type InsertCommunityGroupMember = z.infer<typeof insertCommunityGroupMemberSchema>;

export const analyticsPageViews = pgTable("analytics_page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id", { length: 255 }),
  sessionId: varchar("session_id").notNull(),
  visitorId: varchar("visitor_id").notNull(),
  url: text("url").notNull(),
  path: text("path").notNull(),
  title: text("title"),
  referrer: text("referrer"),
  source: text("source"),
  medium: text("medium"),
  campaign: text("campaign"),
  socialPlatform: text("social_platform"),
  socialDetail: text("social_detail"),
  device: text("device"),
  browser: text("browser"),
  os: text("os"),
  country: text("country"),
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnalyticsPageViewSchema = createInsertSchema(analyticsPageViews).omit({ id: true, createdAt: true });
export type AnalyticsPageView = typeof analyticsPageViews.$inferSelect;
export type InsertAnalyticsPageView = z.infer<typeof insertAnalyticsPageViewSchema>;

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id", { length: 255 }),
  sessionId: varchar("session_id").notNull(),
  visitorId: varchar("visitor_id").notNull(),
  eventType: text("event_type").notNull(),
  elementTag: text("element_tag"),
  elementText: text("element_text"),
  elementId: text("element_id"),
  elementClass: text("element_class"),
  href: text("href"),
  url: text("url").notNull(),
  path: text("path").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, createdAt: true });
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;

export const analyticsSessions = pgTable("analytics_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id", { length: 255 }),
  visitorId: varchar("visitor_id").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  pageCount: integer("page_count").default(0),
  eventCount: integer("event_count").default(0),
  source: text("source"),
  medium: text("medium"),
  campaign: text("campaign"),
  socialPlatform: text("social_platform"),
  socialDetail: text("social_detail"),
  referrer: text("referrer"),
  device: text("device"),
  browser: text("browser"),
  os: text("os"),
  country: text("country"),
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  duration: integer("duration"),
  isUnique: boolean("is_unique").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnalyticsSessionSchema = createInsertSchema(analyticsSessions).omit({ id: true, createdAt: true });
export type AnalyticsSession = typeof analyticsSessions.$inferSelect;
export type InsertAnalyticsSession = z.infer<typeof insertAnalyticsSessionSchema>;

export const trackedLinks = pgTable("tracked_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id"),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  destinationUrl: text("destination_url").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  label: varchar("label", { length: 200 }),
  customDomain: varchar("custom_domain", { length: 255 }),
  totalClicks: integer("total_clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trackedLinkClicks = pgTable("tracked_link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkId: varchar("link_id").notNull(),
  visitorId: varchar("visitor_id", { length: 100 }),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("user_agent"),
  device: varchar("device", { length: 20 }),
  browser: varchar("browser", { length: 50 }),
  os: varchar("os", { length: 50 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  referrer: text("referrer"),
  isUnique: boolean("is_unique").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrackedLinkSchema = createInsertSchema(trackedLinks).omit({ id: true, totalClicks: true, uniqueClicks: true, createdAt: true, updatedAt: true });
export type TrackedLink = typeof trackedLinks.$inferSelect;
export type InsertTrackedLink = z.infer<typeof insertTrackedLinkSchema>;

export const insertTrackedLinkClickSchema = createInsertSchema(trackedLinkClicks).omit({ id: true, createdAt: true });
export type TrackedLinkClick = typeof trackedLinkClicks.$inferSelect;
export type InsertTrackedLinkClick = z.infer<typeof insertTrackedLinkClickSchema>;

export const smsSubscribers = pgTable("sms_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  company: varchar("company", { length: 200 }),
  website: varchar("website", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  referralSource: varchar("referral_source", { length: 100 }),
  interests: text("interests"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  source: varchar("source", { length: 100 }),
  tags: text("tags"),
  notes: text("notes"),
  consentGiven: boolean("consent_given").default(false),
  consentText: text("consent_text"),
  consentIp: varchar("consent_ip", { length: 50 }),
  consentUserAgent: text("consent_user_agent"),
  optedInAt: timestamp("opted_in_at").defaultNow(),
  optedOutAt: timestamp("opted_out_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const smsEvents = pgTable("sms_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  description: text("description"),
  messageTemplate: text("message_template").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  isSystem: boolean("is_system").notNull().default(false),
  triggerCount: integer("trigger_count").notNull().default(0),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const smsMessages = pgTable("sms_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriberId: varchar("subscriber_id"),
  subscriberPhone: varchar("subscriber_phone", { length: 20 }).notNull(),
  subscriberName: varchar("subscriber_name", { length: 200 }),
  eventId: varchar("event_id"),
  eventName: varchar("event_name", { length: 200 }),
  body: text("body").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("queued"),
  direction: varchar("direction", { length: 10 }).notNull().default("outbound"),
  twilioSid: varchar("twilio_sid", { length: 50 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const smsLists = pgTable("sms_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const smsListMembers = pgTable("sms_list_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").notNull(),
  subscriberId: varchar("subscriber_id").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertSmsListSchema = createInsertSchema(smsLists).omit({ id: true, createdAt: true });
export type SmsList = typeof smsLists.$inferSelect;
export type InsertSmsList = z.infer<typeof insertSmsListSchema>;

export const insertSmsListMemberSchema = createInsertSchema(smsListMembers).omit({ id: true, addedAt: true });
export type SmsListMember = typeof smsListMembers.$inferSelect;
export type InsertSmsListMember = z.infer<typeof insertSmsListMemberSchema>;

export const insertSmsSubscriberSchema = createInsertSchema(smsSubscribers).omit({ id: true, createdAt: true, optedInAt: true });
export type SmsSubscriber = typeof smsSubscribers.$inferSelect;
export type InsertSmsSubscriber = z.infer<typeof insertSmsSubscriberSchema>;

export const insertSmsEventSchema = createInsertSchema(smsEvents).omit({ id: true, triggerCount: true, lastTriggeredAt: true, createdAt: true, updatedAt: true });
export type SmsEvent = typeof smsEvents.$inferSelect;
export type InsertSmsEvent = z.infer<typeof insertSmsEventSchema>;

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({ id: true, twilioSid: true, errorMessage: true, sentAt: true, deliveredAt: true, createdAt: true });
export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;

export const directorySubmissions = pgTable("directory_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directoryName: text("directory_name").notNull(),
  directoryUrl: text("directory_url").notNull(),
  category: text("category").notNull(),
  status: text("status").default("pending"),
  submittedAt: timestamp("submitted_at"),
  notes: text("notes"),
  confirmationUrl: text("confirmation_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDirectorySubmissionSchema = createInsertSchema(directorySubmissions).omit({ id: true, createdAt: true });
export type DirectorySubmission = typeof directorySubmissions.$inferSelect;
export type InsertDirectorySubmission = z.infer<typeof insertDirectorySubmissionSchema>;

export const seoKeywords = pgTable("seo_keywords", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyword: text("keyword").notNull(),
  domain: text("domain").default("aipoweredsites.com"),
  currentPosition: integer("current_position"),
  previousPosition: integer("previous_position"),
  positionChange: integer("position_change").default(0),
  searchVolume: integer("search_volume"),
  difficulty: text("difficulty"),
  cpc: text("cpc"),
  status: text("status").default("tracking"),
  tags: text("tags"),
  notes: text("notes"),
  lastChecked: timestamp("last_checked"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const seoKeywordHistory = pgTable("seo_keyword_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keywordId: varchar("keyword_id").notNull(),
  position: integer("position"),
  checkedAt: timestamp("checked_at").defaultNow(),
});

export const insertSeoKeywordSchema = createInsertSchema(seoKeywords).omit({ id: true, createdAt: true });
export type SeoKeyword = typeof seoKeywords.$inferSelect;
export type InsertSeoKeyword = z.infer<typeof insertSeoKeywordSchema>;
export type SeoKeywordHistoryEntry = typeof seoKeywordHistory.$inferSelect;

export const onboardingQuestionnaires = pgTable("onboarding_questionnaires", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  fields: text("fields").notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const onboardingResponses = pgTable("onboarding_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionnaireId: varchar("questionnaire_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  projectId: varchar("project_id"),
  responses: text("responses").notNull(),
  status: text("status").notNull().default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertOnboardingQuestionnaireSchema = createInsertSchema(onboardingQuestionnaires).omit({ id: true, createdAt: true });
export type OnboardingQuestionnaire = typeof onboardingQuestionnaires.$inferSelect;
export type InsertOnboardingQuestionnaire = z.infer<typeof insertOnboardingQuestionnaireSchema>;

export const insertOnboardingResponseSchema = createInsertSchema(onboardingResponses).omit({ id: true, submittedAt: true, reviewedAt: true });
export type OnboardingResponse = typeof onboardingResponses.$inferSelect;
export type InsertOnboardingResponse = z.infer<typeof insertOnboardingResponseSchema>;
