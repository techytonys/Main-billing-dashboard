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

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
