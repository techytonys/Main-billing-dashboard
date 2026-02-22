import { db } from "./db";
import { eq, desc, sql, and, isNull, lt } from "drizzle-orm";
import {
  users, customers, projects, billingRates, workEntries, invoices, invoiceLineItems, paymentMethods, quoteRequests, supportTickets, ticketMessages, qaQuestions, paymentPlans, projectUpdates, projectScreenshots, projectClientFiles, notifications, quotes, quoteLineItems, quoteComments,
  conversations, conversationMessages, apiKeys, gitBackupConfigs, gitBackupLogs, leads, knowledgeBaseArticles, knowledgeBaseCategories, knowledgeBaseTags,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Project, type InsertProject,
  type BillingRate, type InsertBillingRate,
  type WorkEntry, type InsertWorkEntry,
  type Invoice, type InsertInvoice,
  type InvoiceLineItem, type InsertInvoiceLineItem,
  type PaymentMethod, type InsertPaymentMethod,
  type QuoteRequest, type InsertQuoteRequest,
  type SupportTicket, type InsertSupportTicket,
  type TicketMessage, type InsertTicketMessage,
  type QaQuestion, type InsertQaQuestion,
  type PaymentPlan, type InsertPaymentPlan,
  type ProjectUpdate, type InsertProjectUpdate,
  type ProjectScreenshot, type InsertProjectScreenshot,
  type ProjectClientFile, type InsertProjectClientFile,
  type Notification, type InsertNotification,
  type Quote, type InsertQuote,
  type QuoteLineItem, type InsertQuoteLineItem,
  type QuoteComment, type InsertQuoteComment,
  type AgentCostEntry, type InsertAgentCostEntry,
  type Conversation, type InsertConversation,
  type ConversationMessage, type InsertConversationMessage,
  type ApiKey, type InsertApiKey,
  type GitBackupConfig, type InsertGitBackupConfig,
  type GitBackupLog, type InsertGitBackupLog,
  pushSubscriptions,
  type PushSubscription, type InsertPushSubscription,
  agentCostEntries,
  type Lead, type InsertLead,
  linodeServers,
  type LinodeServer, type InsertLinodeServer,
  type KnowledgeBaseArticle, type InsertKnowledgeBaseArticle,
  type KnowledgeBaseCategory, type InsertKnowledgeBaseCategory,
  type KnowledgeBaseTag, type InsertKnowledgeBaseTag,
  licenses, licenseActivations,
  type License, type InsertLicense,
  type LicenseActivation, type InsertLicenseActivation,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  getProjects(customerId?: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  getBillingRates(): Promise<BillingRate[]>;
  getBillingRate(id: string): Promise<BillingRate | undefined>;
  getBillingRateByCode(code: string): Promise<BillingRate | undefined>;
  createBillingRate(rate: InsertBillingRate): Promise<BillingRate>;
  updateBillingRate(id: string, rate: Partial<InsertBillingRate>): Promise<BillingRate | undefined>;
  deleteBillingRate(id: string): Promise<boolean>;

  getWorkEntries(filters?: { projectId?: string; customerId?: string; unbilledOnly?: boolean }): Promise<WorkEntry[]>;
  getWorkEntriesByInvoice(invoiceId: string): Promise<WorkEntry[]>;
  createWorkEntry(entry: InsertWorkEntry): Promise<WorkEntry>;
  updateWorkEntry(id: string, data: Partial<Pick<InsertWorkEntry, 'rateId' | 'quantity' | 'description'> & { recordedAt: Date }>): Promise<WorkEntry | undefined>;
  deleteWorkEntry(id: string): Promise<boolean>;

  getInvoices(limit?: number): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(inv: InsertInvoice): Promise<Invoice>;
  updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined>;
  updateInvoiceDates(id: string, issuedAt: Date, dueDate: Date): Promise<Invoice | undefined>;
  getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]>;
  createInvoiceLineItem(item: InsertInvoiceLineItem): Promise<InvoiceLineItem>;

  getPaymentMethods(): Promise<PaymentMethod[]>;
  createPaymentMethod(pm: InsertPaymentMethod): Promise<PaymentMethod>;

  getDashboardStats(): Promise<{
    totalRevenue: number;
    activeProjects: number;
    pendingInvoices: number;
    unbilledWork: number;
    overdueInvoices: number;
  }>;

  generateInvoiceFromWork(projectId: string, taxRate?: number, dueDays?: number): Promise<Invoice | null>;

  getCustomerByPortalToken(token: string): Promise<Customer | undefined>;
  getInvoicesByCustomerId(customerId: string): Promise<Invoice[]>;
  getOverdueInvoices(): Promise<Invoice[]>;
  markOverdueInvoices(): Promise<number>;

  findOrCreateCustomerByEmail(email: string, name?: string, company?: string, phone?: string): Promise<Customer>;
  createQuoteRequest(quote: InsertQuoteRequest): Promise<QuoteRequest>;
  getQuoteRequests(): Promise<QuoteRequest[]>;

  getSupportTickets(filters?: { customerId?: string; status?: string; priority?: string }): Promise<SupportTicket[]>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: string, updates: Partial<{ status: string; priority: string; category: string }>): Promise<SupportTicket | undefined>;
  deleteSupportTicket(id: string): Promise<boolean>;

  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;
  createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage>;

  deleteInvoice(id: string): Promise<boolean>;
  deleteCustomerData(customerId: string): Promise<void>;

  getQaQuestions(status?: string): Promise<QaQuestion[]>;
  getQaQuestion(id: string): Promise<QaQuestion | undefined>;
  createQaQuestion(question: InsertQaQuestion): Promise<QaQuestion>;
  updateQaQuestion(id: string, updates: Partial<{ answer: string; status: string; isPublic: boolean }>): Promise<QaQuestion | undefined>;
  deleteQaQuestion(id: string): Promise<boolean>;

  getProjectUpdates(projectId: string): Promise<ProjectUpdate[]>;
  createProjectUpdate(update: InsertProjectUpdate): Promise<ProjectUpdate>;
  deleteProjectUpdate(id: string): Promise<boolean>;

  getProjectScreenshots(projectId: string): Promise<ProjectScreenshot[]>;
  createProjectScreenshot(screenshot: InsertProjectScreenshot): Promise<ProjectScreenshot>;
  updateProjectScreenshot(id: string, updates: Partial<{ fileName: string; approvalStatus: string; revisionNotes: string | null; approvalRequestedAt: Date | null; approvedAt: Date | null }>): Promise<ProjectScreenshot | undefined>;
  deleteProjectScreenshot(id: string): Promise<boolean>;

  getProjectClientFiles(projectId: string): Promise<ProjectClientFile[]>;
  createProjectClientFile(file: InsertProjectClientFile): Promise<ProjectClientFile>;
  deleteProjectClientFile(id: string): Promise<boolean>;

  getNotifications(customerId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(customerId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(customerId: string): Promise<number>;

  getQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  getQuoteByToken(token: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<boolean>;
  getQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]>;
  createQuoteLineItem(item: InsertQuoteLineItem): Promise<QuoteLineItem>;
  getQuoteComments(quoteId: string): Promise<QuoteComment[]>;
  createQuoteComment(comment: InsertQuoteComment): Promise<QuoteComment>;

  getAgentCostEntries(projectId?: string): Promise<AgentCostEntry[]>;
  getAgentCostEntry(id: string): Promise<AgentCostEntry | undefined>;
  createAgentCostEntry(entry: InsertAgentCostEntry): Promise<AgentCostEntry>;
  deleteAgentCostEntry(id: string): Promise<boolean>;

  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByToken(token: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<{ status: string; customerId: string }>): Promise<Conversation | undefined>;
  getConversationMessages(conversationId: string): Promise<ConversationMessage[]>;
  createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage>;

  getPushSubscriptions(customerId: string): Promise<PushSubscription[]>;
  createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<boolean>;

  getApiKeys(): Promise<ApiKey[]>;
  getApiKey(id: string): Promise<ApiKey | undefined>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, updates: Partial<{ name: string; isActive: boolean; scopes: string; customerId: string | null }>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<boolean>;
  touchApiKeyLastUsed(id: string): Promise<void>;

  getGitBackupConfigs(projectId?: string): Promise<GitBackupConfig[]>;
  getGitBackupConfig(id: string): Promise<GitBackupConfig | undefined>;
  getGitBackupConfigByProject(projectId: string): Promise<GitBackupConfig | undefined>;
  getGitBackupConfigByCustomer(customerId: string): Promise<GitBackupConfig[]>;
  createGitBackupConfig(config: InsertGitBackupConfig): Promise<GitBackupConfig>;
  updateGitBackupConfig(id: string, updates: Partial<GitBackupConfig>): Promise<GitBackupConfig | undefined>;
  deleteGitBackupConfig(id: string): Promise<boolean>;

  getGitBackupLogs(configId: string, limit?: number): Promise<GitBackupLog[]>;
  getGitBackupLogsByProject(projectId: string, limit?: number): Promise<GitBackupLog[]>;
  createGitBackupLog(log: InsertGitBackupLog): Promise<GitBackupLog>;
  updateGitBackupLog(id: string, updates: Partial<GitBackupLog>): Promise<GitBackupLog | undefined>;
  getAutopilotDueConfigs(): Promise<GitBackupConfig[]>;

  getLeads(filters?: { status?: string; zipCode?: string }): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadByPlaceId(placeId: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<InsertLead & { auditScore: number; auditData: string; lastContactedAt: Date }>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  getLinodeServers(): Promise<LinodeServer[]>;
  getLinodeServer(id: string): Promise<LinodeServer | undefined>;
  getLinodeServerByLinodeId(linodeId: number): Promise<LinodeServer | undefined>;
  getLinodeServersByCustomerId(customerId: string): Promise<LinodeServer[]>;
  createLinodeServer(server: InsertLinodeServer, id?: string): Promise<LinodeServer>;
  updateLinodeServer(id: string, updates: Partial<InsertLinodeServer>): Promise<LinodeServer | undefined>;
  deleteLinodeServer(id: string): Promise<boolean>;

  getLicenses(customerId?: string): Promise<License[]>;
  getLicense(id: string): Promise<License | undefined>;
  getLicenseByKey(key: string): Promise<License | undefined>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: string, updates: Partial<InsertLicense>): Promise<License | undefined>;
  deleteLicense(id: string): Promise<boolean>;
  incrementLicenseActivation(id: string, ip: string, hostname: string): Promise<License | undefined>;
  getLicenseActivations(licenseId: string): Promise<LicenseActivation[]>;
  getActiveLicenseActivations(licenseId: string): Promise<LicenseActivation[]>;
  getLicenseActivationByIp(licenseId: string, ip: string): Promise<LicenseActivation | undefined>;
  createLicenseActivation(activation: InsertLicenseActivation): Promise<LicenseActivation>;
  releaseLicenseActivation(id: string): Promise<LicenseActivation | undefined>;
  releaseLicenseActivationsByServerId(serverId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  async getProjects(customerId?: string): Promise<Project[]> {
    if (customerId) {
      return db.select().from(projects).where(eq(projects.customerId, customerId)).orderBy(desc(projects.createdAt));
    }
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const projectInvoices = await db.select().from(invoices).where(eq(invoices.projectId, id));
    for (const inv of projectInvoices) {
      await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, inv.id));
    }
    await db.delete(invoices).where(eq(invoices.projectId, id));
    await db.delete(workEntries).where(eq(workEntries.projectId, id));
    const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();
    return !!deleted;
  }

  async getBillingRates(): Promise<BillingRate[]> {
    return db.select().from(billingRates).orderBy(billingRates.name);
  }

  async getBillingRate(id: string): Promise<BillingRate | undefined> {
    const [rate] = await db.select().from(billingRates).where(eq(billingRates.id, id));
    return rate;
  }

  async getBillingRateByCode(code: string): Promise<BillingRate | undefined> {
    const [rate] = await db.select().from(billingRates).where(eq(billingRates.code, code));
    return rate;
  }

  async createBillingRate(rate: InsertBillingRate): Promise<BillingRate> {
    const [created] = await db.insert(billingRates).values(rate).returning();
    return created;
  }

  async updateBillingRate(id: string, rate: Partial<InsertBillingRate>): Promise<BillingRate | undefined> {
    const [updated] = await db.update(billingRates).set(rate).where(eq(billingRates.id, id)).returning();
    return updated;
  }

  async deleteBillingRate(id: string): Promise<boolean> {
    const result = await db.delete(billingRates).where(eq(billingRates.id, id)).returning();
    return result.length > 0;
  }

  async getWorkEntries(filters?: { projectId?: string; customerId?: string; unbilledOnly?: boolean }): Promise<WorkEntry[]> {
    const conditions = [];
    if (filters?.projectId) conditions.push(eq(workEntries.projectId, filters.projectId));
    if (filters?.customerId) conditions.push(eq(workEntries.customerId, filters.customerId));
    if (filters?.unbilledOnly) conditions.push(isNull(workEntries.invoiceId));

    if (conditions.length > 0) {
      return db.select().from(workEntries).where(and(...conditions)).orderBy(desc(workEntries.recordedAt));
    }
    return db.select().from(workEntries).orderBy(desc(workEntries.recordedAt));
  }

  async getWorkEntriesByInvoice(invoiceId: string): Promise<WorkEntry[]> {
    return db.select().from(workEntries).where(eq(workEntries.invoiceId, invoiceId)).orderBy(desc(workEntries.recordedAt));
  }

  async createWorkEntry(entry: InsertWorkEntry): Promise<WorkEntry> {
    const [created] = await db.insert(workEntries).values(entry).returning();
    return created;
  }

  async updateWorkEntry(id: string, data: Partial<Pick<InsertWorkEntry, 'rateId' | 'quantity' | 'description'> & { recordedAt: Date }>): Promise<WorkEntry | undefined> {
    const [updated] = await db.update(workEntries).set(data).where(eq(workEntries.id, id)).returning();
    return updated;
  }

  async deleteWorkEntry(id: string): Promise<boolean> {
    const result = await db.delete(workEntries).where(eq(workEntries.id, id)).returning();
    return result.length > 0;
  }

  async getInvoices(limit?: number): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(limit ?? 100);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    return inv;
  }

  async createInvoice(inv: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(inv).returning();
    return created;
  }

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ status }).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async updateInvoiceDates(id: string, issuedAt: Date, dueDate: Date): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ issuedAt, dueDate }).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
  }

  async createInvoiceLineItem(item: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [created] = await db.insert(invoiceLineItems).values(item).returning();
    return created;
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return db.select().from(paymentMethods).orderBy(desc(paymentMethods.isDefault));
  }

  async createPaymentMethod(pm: InsertPaymentMethod): Promise<PaymentMethod> {
    const [created] = await db.insert(paymentMethods).values(pm).returning();
    return created;
  }

  async getDashboardStats() {
    const [revResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.totalAmountCents}), 0)` })
      .from(invoices)
      .where(eq(invoices.status, "paid"));

    const [projectResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(projects)
      .where(eq(projects.status, "active"));

    const [pendingResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices)
      .where(eq(invoices.status, "pending"));

    const [overdueResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices)
      .where(eq(invoices.status, "overdue"));

    const unbilledEntries = await db
      .select({
        quantity: workEntries.quantity,
        rateCents: billingRates.rateCents,
      })
      .from(workEntries)
      .innerJoin(billingRates, eq(workEntries.rateId, billingRates.id))
      .where(isNull(workEntries.invoiceId));

    const unbilledTotal = unbilledEntries.reduce((sum, e) => sum + (Number(e.quantity) * e.rateCents), 0);

    return {
      totalRevenue: Number(revResult?.total ?? 0),
      activeProjects: Number(projectResult?.count ?? 0),
      pendingInvoices: Number(pendingResult?.count ?? 0),
      unbilledWork: unbilledTotal,
      overdueInvoices: Number(overdueResult?.count ?? 0),
    };
  }

  async generateInvoiceFromWork(projectId: string, taxRate: number = 0, dueDays: number = 30): Promise<Invoice | null> {
    const project = await this.getProject(projectId);
    if (!project) return null;

    const unbilledEntries = await db
      .select({
        entry: workEntries,
        rate: billingRates,
      })
      .from(workEntries)
      .innerJoin(billingRates, eq(workEntries.rateId, billingRates.id))
      .where(and(eq(workEntries.projectId, projectId), isNull(workEntries.invoiceId)));

    if (unbilledEntries.length === 0) return null;

    const subtotalCents = unbilledEntries.reduce(
      (sum, { entry, rate }) => sum + Math.round(Number(entry.quantity) * rate.rateCents),
      0
    );
    const taxAmountCents = Math.round(subtotalCents * (taxRate / 100));
    const totalAmountCents = subtotalCents + taxAmountCents;

    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices);
    const invoiceNum = `INV-${new Date().getFullYear()}-${String(Number(countResult.count) + 1).padStart(4, "0")}`;

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + dueDays);

    const invoice = await this.createInvoice({
      customerId: project.customerId,
      projectId,
      invoiceNumber: invoiceNum,
      status: "pending",
      issuedAt: now,
      dueDate,
      subtotalCents,
      taxRate: String(taxRate),
      taxAmountCents,
      totalAmountCents,
      currency: "USD",
    });

    for (const { entry, rate } of unbilledEntries) {
      const lineTotalCents = Math.round(Number(entry.quantity) * rate.rateCents);
      await this.createInvoiceLineItem({
        invoiceId: invoice.id,
        workEntryId: entry.id,
        description: `${rate.name}${entry.description ? ` — ${entry.description}` : ""}`,
        quantity: entry.quantity,
        unitPrice: rate.rateCents,
        totalCents: lineTotalCents,
      });

      await db
        .update(workEntries)
        .set({ invoiceId: invoice.id })
        .where(eq(workEntries.id, entry.id));
    }

    return invoice;
  }

  async getCustomerByPortalToken(token: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.portalToken, token));
    return customer;
  }

  async getInvoicesByCustomerId(customerId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.customerId, customerId)).orderBy(desc(invoices.createdAt));
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices)
      .where(eq(invoices.status, "overdue"))
      .orderBy(desc(invoices.dueDate));
  }

  async markOverdueInvoices(): Promise<number> {
    const now = new Date();
    const result = await db
      .update(invoices)
      .set({ status: "overdue" })
      .where(and(
        eq(invoices.status, "pending"),
        lt(invoices.dueDate, now)
      ))
      .returning();
    return result.length;
  }

  async findOrCreateCustomerByEmail(email: string, name?: string, company?: string, phone?: string): Promise<Customer> {
    const [existing] = await db.select().from(customers).where(eq(customers.email, email));
    if (existing) return existing;
    const portalToken = crypto.randomUUID();
    const [created] = await db.insert(customers).values({
      name: name || email.split("@")[0],
      email,
      company: company || null,
      phone: phone || null,
      currency: "USD",
      portalToken,
    }).returning();
    return created;
  }

  async createQuoteRequest(quote: InsertQuoteRequest): Promise<QuoteRequest> {
    const [result] = await db.insert(quoteRequests).values(quote).returning();
    return result;
  }

  async getQuoteRequests(): Promise<QuoteRequest[]> {
    return db.select().from(quoteRequests).orderBy(desc(quoteRequests.createdAt));
  }

  async getSupportTickets(filters?: { customerId?: string; status?: string; priority?: string }): Promise<SupportTicket[]> {
    const conditions = [];
    if (filters?.customerId) conditions.push(eq(supportTickets.customerId, filters.customerId));
    if (filters?.status) conditions.push(eq(supportTickets.status, filters.status));
    if (filters?.priority) conditions.push(eq(supportTickets.priority, filters.priority));
    if (conditions.length > 0) {
      return db.select().from(supportTickets).where(and(...conditions)).orderBy(desc(supportTickets.updatedAt));
    }
    return db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt));
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket;
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [maxResult] = await db.select({ maxNum: sql<string>`MAX(ticket_number)` }).from(supportTickets);
    let nextNum = 1;
    if (maxResult?.maxNum) {
      const match = maxResult.maxNum.match(/TKT-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const ticketNum = `TKT-${String(nextNum).padStart(4, "0")}`;
    const [created] = await db.insert(supportTickets).values({ ...ticket, ticketNumber: ticketNum }).returning();
    return created;
  }

  async updateSupportTicket(id: string, updates: Partial<{ status: string; priority: string; category: string }>): Promise<SupportTicket | undefined> {
    const [updated] = await db.update(supportTickets).set({ ...updates, updatedAt: new Date() }).where(eq(supportTickets.id, id)).returning();
    return updated;
  }

  async deleteSupportTicket(id: string): Promise<boolean> {
    await db.delete(ticketMessages).where(eq(ticketMessages.ticketId, id));
    const result = await db.delete(supportTickets).where(eq(supportTickets.id, id)).returning();
    return result.length > 0;
  }

  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
  }

  async createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage> {
    const [created] = await db.insert(ticketMessages).values(message).returning();
    await db.update(supportTickets).set({ updatedAt: new Date() }).where(eq(supportTickets.id, message.ticketId));
    return created;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    const result = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return result.length > 0;
  }

  async deleteCustomerData(customerId: string): Promise<void> {
    const customerInvoices = await db.select().from(invoices).where(eq(invoices.customerId, customerId));
    for (const inv of customerInvoices) {
      await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, inv.id));
    }
    await db.delete(invoices).where(eq(invoices.customerId, customerId));
    await db.delete(workEntries).where(eq(workEntries.customerId, customerId));
    await db.delete(projects).where(eq(projects.customerId, customerId));
    const customerTickets = await db.select().from(supportTickets).where(eq(supportTickets.customerId, customerId));
    for (const ticket of customerTickets) {
      await db.delete(ticketMessages).where(eq(ticketMessages.ticketId, ticket.id));
    }
    await db.delete(supportTickets).where(eq(supportTickets.customerId, customerId));
    await db.delete(customers).where(eq(customers.id, customerId));
  }

  async getQaQuestions(status?: string): Promise<QaQuestion[]> {
    if (status) {
      return db.select().from(qaQuestions).where(eq(qaQuestions.status, status)).orderBy(desc(qaQuestions.createdAt));
    }
    return db.select().from(qaQuestions).orderBy(desc(qaQuestions.createdAt));
  }

  async getQaQuestion(id: string): Promise<QaQuestion | undefined> {
    const [question] = await db.select().from(qaQuestions).where(eq(qaQuestions.id, id));
    return question;
  }

  async createQaQuestion(question: InsertQaQuestion): Promise<QaQuestion> {
    const [created] = await db.insert(qaQuestions).values(question).returning();
    return created;
  }

  async updateQaQuestion(id: string, updates: Partial<{ answer: string; status: string; isPublic: boolean }>): Promise<QaQuestion | undefined> {
    const data: any = { ...updates };
    if (updates.status === "answered" && updates.answer) {
      data.answeredAt = new Date();
    } else if (updates.status === "unanswered") {
      data.answeredAt = null;
    }
    const [updated] = await db.update(qaQuestions).set(data).where(eq(qaQuestions.id, id)).returning();
    return updated;
  }

  async deleteQaQuestion(id: string): Promise<boolean> {
    const result = await db.delete(qaQuestions).where(eq(qaQuestions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPaymentPlans(): Promise<PaymentPlan[]> {
    return await db.select().from(paymentPlans).orderBy(paymentPlans.createdAt);
  }

  async getPaymentPlansByCustomer(customerId: string): Promise<PaymentPlan[]> {
    return await db.select().from(paymentPlans).where(eq(paymentPlans.customerId, customerId)).orderBy(paymentPlans.createdAt);
  }

  async getPaymentPlansByInvoice(invoiceId: string): Promise<PaymentPlan[]> {
    return await db.select().from(paymentPlans).where(eq(paymentPlans.invoiceId, invoiceId)).orderBy(paymentPlans.createdAt);
  }

  async getPaymentPlan(id: string): Promise<PaymentPlan | undefined> {
    const [plan] = await db.select().from(paymentPlans).where(eq(paymentPlans.id, id));
    return plan;
  }

  async createPaymentPlan(plan: InsertPaymentPlan): Promise<PaymentPlan> {
    const [created] = await db.insert(paymentPlans).values(plan).returning();
    return created;
  }

  async updatePaymentPlan(id: string, updates: Partial<PaymentPlan>): Promise<PaymentPlan | undefined> {
    const [updated] = await db.update(paymentPlans).set(updates).where(eq(paymentPlans.id, id)).returning();
    return updated;
  }

  async getPaymentPlanBySubscription(subscriptionId: string): Promise<PaymentPlan | undefined> {
    const [plan] = await db.select().from(paymentPlans).where(eq(paymentPlans.stripeSubscriptionId, subscriptionId));
    return plan;
  }

  async getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    return db.select().from(projectUpdates).where(eq(projectUpdates.projectId, projectId)).orderBy(desc(projectUpdates.createdAt));
  }

  async createProjectUpdate(update: InsertProjectUpdate): Promise<ProjectUpdate> {
    const [created] = await db.insert(projectUpdates).values(update).returning();
    return created;
  }

  async deleteProjectUpdate(id: string): Promise<boolean> {
    const [deleted] = await db.delete(projectUpdates).where(eq(projectUpdates.id, id)).returning();
    return !!deleted;
  }

  async getProjectScreenshots(projectId: string): Promise<ProjectScreenshot[]> {
    return db.select().from(projectScreenshots).where(eq(projectScreenshots.projectId, projectId)).orderBy(desc(projectScreenshots.createdAt));
  }

  async createProjectScreenshot(screenshot: InsertProjectScreenshot): Promise<ProjectScreenshot> {
    const [created] = await db.insert(projectScreenshots).values(screenshot).returning();
    return created;
  }

  async updateProjectScreenshot(id: string, updates: Partial<{ fileName: string; approvalStatus: string; revisionNotes: string | null; approvalRequestedAt: Date | null; approvedAt: Date | null }>): Promise<ProjectScreenshot | undefined> {
    const [updated] = await db.update(projectScreenshots).set(updates).where(eq(projectScreenshots.id, id)).returning();
    return updated;
  }

  async deleteProjectScreenshot(id: string): Promise<boolean> {
    const [deleted] = await db.delete(projectScreenshots).where(eq(projectScreenshots.id, id)).returning();
    return !!deleted;
  }

  async getProjectClientFiles(projectId: string): Promise<ProjectClientFile[]> {
    return db.select().from(projectClientFiles).where(eq(projectClientFiles.projectId, projectId)).orderBy(desc(projectClientFiles.createdAt));
  }

  async createProjectClientFile(file: InsertProjectClientFile): Promise<ProjectClientFile> {
    const [created] = await db.insert(projectClientFiles).values(file).returning();
    return created;
  }

  async deleteProjectClientFile(id: string): Promise<boolean> {
    const [deleted] = await db.delete(projectClientFiles).where(eq(projectClientFiles.id, id)).returning();
    return !!deleted;
  }

  async getNotifications(customerId: string, limit: number = 50): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.customerId, customerId)).orderBy(desc(notifications.createdAt)).limit(limit);
  }

  async getUnreadNotificationCount(customerId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.customerId, customerId), eq(notifications.isRead, false)));
    return result[0]?.count ?? 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
    return updated;
  }

  async markAllNotificationsRead(customerId: string): Promise<number> {
    const result = await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.customerId, customerId), eq(notifications.isRead, false))).returning();
    return result.length;
  }

  async getQuotes(): Promise<Quote[]> {
    return db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async getQuoteByToken(token: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.viewToken, token));
    return quote;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db.insert(quotes).values(quote).returning();
    return created;
  }

  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined> {
    const [updated] = await db.update(quotes).set(updates).where(eq(quotes.id, id)).returning();
    return updated;
  }

  async deleteQuote(id: string): Promise<boolean> {
    await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, id));
    await db.delete(quoteComments).where(eq(quoteComments.quoteId, id));
    const [deleted] = await db.delete(quotes).where(eq(quotes.id, id)).returning();
    return !!deleted;
  }

  async getQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]> {
    return db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId));
  }

  async createQuoteLineItem(item: InsertQuoteLineItem): Promise<QuoteLineItem> {
    const [created] = await db.insert(quoteLineItems).values(item).returning();
    return created;
  }

  async getQuoteComments(quoteId: string): Promise<QuoteComment[]> {
    return db.select().from(quoteComments).where(eq(quoteComments.quoteId, quoteId)).orderBy(quoteComments.createdAt);
  }

  async createQuoteComment(comment: InsertQuoteComment): Promise<QuoteComment> {
    const [created] = await db.insert(quoteComments).values(comment).returning();
    return created;
  }

  async getAgentCostEntries(projectId?: string): Promise<AgentCostEntry[]> {
    if (projectId) {
      return db.select().from(agentCostEntries).where(eq(agentCostEntries.projectId, projectId)).orderBy(desc(agentCostEntries.sessionDate));
    }
    return db.select().from(agentCostEntries).orderBy(desc(agentCostEntries.sessionDate));
  }

  async getAgentCostEntry(id: string): Promise<AgentCostEntry | undefined> {
    const [entry] = await db.select().from(agentCostEntries).where(eq(agentCostEntries.id, id));
    return entry;
  }

  async createAgentCostEntry(entry: InsertAgentCostEntry): Promise<AgentCostEntry> {
    const [created] = await db.insert(agentCostEntries).values(entry).returning();
    return created;
  }

  async deleteAgentCostEntry(id: string): Promise<boolean> {
    const result = await db.delete(agentCostEntries).where(eq(agentCostEntries.id, id)).returning();
    return result.length > 0;
  }

  async getUnbilledAgentCosts(customerId?: string, projectId?: string): Promise<AgentCostEntry[]> {
    const conditions = [isNull(agentCostEntries.invoiceId)];
    if (customerId) conditions.push(eq(agentCostEntries.customerId, customerId));
    if (projectId) conditions.push(eq(agentCostEntries.projectId, projectId));
    return db.select().from(agentCostEntries).where(and(...conditions)).orderBy(desc(agentCostEntries.sessionDate));
  }

  async generateInvoiceFromAgentCosts(customerId: string, projectId?: string): Promise<Invoice | null> {
    const unbilled = await this.getUnbilledAgentCosts(customerId, projectId);
    if (unbilled.length === 0) return null;

    const subtotalCents = unbilled.reduce((sum, e) => sum + e.clientChargeCents, 0);
    const totalAmountCents = subtotalCents;

    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices);
    const invoiceNum = `INV-${new Date().getFullYear()}-${String(Number(countResult.count) + 1).padStart(4, "0")}`;

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.createInvoice({
      customerId,
      projectId: projectId || null,
      invoiceNumber: invoiceNum,
      status: "pending",
      issuedAt: now,
      dueDate,
      subtotalCents,
      taxRate: "0",
      taxAmountCents: 0,
      totalAmountCents,
      currency: "USD",
    });

    for (const entry of unbilled) {
      await this.createInvoiceLineItem({
        invoiceId: invoice.id,
        workEntryId: null,
        description: `AI Development — ${entry.description}`,
        quantity: "1",
        unitPrice: entry.clientChargeCents,
        totalCents: entry.clientChargeCents,
      });

      await db
        .update(agentCostEntries)
        .set({ invoiceId: invoice.id })
        .where(eq(agentCostEntries.id, entry.id));
    }

    return invoice;
  }

  async getConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async getConversationByToken(token: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.accessToken, token));
    return conv;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async updateConversation(id: string, updates: Partial<{ status: string; customerId: string }>): Promise<Conversation | undefined> {
    const [updated] = await db.update(conversations).set({ ...updates, updatedAt: new Date() }).where(eq(conversations.id, id)).returning();
    return updated;
  }

  async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    return db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, conversationId)).orderBy(conversationMessages.createdAt);
  }

  async createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage> {
    const [created] = await db.insert(conversationMessages).values(message).returning();
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, message.conversationId));
    return created;
  }

  async getPushSubscriptions(customerId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.customerId, customerId));
  }

  async createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await db.select().from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.customerId, sub.customerId), eq(pushSubscriptions.endpoint, sub.endpoint)));
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(pushSubscriptions).values(sub).returning();
    return created;
  }

  async deletePushSubscription(endpoint: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).returning();
    return result.length > 0;
  }

  async getApiKeys(): Promise<ApiKey[]> {
    return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return key;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [found] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return found;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(apiKey).returning();
    return created;
  }

  async updateApiKey(id: string, updates: Partial<{ name: string; isActive: boolean; scopes: string; customerId: string | null }>): Promise<ApiKey | undefined> {
    const [updated] = await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id)).returning();
    return updated;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id)).returning();
    return result.length > 0;
  }

  async touchApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async getGitBackupConfigs(projectId?: string): Promise<GitBackupConfig[]> {
    if (projectId) {
      return db.select().from(gitBackupConfigs).where(eq(gitBackupConfigs.projectId, projectId)).orderBy(desc(gitBackupConfigs.createdAt));
    }
    return db.select().from(gitBackupConfigs).orderBy(desc(gitBackupConfigs.createdAt));
  }

  async getGitBackupConfig(id: string): Promise<GitBackupConfig | undefined> {
    const [config] = await db.select().from(gitBackupConfigs).where(eq(gitBackupConfigs.id, id));
    return config;
  }

  async getGitBackupConfigByProject(projectId: string): Promise<GitBackupConfig | undefined> {
    const [config] = await db.select().from(gitBackupConfigs).where(eq(gitBackupConfigs.projectId, projectId));
    return config;
  }

  async getGitBackupConfigByCustomer(customerId: string): Promise<GitBackupConfig[]> {
    return db.select().from(gitBackupConfigs).where(eq(gitBackupConfigs.customerId, customerId)).orderBy(desc(gitBackupConfigs.createdAt));
  }

  async createGitBackupConfig(config: InsertGitBackupConfig): Promise<GitBackupConfig> {
    const [created] = await db.insert(gitBackupConfigs).values(config).returning();
    return created;
  }

  async updateGitBackupConfig(id: string, updates: Partial<GitBackupConfig>): Promise<GitBackupConfig | undefined> {
    const [updated] = await db.update(gitBackupConfigs).set(updates).where(eq(gitBackupConfigs.id, id)).returning();
    return updated;
  }

  async deleteGitBackupConfig(id: string): Promise<boolean> {
    const result = await db.delete(gitBackupConfigs).where(eq(gitBackupConfigs.id, id)).returning();
    return result.length > 0;
  }

  async getGitBackupLogs(configId: string, limit?: number): Promise<GitBackupLog[]> {
    const q = db.select().from(gitBackupLogs).where(eq(gitBackupLogs.configId, configId)).orderBy(desc(gitBackupLogs.createdAt));
    if (limit) return q.limit(limit);
    return q;
  }

  async getGitBackupLogsByProject(projectId: string, limit?: number): Promise<GitBackupLog[]> {
    const q = db.select().from(gitBackupLogs).where(eq(gitBackupLogs.projectId, projectId)).orderBy(desc(gitBackupLogs.createdAt));
    if (limit) return q.limit(limit);
    return q;
  }

  async createGitBackupLog(log: InsertGitBackupLog): Promise<GitBackupLog> {
    const [created] = await db.insert(gitBackupLogs).values(log).returning();
    return created;
  }

  async updateGitBackupLog(id: string, updates: Partial<GitBackupLog>): Promise<GitBackupLog | undefined> {
    const [updated] = await db.update(gitBackupLogs).set(updates).where(eq(gitBackupLogs.id, id)).returning();
    return updated;
  }

  async getAutopilotDueConfigs(): Promise<GitBackupConfig[]> {
    return db.select().from(gitBackupConfigs).where(
      and(
        eq(gitBackupConfigs.autopilotEnabled, true),
        eq(gitBackupConfigs.isConnected, true),
        lt(gitBackupConfigs.nextScheduledAt, new Date()),
      )
    );
  }

  async getLeads(filters?: { status?: string; zipCode?: string }): Promise<Lead[]> {
    let conditions = [];
    if (filters?.status) conditions.push(eq(leads.status, filters.status));
    if (filters?.zipCode) conditions.push(eq(leads.zipCode, filters.zipCode));
    if (conditions.length > 0) {
      return db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt));
    }
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadByPlaceId(placeId: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.googlePlaceId, placeId));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async updateLead(id: string, updates: Partial<InsertLead & { auditScore: number; auditData: string; lastContactedAt: Date }>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result.length > 0;
  }

  async getLinodeServers(): Promise<LinodeServer[]> {
    return db.select().from(linodeServers).orderBy(desc(linodeServers.createdAt));
  }

  async getLinodeServer(id: string): Promise<LinodeServer | undefined> {
    const [server] = await db.select().from(linodeServers).where(eq(linodeServers.id, id));
    return server;
  }

  async getLinodeServerByLinodeId(linodeId: number): Promise<LinodeServer | undefined> {
    const [server] = await db.select().from(linodeServers).where(eq(linodeServers.linodeId, linodeId));
    return server;
  }

  async getLinodeServersByCustomerId(customerId: string): Promise<LinodeServer[]> {
    return db.select().from(linodeServers).where(eq(linodeServers.customerId, customerId)).orderBy(desc(linodeServers.createdAt));
  }

  async createLinodeServer(server: InsertLinodeServer, id?: string): Promise<LinodeServer> {
    const values = id ? { ...server, id } : server;
    const [created] = await db.insert(linodeServers).values(values).returning();
    return created;
  }

  async updateLinodeServer(id: string, updates: Partial<InsertLinodeServer>): Promise<LinodeServer | undefined> {
    const [updated] = await db.update(linodeServers).set(updates).where(eq(linodeServers.id, id)).returning();
    return updated;
  }

  async deleteLinodeServer(id: string): Promise<boolean> {
    const result = await db.delete(linodeServers).where(eq(linodeServers.id, id)).returning();
    return result.length > 0;
  }

  async getKnowledgeBaseArticles(): Promise<KnowledgeBaseArticle[]> {
    return db.select().from(knowledgeBaseArticles).orderBy(knowledgeBaseArticles.sortOrder, knowledgeBaseArticles.createdAt);
  }

  async getPublishedKnowledgeBaseArticles(): Promise<KnowledgeBaseArticle[]> {
    return db.select().from(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.status, "published")).orderBy(knowledgeBaseArticles.sortOrder, knowledgeBaseArticles.createdAt);
  }

  async getKnowledgeBaseArticle(id: string): Promise<KnowledgeBaseArticle | undefined> {
    const [article] = await db.select().from(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.id, id));
    return article;
  }

  async getKnowledgeBaseArticleBySlug(slug: string): Promise<KnowledgeBaseArticle | undefined> {
    const [article] = await db.select().from(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.slug, slug));
    return article;
  }

  async createKnowledgeBaseArticle(article: InsertKnowledgeBaseArticle): Promise<KnowledgeBaseArticle> {
    const [created] = await db.insert(knowledgeBaseArticles).values(article).returning();
    return created;
  }

  async updateKnowledgeBaseArticle(id: string, updates: Partial<InsertKnowledgeBaseArticle>): Promise<KnowledgeBaseArticle | undefined> {
    const [updated] = await db.update(knowledgeBaseArticles).set({ ...updates, updatedAt: new Date() }).where(eq(knowledgeBaseArticles.id, id)).returning();
    return updated;
  }

  async deleteKnowledgeBaseArticle(id: string): Promise<boolean> {
    const result = await db.delete(knowledgeBaseArticles).where(eq(knowledgeBaseArticles.id, id)).returning();
    return result.length > 0;
  }

  async getKnowledgeBaseCategories(): Promise<KnowledgeBaseCategory[]> {
    return db.select().from(knowledgeBaseCategories).orderBy(knowledgeBaseCategories.sortOrder, knowledgeBaseCategories.createdAt);
  }

  async createKnowledgeBaseCategory(data: InsertKnowledgeBaseCategory): Promise<KnowledgeBaseCategory> {
    const [created] = await db.insert(knowledgeBaseCategories).values(data).returning();
    return created;
  }

  async updateKnowledgeBaseCategory(id: string, updates: Partial<InsertKnowledgeBaseCategory>): Promise<KnowledgeBaseCategory | undefined> {
    const [updated] = await db.update(knowledgeBaseCategories).set(updates).where(eq(knowledgeBaseCategories.id, id)).returning();
    return updated;
  }

  async deleteKnowledgeBaseCategory(id: string): Promise<boolean> {
    const result = await db.delete(knowledgeBaseCategories).where(eq(knowledgeBaseCategories.id, id)).returning();
    return result.length > 0;
  }

  async getKnowledgeBaseTags(): Promise<KnowledgeBaseTag[]> {
    return db.select().from(knowledgeBaseTags).orderBy(knowledgeBaseTags.createdAt);
  }

  async createKnowledgeBaseTag(data: InsertKnowledgeBaseTag): Promise<KnowledgeBaseTag> {
    const [created] = await db.insert(knowledgeBaseTags).values(data).returning();
    return created;
  }

  async updateKnowledgeBaseTag(id: string, updates: Partial<InsertKnowledgeBaseTag>): Promise<KnowledgeBaseTag | undefined> {
    const [updated] = await db.update(knowledgeBaseTags).set(updates).where(eq(knowledgeBaseTags.id, id)).returning();
    return updated;
  }

  async deleteKnowledgeBaseTag(id: string): Promise<boolean> {
    const result = await db.delete(knowledgeBaseTags).where(eq(knowledgeBaseTags.id, id)).returning();
    return result.length > 0;
  }

  async getLicenses(customerId?: string): Promise<License[]> {
    if (customerId) {
      return db.select().from(licenses).where(eq(licenses.customerId, customerId)).orderBy(desc(licenses.createdAt));
    }
    return db.select().from(licenses).orderBy(desc(licenses.createdAt));
  }

  async getLicense(id: string): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    return license;
  }

  async getLicenseByKey(key: string): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.licenseKey, key));
    return license;
  }

  async createLicense(license: InsertLicense): Promise<License> {
    const [created] = await db.insert(licenses).values(license).returning();
    return created;
  }

  async updateLicense(id: string, updates: Partial<InsertLicense>): Promise<License | undefined> {
    const [updated] = await db.update(licenses).set(updates).where(eq(licenses.id, id)).returning();
    return updated;
  }

  async deleteLicense(id: string): Promise<boolean> {
    const result = await db.delete(licenses).where(eq(licenses.id, id)).returning();
    return result.length > 0;
  }

  async incrementLicenseActivation(id: string, ip: string, hostname: string): Promise<License | undefined> {
    const [updated] = await db.update(licenses).set({
      activationCount: sql`${licenses.activationCount} + 1`,
      lastActivatedAt: new Date(),
      lastActivatedIp: ip,
      lastActivatedHostname: hostname,
    }).where(eq(licenses.id, id)).returning();
    return updated;
  }

  async getLicenseActivations(licenseId: string): Promise<LicenseActivation[]> {
    return db.select().from(licenseActivations).where(eq(licenseActivations.licenseId, licenseId)).orderBy(desc(licenseActivations.activatedAt));
  }

  async getActiveLicenseActivations(licenseId: string): Promise<LicenseActivation[]> {
    return db.select().from(licenseActivations)
      .where(and(eq(licenseActivations.licenseId, licenseId), eq(licenseActivations.status, "active")))
      .orderBy(desc(licenseActivations.activatedAt));
  }

  async getLicenseActivationByIp(licenseId: string, ip: string): Promise<LicenseActivation | undefined> {
    const [activation] = await db.select().from(licenseActivations)
      .where(and(
        eq(licenseActivations.licenseId, licenseId),
        eq(licenseActivations.serverIp, ip),
        eq(licenseActivations.status, "active")
      ));
    return activation;
  }

  async createLicenseActivation(activation: InsertLicenseActivation): Promise<LicenseActivation> {
    const [created] = await db.insert(licenseActivations).values(activation).returning();
    return created;
  }

  async releaseLicenseActivation(id: string): Promise<LicenseActivation | undefined> {
    const [updated] = await db.update(licenseActivations).set({
      status: "released",
      releasedAt: new Date(),
    }).where(eq(licenseActivations.id, id)).returning();
    if (updated) {
      const license = await this.getLicense(updated.licenseId);
      if (license && (license.activationCount || 0) > 0) {
        await db.update(licenses).set({
          activationCount: sql`GREATEST(${licenses.activationCount} - 1, 0)`,
        }).where(eq(licenses.id, updated.licenseId));
      }
    }
    return updated;
  }

  async releaseLicenseActivationsByServerId(serverId: string): Promise<number> {
    const result = await db.update(licenseActivations).set({
      status: "released",
      releasedAt: new Date(),
    }).where(and(
      eq(licenseActivations.serverId, serverId),
      eq(licenseActivations.status, "active")
    )).returning();
    for (const activation of result) {
      const license = await this.getLicense(activation.licenseId);
      if (license && (license.activationCount || 0) > 0) {
        await db.update(licenses).set({
          activationCount: sql`GREATEST(${licenses.activationCount} - 1, 0)`,
        }).where(eq(licenses.id, activation.licenseId));
      }
    }
    return result.length;
  }
}

export const storage = new DatabaseStorage();
