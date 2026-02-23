import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertProjectSchema, insertBillingRateSchema, insertWorkEntrySchema, insertQuoteRequestSchema, insertSupportTicketSchema, insertTicketMessageSchema, insertQaQuestionSchema, insertProjectUpdateSchema } from "@shared/schema";
import crypto from "crypto";
import { z } from "zod";
import { sendInvoiceEmail, sendTicketNotification, sendPortalWelcomeEmail, sendNotificationEmail, sendQuoteEmail, sendQuoteAdminNotification, sendQuoteRequirementsEmail, sendConversationNotificationToAdmin, sendConversationReplyToVisitor, sendAuditReportEmail } from "./email";
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

  app.get("/robots.txt", (_req, res) => {
    const baseUrl = (process.env.SITE_URL || "https://aipoweredsites.com").replace(/\/$/, "");
    res.type("text/plain").send(
`User-agent: *
Allow: /
Allow: /questions
Allow: /quote/
Allow: /conversation/
Allow: /progress/
Allow: /api/docs

Disallow: /admin/
Disallow: /portal/
Disallow: /api/dashboard/
Disallow: /api/customers
Disallow: /api/projects
Disallow: /api/invoices
Disallow: /api/billing-rates
Disallow: /api/work-entries
Disallow: /api/support/
Disallow: /api/conversations
Disallow: /api/payment-plans
Disallow: /api/agent-costs
Disallow: /api/api-keys
Disallow: /api/login
Disallow: /api/logout
Disallow: /login

Sitemap: ${baseUrl}/sitemap.xml
`
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    const baseUrl = (process.env.SITE_URL || "https://aipoweredsites.com").replace(/\/$/, "");
    const today = new Date().toISOString().split("T")[0];

    const staticPages = [
      { loc: "/", changefreq: "weekly", priority: "1.0" },
      { loc: "/questions", changefreq: "daily", priority: "0.8" },
      { loc: "/api/docs", changefreq: "monthly", priority: "0.6" },
    ];

    let urls = staticPages.map(p =>
      `  <url>\n    <loc>${baseUrl}${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    ).join("\n");

    try {
      const questions = await storage.getQaQuestions("public");
      if (questions && questions.length > 0) {
        const qUrls = questions.slice(0, 50).map(q =>
          `  <url>\n    <loc>${baseUrl}/questions#q-${q.id}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>`
        ).join("\n");
        urls += "\n" + qUrls;
      }
    } catch {}

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.type("application/xml").send(xml);
  });

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

  // Website audit endpoint (public) - email is now optional
  app.post("/api/audit", async (req, res) => {
    try {
      const { url, email } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const { runAudit } = await import("./audit");
      const { generateAuditPDF } = await import("./auditPdf");
      const { generateAIAuditInsights } = await import("./auditAI");
      const { addNewsletterContact } = await import("./email");

      const auditResult = await runAudit(url);
      let aiInsights;
      try {
        aiInsights = await generateAIAuditInsights(auditResult);
      } catch (err) {
        console.error("AI insights generation failed, using static fallback:", err);
      }
      const pdfBuffer = await generateAuditPDF(auditResult, aiInsights);

      const pdfBase64 = pdfBuffer.toString('base64');

      if (email) {
        sendAuditReportEmail(email, auditResult.url, auditResult.overallScore, auditResult.grade, pdfBuffer)
          .catch(err => console.error("Failed to send audit email:", err));

        addNewsletterContact({ email })
          .catch(err => console.error("Failed to add audit contact to audience:", err));
      }

      res.json({ ...auditResult, pdfBase64 });
    } catch (err: any) {
      console.error("Audit error:", err);
      res.status(400).json({ message: err.message || "Failed to audit website" });
    }
  });

  // Send audit report to email (separate endpoint for post-audit email capture)
  app.post("/api/audit/send-report", async (req, res) => {
    try {
      const { email, auditData } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      if (!auditData || !auditData.url || !auditData.categories || !auditData.overallScore) {
        return res.status(400).json({ message: "Valid audit data is required" });
      }

      const { generateAuditPDF } = await import("./auditPdf");
      const { generateAIAuditInsights } = await import("./auditAI");
      const { addNewsletterContact } = await import("./email");

      let aiInsights;
      try {
        aiInsights = await generateAIAuditInsights(auditData);
      } catch (err) {
        console.error("AI insights generation failed for send-report:", err);
      }
      const pdfBuffer = await generateAuditPDF(auditData, aiInsights);

      sendAuditReportEmail(email, auditData.url, auditData.overallScore, auditData.grade, pdfBuffer)
        .catch(err => console.error("Failed to send audit email:", err));

      addNewsletterContact({ email })
        .catch(err => console.error("Failed to add audit contact to audience:", err));

      res.json({ success: true });
    } catch (err: any) {
      console.error("Send report error:", err);
      res.status(500).json({ message: "Failed to send report" });
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

  // ============ GIT BACKUP ROUTES ============

  // GitHub OAuth: Start (customer clicks "Connect GitHub" in portal)
  app.get("/api/portal/:token/github/connect", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const clientId = process.env.GITHUB_CLIENT_ID;
      if (!clientId) return res.status(500).json({ message: "GitHub integration not configured" });

      const redirectUri = `${getSiteBaseUrl(req)}/api/github/callback`;
      const state = Buffer.from(JSON.stringify({ portalToken: req.params.token })).toString("base64");
      const scope = "repo";

      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
      res.redirect(authUrl);
    } catch (err) {
      res.status(500).json({ message: "Failed to start GitHub connection" });
    }
  });

  // GitHub OAuth: Callback
  app.get("/api/github/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) return res.status(400).send("Missing code or state");

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.status(500).send("GitHub not configured");

      let stateData: { portalToken: string };
      try {
        stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
      } catch {
        return res.status(400).send("Invalid state");
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) return res.status(400).send("Failed to get GitHub token");

      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" },
      });
      const githubUser = await userRes.json() as any;

      const customer = await storage.getCustomerByPortalToken(stateData.portalToken);
      if (!customer) return res.status(400).send("Invalid portal token");

      const existingConfigs = await storage.getGitBackupConfigByCustomer(customer.id);
      if (existingConfigs.length > 0) {
        for (const config of existingConfigs) {
          await storage.updateGitBackupConfig(config.id, {
            githubToken: tokenData.access_token,
            githubUsername: githubUser.login,
            isConnected: true,
          });
        }
      }

      const baseUrl = getSiteBaseUrl(req);
      res.redirect(`${baseUrl}/portal/${stateData.portalToken}?github_connected=true&github_user=${githubUser.login}`);
    } catch (err) {
      console.error("GitHub callback error:", err);
      res.status(500).send("GitHub connection failed");
    }
  });

  app.get("/api/git-backups/billing-rate", isAuthenticated, async (req, res) => {
    try {
      let rate = await storage.getBillingRateByCode("code_backup");
      if (!rate) {
        rate = await storage.createBillingRate({
          code: "code_backup",
          name: "Code Backup",
          description: "Automated code backup to GitHub repository",
          unitLabel: "backup",
          rateCents: 500,
          isActive: true,
        });
      }
      res.json(rate);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch backup billing rate" });
    }
  });

  app.patch("/api/git-backups/billing-rate", isAuthenticated, async (req, res) => {
    try {
      let rate = await storage.getBillingRateByCode("code_backup");
      if (!rate) return res.status(404).json({ message: "Rate not found" });
      const updates: any = {};
      if (req.body.rateCents !== undefined) {
        const cents = parseInt(req.body.rateCents, 10);
        if (isNaN(cents) || cents < 0) return res.status(400).json({ message: "Rate must be a non-negative integer (cents)" });
        updates.rateCents = cents;
      }
      if (req.body.isActive !== undefined) {
        if (typeof req.body.isActive !== "boolean") return res.status(400).json({ message: "isActive must be a boolean" });
        updates.isActive = req.body.isActive;
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      const updated = await storage.updateBillingRate(rate.id, updates);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update rate" });
    }
  });

  // Admin: Get git backup configs (all or by project)
  app.get("/api/git-backups", isAuthenticated, async (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const configs = await storage.getGitBackupConfigs(projectId);
      res.json(configs.map(c => ({ ...c, githubToken: undefined })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch git backup configs" });
    }
  });

  // Admin: Get git backup config for a project
  app.get("/api/git-backups/project/:projectId", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getGitBackupConfigByProject(req.params.projectId);
      res.json(config ? { ...config, githubToken: undefined } : null);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  // Admin: Create or update git backup config
  app.post("/api/git-backups", isAuthenticated, async (req, res) => {
    try {
      const { projectId, customerId, githubRepo, githubBranch, autopilotEnabled, autopilotFrequency } = req.body;
      if (!projectId || !customerId) return res.status(400).json({ message: "projectId and customerId required" });

      const existing = await storage.getGitBackupConfigByProject(projectId);
      if (existing) {
        const updates: any = {};
        if (githubRepo !== undefined) updates.githubRepo = githubRepo;
        if (githubBranch !== undefined) updates.githubBranch = githubBranch;
        if (autopilotEnabled !== undefined) updates.autopilotEnabled = autopilotEnabled;
        if (autopilotFrequency !== undefined) updates.autopilotFrequency = autopilotFrequency;
        if (autopilotEnabled && !existing.nextScheduledAt) {
          updates.nextScheduledAt = getNextScheduledTime(autopilotFrequency || existing.autopilotFrequency || "daily");
        }
        const updated = await storage.updateGitBackupConfig(existing.id, updates);
        return res.json(updated);
      }

      const config = await storage.createGitBackupConfig({
        projectId,
        customerId,
        githubRepo: githubRepo || null,
        githubBranch: githubBranch || "main",
        autopilotEnabled: autopilotEnabled || false,
        autopilotFrequency: autopilotFrequency || "daily",
        isConnected: false,
        githubToken: null,
        githubUsername: null,
      });
      res.status(201).json(config);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create config" });
    }
  });

  // Admin: Update git backup config
  app.patch("/api/git-backups/:id", isAuthenticated, async (req, res) => {
    try {
      const { githubRepo, githubBranch, autopilotEnabled, autopilotFrequency } = req.body;
      const updates: any = {};
      if (githubRepo !== undefined) updates.githubRepo = githubRepo;
      if (githubBranch !== undefined) updates.githubBranch = githubBranch;
      if (autopilotEnabled !== undefined) {
        updates.autopilotEnabled = autopilotEnabled;
        if (autopilotEnabled) {
          updates.nextScheduledAt = getNextScheduledTime(autopilotFrequency || "daily");
        }
      }
      if (autopilotFrequency !== undefined) updates.autopilotFrequency = autopilotFrequency;
      const updated = await storage.updateGitBackupConfig(req.params.id, updates);
      if (!updated) return res.status(404).json({ message: "Config not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update config" });
    }
  });

  // Admin: Delete git backup config
  app.delete("/api/git-backups/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteGitBackupConfig(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Config not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete config" });
    }
  });

  // Admin: Get backup logs for a project
  app.get("/api/git-backups/logs/:projectId", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const logs = await storage.getGitBackupLogsByProject(req.params.projectId, limit);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch backup logs" });
    }
  });

  // Admin: Trigger manual backup push
  app.post("/api/git-backups/:id/push", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getGitBackupConfig(req.params.id);
      if (!config) return res.status(404).json({ message: "Config not found" });
      if (!config.isConnected || !config.githubToken) {
        return res.status(400).json({ message: "GitHub not connected for this project" });
      }
      if (!config.githubRepo) {
        return res.status(400).json({ message: "No repository configured" });
      }

      const log = await storage.createGitBackupLog({
        configId: config.id,
        projectId: config.projectId,
        status: "pending",
        triggeredBy: "manual",
        commitMessage: req.body.message || `Backup ${new Date().toISOString().split("T")[0]}`,
        commitSha: null,
        filesCount: null,
        errorMessage: null,
      });

      performGitBackup(config, log.id).catch(err => console.error("Backup failed:", err));

      res.json({ message: "Backup started", logId: log.id });
    } catch (err) {
      res.status(500).json({ message: "Failed to trigger backup" });
    }
  });

  // Admin: Get list of customer's GitHub repos
  app.get("/api/git-backups/:id/repos", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getGitBackupConfig(req.params.id);
      if (!config) return res.status(404).json({ message: "Config not found" });
      if (!config.githubToken) return res.status(400).json({ message: "GitHub not connected" });

      const reposRes = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner", {
        headers: { Authorization: `Bearer ${config.githubToken}`, Accept: "application/json" },
      });
      const repos = await reposRes.json() as any[];
      res.json(repos.map((r: any) => ({
        fullName: r.full_name,
        name: r.name,
        private: r.private,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at,
      })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch repos" });
    }
  });

  // Portal: Get git backup status for customer's projects
  app.get("/api/portal/:token/git-backups", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const configs = await storage.getGitBackupConfigByCustomer(customer.id);
      const result = [];
      for (const config of configs) {
        const logs = await storage.getGitBackupLogs(config.id, 10);
        const project = await storage.getProject(config.projectId);
        result.push({
          ...config,
          githubToken: undefined,
          projectName: project?.name || "Unknown",
          recentLogs: logs,
        });
      }

      let backupRate = await storage.getBillingRateByCode("code_backup");
      const rateInfo = backupRate && backupRate.isActive
        ? { rateCents: backupRate.rateCents, unitLabel: backupRate.unitLabel || "backup" }
        : null;

      res.json({ configs: result, billingRate: rateInfo });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch backups" });
    }
  });

  // Helper: Get next scheduled time based on frequency
  function getNextScheduledTime(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case "hourly": return new Date(now.getTime() + 60 * 60 * 1000);
      case "daily": return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case "weekly": return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  // Helper: Perform actual git backup via GitHub API
  async function performGitBackup(config: any, logId: string) {
    try {
      const [owner, repo] = (config.githubRepo as string).split("/");
      const token = config.githubToken as string;
      const branch = config.githubBranch || "main";
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };

      const project = await storage.getProject(config.projectId);
      if (!project) throw new Error("Project not found");

      const backupData = {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          previewUrl: project.previewUrl,
          createdAt: project.createdAt,
        },
        backupTimestamp: new Date().toISOString(),
        workEntries: await storage.getWorkEntries({ projectId: project.id }),
        updates: await storage.getProjectUpdates(project.id),
      };

      const content = Buffer.from(JSON.stringify(backupData, null, 2)).toString("base64");
      const filePath = `backups/${project.name.replace(/[^a-zA-Z0-9-_]/g, "_")}/backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const commitMessage = `Backup: ${project.name} - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

      let sha: string | undefined;
      try {
        const existRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`, { headers });
        if (existRes.ok) {
          const existData = await existRes.json() as any;
          sha = existData.sha;
        }
      } catch {}

      const body: any = {
        message: commitMessage,
        content,
        branch,
      };
      if (sha) body.sha = sha;

      const pushRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      if (!pushRes.ok) {
        const errBody = await pushRes.text();
        throw new Error(`GitHub API error: ${pushRes.status} - ${errBody}`);
      }

      const pushData = await pushRes.json() as any;

      await storage.updateGitBackupLog(logId, {
        status: "success",
        commitSha: pushData.commit?.sha || null,
        filesCount: 1,
        commitMessage,
      });

      await storage.updateGitBackupConfig(config.id, {
        lastPushAt: new Date(),
        nextScheduledAt: config.autopilotEnabled ? getNextScheduledTime(config.autopilotFrequency || "daily") : null,
      });

      try {
        let backupRate = await storage.getBillingRateByCode("code_backup");
        if (!backupRate) {
          backupRate = await storage.createBillingRate({
            code: "code_backup",
            name: "Code Backup",
            description: "Automated code backup to GitHub repository",
            unitLabel: "backup",
            rateCents: 500,
            isActive: true,
          });
        }
        if (backupRate.isActive) {
          await storage.createWorkEntry({
            projectId: config.projectId,
            customerId: config.customerId,
            rateId: backupRate.id,
            quantity: "1",
            description: `Code backup to ${config.githubRepo} (${pushData.commit?.sha?.substring(0, 7) || "success"})`,
          });
        }
      } catch (billingErr) {
        console.error("Failed to create billing entry for backup:", billingErr);
      }

    } catch (err: any) {
      console.error("Git backup failed:", err);
      await storage.updateGitBackupLog(logId, {
        status: "failed",
        errorMessage: err.message || "Unknown error",
      });
    }
  }

  // ============ LEAD GENERATION ============

  app.get("/api/leads/search", isAuthenticated, async (req, res) => {
    try {
      const { zipCode, query, type } = req.query;
      if (!zipCode) return res.status(400).json({ error: "Zip code is required" });

      const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Google Places API key not configured" });

      const searchQuery = query || type || "business";
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(String(searchQuery))}+near+${encodeURIComponent(String(zipCode))}&key=${apiKey}`;

      const response = await fetch(textSearchUrl);
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return res.status(400).json({ error: `Google Places API error: ${data.status}`, details: data.error_message });
      }

      const results = (data.results || []).map((place: any) => {
        let website = null;
        let domain = null;
        let emailGuess = null;

        return {
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address,
          rating: place.rating || null,
          reviewCount: place.user_ratings_total || 0,
          category: place.types?.[0]?.replace(/_/g, " ") || null,
          businessStatus: place.business_status,
          priceLevel: place.price_level,
        };
      });

      res.json({ results, total: results.length });
    } catch (err: any) {
      console.error("Lead search error:", err);
      res.status(500).json({ error: "Failed to search businesses" });
    }
  });

  app.get("/api/leads/place-details/:placeId", isAuthenticated, async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Google Places API key not configured" });

      const { placeId } = req.params;
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,formatted_address,formatted_phone_number,website,url,rating,user_ratings_total,types,business_status,opening_hours&key=${apiKey}`;

      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (data.status !== "OK") {
        return res.status(400).json({ error: `Place details error: ${data.status}` });
      }

      const place = data.result;
      let website = place.website || null;
      let domain = null;
      let scrapedEmails: string[] = [];
      let guessedEmails: string[] = [];
      let emailSource: string = "none";

      if (website) {
        try {
          const url = new URL(website);
          domain = url.hostname.replace(/^www\./, "");
        } catch {}

        try {
          const { scrapeEmailsFromWebsite } = await import("./emailScraper");
          const scrapeResult = await scrapeEmailsFromWebsite(website);
          scrapedEmails = scrapeResult.scrapedEmails;
          guessedEmails = scrapeResult.guessedEmails;
          emailSource = scrapeResult.source;
        } catch (err) {
          console.error("Email scraping failed, falling back to guesses:", err);
          if (domain) {
            const baseName = domain.split(".")[0];
            guessedEmails = [
              `info@${domain}`,
              `contact@${domain}`,
              `hello@${domain}`,
              `${baseName}@gmail.com`,
            ];
            emailSource = "guessed";
          }
        }
      }

      const emailGuess = [...scrapedEmails, ...guessedEmails].join(", ") || null;

      res.json({
        placeId: place.place_id || req.params.placeId,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number || null,
        website,
        domain,
        emailGuess,
        scrapedEmails,
        guessedEmails,
        emailSource,
        rating: place.rating || null,
        reviewCount: place.user_ratings_total || 0,
        category: place.types?.[0]?.replace(/_/g, " ") || null,
        googleMapsUrl: place.url || null,
        isOpen: place.opening_hours?.open_now || null,
      });
    } catch (err: any) {
      console.error("Place details error:", err);
      res.status(500).json({ error: "Failed to get place details" });
    }
  });

  app.get("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const { status, zipCode } = req.query;
      const filters: { status?: string; zipCode?: string } = {};
      if (status) filters.status = String(status);
      if (zipCode) filters.zipCode = String(zipCode);
      const allLeads = await storage.getLeads(filters);
      res.json(allLeads);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const existing = req.body.googlePlaceId ? await storage.getLeadByPlaceId(req.body.googlePlaceId) : null;
      if (existing) {
        return res.json(existing);
      }
      const lead = await storage.createLead(req.body);
      res.json(lead);
    } catch (err: any) {
      console.error("Create lead error:", err);
      res.status(500).json({ error: "Failed to save lead" });
    }
  });

  app.patch("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateLead(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Lead not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.post("/api/leads/scrape-email", isAuthenticated, async (req, res) => {
    try {
      const { website } = req.body;
      if (!website) return res.status(400).json({ error: "Website URL is required" });

      try {
        const parsed = new URL(String(website));
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return res.status(400).json({ error: "Only HTTP/HTTPS URLs are allowed" });
        }
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      const { scrapeEmailsFromWebsite } = await import("./emailScraper");
      const result = await scrapeEmailsFromWebsite(website);
      res.json(result);
    } catch (err: any) {
      console.error("Email scrape error:", err);
      res.status(500).json({ error: "Failed to scrape emails" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteLead(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Lead not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // ============ PORTAL: SERVER PROVISIONING ============

  app.get("/api/portal/:token/licenses", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const customerLicenses = await storage.getLicenses(customer.id);
      const activeLicenses = customerLicenses.filter(l => l.status === "active");
      res.json(activeLicenses.map(l => ({
        id: l.id,
        licenseKey: l.licenseKey,
        status: l.status,
        activationCount: l.activationCount,
        maxActivations: l.maxActivations,
        createdAt: l.createdAt,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/portal/:token/servers", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const servers = await storage.getLinodeServersByCustomerId(customer.id);

      const LINODE_API = "https://api.linode.com/v4";
      const apiKey = process.env.LINODE_API_KEY;
      const linodeHeaders = apiKey ? { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" } : null;

      const enriched = await Promise.all(servers.map(async (server) => {
        if (linodeHeaders) {
          try {
            const liResp = await fetch(`${LINODE_API}/linode/instances/${server.linodeId}`, { headers: linodeHeaders });
            if (liResp.ok) {
              const liData = await liResp.json();
              if (liData.status !== server.status || liData.ipv4?.[0] !== server.ipv4) {
                await storage.updateLinodeServer(server.id, {
                  status: liData.status,
                  ipv4: liData.ipv4?.[0] || server.ipv4,
                  ipv6: liData.ipv6 || server.ipv6,
                });
              }
              return { ...server, status: liData.status, ipv4: liData.ipv4?.[0] || server.ipv4, ipv6: liData.ipv6 || server.ipv6 };
            }
          } catch {}
        }
        return server;
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch servers" });
    }
  });

  app.get("/api/portal/:token/server-types", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const apiKey = process.env.LINODE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Server provisioning not configured" });

      const response = await fetch("https://api.linode.com/v4/linode/types", {
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch server types" });

      const types = (data.data || [])
        .filter((t: any) => {
          const id = (t.id || "").toLowerCase();
          if (!id.includes("nanode") && !id.includes("standard")) return false;
          const excluded = ["g6-standard-8", "g6-standard-16", "g6-standard-24"];
          return !excluded.includes(t.id);
        })
        .map((t: any) => {
          const baseHourly = t.price?.hourly || 0;
          const baseMonthly = t.price?.monthly || 0;
          const markup = 1.5;
          return {
            id: t.id,
            label: t.label,
            typeClass: t.type_class || (t.id?.includes("nanode") ? "nanode" : "standard"),
            vcpus: t.vcpus,
            memory: t.memory,
            disk: t.disk,
            transfer: t.transfer,
            monthlyPrice: parseFloat((baseMonthly * markup).toFixed(2)),
            hourlyPrice: parseFloat((baseHourly * markup).toFixed(6)),
            baseMonthly,
            baseHourly,
            networkOut: t.network_out,
          };
        })
        .sort((a: any, b: any) => (a.hourlyPrice || 0) - (b.hourlyPrice || 0));
      res.json(types);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch server types" });
    }
  });

  app.get("/api/portal/:token/server-regions", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const apiKey = process.env.LINODE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Server provisioning not configured" });

      const response = await fetch("https://api.linode.com/v4/regions", {
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch regions" });

      const regions = (data.data || [])
        .filter((r: any) => r.status === "ok")
        .map((r: any) => ({ id: r.id, label: r.label, country: r.country }));
      res.json(regions);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.post("/api/portal/:token/servers/provision", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const existingLicenses = await storage.getLicenses(customer.id);
      const hasActiveLicense = existingLicenses.some(l => l.status === "active");
      if (!hasActiveLicense) {
        await storage.createLicense({
          customerId: customer.id,
          licenseKey: generateLicenseKey(),
          status: "active",
          maxActivations: 0,
          expiresAt: null,
          notes: "Auto-issued during server provisioning",
        });
      }

      const { typeId, region, label } = req.body;
      if (!typeId || !region || !label) {
        return res.status(400).json({ error: "Server type, region, and label are required" });
      }

      const apiKey = process.env.LINODE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Server provisioning not configured" });

      const linodeHeaders = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };
      const rootPass = `AiPS-${Date.now()}-${Math.random().toString(36).slice(2, 10)}!`;

      let monthlyPriceCents = 0;
      try {
        const typesRes = await fetch(`https://api.linode.com/v4/linode/types/${typeId}`, { headers: linodeHeaders });
        if (typesRes.ok) {
          const typeData = await typesRes.json();
          monthlyPriceCents = Math.round((typeData.price?.monthly || 0) * 100);
        }
      } catch {}

      const { randomUUID } = await import("crypto");
      const preGeneratedId = randomUUID();

      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
      const setupUrl = `${protocol}://${host}/api/server-setup/${req.params.token}/${preGeneratedId}`;

      const cloudInitScript = `#!/bin/bash
apt-get update -qq && apt-get install -y -qq curl jq > /dev/null 2>&1
curl -sL ${setupUrl} | bash
`;
      const userDataBase64 = Buffer.from(cloudInitScript).toString("base64");

      const response = await fetch("https://api.linode.com/v4/linode/instances", {
        method: "POST",
        headers: linodeHeaders,
        body: JSON.stringify({
          type: typeId,
          region,
          label: `${label}-${customer.id.substring(0, 6)}`,
          image: "linode/ubuntu24.04",
          root_pass: rootPass,
          booted: true,
          tags: ["aipoweredsites", "client-provisioned"],
          metadata: {
            user_data: userDataBase64,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.errors?.[0]?.reason || "Failed to provision server" });
      }

      const server = await storage.createLinodeServer({
        linodeId: data.id,
        label: data.label,
        customerId: customer.id,
        region: data.region,
        planType: data.type,
        planLabel: data.specs?.type_class || typeId,
        status: data.status,
        ipv4: data.ipv4?.[0] || null,
        ipv6: data.ipv6 || null,
        vcpus: data.specs?.vcpus || null,
        memory: data.specs?.memory || null,
        disk: data.specs?.disk || null,
        monthlyPriceCents,
        markupPercent: 50,
      }, preGeneratedId);

      const setupCommand = `curl -sL ${setupUrl} | sudo bash`;

      res.json({ server, rootPassword: rootPass, setupCommand, autoSetup: true });
    } catch (err: any) {
      console.error("Portal server provision error:", err.message);
      res.status(500).json({ error: err.message || "Failed to provision server" });
    }
  });

  app.post("/api/portal/:token/servers/:serverId/credentials", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const { sshUser, sshPort, sshPublicKey, serverIp, password } = req.body;
      if (!sshUser || !sshPort) {
        return res.status(400).json({ error: "SSH user and port are required" });
      }

      const servers = await storage.getLinodeServersByCustomerId(customer.id);
      const server = servers.find(s => s.id === req.params.serverId);
      if (!server) return res.status(404).json({ message: "Server not found" });

      await storage.updateLinodeServer(server.id, {
        sshUser: sshUser,
        sshPort: sshPort,
        sshPublicKey: sshPublicKey || null,
        serverSetupComplete: true,
      });

      if (customer.email && serverIp && password) {
        try {
          const { sendEmail } = await import("./email");
          const sshCmd = `ssh -p ${sshPort} ${sshUser}@${serverIp}`;

          const customerLicenses = await storage.getLicenses(customer.id);
          const activeLicense = customerLicenses.find(l => l.status === "active");
          const licenseKey = activeLicense?.licenseKey || "";

          const protocol = req.headers["x-forwarded-proto"] || "https";
          const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
          const curlCommand = `curl -sL ${protocol}://${host}/api/server-setup/${req.params.token}/${req.params.serverId} | sudo bash`;

          const portalUrl = `${protocol}://${host}/portal/${req.params.token}`;

          await sendEmail({
            to: customer.email,
            subject: `Your Server Is Ready - ${serverIp}`,
            html: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;">
<div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; border-radius: 12px 12px 0 0;">
  <h1 style="color: #ffffff; margin: 0 0 5px 0; font-size: 24px;">🚀 Your Server Is Ready</h1>
  <p style="color: #94a3b8; margin: 0; font-size: 14px;">Everything is set up and secured. Here's everything you need.</p>
</div>

<div style="padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">

<h2 style="color: #1a1a2e; font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #10b981;">🔐 SSH Login Credentials</h2>
<table style="width: 100%; border-collapse: collapse; margin: 0 0 20px 0;">
<tr><td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc; width: 140px; color: #374151;">Server IP</td><td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-family: monospace; color: #1a1a2e;">${serverIp}</td></tr>
<tr><td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc; color: #374151;">Username</td><td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-family: monospace; color: #1a1a2e;">${sshUser}</td></tr>
<tr><td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc; color: #374151;">Password</td><td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-family: monospace; color: #1a1a2e;">${password}</td></tr>
<tr><td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc; color: #374151;">SSH Port</td><td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-family: monospace; color: #1a1a2e;">${sshPort}</td></tr>
<tr><td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc; color: #374151;">Sudo Access</td><td style="padding: 10px 12px; border: 1px solid #e2e8f0; color: #10b981; font-weight: 600;">✅ Yes — use the same password</td></tr>
</table>

<h3 style="color: #1a1a2e; font-size: 14px; margin: 0 0 8px 0;">SSH Login Command</h3>
<pre style="background: #0f172a; color: #4ade80; padding: 14px 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; margin: 0 0 20px 0;">${sshCmd}</pre>

${sshPublicKey ? `<h2 style="color: #1a1a2e; font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">🔑 SSH Public Key</h2>
<p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0;">This key has been installed on your server for passwordless authentication:</p>
<pre style="background: #f1f5f9; color: #334155; padding: 14px 16px; border-radius: 8px; overflow-x: auto; font-size: 11px; word-break: break-all; white-space: pre-wrap; margin: 0 0 20px 0; border: 1px solid #e2e8f0;">${sshPublicKey}</pre>` : ''}

${licenseKey ? `<h2 style="color: #1a1a2e; font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #f59e0b;">🛡️ License Key</h2>
<p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0;">Your license key for server setup script validation:</p>
<pre style="background: #fefce8; color: #854d0e; padding: 14px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 1px; margin: 0 0 20px 0; border: 1px solid #fde68a; text-align: center;">${licenseKey}</pre>` : ''}

<h2 style="color: #1a1a2e; font-size: 16px; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #8b5cf6;">⚡ One-Click Setup Command</h2>
<p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0;">Need to re-run the setup? SSH into your server as root and paste this command. Your license key is pre-included — no extra configuration needed:</p>
<pre style="background: #0f172a; color: #c4b5fd; padding: 14px 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; margin: 0 0 20px 0; word-break: break-all; white-space: pre-wrap;">${curlCommand}</pre>

<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
  <h3 style="color: #166534; font-size: 14px; margin: 0 0 8px 0;">🔒 Security Notes</h3>
  <ul style="color: #15803d; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
    <li>Root SSH login has been <strong>disabled</strong> for security</li>
    <li>Please change your password after first login</li>
    <li>Your user <strong>${sshUser}</strong> has full sudo access using the same password</li>
    <li>SSH is configured on a custom port (<strong>${sshPort}</strong>) for added security</li>
  </ul>
</div>

<div style="text-align: center; margin: 25px 0 10px 0;">
  <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">View in Your Portal →</a>
</div>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e2e8f0;">
<p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">This is an automated message from AI Powered Sites. Keep this email safe — it contains your server credentials.</p>
</div>
</div>`,
          });
        } catch (emailErr: any) {
          console.error("Failed to send server credentials email:", emailErr.message);
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Portal server credentials update error:", err.message);
      res.status(500).json({ error: err.message || "Failed to update server credentials" });
    }
  });

  app.get("/api/linode/servers/:serverId/setup-command", isAuthenticated, async (req, res) => {
    try {
      const servers = await storage.getLinodeServers();
      const server = servers.find(s => s.id === req.params.serverId);
      if (!server) return res.status(404).json({ message: "Server not found" });
      if (!server.customerId) return res.status(400).json({ message: "Server must be assigned to a customer first" });

      const customer = await storage.getCustomer(server.customerId);
      if (!customer) return res.status(400).json({ message: "Customer not found" });

      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
      const setupCommand = `curl -sL ${protocol}://${host}/api/server-setup/${customer.portalToken}/${server.id} | sudo bash`;

      res.json({ setupCommand });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/server-setup/:token/:serverId", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).send("# Invalid portal token");

      const servers = await storage.getLinodeServersByCustomerId(customer.id);
      const server = servers.find(s => s.id === req.params.serverId) || null;

      const fs = await import("fs");
      const path = await import("path");
      const scriptPath = path.join(process.cwd(), "scripts", "server-setup.sh");
      let script = fs.readFileSync(scriptPath, "utf-8");

      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
      let apiUrl = `${protocol}://${host}`;
      if (apiUrl.includes("localhost") && process.env.REPLIT_DEV_DOMAIN) {
        apiUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      }

      const nameParts = (customer.name || "").split(" ");
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "";
      const username = req.query.user as string || firstName.toLowerCase().replace(/[^a-z0-9]/g, "") || "admin";

      const customerLicenses = await storage.getLicenses(customer.id);
      const activeLicense = customerLicenses.find(l => l.status === "active");
      const licenseKey = activeLicense?.licenseKey || "";

      const adminSshKey = server?.sshPublicKey || "";

      const envBlock = [
        `export SETUP_USER="${username}"`,
        `export SETUP_EMAIL="${customer.email || ""}"`,
        `export SETUP_FIRST_NAME="${firstName}"`,
        `export SETUP_LAST_NAME="${lastName}"`,
        `export SETUP_API_URL="${apiUrl}"`,
        `export SETUP_RESEND_KEY=""`,
        `export SETUP_PORTAL_TOKEN="${req.params.token}"`,
        `export SETUP_SERVER_ID="${req.params.serverId}"`,
        `export SETUP_LICENSE_KEY="${licenseKey}"`,
        `export SETUP_ADMIN_SSH_KEY="${adminSshKey.replace(/"/g, '\\"')}"`,
      ].join("\n");

      script = script.replace(
        "#!/bin/bash\nset -euo pipefail",
        `#!/bin/bash\nset -euo pipefail\n\n# Auto-configured by Billing Hub\n${envBlock}\n`
      );

      res.setHeader("Content-Type", "text/plain");
      res.send(script);
    } catch (err: any) {
      res.status(500).send(`# Error: ${err.message}`);
    }
  });

  // ============ LINODE SERVER PROVISIONING ============

  const LINODE_API_BASE = "https://api.linode.com/v4";

  function getLinodeHeaders() {
    const apiKey = process.env.LINODE_API_KEY;
    if (!apiKey) throw new Error("LINODE_API_KEY not configured");
    return {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  app.get("/api/linode/types", isAuthenticated, async (req, res) => {
    try {
      const response = await fetch(`${LINODE_API_BASE}/linode/types`, {
        headers: getLinodeHeaders(),
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.errors?.[0]?.reason || "Failed to fetch types" });

      const types = (data.data || []).map((t: any) => ({
        id: t.id,
        label: t.label,
        typeClass: t.type_class,
        vcpus: t.vcpus,
        memory: t.memory,
        disk: t.disk,
        transfer: t.transfer,
        monthlyPrice: t.price?.monthly,
        hourlyPrice: t.price?.hourly,
      }));
      res.json(types);
    } catch (err: any) {
      console.error("Linode types error:", err.message);
      res.status(500).json({ error: err.message || "Failed to fetch server types" });
    }
  });

  app.get("/api/linode/regions", isAuthenticated, async (req, res) => {
    try {
      const response = await fetch(`${LINODE_API_BASE}/regions`, {
        headers: getLinodeHeaders(),
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.errors?.[0]?.reason || "Failed to fetch regions" });

      const regions = (data.data || [])
        .filter((r: any) => r.status === "ok")
        .map((r: any) => ({
          id: r.id,
          label: r.label,
          country: r.country,
        }));
      res.json(regions);
    } catch (err: any) {
      console.error("Linode regions error:", err.message);
      res.status(500).json({ error: err.message || "Failed to fetch regions" });
    }
  });

  app.post("/api/linode/provision", isAuthenticated, async (req, res) => {
    try {
      const { typeId, region, label, customerId, rootPassword, authorizedKeys } = req.body;
      if (!typeId || !region || !label) {
        return res.status(400).json({ error: "typeId, region, and label are required" });
      }

      const rootPass = rootPassword || `AiPS-${Date.now()}-${Math.random().toString(36).slice(2, 10)}!`;

      let monthlyPriceCents = 0;
      let hourlyPriceForPlan = 0;
      try {
        const typesRes = await fetch(`${LINODE_API_BASE}/linode/types/${typeId}`, {
          headers: getLinodeHeaders(),
        });
        if (typesRes.ok) {
          const typeData = await typesRes.json();
          monthlyPriceCents = Math.round((typeData.price?.monthly || 0) * 100);
          hourlyPriceForPlan = typeData.price?.hourly || 0;
        }
      } catch {}

      const { randomUUID } = await import("crypto");
      const preGeneratedId = randomUUID();
      const sanitizedCustomerId = customerId && customerId !== "none" ? customerId : null;

      let setupCommand = "";
      let autoSetup = false;
      let userDataBase64: string | undefined;

      if (sanitizedCustomerId) {
        const customer = await storage.getCustomer(sanitizedCustomerId);
        if (customer) {
          const protocol = req.headers["x-forwarded-proto"] || "https";
          const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
          const setupUrl = `${protocol}://${host}/api/server-setup/${customer.portalToken}/${preGeneratedId}`;
          setupCommand = `curl -sL ${setupUrl} | sudo bash`;

          const cloudInitScript = `#!/bin/bash
apt-get update -qq && apt-get install -y -qq curl jq > /dev/null 2>&1
curl -sL ${setupUrl} | bash
`;
          userDataBase64 = Buffer.from(cloudInitScript).toString("base64");
          autoSetup = true;
        }
      }

      const linodePayload: any = {
        type: typeId,
        region,
        label,
        image: "linode/ubuntu24.04",
        root_pass: rootPass,
        booted: true,
        tags: ["aipoweredsites"],
      };
      if (authorizedKeys) {
        const keys = authorizedKeys.split("\n").map((k: string) => k.trim()).filter((k: string) => k.length > 0);
        if (keys.length > 0) {
          linodePayload.authorized_keys = keys;
        }
      }
      if (userDataBase64) {
        linodePayload.metadata = { user_data: userDataBase64 };
      }

      const response = await fetch(`${LINODE_API_BASE}/linode/instances`, {
        method: "POST",
        headers: getLinodeHeaders(),
        body: JSON.stringify(linodePayload),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.errors?.[0]?.reason || "Failed to provision server" });
      }

      const server = await storage.createLinodeServer({
        linodeId: data.id,
        label: data.label,
        customerId: sanitizedCustomerId,
        region: data.region,
        planType: data.type,
        planLabel: data.specs?.type_class || typeId,
        status: data.status,
        ipv4: data.ipv4?.[0] || null,
        ipv6: data.ipv6 || null,
        vcpus: data.specs?.vcpus || null,
        memory: data.specs?.memory || null,
        disk: data.specs?.disk || null,
        monthlyPriceCents,
        markupPercent: 50,
        sshPublicKey: authorizedKeys || null,
      }, preGeneratedId);

      res.json({ ...server, rootPassword: rootPass, setupCommand, autoSetup });
    } catch (err: any) {
      console.error("Linode provision error:", err.message);
      res.status(500).json({ error: err.message || "Failed to provision server" });
    }
  });

  app.get("/api/linode/servers", isAuthenticated, async (req, res) => {
    try {
      const servers = await storage.getLinodeServers();

      const enriched = await Promise.all(servers.map(async (server) => {
        try {
          const response = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}`, {
            headers: getLinodeHeaders(),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.status !== server.status || data.ipv4?.[0] !== server.ipv4) {
              await storage.updateLinodeServer(server.id, {
                status: data.status,
                ipv4: data.ipv4?.[0] || server.ipv4,
              });
            }
            return {
              ...server,
              status: data.status,
              ipv4: data.ipv4?.[0] || server.ipv4,
              updated: data.updated || null,
            };
          }
        } catch {}
        return server;
      }));

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch servers" });
    }
  });

  app.get("/api/linode/servers/:id/stats", isAuthenticated, async (req, res) => {
    try {
      const server = await storage.getLinodeServer(req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found" });

      const response = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}/stats`, {
        headers: getLinodeHeaders(),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 400 || response.status === 404) {
          return res.json({
            cpu: "0.00",
            networkInGB: "0.00",
            networkOutGB: "0.00",
            cpuTimeline: [],
            message: "Stats not available yet — usage data takes a few hours to populate after provisioning.",
          });
        }
        return res.status(response.status).json({ error: err.errors?.[0]?.reason || "Stats not available" });
      }

      const stats = await response.json();

      const cpuData = stats.data?.cpu || [];
      const netIn = stats.data?.netv4?.in || [];
      const netOut = stats.data?.netv4?.out || [];

      const avgCpu = cpuData.length > 0
        ? cpuData.reduce((sum: number, p: number[]) => sum + p[1], 0) / cpuData.length
        : 0;

      const totalNetIn = netIn.length > 0
        ? netIn.reduce((sum: number, p: number[]) => sum + p[1], 0)
        : 0;
      const totalNetOut = netOut.length > 0
        ? netOut.reduce((sum: number, p: number[]) => sum + p[1], 0)
        : 0;

      await storage.updateLinodeServer(server.id, {
        cpuUsage: String(avgCpu.toFixed(2)),
        networkIn: String((totalNetIn / 1e9).toFixed(2)),
        networkOut: String((totalNetOut / 1e9).toFixed(2)),
        lastStatsAt: new Date(),
      });

      res.json({
        cpu: avgCpu.toFixed(2),
        networkInGB: (totalNetIn / 1e9).toFixed(2),
        networkOutGB: (totalNetOut / 1e9).toFixed(2),
        cpuTimeline: cpuData.slice(-24).map((p: number[]) => ({ time: p[0], value: p[1]?.toFixed(1) })),
      });
    } catch (err: any) {
      console.error("Linode stats error:", err.message);
      res.status(500).json({ error: err.message || "Failed to fetch stats" });
    }
  });

  app.delete("/api/linode/servers/:id", isAuthenticated, async (req, res) => {
    try {
      const server = await storage.getLinodeServer(req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found" });

      const response = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}`, {
        method: "DELETE",
        headers: getLinodeHeaders(),
      });

      if (!response.ok && response.status !== 404) {
        const err = await response.json();
        return res.status(response.status).json({ error: err.errors?.[0]?.reason || "Failed to delete server" });
      }

      await storage.deleteLinodeServer(server.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Linode delete error:", err.message);
      res.status(500).json({ error: err.message || "Failed to delete server" });
    }
  });

  app.patch("/api/linode/servers/:id", isAuthenticated, async (req, res) => {
    try {
      const server = await storage.getLinodeServer(req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found" });

      // If label is being changed, sync to Linode
      if (req.body.label && req.body.label !== server.label) {
        const linodeRes = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}`, {
          method: "PUT",
          headers: getLinodeHeaders(),
          body: JSON.stringify({ label: req.body.label }),
        });
        if (!linodeRes.ok) {
          const err = await linodeRes.json();
          return res.status(linodeRes.status).json({ error: err.errors?.[0]?.reason || "Failed to rename on Linode" });
        }
      }

      const updated = await storage.updateLinodeServer(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Server not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update server" });
    }
  });

  // In-memory cache for Linode type pricing (avoids hitting API every 30s per server)
  const typeCache = new Map<string, { hourly: number; monthly: number; backupMonthly: number; fetchedAt: number }>();
  const TYPE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async function getLinodeTypePricing(planType: string): Promise<{ hourly: number; monthly: number; backupMonthly: number }> {
    const cached = typeCache.get(planType);
    if (cached && Date.now() - cached.fetchedAt < TYPE_CACHE_TTL) {
      return { hourly: cached.hourly, monthly: cached.monthly, backupMonthly: cached.backupMonthly };
    }

    try {
      const typeRes = await fetch(`${LINODE_API_BASE}/linode/types/${planType}`, {
        headers: getLinodeHeaders(),
      });
      if (typeRes.ok) {
        const typeData = await typeRes.json();
        const result = {
          hourly: typeData.price?.hourly || 0,
          monthly: typeData.price?.monthly || 0,
          backupMonthly: typeData.addons?.backups?.price?.monthly || 0,
          fetchedAt: Date.now(),
        };
        typeCache.set(planType, result);
        return result;
      }
      console.warn(`[linode-pricing] Type API returned ${typeRes.status} for ${planType}`);
    } catch (err: any) {
      console.warn(`[linode-pricing] Type API failed for ${planType}: ${err.message}`);
    }

    if (cached) {
      return { hourly: cached.hourly, monthly: cached.monthly, backupMonthly: cached.backupMonthly };
    }

    return { hourly: 0, monthly: 0, backupMonthly: 0 };
  }

  // Get real-time pricing info for a server (hourly cost, backup cost, hours running)
  app.get("/api/linode/servers/:id/pricing", isAuthenticated, async (req, res) => {
    try {
      const server = await storage.getLinodeServer(req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found" });

      const typePricing = await getLinodeTypePricing(server.planType);
      let hourlyPrice = typePricing.hourly;
      let backupMonthly = typePricing.backupMonthly;

      // Fallback: derive hourly from stored monthly price if Linode API returned 0
      if (hourlyPrice === 0 && server.monthlyPriceCents) {
        hourlyPrice = server.monthlyPriceCents / 100 / 730;
        console.warn(`[linode-pricing] Using fallback hourly rate $${hourlyPrice.toFixed(6)} for server ${server.id} (plan: ${server.planType})`);
      }

      const markupMultiplier = 1 + (server.markupPercent || 50) / 100;
      const billingStart = server.lastInvoiceAt ? new Date(server.lastInvoiceAt) : new Date(server.createdAt || Date.now());
      const hoursRunning = Math.max(0, (Date.now() - billingStart.getTime()) / (1000 * 60 * 60));

      const linodeCostSoFar = hourlyPrice * hoursRunning;
      const costWithMarkup = linodeCostSoFar * markupMultiplier;
      const backupWithMarkup = backupMonthly * markupMultiplier;

      res.json({
        hourlyPrice,
        hourlyWithMarkup: +(hourlyPrice * markupMultiplier).toFixed(6),
        hoursRunning: +hoursRunning.toFixed(4),
        billingStart: billingStart.toISOString(),
        linodeCostSoFar: +linodeCostSoFar.toFixed(6),
        costWithMarkup: +costWithMarkup.toFixed(6),
        markupPercent: server.markupPercent || 50,
        monthlyPrice: typePricing.monthly,
        monthlyWithMarkup: +(typePricing.monthly * markupMultiplier).toFixed(2),
        backupMonthly,
        backupWithMarkup: +backupWithMarkup.toFixed(2),
      });
    } catch (err: any) {
      console.error(`[linode-pricing] Error for server ${req.params.id}:`, err.message);
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  });

  app.post("/api/linode/servers/:id/reboot", isAuthenticated, async (req, res) => {
    try {
      const server = await storage.getLinodeServer(req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found" });

      const response = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}/reboot`, {
        method: "POST",
        headers: getLinodeHeaders(),
      });

      if (!response.ok) {
        const err = await response.json();
        return res.status(response.status).json({ error: err.errors?.[0]?.reason || "Failed to reboot server" });
      }

      await storage.updateLinodeServer(server.id, { status: "rebooting" });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Linode reboot error:", err.message);
      res.status(500).json({ error: err.message || "Failed to reboot server" });
    }
  });

  app.get("/api/linode/servers/:id/backups", isAuthenticated, async (req, res) => {
    try {
      const server = await storage.getLinodeServer(req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found" });

      const response = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}/backups`, {
        headers: getLinodeHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.errors?.[0]?.reason || "Failed to fetch backup info" });
      }

      res.json({
        enabled: data.enabled ?? false,
        automatic: data.automatic || [],
        snapshot: data.snapshot || {},
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch backup info" });
    }
  });

  app.post("/api/linode/servers/:id/backups/enable", isAuthenticated, async (req, res) => {
    try {
      const server = await storage.getLinodeServer(req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found" });

      const response = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}/backups/enable`, {
        method: "POST",
        headers: getLinodeHeaders(),
      });

      if (!response.ok) {
        const err = await response.json();
        return res.status(response.status).json({ error: err.errors?.[0]?.reason || "Failed to enable backups" });
      }

      // Fetch the backup price from the plan type
      let backupPriceCents = 0;
      try {
        const typeRes = await fetch(`${LINODE_API_BASE}/linode/types/${server.planType}`, {
          headers: getLinodeHeaders(),
        });
        if (typeRes.ok) {
          const typeData = await typeRes.json();
          backupPriceCents = Math.round((typeData.addons?.backups?.price?.monthly || 0) * 100);
        }
      } catch {}

      const markupCents = Math.round(backupPriceCents * 0.5);

      res.json({
        success: true,
        backupPriceCents,
        markupCents,
        totalCents: backupPriceCents + markupCents,
      });
    } catch (err: any) {
      console.error("Linode backup enable error:", err.message);
      res.status(500).json({ error: err.message || "Failed to enable backups" });
    }
  });

  app.post("/api/linode/servers/:id/backups/cancel", isAuthenticated, async (req, res) => {
    try {
      const server = await storage.getLinodeServer(req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found" });

      const response = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}/backups/cancel`, {
        method: "POST",
        headers: getLinodeHeaders(),
      });

      if (!response.ok) {
        const err = await response.json();
        return res.status(response.status).json({ error: err.errors?.[0]?.reason || "Failed to cancel backups" });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Linode backup cancel error:", err.message);
      res.status(500).json({ error: err.message || "Failed to cancel backups" });
    }
  });

  app.post("/api/linode/servers/:id/invoice", isAuthenticated, async (req, res) => {
    try {
      const server = await storage.getLinodeServer(req.params.id);
      if (!server) return res.status(404).json({ error: "Server not found" });

      let customerEmail = null;
      let customerName = null;
      if (server.customerId) {
        const customer = await storage.getCustomer(server.customerId);
        if (customer) {
          customerEmail = customer.email;
          customerName = customer.name;
        }
      }

      // Fetch actual Linode transfer usage for this server
      let transferUsedGB = 0;
      let transferQuotaGB = 0;
      try {
        const transferRes = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}/transfer`, {
          headers: getLinodeHeaders(),
        });
        if (transferRes.ok) {
          const transferData = await transferRes.json();
          transferUsedGB = Math.round(((transferData.used || 0) / 1e9) * 100) / 100;
          transferQuotaGB = Math.round(((transferData.quota || 0) / 1e9) * 100) / 100;
        }
      } catch {}

      // Compute usage cost: hours since last invoice (or server creation) × hourly rate
      const billingStart = server.lastInvoiceAt ? new Date(server.lastInvoiceAt) : new Date(server.createdAt || Date.now());
      const billingEnd = new Date();
      const hoursInPeriod = Math.max(1, Math.ceil((billingEnd.getTime() - billingStart.getTime()) / (1000 * 60 * 60)));

      let linodeCostCents = 0;
      let hourlyPrice = 0;

      // Use server.planType directly (more reliable than fetching instance first)
      const typePricing = await getLinodeTypePricing(server.planType);
      hourlyPrice = typePricing.hourly;

      if (hourlyPrice === 0 && server.monthlyPriceCents) {
        hourlyPrice = server.monthlyPriceCents / 100 / 730;
      }

      linodeCostCents = Math.round(hourlyPrice * hoursInPeriod * 100);

      if (linodeCostCents === 0) {
        return res.status(400).json({ error: "Could not calculate usage cost. Server may still be provisioning — try again shortly." });
      }

      const MARKUP_PERCENT = server.markupPercent || 50;
      const markupCents = Math.round(linodeCostCents * MARKUP_PERCENT / 100);
      const totalCents = linodeCostCents + markupCents;

      // Fetch CPU/network stats for the invoice
      let avgCpu = "0";
      let netInGB = server.networkIn || "0";
      let netOutGB = server.networkOut || "0";
      try {
        const statsRes = await fetch(`${LINODE_API_BASE}/linode/instances/${server.linodeId}/stats`, {
          headers: getLinodeHeaders(),
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const cpuData = statsData.data?.cpu || [];
          if (cpuData.length > 0) {
            avgCpu = (cpuData.reduce((s: number, p: number[]) => s + p[1], 0) / cpuData.length).toFixed(1);
          }
          const netInData = statsData.data?.netv4?.in || [];
          const netOutData = statsData.data?.netv4?.out || [];
          if (netInData.length > 0) {
            netInGB = (netInData.reduce((s: number, p: number[]) => s + p[1], 0) / 1e9).toFixed(2);
          }
          if (netOutData.length > 0) {
            netOutGB = (netOutData.reduce((s: number, p: number[]) => s + p[1], 0) / 1e9).toFixed(2);
          }
        }
      } catch {}

      const invoiceHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{font-family:'Poppins',sans-serif;margin:0;padding:40px;background:#f8f9fa}
.invoice{max-width:700px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #f0f0f0}
.logo{font-size:22px;font-weight:700;background:linear-gradient(135deg,#7c3aed,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.invoice-number{color:#6b7280;font-size:14px}
.details{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
.detail-group h4{color:#6b7280;font-size:12px;text-transform:uppercase;margin:0 0 6px}
.detail-group p{margin:0;font-size:14px;color:#1f2937}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{background:#f9fafb;padding:12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb}
td{padding:12px;border-bottom:1px solid #f3f4f6;font-size:14px}
.total-row{font-weight:700;font-size:16px;border-top:2px solid #e5e7eb}
.total-row td{padding-top:16px}
.usage-box{background:#f0f4ff;border-radius:12px;padding:16px;margin-bottom:24px}
.usage-box h4{margin:0 0 12px;font-size:13px;color:#4b5563;text-transform:uppercase}
.usage-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.usage-item{text-align:center}
.usage-item .value{font-size:20px;font-weight:700;color:#1f2937}
.usage-item .label{font-size:11px;color:#6b7280;margin-top:2px}
.footer{text-align:center;color:#9ca3af;font-size:12px;margin-top:32px}
</style></head>
<body>
<div class="invoice">
<div class="header">
<div class="logo">AI Powered Sites</div>
<div class="invoice-number">Usage-Based Server Invoice<br>Period: ${billingStart.toLocaleDateString()} — ${billingEnd.toLocaleDateString()}<br>${hoursInPeriod} hours</div>
</div>
<div class="details">
<div class="detail-group">
<h4>Billed To</h4>
<p>${customerName || "—"}</p>
<p>${customerEmail || "—"}</p>
</div>
<div class="detail-group">
<h4>Server Details</h4>
<p>${server.label}</p>
<p>IP: ${server.ipv4 || "Pending"}</p>
<p>Region: ${server.region}</p>
<p>Plan: ${server.planType}</p>
</div>
</div>
<div class="usage-box">
<h4>Usage Summary</h4>
<div class="usage-grid">
<div class="usage-item"><div class="value">${avgCpu}%</div><div class="label">Avg CPU</div></div>
<div class="usage-item"><div class="value">${netInGB} GB</div><div class="label">Network In</div></div>
<div class="usage-item"><div class="value">${netOutGB} GB</div><div class="label">Network Out</div></div>
</div>
${transferUsedGB > 0 ? `<p style="margin:12px 0 0;font-size:12px;color:#6b7280;text-align:center">Transfer used: ${transferUsedGB} GB of ${transferQuotaGB} GB quota</p>` : ""}
</div>
<table>
<thead><tr><th>Item</th><th>Details</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>
<tr><td>Compute Usage (${hoursInPeriod} hrs × $${hourlyPrice}/hr)</td><td>${server.vcpus || "—"} vCPU / ${server.memory ? Math.round(server.memory / 1024) + "GB" : "—"} RAM / ${server.disk ? Math.round(server.disk / 1024) + "GB" : "—"} Disk</td><td style="text-align:right">$${(linodeCostCents / 100).toFixed(2)}</td></tr>
<tr><td>Network Transfer</td><td>In: ${netInGB} GB / Out: ${netOutGB} GB</td><td style="text-align:right">Included</td></tr>
<tr><td>Management & Support (${MARKUP_PERCENT}% markup)</td><td>Server management, monitoring, updates</td><td style="text-align:right">$${(markupCents / 100).toFixed(2)}</td></tr>
<tr class="total-row"><td colspan="2">Total Due</td><td style="text-align:right">$${(totalCents / 100).toFixed(2)}</td></tr>
</tbody>
</table>
<div class="footer">
<p>AI Powered Sites — aipoweredsites.com</p>
<p>Usage-based billing. Thank you for your business!</p>
</div>
</div>
</body>
</html>`;

      // Update lastInvoiceAt so next invoice only covers the new period
      await storage.updateLinodeServer(server.id, {
        lastInvoiceAt: billingEnd,
      });

      if (customerEmail) {
        try {
          const { sendEmail } = await import("./email");
          await sendEmail({
            to: customerEmail,
            subject: `Server Usage Invoice — ${server.label}`,
            html: invoiceHtml,
          });
        } catch (emailErr) {
          console.error("Failed to send server invoice email:", emailErr);
        }
      }

      res.json({
        html: invoiceHtml,
        linodeCostCents,
        markupPercent: MARKUP_PERCENT,
        markupCents,
        totalCents,
        hoursInPeriod,
        billingStart: billingStart.toISOString(),
        billingEnd: billingEnd.toISOString(),
        customerEmail,
        emailSent: !!customerEmail,
      });
    } catch (err: any) {
      console.error("Invoice generation error:", err.message);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  // ===== Knowledge Base Articles =====
  app.get("/api/knowledge-base", isAuthenticated, async (req, res) => {
    try {
      const articles = await storage.getKnowledgeBaseArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/knowledge-base/categories/list", isAuthenticated, async (_req, res) => {
    try {
      const categories = await storage.getKnowledgeBaseCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/knowledge-base/categories", isAuthenticated, async (req, res) => {
    try {
      const { name, icon, sortOrder } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }
      const category = await storage.createKnowledgeBaseCategory({
        name: name.trim(), icon: icon || "Folder", sortOrder: sortOrder || 0,
      });
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/api/knowledge-base/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { name, icon, sortOrder } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (icon !== undefined) updates.icon = icon;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      const category = await storage.updateKnowledgeBaseCategory(req.params.id, updates);
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/knowledge-base/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteKnowledgeBaseCategory(req.params.id);
      res.json({ success: deleted });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  app.get("/api/knowledge-base/tags/list", isAuthenticated, async (_req, res) => {
    try {
      const tags = await storage.getKnowledgeBaseTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/knowledge-base/tags", isAuthenticated, async (req, res) => {
    try {
      const { name, icon, color } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }
      const tag = await storage.createKnowledgeBaseTag({
        name: name.trim(), icon: icon || "Tag", color: color || "gray",
      });
      res.json(tag);
    } catch (error) {
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  app.patch("/api/knowledge-base/tags/:id", isAuthenticated, async (req, res) => {
    try {
      const { name, icon, color } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (icon !== undefined) updates.icon = icon;
      if (color !== undefined) updates.color = color;
      const tag = await storage.updateKnowledgeBaseTag(req.params.id, updates);
      res.json(tag);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tag" });
    }
  });

  app.delete("/api/knowledge-base/tags/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteKnowledgeBaseTag(req.params.id);
      res.json({ success: deleted });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  app.get("/api/knowledge-base/:id", isAuthenticated, async (req, res) => {
    try {
      const article = await storage.getKnowledgeBaseArticle(req.params.id);
      if (!article) return res.status(404).json({ error: "Article not found" });
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  app.post("/api/knowledge-base", isAuthenticated, async (req, res) => {
    try {
      const { title, content, category, status, sortOrder, tags } = req.body;
      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }
      if (status && !["draft", "published"].includes(status)) {
        return res.status(400).json({ error: "Status must be 'draft' or 'published'" });
      }
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const article = await storage.createKnowledgeBaseArticle({
        title, slug, content: content || "", category: category || "General",
        tags: Array.isArray(tags) ? tags : [],
        status: status || "draft", sortOrder: sortOrder || 0, notionPageId: null,
      });

      if (status === "published") {
        try {
          const { syncArticleToNotion } = await import("./notionClient");
          const notionPageId = await syncArticleToNotion({ title, content: content || "", category: category || "General", status });
          if (notionPageId) {
            await storage.updateKnowledgeBaseArticle(article.id, { notionPageId });
            article.notionPageId = notionPageId;
          }
        } catch (e) {
          console.error("Notion sync skipped:", e);
        }
      }

      res.json(article);
    } catch (error) {
      console.error("Create article error:", error);
      res.status(500).json({ error: "Failed to create article" });
    }
  });

  app.patch("/api/knowledge-base/:id", isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getKnowledgeBaseArticle(req.params.id);
      if (!existing) return res.status(404).json({ error: "Article not found" });

      const { title, content, category, status, sortOrder, tags } = req.body;
      const updates: any = {};
      if (title !== undefined) {
        updates.title = title;
        updates.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      }
      if (content !== undefined) updates.content = content;
      if (category !== undefined) updates.category = category;
      if (status !== undefined) updates.status = status;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];

      const article = await storage.updateKnowledgeBaseArticle(req.params.id, updates);

      if (article && (status === "published" || (existing.status === "published" && status !== "draft"))) {
        try {
          const { syncArticleToNotion } = await import("./notionClient");
          const notionPageId = await syncArticleToNotion(
            { title: article.title, content: article.content, category: article.category, status: article.status },
            article.notionPageId
          );
          if (notionPageId && notionPageId !== article.notionPageId) {
            await storage.updateKnowledgeBaseArticle(article.id, { notionPageId });
            article.notionPageId = notionPageId;
          }
        } catch (e) {
          console.error("Notion sync skipped:", e);
        }
      }

      res.json(article);
    } catch (error) {
      console.error("Update article error:", error);
      res.status(500).json({ error: "Failed to update article" });
    }
  });

  app.delete("/api/knowledge-base/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteKnowledgeBaseArticle(req.params.id);
      res.json({ success: deleted });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete article" });
    }
  });

  app.get("/api/public/knowledge-base/categories", async (_req, res) => {
    try {
      const categories = await storage.getKnowledgeBaseCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/public/knowledge-base/tags", async (_req, res) => {
    try {
      const tags = await storage.getKnowledgeBaseTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.get("/api/public/knowledge-base", async (_req, res) => {
    try {
      const articles = await storage.getPublishedKnowledgeBaseArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/public/knowledge-base/:slug", async (req, res) => {
    try {
      const article = await storage.getKnowledgeBaseArticleBySlug(req.params.slug);
      if (!article || article.status !== "published") return res.status(404).json({ error: "Article not found" });
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  // Autopilot scheduler - runs every 5 minutes
  // ═══════════════════ NETLIFY DEPLOY ═══════════════════
  const netlifyModule = await import("./netlify");

  app.get("/api/netlify/status", isAuthenticated, (_req, res) => {
    res.json({ configured: netlifyModule.isNetlifyConfigured() });
  });

  app.post("/api/projects/:id/netlify/create", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.netlifySiteId) return res.status(400).json({ message: "Netlify site already exists for this project" });

      const customer = await storage.getCustomer(project.customerId);
      const siteName = `${customer?.company || customer?.name || "client"}-${project.name}`
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

      const site = await netlifyModule.createNetlifySite(siteName);

      const updated = await storage.updateProject(project.id, {
        netlifySiteId: site.id,
        netlifySiteUrl: site.url,
        previewUrl: site.url,
      });

      res.json({ site, project: updated });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create Netlify site" });
    }
  });

  app.post("/api/projects/:id/netlify/link-github", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.netlifySiteId) return res.status(400).json({ message: "Create Netlify site first" });

      const { repoUrl, branch } = req.body;
      if (!repoUrl) return res.status(400).json({ message: "GitHub repo URL required" });

      const result = await netlifyModule.linkSiteToGitHub(project.netlifySiteId, repoUrl, branch || "main");

      await storage.updateProject(project.id, {
        githubRepoUrl: repoUrl,
        netlifySiteUrl: result.url,
        previewUrl: result.url,
      });

      res.json({ url: result.url });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to link GitHub repo" });
    }
  });

  app.post("/api/projects/:id/netlify/deploy", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.netlifySiteId) return res.status(400).json({ message: "Create Netlify site first" });

      const deploy = await netlifyModule.triggerDeploy(project.netlifySiteId);
      res.json(deploy);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to trigger deploy" });
    }
  });

  app.get("/api/projects/:id/netlify/info", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.netlifySiteId) return res.status(404).json({ message: "No Netlify site linked" });

      const site = await netlifyModule.getNetlifySite(project.netlifySiteId);
      const deploys = await netlifyModule.getNetlifyDeploys(project.netlifySiteId);
      res.json({ site, deploys, githubRepoUrl: project.githubRepoUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch Netlify info" });
    }
  });

  app.delete("/api/projects/:id/netlify", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.netlifySiteId) return res.status(404).json({ message: "No Netlify site linked" });

      await netlifyModule.deleteNetlifySite(project.netlifySiteId);
      await storage.updateProject(project.id, {
        netlifySiteId: null,
        netlifySiteUrl: null,
        githubRepoUrl: null,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to delete Netlify site" });
    }
  });

  // ═══════════════════ VERCEL DEPLOY ═══════════════════
  const vercelModule = await import("./vercel");

  app.get("/api/vercel/status", isAuthenticated, (_req, res) => {
    res.json({ configured: vercelModule.isVercelConfigured() });
  });

  app.post("/api/projects/:id/vercel/create", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.vercelProjectId) return res.status(400).json({ message: "Vercel project already exists" });

      const customer = await storage.getCustomer(project.customerId);
      const siteName = `${customer?.company || customer?.name || "client"}-${project.name}`
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

      const result = await vercelModule.createVercelProject(siteName, project.githubRepoUrl || undefined);

      await storage.updateProject(project.id, {
        vercelProjectId: result.id,
        vercelProjectUrl: result.url,
        previewUrl: result.url,
        deployPlatform: "vercel",
      });

      res.json({ project: result });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create Vercel project" });
    }
  });

  app.post("/api/projects/:id/vercel/link-github", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.vercelProjectId) return res.status(400).json({ message: "Create Vercel project first" });

      const { repoUrl } = req.body;
      if (!repoUrl) return res.status(400).json({ message: "GitHub repo URL required" });

      const result = await vercelModule.linkVercelToGitHub(project.vercelProjectId, repoUrl);

      await storage.updateProject(project.id, {
        githubRepoUrl: repoUrl,
        vercelProjectUrl: result.url,
        previewUrl: result.url,
      });

      res.json({ url: result.url });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to link GitHub repo" });
    }
  });

  app.post("/api/projects/:id/vercel/deploy", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.vercelProjectId) return res.status(400).json({ message: "Create Vercel project first" });

      const vercelProject = await vercelModule.getVercelProject(project.vercelProjectId);
      const deploy = await vercelModule.triggerVercelDeploy(vercelProject.id);
      res.json(deploy);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to trigger deploy" });
    }
  });

  app.get("/api/projects/:id/vercel/info", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.vercelProjectId) return res.status(404).json({ message: "No Vercel project linked" });

      const site = await vercelModule.getVercelProject(project.vercelProjectId);
      const deploys = await vercelModule.getVercelDeploys(project.vercelProjectId);
      res.json({ site, deploys, githubRepoUrl: project.githubRepoUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch Vercel info" });
    }
  });

  app.delete("/api/projects/:id/vercel", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.vercelProjectId) return res.status(404).json({ message: "No Vercel project linked" });

      await vercelModule.deleteVercelProject(project.vercelProjectId);
      await storage.updateProject(project.id, {
        vercelProjectId: null,
        vercelProjectUrl: null,
        deployPlatform: null,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to delete Vercel project" });
    }
  });

  // ═══════════════════ RAILWAY DEPLOY ═══════════════════
  const railwayModule = await import("./railway");

  app.get("/api/railway/status", isAuthenticated, (_req, res) => {
    res.json({ configured: railwayModule.isRailwayConfigured() });
  });

  app.post("/api/projects/:id/railway/create", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.railwayProjectId) return res.status(400).json({ message: "Railway project already exists" });

      const customer = await storage.getCustomer(project.customerId);
      const siteName = `${customer?.company || customer?.name || "client"}-${project.name}`
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

      const result = await railwayModule.createRailwayProject(siteName, project.githubRepoUrl || undefined);

      let publicUrl = result.url;
      try {
        publicUrl = await railwayModule.generateRailwayDomain(result.projectId, result.serviceId);
      } catch {}

      await storage.updateProject(project.id, {
        railwayProjectId: result.projectId,
        railwayServiceId: result.serviceId,
        railwayProjectUrl: publicUrl,
        previewUrl: publicUrl,
        deployPlatform: "railway",
      });

      res.json({ project: result, publicUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create Railway project" });
    }
  });

  app.post("/api/projects/:id/railway/link-github", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const { repoUrl } = req.body;
      if (!repoUrl) return res.status(400).json({ message: "GitHub repo URL required" });

      if (project.railwayProjectId) {
        try { await railwayModule.deleteRailwayProject(project.railwayProjectId); } catch {}
      }

      const customer = await storage.getCustomer(project.customerId);
      const siteName = `${customer?.company || customer?.name || "client"}-${project.name}`
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

      const result = await railwayModule.createRailwayProject(siteName, repoUrl);

      let publicUrl = result.url;
      try {
        publicUrl = await railwayModule.generateRailwayDomain(result.projectId, result.serviceId);
      } catch {}

      await storage.updateProject(project.id, {
        githubRepoUrl: repoUrl,
        railwayProjectId: result.projectId,
        railwayServiceId: result.serviceId,
        railwayProjectUrl: publicUrl,
        previewUrl: publicUrl,
      });

      res.json({ url: publicUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to link GitHub repo" });
    }
  });

  app.post("/api/projects/:id/railway/deploy", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.railwayProjectId || !project.railwayServiceId) return res.status(400).json({ message: "Create Railway project first" });

      const deploy = await railwayModule.triggerRailwayDeploy(project.railwayProjectId, project.railwayServiceId);
      res.json(deploy);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to trigger deploy" });
    }
  });

  app.get("/api/projects/:id/railway/info", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.railwayProjectId) return res.status(404).json({ message: "No Railway project linked" });

      const info = await railwayModule.getRailwayProject(project.railwayProjectId);
      const deploys = project.railwayServiceId
        ? await railwayModule.getRailwayDeploys(project.railwayProjectId, project.railwayServiceId)
        : [];
      res.json({ site: info, deploys, githubRepoUrl: project.githubRepoUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch Railway info" });
    }
  });

  app.delete("/api/projects/:id/railway", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.railwayProjectId) return res.status(404).json({ message: "No Railway project linked" });

      await railwayModule.deleteRailwayProject(project.railwayProjectId);
      await storage.updateProject(project.id, {
        railwayProjectId: null,
        railwayServiceId: null,
        railwayProjectUrl: null,
        deployPlatform: null,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to delete Railway project" });
    }
  });

  // ═══════════════════ DEPLOY STATUS (ALL PLATFORMS) ═══════════════════
  app.get("/api/deploy/status", isAuthenticated, (_req, res) => {
    res.json({
      netlify: { configured: netlifyModule.isNetlifyConfigured() },
      vercel: { configured: vercelModule.isVercelConfigured() },
      railway: { configured: railwayModule.isRailwayConfigured() },
    });
  });

  setInterval(async () => {
    try {
      const dueConfigs = await storage.getAutopilotDueConfigs();
      for (const config of dueConfigs) {
        if (!config.githubToken || !config.githubRepo) continue;
        const log = await storage.createGitBackupLog({
          configId: config.id,
          projectId: config.projectId,
          status: "pending",
          triggeredBy: "autopilot",
          commitMessage: `Auto-backup ${new Date().toISOString().split("T")[0]}`,
          commitSha: null,
          filesCount: null,
          errorMessage: null,
        });
        performGitBackup(config, log.id).catch(err => console.error("Autopilot backup failed:", err));
      }
    } catch (err) {
      console.error("Autopilot scheduler error:", err);
    }
  }, 5 * 60 * 1000);

  // ============ LICENSE MANAGEMENT ============

  function generateLicenseKey(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(25);
    const segments = [];
    for (let s = 0; s < 5; s++) {
      let seg = "";
      for (let i = 0; i < 5; i++) {
        seg += chars[bytes[s * 5 + i] % chars.length];
      }
      segments.push(seg);
    }
    return `APS-${segments.join("-")}`;
  }

  app.get("/api/licenses", isAuthenticated, async (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const licenses = await storage.getLicenses(customerId);
      res.json(licenses);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/licenses/:id", isAuthenticated, async (req, res) => {
    try {
      const license = await storage.getLicense(req.params.id);
      if (!license) return res.status(404).json({ error: "License not found" });
      res.json(license);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/licenses", isAuthenticated, async (req, res) => {
    try {
      const { customerId, maxActivations, expiresAt, notes } = req.body;
      if (!customerId) return res.status(400).json({ error: "Customer ID required" });

      const customer = await storage.getCustomer(customerId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const licenseKey = generateLicenseKey();
      const license = await storage.createLicense({
        customerId,
        licenseKey,
        status: "active",
        maxActivations: maxActivations || 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes: notes || null,
      });
      res.json(license);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/licenses/:id/reissue", isAuthenticated, async (req, res) => {
    try {
      const license = await storage.getLicense(req.params.id);
      if (!license) return res.status(404).json({ error: "License not found" });

      const activeActivations = await storage.getActiveLicenseActivations(license.id);
      for (const activation of activeActivations) {
        await storage.releaseLicenseActivation(activation.id);
      }

      const newKey = generateLicenseKey();
      const updated = await storage.updateLicense(req.params.id, {
        licenseKey: newKey,
        activationCount: 0,
      } as any);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/licenses/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateLicense(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "License not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/licenses/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteLicense(req.params.id);
      if (!deleted) return res.status(404).json({ error: "License not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/licenses/:id/activations", isAuthenticated, async (req, res) => {
    try {
      const activations = await storage.getLicenseActivations(req.params.id);
      res.json(activations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/license/validate", async (req, res) => {
    try {
      const { licenseKey, serverIp, hostname } = req.body;
      if (!licenseKey) return res.status(400).json({ valid: false, error: "License key required" });
      if (!serverIp || serverIp === "unknown") return res.status(400).json({ valid: false, error: "Server IP address is required for license validation" });

      const license = await storage.getLicenseByKey(licenseKey);
      if (!license) return res.status(404).json({ valid: false, error: "Invalid license key" });

      if (license.status !== "active") {
        return res.json({ valid: false, error: `License is ${license.status}` });
      }

      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return res.json({ valid: false, error: "License has expired" });
      }

      const existingActivation = await storage.getLicenseActivationByIp(license.id, serverIp);
      if (existingActivation) {
        const customer = await storage.getCustomer(license.customerId);
        return res.json({
          valid: true,
          licensee: customer?.name || "Licensed User",
          company: customer?.company || "",
          activationCount: license.activationCount || 0,
          maxActivations: license.maxActivations || 0,
          message: "License already activated for this IP",
        });
      }

      const activeActivations = await storage.getActiveLicenseActivations(license.id);
      if (license.maxActivations && license.maxActivations > 0 && activeActivations.length >= license.maxActivations) {
        const activeIps = activeActivations.map(a => a.serverIp).join(", ");
        return res.json({
          valid: false,
          error: `Maximum activations reached (${activeActivations.length}/${license.maxActivations}). Active IPs: ${activeIps}. Release an IP in your portal or contact support.`,
        });
      }

      await storage.incrementLicenseActivation(license.id, serverIp, hostname || "unknown");

      await storage.createLicenseActivation({
        licenseId: license.id,
        serverId: null,
        serverIp: serverIp,
        hostname: hostname || "unknown",
        status: "active",
      });

      const customer = await storage.getCustomer(license.customerId);

      res.json({
        valid: true,
        licensee: customer?.name || "Licensed User",
        company: customer?.company || "",
        activationCount: (license.activationCount || 0) + 1,
        maxActivations: license.maxActivations || 0,
        message: `License activated for IP ${serverIp}`,
      });
    } catch (err: any) {
      res.status(500).json({ valid: false, error: err.message });
    }
  });

  app.post("/api/licenses/:id/activations/:activationId/release", isAuthenticated, async (req, res) => {
    try {
      const released = await storage.releaseLicenseActivation(req.params.activationId);
      if (!released) return res.status(404).json({ error: "Activation not found" });
      res.json({ success: true, released });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/portal/:token/licenses/:licenseId/release/:activationId", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const license = await storage.getLicense(req.params.licenseId);
      if (!license || license.customerId !== customer.id) {
        return res.status(404).json({ error: "License not found" });
      }

      const released = await storage.releaseLicenseActivation(req.params.activationId);
      if (!released) return res.status(404).json({ error: "Activation not found" });
      res.json({ success: true, released });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/portal/:token/licenses/:licenseId/activations", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });

      const license = await storage.getLicense(req.params.licenseId);
      if (!license || license.customerId !== customer.id) {
        return res.status(404).json({ error: "License not found" });
      }

      const activations = await storage.getLicenseActivations(req.params.licenseId);
      res.json(activations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Community Auth ====================

  const getCommunityUser = async (req: any): Promise<any | null> => {
    const token = req.cookies?.community_session;
    if (!token) return null;
    const user = await storage.getCommunityUserBySessionToken(token);
    return user || null;
  };

  const processMentionNotifications = async (text: string, actorName: string, actorUserId: string | null, postId: string, commentId?: string) => {
    const mentionRegex = /@([A-Za-z0-9_ ]+)/g;
    let match;
    const mentionedNames = new Set<string>();
    while ((match = mentionRegex.exec(text)) !== null) {
      mentionedNames.add(match[1].trim());
    }
    for (const name of mentionedNames) {
      const users = await storage.searchCommunityUsers(name, 1);
      const mentioned = users.find(u => u.displayName.toLowerCase() === name.toLowerCase());
      if (mentioned && mentioned.id !== actorUserId) {
        await storage.createCommunityNotification({
          recipientType: "community_user",
          recipientUserId: mentioned.id,
          type: "mention",
          message: `${actorName} mentioned you in a ${commentId ? "comment" : "post"}`,
          postId,
          commentId: commentId || null,
          actorName,
        });
      }
    }
  };

  app.post("/api/community/auth/signup", async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: "Email, password, and display name are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const existing = await storage.getCommunityUserByEmail(email.toLowerCase());
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createCommunityUser({
        email: email.toLowerCase(),
        passwordHash,
        displayName,
        isActive: true,
      });
      const crypto = await import("crypto");
      const sessionToken = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
      const userAgentStr = req.headers["user-agent"] || "";
      await storage.createCommunitySession(user.id, sessionToken, expiresAt, ipAddress, userAgentStr);
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("community_session", sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      const { passwordHash: _, totpSecret: _ts, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/auth/login", async (req, res) => {
    try {
      const { email, password, totpCode } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = await storage.getCommunityUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (user.twoFactorEnabled && user.totpSecret) {
        if (!totpCode) {
          return res.status(403).json({ error: "2fa_required", message: "Two-factor authentication code required" });
        }
        const { TOTP } = await import("otpauth");
        const totp = new TOTP({ secret: user.totpSecret, algorithm: "SHA1", digits: 6, period: 30 });
        const delta = totp.validate({ token: totpCode, window: 1 });
        if (delta === null) {
          return res.status(401).json({ error: "Invalid two-factor authentication code" });
        }
      }
      await storage.updateCommunityUser(user.id, { lastSeenAt: new Date() });
      const crypto = await import("crypto");
      const sessionToken = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
      const userAgentStr = req.headers["user-agent"] || "";
      await storage.createCommunitySession(user.id, sessionToken, expiresAt, ipAddress, userAgentStr);
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("community_session", sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      const { passwordHash: _, totpSecret: _ts, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/auth/logout", async (req, res) => {
    try {
      const token = req.cookies?.community_session;
      if (token) {
        await storage.deleteCommunitySession(token);
      }
      res.clearCookie("community_session", { path: "/" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/auth/me", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.updateCommunityUser(user.id, { lastSeenAt: new Date() });
      const { passwordHash: _, totpSecret: _ts, ...safeUser } = user;
      const isCommunityAdmin = !!user.adminUserId;
      res.json({ ...safeUser, twoFactorEnabled: !!user.twoFactorEnabled, isAdmin: isCommunityAdmin });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/community/auth/profile", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const { displayName, bio, avatarUrl, websiteUrl, facebookUrl, twitterUrl, linkedinUrl, instagramUrl, youtubeUrl, githubUrl, tiktokUrl } = req.body;
      const updated = await storage.updateCommunityUser(user.id, {
        ...(displayName && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(facebookUrl !== undefined && { facebookUrl }),
        ...(twitterUrl !== undefined && { twitterUrl }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
        ...(instagramUrl !== undefined && { instagramUrl }),
        ...(youtubeUrl !== undefined && { youtubeUrl }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(tiktokUrl !== undefined && { tiktokUrl }),
      });
      if (!updated) return res.status(404).json({ error: "User not found" });

      if (avatarUrl !== undefined) {
        try {
          const { db: appDb } = await import("./db");
          const { sql: sqlTag } = await import("drizzle-orm");
          const linkedAdminId = updated.adminUserId;
          if (linkedAdminId) {
            await appDb.execute(sqlTag`UPDATE users SET profile_image_url = ${avatarUrl} WHERE id = ${linkedAdminId}`);
          } else {
            const adminUser = req.user as any;
            if (adminUser?.id) {
              await appDb.execute(sqlTag`UPDATE users SET profile_image_url = ${avatarUrl} WHERE id = ${adminUser.id}`);
            }
          }
        } catch (e) {}
      }

      const { passwordHash: _, totpSecret: _ts, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Two-Factor Authentication ====================
  app.post("/api/community/auth/2fa/setup", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      if (user.twoFactorEnabled) return res.status(400).json({ error: "Two-factor authentication is already enabled" });

      const { TOTP, Secret } = await import("otpauth");
      const secret = new Secret({ size: 20 });
      const totp = new TOTP({
        issuer: "AI Powered Sites Community",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });

      await storage.updateCommunityUser(user.id, { totpSecret: secret.base32 });
      const otpauthUrl = totp.toString();
      const QRCode = await import("qrcode");
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      res.json({
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
        otpauthUrl,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/auth/2fa/verify", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      if (user.twoFactorEnabled) return res.status(400).json({ error: "Two-factor authentication is already enabled" });
      if (!user.totpSecret) return res.status(400).json({ error: "Please set up 2FA first" });

      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Verification code is required" });

      const { TOTP } = await import("otpauth");
      const totp = new TOTP({ secret: user.totpSecret, algorithm: "SHA1", digits: 6, period: 30 });
      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        return res.status(400).json({ error: "Invalid verification code. Please try again." });
      }

      await storage.updateCommunityUser(user.id, { twoFactorEnabled: true });
      res.json({ success: true, message: "Two-factor authentication enabled successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/auth/2fa/disable", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      if (!user.twoFactorEnabled) return res.status(400).json({ error: "Two-factor authentication is not enabled" });

      const { password } = req.body;
      if (!password) return res.status(400).json({ error: "Password is required to disable 2FA" });

      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Incorrect password" });

      await storage.updateCommunityUser(user.id, { twoFactorEnabled: false, totpSecret: null });
      res.json({ success: true, message: "Two-factor authentication disabled" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Admin Auto-Login to Community ====================
  app.post("/api/community/auth/admin-auto-login", isAuthenticated, async (req, res) => {
    try {
      const rawUser = req.user as any;
      if (!rawUser) return res.status(401).json({ error: "Not authenticated as admin" });

      const adminId = rawUser.id || rawUser.claims?.sub || "admin-local";
      const adminEmail = rawUser.email || rawUser.claims?.email || process.env.ADMIN_EMAIL || "admin@admin.local";
      const adminFirstName = rawUser.firstName || rawUser.claims?.first_name || "Admin";
      const adminLastName = rawUser.lastName || rawUser.claims?.last_name || "";
      const adminDisplayName = [adminFirstName, adminLastName].filter(Boolean).join(" ") || "Admin";
      const adminAvatar = rawUser.profileImageUrl || rawUser.claims?.profile_image_url || null;
      const adminUser = { id: adminId, email: adminEmail, firstName: adminFirstName, lastName: adminLastName, profileImageUrl: adminAvatar };

      const { db: appDb } = await import("./db");
      const { sql: sqlTag } = await import("drizzle-orm");

      const linkedResult = await appDb.execute(sqlTag`SELECT * FROM community_users WHERE admin_user_id = ${adminUser.id} LIMIT 1`);
      let communityUser = linkedResult.rows?.[0] as any;

      if (!communityUser) {
        const lookupEmail = adminUser.email || `admin-${adminUser.id}@admin.local`;
        communityUser = await storage.getCommunityUserByEmail(lookupEmail);
      }

      if (!communityUser) {
        const adminEmail = adminUser.email || `admin-${adminUser.id}@admin.local`;
        const bcrypt = await import("bcryptjs");
        const randomPass = require("crypto").randomBytes(32).toString("hex");
        const passwordHash = await bcrypt.hash(randomPass, 12);
        communityUser = await storage.createCommunityUser({
          email: adminEmail,
          passwordHash,
          displayName: adminDisplayName,
          avatarUrl: adminAvatar,
          isActive: true,
          adminUserId: adminUser.id,
        });
      } else {
        if (!communityUser.admin_user_id && !communityUser.adminUserId) {
          await appDb.execute(sqlTag`UPDATE community_users SET admin_user_id = ${adminUser.id} WHERE id = ${communityUser.id}`);
        }
        const communityAvatar = communityUser.avatar_url || communityUser.avatarUrl;
        if (communityAvatar && communityAvatar !== adminAvatar) {
          await appDb.execute(sqlTag`UPDATE users SET profile_image_url = ${communityAvatar} WHERE id = ${adminUser.id}`);
        } else if (adminAvatar && !communityAvatar) {
          await storage.updateCommunityUser(communityUser.id, { avatarUrl: adminAvatar });
        }
        await storage.updateCommunityUser(communityUser.id, { lastSeenAt: new Date() });
      }

      const crypto = await import("crypto");
      const sessionToken = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
      const userAgentStr = req.headers["user-agent"] || "";
      await storage.createCommunitySession(communityUser.id, sessionToken, expiresAt, ipAddress, userAgentStr);

      res.cookie("community_session", sessionToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      const { passwordHash: _, totpSecret: _ts, ...safeUser } = communityUser;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Community Sessions & User Search ====================

  app.get("/api/community/auth/sessions", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const sessions = await storage.getCommunityUserSessions(user.id);
      const currentToken = req.cookies?.community_session;
      const safeSessions = sessions.map(({ sessionToken, ...s }) => ({
        ...s,
        isCurrent: sessionToken === currentToken,
      }));
      res.json(safeSessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/community/auth/sessions/:id", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const sessions = await storage.getCommunityUserSessions(user.id);
      const session = sessions.find(s => s.id === req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      await storage.deleteCommunitySession(session.sessionToken);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/users/search", async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim();
      if (!q || q.length < 1) return res.json([]);
      const users = await storage.searchCommunityUsers(q, 8);
      const safeUsers = users.map(({ passwordHash, ...u }) => u);
      res.json(safeUsers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Community Members ====================

  app.get("/api/community/members", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const members = await storage.getCommunityMembers(limit);
      const safeMembers = members.map(({ passwordHash, ...m }) => m);
      res.json(safeMembers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Community Messages / Support ====================

  app.post("/api/community/messages", async (req, res) => {
    try {
      const { name, email, subject, body } = req.body;
      if (!name || !email || !subject || !body) {
        return res.status(400).json({ error: "All fields are required" });
      }
      const communityUser = await getCommunityUser(req);
      const message = await storage.createCommunityMessage({
        userId: communityUser?.id || null,
        name,
        email,
        subject,
        body,
      });
      res.status(201).json(message);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/messages", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const messages = await storage.getCommunityMessages(status);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/community/messages/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateCommunityMessage(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Message not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Community User Notifications ====================

  app.get("/api/community/user/notifications", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const notifications = await storage.getCommunityNotifications("community_user", user.id, 50);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/user/notifications/unread-count", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const count = await storage.getUnreadCommunityNotificationCount("community_user", user.id);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/user/notifications/:id/read", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const notification = await storage.markCommunityNotificationRead(req.params.id);
      res.json(notification);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/user/notifications/read-all", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const count = await storage.markAllCommunityNotificationsRead("community_user", user.id);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check if community user has a linked portal
  app.get("/api/community/user/portal-link", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user || !user.customerId) {
        return res.json({ hasPortal: false });
      }
      const customer = await storage.getCustomer(user.customerId);
      if (!customer || !customer.portalToken) {
        return res.json({ hasPortal: false });
      }
      res.json({ hasPortal: true, portalUrl: `/portal/${customer.portalToken}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Community Feed ====================

  app.get("/api/community/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string;
      const posts = await storage.getCommunityPosts(limit, cursor);
      const enriched = await Promise.all(posts.map(async (post: any) => {
        if (post.authorUserId) {
          try {
            const user = await storage.getCommunityUser(post.authorUserId);
            if (user?.avatarUrl) {
              return { ...post, authorAvatar: user.avatarUrl };
            }
          } catch (e) {}
        }
        return post;
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/posts/:id", async (req, res) => {
    try {
      const post = await storage.getCommunityPost(req.params.id) as any;
      if (!post) return res.status(404).json({ error: "Post not found" });
      if (post.authorUserId) {
        try {
          const user = await storage.getCommunityUser(post.authorUserId);
          if (user?.avatarUrl) {
            return res.json({ ...post, authorAvatar: user.avatarUrl });
          }
        } catch (e) {}
      }
      res.json(post);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/posts", async (req, res) => {
    try {
      const { authorName, body } = req.body;
      if (!authorName || !body) return res.status(400).json({ error: "authorName and body are required" });
      const communityUser = await getCommunityUser(req);
      const post = await storage.createCommunityPost({
        ...req.body,
        authorUserId: communityUser?.id || null,
      });
      try {
        await processMentionNotifications(body, authorName, communityUser?.id || null, post.id);
      } catch (e) {}
      res.status(201).json(post);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/community/posts/:id", async (req, res) => {
    try {
      const post = await storage.getCommunityPost(req.params.id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      const { authorName } = req.body;
      const isAdmin = req.isAuthenticated?.();
      const communityUser = await getCommunityUser(req);
      const isAdminCommunityUser = communityUser?.adminUserId || communityUser?.admin_user_id;
      const isCommunityOwner = communityUser && post.authorUserId && communityUser.id === post.authorUserId;
      const isNameMatch = post.authorName === authorName;
      if (!isAdmin && !isAdminCommunityUser && !isCommunityOwner && !isNameMatch) {
        return res.status(403).json({ error: "You can only edit your own posts" });
      }
      const updated = await storage.updateCommunityPost(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/community/posts/:id", async (req, res) => {
    try {
      const { authorName } = req.query;
      const post = await storage.getCommunityPost(req.params.id);
      if (!post) return res.status(404).json({ error: "Post not found" });
      const isAdmin = req.isAuthenticated?.();
      const communityUser = await getCommunityUser(req);
      const isAdminCommunityUser = communityUser?.adminUserId || communityUser?.admin_user_id;
      const isCommunityOwner = communityUser && post.authorUserId && communityUser.id === post.authorUserId;
      const isNameMatch = post.authorName === (authorName as string);
      if (!isAdmin && !isAdminCommunityUser && !isCommunityOwner && !isNameMatch) {
        return res.status(403).json({ error: "You can only delete your own posts" });
      }
      const deleted = await storage.deleteCommunityPost(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Post not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getCommunityComments(req.params.id);
      const enriched = await Promise.all(comments.map(async (comment: any) => {
        if (comment.authorUserId) {
          try {
            const user = await storage.getCommunityUser(comment.authorUserId);
            if (user?.avatarUrl) {
              return { ...comment, authorAvatar: user.avatarUrl };
            }
          } catch (e) {}
        }
        return comment;
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/posts/:id/comments", async (req, res) => {
    try {
      const communityUser = await getCommunityUser(req);
      const comment = await storage.createCommunityComment({
        ...req.body,
        postId: req.params.id,
        authorUserId: communityUser?.id || null,
      });

      const post = await storage.getCommunityPost(req.params.id);
      if (post) {
        if (post.authorRole === "admin") {
          await storage.createCommunityNotification({
            recipientType: "admin",
            type: "comment",
            message: `${comment.authorName} commented on your post`,
            postId: req.params.id,
            commentId: comment.id,
            actorName: comment.authorName,
          });
        }
        if (post.authorUserId && post.authorUserId !== communityUser?.id) {
          await storage.createCommunityNotification({
            recipientType: "community_user",
            recipientUserId: post.authorUserId,
            type: "comment",
            message: `${comment.authorName} commented on your post`,
            postId: req.params.id,
            commentId: comment.id,
            actorName: comment.authorName,
          });
        }
      }

      try {
        await processMentionNotifications(req.body.body || "", comment.authorName, communityUser?.id || null, req.params.id, comment.id);
      } catch (e) {}

      res.status(201).json(comment);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/community/comments/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteCommunityComment(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Comment not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/posts/:id/reactions", async (req, res) => {
    try {
      const reactions = await storage.getCommunityReactions(req.params.id);
      res.json(reactions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/posts/:id/reactions", async (req, res) => {
    try {
      const { reactionType, actorName, actorType, customerId } = req.body;
      const communityUser = await getCommunityUser(req);
      const result = await storage.toggleCommunityReaction(
        req.params.id, reactionType || "like", actorName, actorType || "client", customerId
      );

      if (result.added) {
        const post = await storage.getCommunityPost(req.params.id);
        if (post) {
          const reactionLabel = reactionType === "heart" ? "loved" : reactionType === "haha" ? "laughed at" : reactionType === "angry" ? "reacted to" : "liked";
          if (post.authorRole === "admin") {
            await storage.createCommunityNotification({
              recipientType: "admin",
              type: "reaction",
              message: `${actorName} ${reactionLabel} your post`,
              postId: req.params.id,
              actorName,
            });
          }
          if (post.authorUserId && post.authorUserId !== communityUser?.id) {
            await storage.createCommunityNotification({
              recipientType: "community_user",
              recipientUserId: post.authorUserId,
              type: "reaction",
              message: `${actorName} ${reactionLabel} your post`,
              postId: req.params.id,
              actorName,
            });
          }
        }
      }

      const updatedPost = await storage.getCommunityPost(req.params.id);
      res.json({ ...result, post: updatedPost });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/posts/:id/share", async (req, res) => {
    try {
      await storage.updateCommunityPost(req.params.id, {} as any);
      const post = await storage.getCommunityPost(req.params.id);
      if (post) {
        await storage.createCommunityNotification({
          recipientType: "admin",
          type: "share",
          message: `${req.body.actorName || "Someone"} shared your post`,
          postId: req.params.id,
          actorName: req.body.actorName || "Anonymous",
        });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getCommunityNotifications("admin", undefined, 50);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadCommunityNotificationCount("admin");
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notification = await storage.markCommunityNotificationRead(req.params.id);
      res.json(notification);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.markAllCommunityNotificationsRead("admin");
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Portal community endpoints (for clients)
  app.get("/api/portal/:token/community/notifications", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const notifications = await storage.getCommunityNotifications("client", customer.id, 50);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/portal/:token/community/notifications/unread-count", async (req, res) => {
    try {
      const customer = await storage.getCustomerByPortalToken(req.params.token);
      if (!customer) return res.status(404).json({ message: "Invalid portal link" });
      const count = await storage.getUnreadCommunityNotificationCount("client", customer.id);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Community Friendships ====================

  app.get("/api/community/friendships", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const friendships = await storage.getCommunityFriendships(user.id);
      res.json(friendships);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/friendships", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const { addresseeId } = req.body;
      if (!addresseeId) return res.status(400).json({ error: "addresseeId required" });
      const existing = await storage.getCommunityFriendship(user.id, addresseeId);
      if (existing) return res.status(400).json({ error: "Friend request already exists" });
      const friendship = await storage.createCommunityFriendship({
        requesterId: user.id,
        addresseeId,
        status: "pending",
      });
      const addressee = await storage.getCommunityUser(addresseeId);
      if (addressee) {
        await storage.createCommunityNotification({
          recipientType: "community_user",
          recipientUserId: addresseeId,
          type: "friend_request",
          message: `${user.displayName} sent you a friend request`,
          actorName: user.displayName,
        });
      }
      res.json(friendship);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/friendships/:id/accept", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const updated = await storage.updateCommunityFriendship(req.params.id, "accepted");
      if (updated) {
        await storage.createCommunityNotification({
          recipientType: "community_user",
          recipientUserId: updated.requesterId,
          type: "friend_accepted",
          message: `${user.displayName} accepted your friend request`,
          actorName: user.displayName,
        });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/friendships/:id/decline", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      await storage.deleteCommunityFriendship(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/community/friendships/:id", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      await storage.deleteCommunityFriendship(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/friends", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const friendIds = await storage.getCommunityFriends(user.id);
      const friends = await Promise.all(friendIds.map(id => storage.getCommunityUser(id)));
      res.json(friends.filter(Boolean));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== Community Groups ====================

  app.get("/api/community/groups", async (req, res) => {
    try {
      const groups = await storage.getCommunityGroups();
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/groups/:id", async (req, res) => {
    try {
      const group = await storage.getCommunityGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });
      res.json(group);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/groups", isAuthenticated, async (req, res) => {
    try {
      const group = await storage.createCommunityGroup(req.body);
      res.json(group);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/community/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateCommunityGroup(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/community/groups/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCommunityGroup(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/groups/:id/members", async (req, res) => {
    try {
      const members = await storage.getCommunityGroupMembers(req.params.id);
      res.json(members);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/groups/:id/join", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      const isMember = await storage.isGroupMember(req.params.id, user.id);
      if (isMember) return res.status(400).json({ error: "Already a member" });
      const member = await storage.addCommunityGroupMember({
        groupId: req.params.id,
        userId: user.id,
        role: "member",
      });
      res.json(member);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/community/groups/:id/leave", async (req, res) => {
    try {
      const user = await getCommunityUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });
      await storage.removeCommunityGroupMember(req.params.id, user.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/community/groups/:id/posts", async (req, res) => {
    try {
      const posts = await storage.getCommunityGroupPosts(req.params.id);
      const enriched = await Promise.all(posts.map(async (post: any) => {
        if (post.authorUserId) {
          try {
            const user = await storage.getCommunityUser(post.authorUserId);
            if (user?.avatarUrl) {
              return { ...post, authorAvatar: user.avatarUrl };
            }
          } catch (e) {}
        }
        return post;
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin friendships endpoint (for admin panel)
  app.get("/api/community/admin/friendships", isAuthenticated, async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const friendships = await storage.getCommunityFriendships(userId);
      res.json(friendships);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
