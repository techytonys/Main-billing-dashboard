import { db } from "./db";
import { eq, desc, sql, and, isNull, lt } from "drizzle-orm";
import {
  users, customers, projects, billingRates, workEntries, invoices, invoiceLineItems, paymentMethods, quoteRequests, supportTickets, ticketMessages, qaQuestions, paymentPlans, projectUpdates, projectScreenshots, projectClientFiles, notifications, quotes, quoteLineItems, quoteComments,
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
  createBillingRate(rate: InsertBillingRate): Promise<BillingRate>;
  updateBillingRate(id: string, rate: Partial<InsertBillingRate>): Promise<BillingRate | undefined>;
  deleteBillingRate(id: string): Promise<boolean>;

  getWorkEntries(filters?: { projectId?: string; customerId?: string; unbilledOnly?: boolean }): Promise<WorkEntry[]>;
  createWorkEntry(entry: InsertWorkEntry): Promise<WorkEntry>;
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

  generateInvoiceFromWork(projectId: string, taxRate?: number): Promise<Invoice | null>;

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

  async createWorkEntry(entry: InsertWorkEntry): Promise<WorkEntry> {
    const [created] = await db.insert(workEntries).values(entry).returning();
    return created;
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

  async generateInvoiceFromWork(projectId: string, taxRate: number = 0): Promise<Invoice | null> {
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
    dueDate.setDate(dueDate.getDate() + 30);

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
}

export const storage = new DatabaseStorage();
