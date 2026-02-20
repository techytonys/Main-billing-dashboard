import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertProjectSchema, insertBillingRateSchema, insertWorkEntrySchema, insertQuoteRequestSchema, insertSupportTicketSchema, insertTicketMessageSchema, insertQaQuestionSchema, insertProjectUpdateSchema } from "@shared/schema";
import crypto from "crypto";
import { z } from "zod";
import { sendInvoiceEmail, sendTicketNotification, sendPortalWelcomeEmail, sendNotificationEmail, sendQuoteEmail, sendQuoteAdminNotification, sendQuoteRequirementsEmail, sendConversationNotificationToAdmin, sendConversationReplyToVisitor } from "./email";
import { isAuthenticated } from "./replit_integrations/auth";
import { generateInvoicePDF } from "./pdf";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import type { Customer } from "@shared/schema";
import webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@aipoweredsites.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

function getSiteBaseUrl(req: any): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "localhost:5000";
  return `${protocol}://${host}`;
}

async function sendPushToCustomer(customerId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  try {
    const subs = await storage.getPushSubscriptions(customerId);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await storage.deletePushSubscription(sub.endpoint);
        }
      }
    }
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

async function createNotificationAndEmail(
  customerId: string,
  type: string,
  title: string,
  body: string,
  linkUrl?: string,
) {
  try {
    const notification = await storage.createNotification({
      customerId,
      type,
      title,
      body: body || null,
      linkUrl: linkUrl || null,
      isRead: false,
    });
    const customer = await storage.getCustomer(customerId);
    if (customer?.email && customer.portalToken) {
      const portalBase = process.env.SITE_URL
        || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
        || (process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : null)
        || "https://aipoweredsites.com";
      const portalUrl = `${portalBase}/portal/${customer.portalToken}`;
      sendNotificationEmail({
        customerName: customer.name,
        customerEmail: customer.email,
        title,
        body: body || "",
        portalUrl,
      }).catch((err) => console.error("Notification email failed:", err));
    }

    sendPushToCustomer(customerId, {
      title,
      body: body || "",
      url: linkUrl,
      tag: type,
    }).catch((err) => console.error("Push notification failed:", err));

    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try {
      await storage.markOverdueInvoices();
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/customers", isAuthenticated, async (_req, res) => {
    try {
      const result = await storage.getCustomers();
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      res.json(customer);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(parsed);
      res.status(201).json(customer);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid customer data" });
    }
  });

  app.patch("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      res.json(customer);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Customer not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  app.post("/api/customers/:id/send-portal-link", isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      if (!customer.email) return res.status(400).json({ message: "Customer has no email address" });
      if (!customer.portalToken) return res.status(400).json({ message: "Customer has no portal token" });

      const portalUrl = `${getSiteBaseUrl(req)}/portal/${customer.portalToken}`;

      const result = await sendPortalWelcomeEmail({
        customerName: customer.name,
        customerEmail: customer.email,
        portalUrl,
      });

      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to send email" });
      }
      res.json({ success: true, messageId: result.messageId });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to send portal link email" });
    }
  });

  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const result = await storage.getProjects(customerId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(parsed);
      res.status(201).json(project);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const { name, description, status, previewUrl, progressUrl, customerId } = req.body;
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;
      if (customerId !== undefined) updates.customerId = customerId;
      if (previewUrl !== undefined) {
        if (previewUrl !== null && previewUrl !== "" && !/^https?:\/\/.+/i.test(previewUrl)) {
          return res.status(400).json({ message: "Preview URL must start with http:// or https://" });
        }
        updates.previewUrl = previewUrl || null;
      }
      if (progressUrl !== undefined) {
        if (progressUrl !== null && progressUrl !== "" && !/^https?:\/\/.+/i.test(progressUrl)) {
          return res.status(400).json({ message: "Progress URL must start with http:// or https://" });
        }
        updates.progressUrl = progressUrl || null;
      }
      const project = await storage.updateProject(req.params.id, updates);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Project not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to delete project" });
    }
  });

  app.get("/api/projects/:id/updates", isAuthenticated, async (req, res) => {
    try {
      const updates = await storage.getProjectUpdates(req.params.id);
      res.json(updates);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch project updates" });
    }
  });

  app.post("/api/projects/:id/updates", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const parsed = insertProjectUpdateSchema.parse({ ...req.body, projectId: req.params.id });
      const update = await storage.createProjectUpdate(parsed);

      createNotificationAndEmail(
        project.customerId,
        "project_update",
        `Project Update: ${project.name}`,
        `${parsed.title}${parsed.description ? " - " + parsed.description : ""}`,
      ).catch(() => {});

      res.status(201).json(update);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid update data" });
    }
  });

  app.delete("/api/project-updates/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteProjectUpdate(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Update not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete update" });
    }
  });

  app.get("/api/public/progress/:projectId", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const customer = await storage.getCustomer(project.customerId);
      const updates = await storage.getProjectUpdates(project.id);
      const workEntries = await storage.getWorkEntries({ projectId: project.id });
      res.json({
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          previewUrl: project.previewUrl,
          createdAt: project.createdAt,
        },
        customerName: customer?.name || "Client",
        updates,
        completedWork: workEntries.length,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch progress data" });
    }
  });

  app.get("/api/billing-rates", isAuthenticated, async (_req, res) => {
    try {
      const rates = await storage.getBillingRates();
      res.json(rates);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch billing rates" });
    }
  });

  app.post("/api/billing-rates", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertBillingRateSchema.parse(req.body);
      const rate = await storage.createBillingRate(parsed);
      res.status(201).json(rate);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid billing rate data" });
    }
  });

  app.patch("/api/billing-rates/:id", isAuthenticated, async (req, res) => {
    try {
      const rate = await storage.updateBillingRate(req.params.id, req.body);
      if (!rate) return res.status(404).json({ message: "Rate not found" });
      res.json(rate);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to update rate" });
    }
  });

  app.delete("/api/billing-rates/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteBillingRate(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Rate not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete billing rate" });
    }
  });

  app.get("/api/work-entries", isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const customerId = req.query.customerId as string | undefined;
      const unbilledOnly = req.query.unbilledOnly === "true";
      const entries = await storage.getWorkEntries({ projectId, customerId, unbilledOnly });
      res.json(entries);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch work entries" });
    }
  });

  app.post("/api/work-entries", isAuthenticated, async (req, res) => {
    try {
      const { recordedAt, ...rest } = req.body;
      const parsed = insertWorkEntrySchema.parse(rest);
      const entryData: any = { ...parsed };
      if (recordedAt) {
        entryData.recordedAt = new Date(recordedAt);
      }
      const entry = await storage.createWorkEntry(entryData);
      res.status(201).json(entry);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid work entry data" });
    }
  });

  app.patch("/api/work-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const { rateId, quantity, description, recordedAt } = req.body;
      const updateData: any = {};
      if (rateId !== undefined) {
        if (typeof rateId !== "string" || !rateId.trim()) return res.status(400).json({ message: "Invalid rateId" });
        updateData.rateId = rateId;
      }
      if (quantity !== undefined) {
        const q = Number(quantity);
        if (isNaN(q) || q <= 0) return res.status(400).json({ message: "Quantity must be a positive number" });
        updateData.quantity = String(q);
      }
      if (description !== undefined) updateData.description = description;
      if (recordedAt !== undefined) {
        const d = new Date(recordedAt);
        if (isNaN(d.getTime())) return res.status(400).json({ message: "Invalid date" });
        updateData.recordedAt = d;
      }
      const updated = await storage.updateWorkEntry(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "Work entry not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to update work entry" });
    }
  });

  app.delete("/api/work-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteWorkEntry(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Work entry not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete work entry" });
    }
  });

  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      await storage.markOverdueInvoices();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const invs = await storage.getInvoices(limit);
      res.json(invs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      const lineItems = await storage.getInvoiceLineItems(invoice.id);
      const customer = await storage.getCustomer(invoice.customerId);
      let projectName: string | null = null;
      if (invoice.projectId) {
        const project = await storage.getProject(invoice.projectId);
        if (project) projectName = project.name;
      }
      const workEntries = await storage.getWorkEntriesByInvoice(invoice.id);
      const rates = await storage.getBillingRates();
      const rateMap = new Map(rates.map(r => [r.id, r]));
      const enrichedWorkEntries = workEntries.map(e => ({
        ...e,
        rateName: rateMap.get(e.rateId)?.name ?? null,
        unitLabel: rateMap.get(e.rateId)?.unitLabel ?? null,
        rateCents: rateMap.get(e.rateId)?.rateCents ?? 0,
      }));
      res.json({
        ...invoice,
        lineItems,
        projectName,
        customerName: customer?.company || customer?.name || null,
        workEntries: enrichedWorkEntries,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.patch("/api/invoices/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "Status is required" });
      const invoice = await storage.updateInvoiceStatus(req.params.id, status);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      res.json(invoice);
    } catch (err) {
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Invoice not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to delete invoice" });
    }
  });

  app.post("/api/invoices/generate", isAuthenticated, async (req, res) => {
    try {
      const { projectId, dueDays } = req.body;
      if (!projectId) return res.status(400).json({ message: "projectId is required" });
      const invoice = await storage.generateInvoiceFromWork(projectId, 0, dueDays || 30);
      if (!invoice) return res.status(400).json({ message: "No unbilled work entries found for this project" });

      const project = await storage.getProject(projectId);
      if (project) {
        const amt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(invoice.totalAmountCents / 100);
        createNotificationAndEmail(
          invoice.customerId,
          "invoice_created",
          `New Invoice: ${invoice.invoiceNumber}`,
          `A new invoice for ${amt} has been generated${project ? ` for project "${project.name}"` : ""}. Due date: ${new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`,
        ).catch(() => {});
      }

      res.status(201).json(invoice);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to generate invoice" });
    }
  });

  app.post("/api/invoices/generate-from-agent-costs", isAuthenticated, async (req, res) => {
    try {
      const { customerId, projectId } = req.body;
      if (!customerId) return res.status(400).json({ message: "customerId is required" });

      const customer = await storage.getCustomer(customerId);
      if (!customer) return res.status(404).json({ message: "Customer not found" });

      const invoice = await storage.generateInvoiceFromAgentCosts(customerId, projectId || undefined);
      if (!invoice) return res.status(400).json({ message: "No unbilled agent cost entries found for this customer" });

      const amt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(invoice.totalAmountCents / 100);
      createNotificationAndEmail(
        invoice.customerId,
        "invoice_created",
        `New Invoice: ${invoice.invoiceNumber}`,
        `A new invoice for ${amt} has been generated for AI development services. Due date: ${new Date(invoice.dueDate!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`,
      ).catch(() => {});

      res.status(201).json(invoice);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to generate invoice" });
    }
  });

  app.get("/api/invoices/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      const lineItems = await storage.getInvoiceLineItems(invoice.id);
      const customer = await storage.getCustomer(invoice.customerId);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      const doc = generateInvoicePDF(invoice, lineItems, customer);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      doc.pipe(res);
      doc.end();
    } catch (err) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.get("/api/portal/:token/invoices/:invoiceId/pdf", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const invoice = await storage.getInvoice(req.params.invoiceId);
      if (!invoice || invoice.customerId !== customer.id) return res.status(404).json({ message: "Invoice not found" });
      const lineItems = await storage.getInvoiceLineItems(invoice.id);
      const doc = generateInvoicePDF(invoice, lineItems, customer);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      doc.pipe(res);
      doc.end();
    } catch (err) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.status !== "draft") {
        return res.status(400).json({ message: "Only draft invoices can be deleted" });
      }
      await storage.deleteInvoice(req.params.id);
      res.json({ message: "Invoice deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  app.post("/api/portal/:token/delete-account", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const unpaidInvoices = (await storage.getInvoicesByCustomerId(customer.id))
        .filter(inv => inv.status === "pending" || inv.status === "overdue");
      if (unpaidInvoices.length > 0) {
        return res.status(400).json({ message: "Cannot delete account with outstanding invoices. Please settle all invoices first." });
      }
      await storage.deleteCustomerData(customer.id);
      res.json({ message: "Your account and data have been deleted." });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete account data" });
    }
  });

  app.get("/api/payment-methods", isAuthenticated, async (_req, res) => {
    try {
      const methods = await storage.getPaymentMethods();
      res.json(methods);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.get("/api/portal/:token", async (req, res) => {
    try {
      await storage.markOverdueInvoices();
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const customerInvoices = await storage.getInvoicesByCustomerId(customer.id);
      const invoicesWithLineItems = await Promise.all(
        customerInvoices.map(async (inv) => {
          const lineItems = await storage.getInvoiceLineItems(inv.id);
          return { ...inv, lineItems };
        })
      );
      const customerProjects = await storage.getProjects(customer.id);
      res.json({
        customer: { name: customer.name, company: customer.company, email: customer.email, phone: customer.phone },
        invoices: invoicesWithLineItems,
        projects: customerProjects,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to load portal" });
    }
  });

  app.patch("/api/portal/:token/profile", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const portalProfileSchema = z.object({
        name: z.string().min(1, "Name is required").optional(),
        email: z.string().email("Invalid email address"),
        company: z.string().optional().default(""),
        phone: z.string().optional().default(""),
      });

      const parsed = portalProfileSchema.parse(req.body);
      const updates: Partial<{ name: string; email: string; company: string | null; phone: string | null }> = {};
      if (parsed.name) updates.name = parsed.name.trim();
      updates.email = parsed.email.trim();
      updates.company = parsed.company?.trim() || null;
      updates.phone = parsed.phone?.trim() || null;

      const updated = await storage.updateCustomer(customer.id, updates);
      if (!updated) return res.status(500).json({ message: "Failed to update profile" });
      res.json({ name: updated.name, company: updated.company, email: updated.email, phone: updated.phone });
    } catch (err) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/invoices/:id/send", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const lineItems = await storage.getInvoiceLineItems(invoice.id);
      const customer = await storage.getCustomer(invoice.customerId);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      if (!customer.email) return res.status(400).json({ message: "Customer has no email address" });

      const portalUrl = customer.portalToken ? `${getSiteBaseUrl(req)}/portal/${customer.portalToken}` : undefined;

      let issuedAt = invoice.issuedAt;
      let dueDate = invoice.dueDate;
      if (!issuedAt || !dueDate) {
        issuedAt = issuedAt || new Date();
        dueDate = dueDate || new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        await storage.updateInvoiceDates(invoice.id, issuedAt, dueDate);
      }

      const result = await sendInvoiceEmail({
        customerName: customer.name,
        customerEmail: customer.email,
        companyName: customer.company,
        invoiceNumber: invoice.invoiceNumber,
        issuedAt: issuedAt.toISOString(),
        dueDate: dueDate.toISOString(),
        lineItems: lineItems.map(li => ({
          description: li.description,
          quantity: Number(li.quantity),
          unitPrice: li.unitPrice,
          total: li.totalCents,
        })),
        subtotal: invoice.subtotalCents,
        total: invoice.totalAmountCents,
        currency: invoice.currency || "USD",
        portalUrl,
      });

      if (result.success) {
        if (invoice.status === "draft") {
          await storage.updateInvoiceStatus(invoice.id, "pending");
        }
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ message: result.error || "Failed to send email" });
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to send invoice email" });
    }
  });

  app.get("/api/overdue-invoices", isAuthenticated, async (_req, res) => {
    try {
      const marked = await storage.markOverdueInvoices();
      const overdue = await storage.getOverdueInvoices();
      res.json(overdue);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch overdue invoices" });
    }
  });

  app.post("/api/newsletter/create-audience", async (_req, res) => {
    try {
      const { createResendAudience } = await import("./email");
      const result = await createResendAudience("Newsletter");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email, firstName, lastName } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      const { addNewsletterContact } = await import("./email");
      const result = await addNewsletterContact({
        email: email.trim(),
        firstName: firstName?.trim() || undefined,
        lastName: lastName?.trim() || undefined,
      });
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to subscribe" });
      }
      res.json({ message: "Subscribed successfully", contactId: result.contactId });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to subscribe" });
    }
  });

  app.post("/api/quote-requests", async (req, res) => {
    try {
      const validated = insertQuoteRequestSchema.parse(req.body);
      const quote = await storage.createQuoteRequest(validated);

      try {
        const customer = await storage.findOrCreateCustomerByEmail(
          validated.email,
          validated.name,
          validated.company || undefined,
          validated.phone || undefined
        );

        const subject = `Quote Request: ${validated.projectType}`;
        const messageBody = [
          `New quote request from ${validated.name}`,
          validated.company ? `Company: ${validated.company}` : null,
          `Email: ${validated.email}`,
          validated.phone ? `Phone: ${validated.phone}` : null,
          `Project Type: ${validated.projectType}`,
          validated.budget ? `Budget: ${validated.budget}` : null,
          `\nMessage:\n${validated.message}`,
        ].filter(Boolean).join("\n");

        const ticket = await storage.createSupportTicket({
          customerId: customer.id,
          subject,
          category: "billing",
          priority: "medium",
        });

        await storage.createTicketMessage({
          ticketId: ticket.id,
          senderType: "customer",
          senderName: validated.name,
          message: messageBody,
        });

        const portalUrl = customer.portalToken
          ? `${getSiteBaseUrl(req)}/portal/${customer.portalToken}`
          : undefined;

        await sendTicketNotification({
          customerName: validated.name,
          customerEmail: validated.email,
          ticketNumber: ticket.ticketNumber,
          subject,
          message: messageBody,
          isReply: false,
          senderName: validated.name,
          portalUrl,
        });
      } catch (ticketErr) {
        console.error("Failed to create ticket from quote request (non-fatal):", ticketErr);
      }

      res.status(201).json(quote);
    } catch (err: any) {
      if (err.name === "ZodError") {
        res.status(400).json({ message: "Invalid form data", errors: err.errors });
      } else {
        res.status(500).json({ message: "Failed to submit quote request" });
      }
    }
  });

  app.get("/api/quote-requests", isAuthenticated, async (_req, res) => {
    try {
      const quotes = await storage.getQuoteRequests();
      res.json(quotes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch quote requests" });
    }
  });

  // ============ INBOUND EMAIL WEBHOOK (Resend) ============

  app.post("/api/webhooks/resend/inbound", async (req, res) => {
    try {
      const event = req.body;

      if (event.type !== "email.received") {
        return res.status(200).json({ received: true, skipped: true });
      }

      const { email_id, from: fromField, subject } = event.data || {};
      if (!fromField || !email_id) {
        return res.status(200).json({ received: true, skipped: true });
      }

      const emailMatch = fromField.match(/<([^>]+)>/) || [null, fromField];
      const senderEmail = (emailMatch[1] || fromField).trim().toLowerCase();
      const nameMatch = fromField.match(/^([^<]+)</);
      const senderName = nameMatch ? nameMatch[1].trim() : senderEmail.split("@")[0];

      let emailBody = subject || "(No content)";
      try {
        const { Resend } = await import("resend");
        const resendClient = new Resend(process.env.RESEND_API_KEY);
        const emailData = await (resendClient as any).emails.get(email_id);
        if (emailData?.data?.text) {
          emailBody = emailData.data.text;
        } else if (emailData?.data?.html) {
          emailBody = emailData.data.html.replace(/<[^>]*>/g, "").trim();
        }
      } catch (fetchErr) {
        console.error("Could not fetch email body (using subject as fallback):", fetchErr);
      }

      const customer = await storage.findOrCreateCustomerByEmail(senderEmail, senderName);

      const ticketSubject = subject || "Email Inquiry";
      const ticket = await storage.createSupportTicket({
        customerId: customer.id,
        subject: ticketSubject,
        category: "general",
        priority: "medium",
      });

      await storage.createTicketMessage({
        ticketId: ticket.id,
        senderType: "customer",
        senderName: senderName,
        message: emailBody,
      });

      const portalUrl = customer.portalToken
        ? `${getSiteBaseUrl(req)}/portal/${customer.portalToken}`
        : undefined;

      await sendTicketNotification({
        customerName: senderName,
        customerEmail: senderEmail,
        ticketNumber: ticket.ticketNumber,
        subject: ticketSubject,
        message: emailBody.substring(0, 500),
        isReply: false,
        senderName: senderName,
        portalUrl,
      }).catch((err: any) => console.error("Failed to send ticket confirmation:", err));

      console.log(`Inbound email from ${senderEmail} → Ticket ${ticket.ticketNumber}`);
      res.status(200).json({ received: true, ticketNumber: ticket.ticketNumber });
    } catch (err: any) {
      console.error("Inbound email webhook error:", err);
      res.status(200).json({ received: true, error: err.message });
    }
  });

  // ============ SUPPORT TICKETS - ADMIN ============

  app.get("/api/support/tickets", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;
      const tickets = await storage.getSupportTickets({ status, priority });
      const ticketsWithCustomer = await Promise.all(
        tickets.map(async (ticket) => {
          const customer = await storage.getCustomer(ticket.customerId);
          return { ...ticket, customerName: customer?.name || "Unknown", customerEmail: customer?.email || "" };
        })
      );
      res.json(ticketsWithCustomer);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get("/api/support/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      const messages = await storage.getTicketMessages(ticket.id);
      const customer = await storage.getCustomer(ticket.customerId);
      const project = ticket.projectId ? await storage.getProject(ticket.projectId) : null;
      res.json({
        ...ticket,
        customerName: customer?.name || "Unknown",
        customerEmail: customer?.email || "",
        projectName: project?.name || null,
        messages,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.patch("/api/support/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const updates: Partial<{ status: string; priority: string; category: string }> = {};
      if (req.body.status) updates.status = req.body.status;
      if (req.body.priority) updates.priority = req.body.priority;
      if (req.body.category) updates.category = req.body.category;
      const ticket = await storage.updateSupportTicket(req.params.id, updates);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      res.json(ticket);
    } catch (err) {
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  app.delete("/api/support/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteSupportTicket(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Ticket not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete ticket" });
    }
  });

  app.post("/api/support/tickets/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      const messageSchema = z.object({
        message: z.string().min(1, "Message is required"),
      });
      const parsed = messageSchema.parse(req.body);

      const msg = await storage.createTicketMessage({
        ticketId: ticket.id,
        senderType: "admin",
        senderName: "Support Team",
        message: parsed.message,
      });

      const customer = await storage.getCustomer(ticket.customerId);
      if (customer?.email) {
        const portalUrl = customer.portalToken ? `${getSiteBaseUrl(req)}/portal/${customer.portalToken}` : undefined;
        sendTicketNotification({
          customerName: customer.name,
          customerEmail: customer.email,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          message: parsed.message,
          isReply: true,
          senderName: "Support Team",
          portalUrl,
        }).catch(() => {});
      }

      createNotificationAndEmail(
        ticket.customerId,
        "ticket_reply",
        `Reply on Ticket: ${ticket.subject}`,
        `The support team has replied to your ticket (${ticket.ticketNumber}).`,
      ).catch(() => {});

      res.status(201).json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to send reply" });
    }
  });

  // ============ SUPPORT TICKETS - PORTAL ============

  app.get("/api/portal/:token/tickets", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const tickets = await storage.getSupportTickets({ customerId: customer.id });
      res.json(tickets);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.post("/api/portal/:token/tickets", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const ticketSchema = z.object({
        subject: z.string().min(1, "Subject is required"),
        message: z.string().min(1, "Message is required"),
        category: z.string().optional().default("general"),
        priority: z.string().optional().default("medium"),
        projectId: z.string().optional(),
      });
      const parsed = ticketSchema.parse(req.body);

      const ticket = await storage.createSupportTicket({
        customerId: customer.id,
        subject: parsed.subject,
        category: parsed.category,
        priority: parsed.priority,
        projectId: parsed.projectId || null,
        status: "open",
      });

      await storage.createTicketMessage({
        ticketId: ticket.id,
        senderType: "customer",
        senderName: customer.name,
        message: parsed.message,
      });

      if (customer.email) {
        const portalUrl = `${getSiteBaseUrl(req)}/portal/${customer.portalToken}`;
        sendTicketNotification({
          customerName: customer.name,
          customerEmail: customer.email,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          message: parsed.message,
          isReply: false,
          senderName: customer.name,
          portalUrl,
        }).catch(() => {});
      }

      res.status(201).json(ticket);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to create ticket" });
    }
  });

  app.get("/api/portal/:token/tickets/:ticketId", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const ticket = await storage.getSupportTicket(req.params.ticketId);
      if (!ticket || ticket.customerId !== customer.id) return res.status(404).json({ message: "Ticket not found" });
      const messages = await storage.getTicketMessages(ticket.id);
      res.json({ ...ticket, messages });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.post("/api/portal/:token/tickets/:ticketId/messages", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const ticket = await storage.getSupportTicket(req.params.ticketId);
      if (!ticket || ticket.customerId !== customer.id) return res.status(404).json({ message: "Ticket not found" });

      const messageSchema = z.object({ message: z.string().min(1, "Message is required") });
      const parsed = messageSchema.parse(req.body);

      const msg = await storage.createTicketMessage({
        ticketId: ticket.id,
        senderType: "customer",
        senderName: customer.name,
        message: parsed.message,
      });

      if (ticket.status === "resolved") {
        await storage.updateSupportTicket(ticket.id, { status: "open" });
      }

      res.status(201).json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to send reply" });
    }
  });

  // ============ STRIPE PAYMENT - PORTAL ============

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err) {
      res.status(500).json({ message: "Failed to get Stripe key" });
    }
  });

  app.post("/api/portal/:token/invoices/:invoiceId/pay", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const invoice = await storage.getInvoice(req.params.invoiceId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.customerId !== customer.id) return res.status(403).json({ message: "Access denied" });
      if (invoice.status === "paid") return res.status(400).json({ message: "Invoice is already paid" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const portalUrl = `${getSiteBaseUrl(req)}/portal/${req.params.token}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: (invoice.currency || "usd").toLowerCase(),
              product_data: {
                name: `Invoice ${invoice.invoiceNumber}`,
                description: `Payment for invoice ${invoice.invoiceNumber}`,
              },
              unit_amount: invoice.totalAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${portalUrl}?payment=success&invoice=${invoice.invoiceNumber}`,
        cancel_url: `${portalUrl}?payment=cancelled`,
        customer_email: customer.email,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: customer.id,
          portalToken: req.params.token,
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      res.status(500).json({ message: err.message || "Failed to create payment session" });
    }
  });

  app.get("/api/portal/:token/payment-status/:sessionId", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
      if (session.payment_status === "paid" && session.metadata?.invoiceId) {
        await storage.updateInvoiceStatus(session.metadata.invoiceId, "paid");
      }

      res.json({ status: session.payment_status });
    } catch (err) {
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

  // ============ PAYMENT METHOD MANAGEMENT - PORTAL ============

  async function getOrCreateStripeCustomer(customer: any) {
    const { getUncachableStripeClient } = await import("./stripeClient");
    const stripe = await getUncachableStripeClient();

    if (customer.stripeCustomerId) {
      try {
        const existing = await stripe.customers.retrieve(customer.stripeCustomerId);
        if (!(existing as any).deleted) return { stripe, stripeCustomerId: customer.stripeCustomerId };
      } catch {}
    }

    const stripeCustomer = await stripe.customers.create({
      name: customer.name,
      email: customer.email,
      metadata: { billingHubCustomerId: customer.id },
    });

    await storage.updateCustomer(customer.id, { stripeCustomerId: stripeCustomer.id } as any);
    return { stripe, stripeCustomerId: stripeCustomer.id };
  }

  app.get("/api/portal/:token/payment-methods", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      if (!customer.stripeCustomerId) {
        return res.json({ paymentMethods: [], defaultPaymentMethodId: null });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const methods = await stripe.paymentMethods.list({
        customer: customer.stripeCustomerId,
        type: "card",
      });

      const stripeCustomer = await stripe.customers.retrieve(customer.stripeCustomerId) as any;
      const defaultPmId = stripeCustomer.invoice_settings?.default_payment_method || null;

      const paymentMethods = methods.data.map((pm: any) => ({
        id: pm.id,
        brand: pm.card?.brand || "unknown",
        last4: pm.card?.last4 || "****",
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPmId,
      }));

      res.json({ paymentMethods, defaultPaymentMethodId: defaultPmId });
    } catch (err: any) {
      console.error("List payment methods error:", err);
      res.status(500).json({ message: "Failed to load payment methods" });
    }
  });

  app.post("/api/portal/:token/setup-intent", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const { stripe, stripeCustomerId } = await getOrCreateStripeCustomer(customer);

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
      });

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (err: any) {
      console.error("Setup intent error:", err);
      res.status(500).json({ message: "Failed to create setup intent" });
    }
  });

  app.delete("/api/portal/:token/payment-methods/:pmId", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      if (!customer.stripeCustomerId) return res.status(400).json({ message: "No billing account found" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const pm = await stripe.paymentMethods.retrieve(req.params.pmId);
      if (!pm.customer || pm.customer !== customer.stripeCustomerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await stripe.paymentMethods.detach(req.params.pmId);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete payment method error:", err);
      res.status(500).json({ message: "Failed to remove payment method" });
    }
  });

  app.post("/api/portal/:token/default-payment-method", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      if (!customer.stripeCustomerId) return res.status(400).json({ message: "No billing account found" });

      const { paymentMethodId } = req.body;
      if (!paymentMethodId) return res.status(400).json({ message: "Payment method ID required" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (!pm.customer || pm.customer !== customer.stripeCustomerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await stripe.customers.update(customer.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Set default payment method error:", err);
      res.status(500).json({ message: "Failed to set default payment method" });
    }
  });

  // ============ Q&A - ADMIN ============

  app.get("/api/qa/questions", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const questions = await storage.getQaQuestions(status);
      res.json(questions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.get("/api/qa/questions/:id", isAuthenticated, async (req, res) => {
    try {
      const question = await storage.getQaQuestion(req.params.id);
      if (!question) return res.status(404).json({ message: "Question not found" });
      res.json(question);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });

  app.patch("/api/qa/questions/:id", isAuthenticated, async (req, res) => {
    try {
      const updateSchema = z.object({
        answer: z.string().optional(),
        status: z.enum(["answered", "unanswered"]).optional(),
        isPublic: z.boolean().optional(),
      });
      const parsed = updateSchema.parse(req.body);
      const question = await storage.updateQaQuestion(req.params.id, parsed);
      if (!question) return res.status(404).json({ message: "Question not found" });
      res.json(question);
    } catch (err: any) {
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid data", errors: err.errors });
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete("/api/qa/questions/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteQaQuestion(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Question not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // ============ Q&A - PUBLIC ============

  app.get("/api/public/qa/questions", async (_req, res) => {
    try {
      const questions = await storage.getQaQuestions();
      const publicQuestions = questions.filter(q => q.isPublic);
      res.json(publicQuestions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post("/api/public/qa/questions", async (req, res) => {
    try {
      const parsed = insertQaQuestionSchema.parse({
        ...req.body,
        status: "unanswered",
        isPublic: true,
      });
      const question = await storage.createQaQuestion(parsed);
      res.status(201).json(question);
    } catch (err: any) {
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid data", errors: err.errors });
      res.status(500).json({ message: "Failed to submit question" });
    }
  });

  // ============ PAYMENT PLANS - ADMIN ============

  app.get("/api/payment-plans", isAuthenticated, async (_req, res) => {
    try {
      const plans = await storage.getPaymentPlans();
      res.json(plans);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch payment plans" });
    }
  });

  app.post("/api/invoices/:id/payment-plan", isAuthenticated, async (req, res) => {
    try {
      const createPlanSchema = z.object({
        numberOfInstallments: z.number().int().min(2).max(24),
        frequency: z.enum(["weekly", "biweekly", "monthly"]),
      });
      const parsed = createPlanSchema.parse(req.body);

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.status === "paid") return res.status(400).json({ message: "Invoice is already paid" });

      const existingPlans = await storage.getPaymentPlansByInvoice(invoice.id);
      const activePlan = existingPlans.find(p => p.status === "pending" || p.status === "active");
      if (activePlan) return res.status(400).json({ message: "An active payment plan already exists for this invoice" });

      const installmentAmount = Math.ceil(invoice.totalAmountCents / parsed.numberOfInstallments);

      const plan = await storage.createPaymentPlan({
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        totalAmountCents: invoice.totalAmountCents,
        installmentAmountCents: installmentAmount,
        numberOfInstallments: parsed.numberOfInstallments,
        frequency: parsed.frequency,
        status: "pending",
        stripeSubscriptionId: null,
        stripePriceId: null,
        installmentsPaid: 0,
        startDate: null,
      });

      const amt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(installmentAmount / 100);
      const freqLabel = parsed.frequency === "weekly" ? "week" : parsed.frequency === "biweekly" ? "2 weeks" : "month";
      createNotificationAndEmail(
        invoice.customerId,
        "payment_plan_created",
        `Payment Plan Available`,
        `A new payment plan has been created for invoice ${invoice.invoiceNumber}: ${parsed.numberOfInstallments} payments of ${amt} every ${freqLabel}. Log in to your portal to accept and start the plan.`,
      ).catch(() => {});

      res.status(201).json(plan);
    } catch (err: any) {
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid data", errors: err.errors });
      res.status(500).json({ message: "Failed to create payment plan" });
    }
  });

  app.delete("/api/payment-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const plan = await storage.getPaymentPlan(req.params.id);
      if (!plan) return res.status(404).json({ message: "Payment plan not found" });
      if (plan.status === "active") {
        try {
          const { getUncachableStripeClient } = await import("./stripeClient");
          const stripe = await getUncachableStripeClient();
          if (plan.stripeSubscriptionId) {
            await stripe.subscriptions.cancel(plan.stripeSubscriptionId);
          }
        } catch (e) {
          console.error("Failed to cancel Stripe subscription:", e);
        }
      }
      await storage.updatePaymentPlan(plan.id, { status: "cancelled" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to cancel payment plan" });
    }
  });

  // ============ PAYMENT PLANS - PORTAL ============

  app.get("/api/portal/:token/payment-plans", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const plans = await storage.getPaymentPlansByCustomer(customer.id);
      res.json(plans);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch payment plans" });
    }
  });

  // ============ PROJECT SCREENSHOTS - ADMIN ============

  registerObjectStorageRoutes(app);

  app.get("/api/projects/:id/screenshots", isAuthenticated, async (req, res) => {
    try {
      const screenshots = await storage.getProjectScreenshots(req.params.id);
      res.json(screenshots);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch screenshots" });
    }
  });

  app.post("/api/projects/:id/screenshots", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const { objectPath, fileName, fileSize, contentType } = req.body;
      if (!objectPath || !fileName) {
        return res.status(400).json({ message: "objectPath and fileName are required" });
      }
      const screenshot = await storage.createProjectScreenshot({
        projectId: req.params.id,
        objectPath,
        fileName,
        fileSize: fileSize || null,
        contentType: contentType || null,
      });

      createNotificationAndEmail(
        project.customerId,
        "screenshot_uploaded",
        `New Screenshot: ${project.name}`,
        `A new screenshot "${fileName}" has been uploaded to your project "${project.name}".`,
      ).catch(() => {});

      res.status(201).json(screenshot);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to save screenshot" });
    }
  });

  app.patch("/api/screenshots/:id", isAuthenticated, async (req, res) => {
    try {
      const { fileName } = req.body;
      if (!fileName || !fileName.trim()) {
        return res.status(400).json({ message: "fileName is required" });
      }
      const updated = await storage.updateProjectScreenshot(req.params.id, { fileName: fileName.trim() });
      if (!updated) return res.status(404).json({ message: "Screenshot not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update screenshot" });
    }
  });

  app.delete("/api/screenshots/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteProjectScreenshot(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Screenshot not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete screenshot" });
    }
  });

  // ============ PROJECT SCREENSHOTS - PORTAL ============

  app.get("/api/portal/:token/projects/:projectId/screenshots", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.customerId !== customer.id) {
        return res.status(404).json({ message: "Project not found" });
      }
      const screenshots = await storage.getProjectScreenshots(project.id);
      res.json(screenshots);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch screenshots" });
    }
  });

  // ============ SCREENSHOT APPROVAL - ADMIN ============

  app.patch("/api/screenshots/:id/request-approval", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateProjectScreenshot(req.params.id, {
        approvalStatus: "pending",
        approvalRequestedAt: new Date(),
        revisionNotes: null,
        approvedAt: null,
      });
      if (!updated) return res.status(404).json({ message: "Screenshot not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to request approval" });
    }
  });

  // ============ SCREENSHOT APPROVAL - PORTAL ============

  app.post("/api/portal/:token/screenshots/:screenshotId/approve", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const updated = await storage.updateProjectScreenshot(req.params.screenshotId, {
        approvalStatus: "approved",
        approvedAt: new Date(),
        revisionNotes: null,
      });
      if (!updated) return res.status(404).json({ message: "Screenshot not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to approve" });
    }
  });

  app.post("/api/portal/:token/screenshots/:screenshotId/revisions", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const { notes } = req.body;
      if (!notes || !notes.trim()) return res.status(400).json({ message: "Revision notes are required" });
      const updated = await storage.updateProjectScreenshot(req.params.screenshotId, {
        approvalStatus: "revisions",
        revisionNotes: notes.trim(),
        approvedAt: null,
      });
      if (!updated) return res.status(404).json({ message: "Screenshot not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to request revisions" });
    }
  });

  // ============ CLIENT FILE UPLOADS - PORTAL ============

  app.get("/api/portal/:token/projects/:projectId/files", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.customerId !== customer.id) {
        return res.status(404).json({ message: "Project not found" });
      }
      const files = await storage.getProjectClientFiles(project.id);
      res.json(files);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.post("/api/portal/:token/projects/:projectId/files", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const project = await storage.getProject(req.params.projectId);
      if (!project || project.customerId !== customer.id) {
        return res.status(404).json({ message: "Project not found" });
      }
      const { objectPath, fileName, fileSize, contentType } = req.body;
      if (!objectPath || !fileName) {
        return res.status(400).json({ message: "objectPath and fileName are required" });
      }
      const file = await storage.createProjectClientFile({
        projectId: project.id,
        customerId: customer.id,
        objectPath,
        fileName,
        fileSize: fileSize || null,
        contentType: contentType || null,
      });
      res.json(file);
    } catch (err) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.delete("/api/portal/:token/files/:fileId", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const deleted = await storage.deleteProjectClientFile(req.params.fileId);
      if (!deleted) return res.status(404).json({ message: "File not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // ============ CLIENT FILES - ADMIN ============

  app.get("/api/projects/:id/client-files", isAuthenticated, async (req, res) => {
    try {
      const files = await storage.getProjectClientFiles(req.params.id);
      res.json(files);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch client files" });
    }
  });

  app.delete("/api/client-files/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteProjectClientFile(req.params.id);
      if (!deleted) return res.status(404).json({ message: "File not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  app.post("/api/portal/:token/payment-plans/:planId/accept", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const plan = await storage.getPaymentPlan(req.params.planId);
      if (!plan) return res.status(404).json({ message: "Payment plan not found" });
      if (plan.customerId !== customer.id) return res.status(403).json({ message: "Access denied" });
      if (plan.status !== "pending") return res.status(400).json({ message: "Plan is not available for acceptance" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      let stripeCustomerId = customer.stripeCustomerId;
      if (!stripeCustomerId) {
        const sc = await stripe.customers.create({
          name: customer.name,
          email: customer.email,
          metadata: { billingHubCustomerId: customer.id },
        });
        stripeCustomerId = sc.id;
        await storage.updateCustomer(customer.id, { stripeCustomerId: sc.id } as any);
      }

      const invoice = await storage.getInvoice(plan.invoiceId);
      const intervalMap: Record<string, "week" | "month"> = {
        weekly: "week",
        biweekly: "week",
        monthly: "month",
      };
      const intervalCountMap: Record<string, number> = {
        weekly: 1,
        biweekly: 2,
        monthly: 1,
      };

      const price = await stripe.prices.create({
        currency: (invoice?.currency || "usd").toLowerCase(),
        unit_amount: plan.installmentAmountCents,
        recurring: {
          interval: intervalMap[plan.frequency],
          interval_count: intervalCountMap[plan.frequency],
        },
        product_data: {
          name: `Payment Plan - Invoice ${invoice?.invoiceNumber || plan.invoiceId}`,
        },
      });

      const frequencyDays: Record<string, number> = {
        weekly: 7,
        biweekly: 14,
        monthly: 30,
      };
      const cancelAtTimestamp = Math.floor(
        (Date.now() / 1000) + (frequencyDays[plan.frequency] * plan.numberOfInstallments * 86400)
      );

      const portalUrl = `${getSiteBaseUrl(req)}/portal/${req.params.token}`;

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        subscription_data: {
          metadata: {
            paymentPlanId: plan.id,
            invoiceId: plan.invoiceId,
            customerId: customer.id,
          },
          cancel_at: cancelAtTimestamp,
        },
        success_url: `${portalUrl}?payment_plan=accepted`,
        cancel_url: `${portalUrl}?payment_plan=cancelled`,
        metadata: {
          paymentPlanId: plan.id,
        },
      });

      await storage.updatePaymentPlan(plan.id, {
        stripePriceId: price.id,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Payment plan accept error:", err);
      res.status(500).json({ message: err.message || "Failed to start payment plan" });
    }
  });

  // ============ NOTIFICATIONS - PORTAL ============

  app.get("/api/portal/:token/notifications", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const notificationList = await storage.getNotifications(customer.id, 50);
      const unreadCount = await storage.getUnreadNotificationCount(customer.id);
      res.json({ notifications: notificationList, unreadCount });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/portal/:token/notifications/:id/read", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const updated = await storage.markNotificationRead(req.params.id);
      if (!updated) return res.status(404).json({ message: "Notification not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/portal/:token/notifications/read-all", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const count = await storage.markAllNotificationsRead(customer.id);
      res.json({ markedRead: count });
    } catch (err) {
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  // ===== Push Notification Routes =====

  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  app.post("/api/portal/:token/push/subscribe", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }
      const sub = await storage.createPushSubscription({
        customerId: customer.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      res.json(sub);
    } catch (err) {
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });

  app.post("/api/portal/:token/push/unsubscribe", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const { endpoint } = req.body;
      if (!endpoint) return res.status(400).json({ message: "Missing endpoint" });
      await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  // ===== Quote Proposal Routes =====

  app.get("/api/quotes", isAuthenticated, async (_req, res) => {
    try {
      const allQuotes = await storage.getQuotes();
      res.json(allQuotes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const lineItems = await storage.getQuoteLineItems(quote.id);
      const comments = await storage.getQuoteComments(quote.id);
      res.json({ ...quote, lineItems, comments });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.post("/api/quotes", isAuthenticated, async (req, res) => {
    try {
      const { customerName, customerEmail, lineItems, notes, expiresAt } = req.body;
      if (!customerName || !customerEmail || !lineItems?.length) {
        return res.status(400).json({ message: "Customer name, email, and at least one line item are required" });
      }

      const totalAmountCents = lineItems.reduce((sum: number, item: any) => sum + Math.round(item.quantity * item.unitPriceCents), 0);

      const [countResult] = await (await import("./db")).db.select({ count: (await import("drizzle-orm")).sql<number>`COUNT(*)` }).from((await import("@shared/schema")).quotes);
      const quoteNum = `QTE-${new Date().getFullYear()}-${String(Number(countResult.count) + 1).padStart(4, "0")}`;

      const quote = await storage.createQuote({
        customerName,
        customerEmail,
        customerId: req.body.customerId || null,
        quoteNumber: quoteNum,
        status: "draft",
        totalAmountCents,
        notes: notes || null,
        sentAt: null,
        respondedAt: null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      for (const item of lineItems) {
        await storage.createQuoteLineItem({
          quoteId: quote.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalCents: Math.round(item.quantity * item.unitPriceCents),
        });
      }

      const savedLineItems = await storage.getQuoteLineItems(quote.id);
      res.status(201).json({ ...quote, lineItems: savedLineItems });
    } catch (err: any) {
      console.error("Failed to create quote:", err);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.post("/api/quotes/:id/send", isAuthenticated, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const lineItems = await storage.getQuoteLineItems(quote.id);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const quoteUrl = `${baseUrl}/quote/${quote.viewToken}`;

      const emailResult = await sendQuoteEmail({
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        quoteNumber: quote.quoteNumber,
        totalAmount: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quote.totalAmountCents / 100),
        lineItems: lineItems.map(li => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPriceCents,
          total: li.totalCents,
        })),
        notes: quote.notes,
        quoteUrl,
      });

      if (!emailResult.success) {
        return res.status(500).json({ message: `Failed to send email: ${emailResult.error}` });
      }

      const updated = await storage.updateQuote(quote.id, {
        status: "sent",
        sentAt: new Date(),
      });

      res.json(updated);
    } catch (err: any) {
      console.error("Failed to send quote:", err);
      res.status(500).json({ message: "Failed to send quote" });
    }
  });

  app.delete("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteQuote(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Quote not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Public quote routes (no auth needed, uses view token)
  app.get("/api/public/quotes/:token", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const lineItems = await storage.getQuoteLineItems(quote.id);
      const comments = await storage.getQuoteComments(quote.id);
      res.json({ ...quote, lineItems, comments });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.post("/api/public/quotes/:token/respond", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const { action, comment } = req.body;
      if (!action || !["approve", "deny"].includes(action)) {
        return res.status(400).json({ message: "Action must be 'approve' or 'deny'" });
      }

      const newStatus = action === "approve" ? "approved" : "declined";
      const updated = await storage.updateQuote(quote.id, {
        status: newStatus,
        respondedAt: new Date(),
      });

      if (comment) {
        await storage.createQuoteComment({
          quoteId: quote.id,
          senderType: "customer",
          senderName: quote.customerName,
          message: comment,
        });
      }

      sendQuoteAdminNotification({
        quoteNumber: quote.quoteNumber,
        customerName: quote.customerName,
        action: action === "approve" ? "approved" : "denied",
        comment: comment || undefined,
      }).catch(err => console.error("Failed to send admin notification:", err));

      const comments = await storage.getQuoteComments(quote.id);
      res.json({ ...updated, comments });
    } catch (err) {
      res.status(500).json({ message: "Failed to respond to quote" });
    }
  });

  app.post("/api/public/quotes/:token/comments", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Comment message required" });

      const created = await storage.createQuoteComment({
        quoteId: quote.id,
        senderType: "customer",
        senderName: quote.customerName,
        message: message.trim(),
      });

      sendQuoteAdminNotification({
        quoteNumber: quote.quoteNumber,
        customerName: quote.customerName,
        action: "comment",
        comment: message.trim(),
      }).catch(err => console.error("Failed to send admin notification:", err));

      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // Customer submits project requirements on approved quote
  app.post("/api/public/quotes/:token/requirements", async (req, res) => {
    try {
      const quote = await storage.getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      if (quote.status !== "approved") {
        return res.status(400).json({ message: "Requirements can only be submitted for approved quotes" });
      }

      if (quote.projectRequirements) {
        return res.status(400).json({ message: "Requirements have already been submitted for this quote" });
      }

      const { requirements } = req.body;
      if (!requirements?.trim()) {
        return res.status(400).json({ message: "Requirements text is required" });
      }

      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { quotes: quotesTable } = await import("@shared/schema");

      // Find or create customer from quote info
      const customer = await storage.findOrCreateCustomerByEmail(
        quote.customerEmail,
        quote.customerName
      );

      // Get line items for project description
      const lineItems = await storage.getQuoteLineItems(quote.id);
      const lineItemsSummary = lineItems.map(li => `${li.description} x${li.quantity}`).join(", ");

      // Create project from the quote
      const project = await storage.createProject({
        customerId: customer.id,
        name: `${quote.quoteNumber} - ${quote.customerName}`,
        description: `Quote: ${quote.quoteNumber}\nServices: ${lineItemsSummary}\n\nProject Requirements:\n${requirements.trim()}`,
        status: "active",
      });

      // Update quote with requirements + link to customer
      await db.update(quotesTable).set({
        projectRequirements: requirements.trim(),
        requirementsSubmittedAt: new Date(),
        customerId: customer.id,
      }).where(eq(quotesTable.id, quote.id));

      // Send detailed email to admin with requirements
      sendQuoteRequirementsEmail({
        quoteNumber: quote.quoteNumber,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        requirements: requirements.trim(),
        lineItems: lineItems.map(li => ({
          description: li.description,
          quantity: li.quantity,
          totalCents: li.totalCents,
        })),
        totalAmountCents: quote.totalAmountCents,
        projectName: project.name,
      }).catch(err => console.error("Failed to send requirements email:", err));

      res.json({ success: true, projectId: project.id });
    } catch (err) {
      console.error("Failed to submit requirements:", err);
      res.status(500).json({ message: "Failed to submit requirements" });
    }
  });

  // Admin add comment to quote
  app.post("/api/quotes/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Comment message required" });

      const created = await storage.createQuoteComment({
        quoteId: quote.id,
        senderType: "admin",
        senderName: "AI Powered Sites",
        message: message.trim(),
      });

      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  app.get("/api/agent-costs", isAuthenticated, async (_req, res) => {
    try {
      const projectId = _req.query.projectId as string | undefined;
      const entries = await storage.getAgentCostEntries(projectId);
      res.json(entries);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch agent cost entries" });
    }
  });

  app.post("/api/agent-costs", isAuthenticated, async (req, res) => {
    try {
      const { description, agentCostCents, markupPercent, projectId, customerId, sessionDate } = req.body;
      if (!description?.trim() || !agentCostCents || agentCostCents <= 0) {
        return res.status(400).json({ message: "Description and valid agent cost are required" });
      }
      const markup = markupPercent ?? 50;
      const clientChargeCents = Math.round(agentCostCents * (1 + markup / 100));
      const entry = await storage.createAgentCostEntry({
        description: description.trim(),
        agentCostCents,
        markupPercent: markup,
        clientChargeCents,
        projectId: projectId || null,
        customerId: customerId || null,
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
        invoiceId: null,
      });
      res.status(201).json(entry);
    } catch (err) {
      res.status(500).json({ message: "Failed to create agent cost entry" });
    }
  });

  app.delete("/api/agent-costs/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteAgentCostEntry(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Entry not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete agent cost entry" });
    }
  });

  // ─── Conversations ─────────────────────────────────────────────────
  app.get("/api/conversations", isAuthenticated, async (_req, res) => {
    try {
      const convos = await storage.getConversations();
      const results = await Promise.all(convos.map(async (c) => {
        const messages = await storage.getConversationMessages(c.id);
        return { ...c, messageCount: messages.length, lastMessage: messages[messages.length - 1] || null };
      }));
      res.json(results);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const conv = await storage.getConversation(req.params.id);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });
      const messages = await storage.getConversationMessages(conv.id);
      res.json({ ...conv, messages });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const conv = await storage.getConversation(req.params.id);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });
      const { message } = req.body;
      if (!message || typeof message !== "string") return res.status(400).json({ message: "Message is required" });
      const msg = await storage.createConversationMessage({
        conversationId: conv.id,
        senderType: "admin",
        senderName: "AI Powered Sites",
        message,
        attachments: req.body.attachments || null,
      });
      sendConversationReplyToVisitor({
        visitorName: conv.visitorName,
        visitorEmail: conv.visitorEmail,
        subject: conv.subject,
        message,
        conversationToken: conv.accessToken || "",
      }).catch((err) => console.error("Failed to send conversation reply email:", err));
      res.status(201).json(msg);
    } catch (err) {
      res.status(500).json({ message: "Failed to send reply" });
    }
  });

  app.patch("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateConversation(req.params.id, { status });
      if (!updated) return res.status(404).json({ message: "Conversation not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  // Public conversation endpoints (no auth - token-based access)
  app.post("/api/public/conversations", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "Name, email, subject, and message are required" });
      }
      const conv = await storage.createConversation({
        visitorName: name,
        visitorEmail: email,
        subject,
        status: "active",
        customerId: null,
      });
      await storage.createConversationMessage({
        conversationId: conv.id,
        senderType: "visitor",
        senderName: name,
        message,
        attachments: null,
      });
      sendConversationNotificationToAdmin({
        visitorName: name,
        visitorEmail: email,
        subject,
        message,
        conversationId: conv.id,
      }).catch((err) => console.error("Failed to send admin notification:", err));
      res.status(201).json({ accessToken: conv.accessToken, conversationId: conv.id });
    } catch (err) {
      res.status(500).json({ message: "Failed to start conversation" });
    }
  });

  app.get("/api/public/conversations/:token", async (req, res) => {
    try {
      const conv = await storage.getConversationByToken(req.params.token);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });
      const messages = await storage.getConversationMessages(conv.id);
      res.json({
        id: conv.id,
        visitorName: conv.visitorName,
        subject: conv.subject,
        status: conv.status,
        createdAt: conv.createdAt,
        messages,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/public/conversations/:token/messages", async (req, res) => {
    try {
      const conv = await storage.getConversationByToken(req.params.token);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });
      if (conv.status === "closed") return res.status(400).json({ message: "This conversation has been closed" });
      const { message } = req.body;
      if (!message || typeof message !== "string") return res.status(400).json({ message: "Message is required" });
      const msg = await storage.createConversationMessage({
        conversationId: conv.id,
        senderType: "visitor",
        senderName: conv.visitorName,
        message,
        attachments: req.body.attachments || null,
      });
      sendConversationNotificationToAdmin({
        visitorName: conv.visitorName,
        visitorEmail: conv.visitorEmail,
        subject: conv.subject,
        message,
        conversationId: conv.id,
      }).catch((err) => console.error("Failed to send admin notification:", err));
      res.status(201).json(msg);
    } catch (err) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/agent-costs/summary", isAuthenticated, async (_req, res) => {
    try {
      const entries = await storage.getAgentCostEntries();
      const totalAgentCost = entries.reduce((sum, e) => sum + e.agentCostCents, 0);
      const totalClientCharge = entries.reduce((sum, e) => sum + e.clientChargeCents, 0);
      const totalProfit = totalClientCharge - totalAgentCost;
      const byProject: Record<string, { projectId: string; agentCost: number; clientCharge: number; profit: number; count: number }> = {};
      for (const e of entries) {
        const pid = e.projectId || "unassigned";
        if (!byProject[pid]) byProject[pid] = { projectId: pid, agentCost: 0, clientCharge: 0, profit: 0, count: 0 };
        byProject[pid].agentCost += e.agentCostCents;
        byProject[pid].clientCharge += e.clientChargeCents;
        byProject[pid].profit += e.clientChargeCents - e.agentCostCents;
        byProject[pid].count += 1;
      }
      const unbilled = entries.filter(e => !e.invoiceId);
      res.json({
        totalEntries: entries.length,
        totalAgentCostCents: totalAgentCost,
        totalClientChargeCents: totalClientCharge,
        totalProfitCents: totalProfit,
        unbilledCount: unbilled.length,
        unbilledChargeCents: unbilled.reduce((sum, e) => sum + e.clientChargeCents, 0),
        byProject: Object.values(byProject),
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  // ==========================================
  // Admin API Key Management
  // ==========================================

  app.get("/api/api-keys", isAuthenticated, async (_req, res) => {
    try {
      const keys = await storage.getApiKeys();
      res.json(keys.map(k => ({ ...k, key: k.key.slice(0, 8) + "..." + k.key.slice(-4) })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  const createApiKeySchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    scopes: z.enum(["read", "read,write", "all"]).default("read"),
    customerId: z.string().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  });

  app.post("/api/api-keys", isAuthenticated, async (req, res) => {
    try {
      const parsed = createApiKeySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const key = `aips_${crypto.randomBytes(32).toString("hex")}`;
      const apiKey = await storage.createApiKey({
        name: parsed.data.name,
        key,
        scopes: parsed.data.scopes,
        customerId: parsed.data.customerId || null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      });
      res.json(apiKey);
    } catch (err) {
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.patch("/api/api-keys/:id", isAuthenticated, async (req, res) => {
    try {
      const { name, isActive, scopes, customerId } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (isActive !== undefined) updates.isActive = isActive;
      if (scopes !== undefined) updates.scopes = scopes;
      if (customerId !== undefined) updates.customerId = customerId;
      const updated = await storage.updateApiKey(req.params.id, updates);
      if (!updated) return res.status(404).json({ message: "API key not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  app.delete("/api/api-keys/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteApiKey(req.params.id);
      if (!deleted) return res.status(404).json({ message: "API key not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // ==========================================
  // Public API with API Key Authentication
  // ==========================================

  async function authenticateApiKey(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid API key. Include 'Authorization: Bearer YOUR_API_KEY' header." });
    }
    const key = authHeader.slice(7);
    const apiKey = await storage.getApiKeyByKey(key);
    if (!apiKey) return res.status(401).json({ error: "Invalid API key." });
    if (!apiKey.isActive) return res.status(403).json({ error: "API key is disabled." });
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return res.status(403).json({ error: "API key has expired." });
    }
    req.apiKey = apiKey;
    storage.touchApiKeyLastUsed(apiKey.id);
    next();
  }

  function requireScope(scope: string) {
    return (req: any, res: any, next: any) => {
      const scopes = (req.apiKey?.scopes || "").split(",").map((s: string) => s.trim());
      if (scopes.includes("all") || scopes.includes(scope)) return next();
      return res.status(403).json({ error: `Missing required scope: '${scope}'. Your key has: ${scopes.join(", ")}` });
    };
  }

  // Public API: Get customers
  app.get("/api/v1/customers", authenticateApiKey, requireScope("read"), async (req: any, res) => {
    try {
      let customers = await storage.getCustomers();
      if (req.apiKey.customerId) {
        customers = customers.filter((c: any) => c.id === req.apiKey.customerId);
      }
      res.json({ data: customers.map((c: any) => ({ id: c.id, name: c.name, email: c.email, company: c.company, createdAt: c.createdAt })) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Public API: Get single customer
  app.get("/api/v1/customers/:id", authenticateApiKey, requireScope("read"), async (req: any, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      if (req.apiKey.customerId && customer.id !== req.apiKey.customerId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json({ data: { id: customer.id, name: customer.name, email: customer.email, company: customer.company, createdAt: customer.createdAt } });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  // Public API: Get projects
  app.get("/api/v1/projects", authenticateApiKey, requireScope("read"), async (req: any, res) => {
    try {
      const scopedCustomerId = req.apiKey.customerId;
      if (scopedCustomerId && req.query.customerId && req.query.customerId !== scopedCustomerId) {
        return res.status(403).json({ error: "Access denied. Your key is scoped to a specific customer." });
      }
      const customerId = scopedCustomerId || req.query.customerId;
      let projects;
      if (customerId) {
        projects = await storage.getProjectsByCustomer(customerId);
      } else {
        projects = await storage.getProjects();
      }
      res.json({ data: projects.map((p: any) => ({ id: p.id, name: p.name, description: p.description, status: p.status, customerId: p.customerId, previewUrl: p.previewUrl, createdAt: p.createdAt })) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Public API: Get single project
  app.get("/api/v1/projects/:id", authenticateApiKey, requireScope("read"), async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (req.apiKey.customerId && project.customerId !== req.apiKey.customerId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json({ data: { id: project.id, name: project.name, description: project.description, status: project.status, customerId: project.customerId, previewUrl: project.previewUrl, createdAt: project.createdAt } });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Public API: Get invoices
  app.get("/api/v1/invoices", authenticateApiKey, requireScope("read"), async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices();
      let filtered = invoices;
      if (req.apiKey.customerId) {
        filtered = invoices.filter((inv: any) => inv.customerId === req.apiKey.customerId);
      }
      if (req.query.status) {
        filtered = filtered.filter((inv: any) => inv.status === req.query.status);
      }
      res.json({ data: filtered.map((inv: any) => ({ id: inv.id, invoiceNumber: inv.invoiceNumber, customerId: inv.customerId, projectId: inv.projectId, status: inv.status, totalCents: inv.totalCents, dueDate: inv.dueDate, createdAt: inv.createdAt })) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Public API: Get single invoice with line items
  app.get("/api/v1/invoices/:id", authenticateApiKey, requireScope("read"), async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      if (req.apiKey.customerId && invoice.customerId !== req.apiKey.customerId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const lineItems = await storage.getInvoiceLineItems(req.params.id);
      res.json({
        data: {
          id: invoice.id, invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId,
          projectId: invoice.projectId, status: invoice.status, totalCents: invoice.totalCents,
          dueDate: invoice.dueDate, createdAt: invoice.createdAt,
          lineItems: lineItems.map((li: any) => ({ description: li.description, quantity: li.quantity, unitPriceCents: li.unitPriceCents, totalCents: li.totalCents }))
        }
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  // Public API: Create work entry
  app.post("/api/v1/work-entries", authenticateApiKey, requireScope("write"), async (req: any, res) => {
    try {
      const parsed = insertWorkEntrySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      if (req.apiKey.customerId) {
        const project = await storage.getProject(parsed.data.projectId);
        if (!project || project.customerId !== req.apiKey.customerId) {
          return res.status(403).json({ error: "Access denied to this project" });
        }
      }
      const entry = await storage.createWorkEntry(parsed.data);
      res.status(201).json({ data: entry });
    } catch (err) {
      res.status(500).json({ error: "Failed to create work entry" });
    }
  });

  // Public API: Get project updates / progress
  app.get("/api/v1/projects/:id/updates", authenticateApiKey, requireScope("read"), async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (req.apiKey.customerId && project.customerId !== req.apiKey.customerId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updates = await storage.getProjectUpdates(req.params.id);
      res.json({ data: updates });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch project updates" });
    }
  });

  return httpServer;
}
