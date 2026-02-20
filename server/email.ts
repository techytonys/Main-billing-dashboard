// Resend integration for sending emails (via Replit connector)
import { Resend } from 'resend';

const FALLBACK_FROM_EMAIL = "AI Powered Sites <hello@aipoweredsites.com>";

function getSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  if (process.env.REPL_SLUG) return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  return "https://aipoweredsites.com";
}

async function getCredentials() {
  const directKey = process.env.RESEND_API_KEY;
  if (directKey) {
    return { apiKey: directKey, fromEmail: FALLBACK_FROM_EMAIL };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (hostname && xReplitToken) {
    try {
      const res = await fetch(
        'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
        { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
      );
      const data = await res.json();
      const conn = data.items?.[0];
      if (conn?.settings?.api_key) {
        return { apiKey: conn.settings.api_key, fromEmail: conn.settings.from_email || FALLBACK_FROM_EMAIL };
      }
    } catch {}
  }

  throw new Error('Resend not configured');
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

interface InvoiceEmailData {
  customerName: string;
  customerEmail: string;
  companyName: string | null;
  invoiceNumber: string;
  issuedAt: string;
  dueDate: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  total: number;
  currency: string;
  portalUrl?: string;
}

function formatMoney(cents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function formatDateStr(date: string): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
}

function buildInvoiceHtml(data: InvoiceEmailData): string {
  const lineItemRows = data.lineItems.map((item, i) => `
    <tr style="background: ${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 12px 16px; font-size: 14px; color: #334155;">${item.description}</td>
      <td style="padding: 12px 16px; font-size: 14px; color: #64748b; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 16px; font-size: 14px; color: #64748b; text-align: right;">${formatMoney(item.unitPrice, data.currency)}</td>
      <td style="padding: 12px 16px; font-size: 14px; color: #0f172a; text-align: right; font-weight: 600;">${formatMoney(item.total, data.currency)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">

    <div style="background: #0f0f1a; border-radius: 12px 12px 0 0; padding: 36px 40px;">
      <table style="width: 100%;" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;">AI Powered Sites</h2>
            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">hello@aipoweredsites.com</p>
          </td>
          <td style="text-align: right;">
            <p style="margin: 0; color: #818cf8; font-size: 24px; font-weight: 800; letter-spacing: -1px;">INVOICE</p>
            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${data.invoiceNumber}</p>
          </td>
        </tr>
      </table>
      <div style="height: 3px; background: linear-gradient(90deg, #6366f1, #818cf8, #6366f1); border-radius: 2px; margin-top: 24px;"></div>
    </div>

    <div style="background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

      <div style="padding: 32px 40px 0;">
        <p style="margin: 0 0 8px; font-size: 15px; color: #334155; line-height: 1.6;">
          Hi ${data.customerName},
        </p>
        <p style="margin: 0 0 28px; font-size: 15px; color: #64748b; line-height: 1.6;">
          Please find your invoice below. We appreciate your business and look forward to continuing our work together.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 14px 18px; background: #f8fafc; border-radius: 8px 0 0 8px; border: 1px solid #e2e8f0; border-right: none;">
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Issued</span><br>
              <span style="font-size: 14px; color: #0f172a; font-weight: 600;">${formatDateStr(data.issuedAt)}</span>
            </td>
            <td style="padding: 14px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-right: none; border-left: none;">
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Due Date</span><br>
              <span style="font-size: 14px; color: #0f172a; font-weight: 600;">${formatDateStr(data.dueDate)}</span>
            </td>
            <td style="padding: 14px 18px; background: #f8fafc; border-radius: 0 8px 8px 0; border: 1px solid #e2e8f0; border-left: none; text-align: right;">
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Amount Due</span><br>
              <span style="font-size: 14px; color: #0f172a; font-weight: 700;">${formatMoney(data.total, data.currency)}</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding: 0 40px;">
        <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden;" cellpadding="0" cellspacing="0">
          <thead>
            <tr style="background: #0f0f1a;">
              <th style="padding: 12px 16px; text-align: left; font-size: 10px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Description</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 10px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Qty</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 10px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Rate</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 10px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemRows}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 16px 20px; background: #0f0f1a; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 700;">Total Due</td>
            <td style="padding: 16px 20px; background: #0f0f1a; border-radius: 8px; color: #ffffff; font-size: 18px; font-weight: 800; text-align: right; letter-spacing: -0.5px;">${formatMoney(data.total, data.currency)}</td>
          </tr>
        </table>
      </div>

      ${data.portalUrl ? `
      <div style="padding: 32px 40px 8px; text-align: center;">
        <a href="${data.portalUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 48px; border-radius: 8px; font-size: 15px; font-weight: 700; letter-spacing: -0.2px;">View & Pay Online</a>
      </div>
      ` : ""}

      <div style="padding: 28px 40px; margin-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8;">
          Thank you for choosing AI Powered Sites.
        </p>
        <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
          hello@aipoweredsites.com  |  aipoweredsites.com
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

interface TicketEmailData {
  customerName: string;
  customerEmail: string;
  ticketNumber: string;
  subject: string;
  message: string;
  isReply: boolean;
  senderName: string;
  portalUrl?: string;
}

function buildTicketHtml(data: TicketEmailData): string {
  const title = data.isReply ? `Reply on ${data.ticketNumber}` : `New Ticket ${data.ticketNumber}`;
  const intro = data.isReply
    ? `${data.senderName} replied to your support ticket.`
    : `Your support ticket has been received. We'll get back to you shortly.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: #1a1a2e; padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">${title}</h1>
        <p style="margin: 8px 0 0; color: #a0aec0; font-size: 14px;">${data.subject}</p>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">Hi ${data.customerName},</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">${intro}</p>
        <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px; border-left: 3px solid #1a1a2e;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280; font-weight: 600;">${data.senderName}</p>
          <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
        </div>
        ${data.portalUrl ? `
        <div style="text-align: center; margin-top: 32px;">
          <a href="${data.portalUrl}" style="display: inline-block; background: #1a1a2e; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600;">View Ticket Online</a>
        </div>` : ""}
      </div>
      <div style="padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated notification from your support portal.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendTicketNotification(data: TicketEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const subjectLine = data.isReply
      ? `Re: [${data.ticketNumber}] ${data.subject}`
      : `[${data.ticketNumber}] ${data.subject}`;

    const result = await client.emails.send({
      from: fromEmail || "Support <onboarding@resend.dev>",
      to: [data.customerEmail],
      subject: subjectLine,
      html: buildTicketHtml(data),
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, messageId: result.data?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send email" };
  }
}

export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();

    const result = await client.emails.send({
      from: fromEmail || "AI Powered Sites <onboarding@resend.dev>",
      to: [data.customerEmail],
      subject: `Invoice ${data.invoiceNumber} - ${formatMoney(data.total, data.currency)}`,
      html: buildInvoiceHtml(data),
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send email" };
  }
}

interface PortalWelcomeData {
  customerName: string;
  customerEmail: string;
  portalUrl: string;
}

function buildPortalWelcomeHtml(data: PortalWelcomeData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: #1a1a2e; padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">Welcome to Your Client Portal</h1>
        <p style="margin: 8px 0 0; color: #a0aec0; font-size: 14px;">AI Powered Sites</p>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">Hi ${data.customerName},</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
          Your client portal is ready. Use the link below to view your invoices, projects, payment history, and more. Bookmark this link for easy access anytime.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.portalUrl}" style="display: inline-block; background: #1a1a2e; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 15px; font-weight: 600;">Access Your Portal</a>
        </div>
        <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin-top: 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Your Portal Link</p>
          <p style="margin: 0; font-size: 13px; color: #374151; word-break: break-all;">${data.portalUrl}</p>
        </div>
      </div>
      <div style="padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          This is your private link. Please keep it safe and do not share it with others.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendPortalWelcomeEmail(data: PortalWelcomeData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const result = await client.emails.send({
      from: fromEmail || "AI Powered Sites <onboarding@resend.dev>",
      to: [data.customerEmail],
      subject: "Your Client Portal Access Link",
      html: buildPortalWelcomeHtml(data),
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, messageId: result.data?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send email" };
  }
}

interface NotificationEmailData {
  customerName: string;
  customerEmail: string;
  title: string;
  body: string;
  portalUrl?: string;
}

function buildNotificationHtml(data: NotificationEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: #0f172a; padding: 28px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">AI Powered Sites</h1>
        <p style="margin: 6px 0 0; color: #94a3b8; font-size: 12px;">New Update for You</p>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">Hi ${data.customerName},</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6366f1;">
          <h2 style="margin: 0 0 8px; font-size: 16px; color: #1e293b; font-weight: 600;">${data.title}</h2>
          <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">${data.body}</p>
        </div>
        ${data.portalUrl ? `
        <div style="text-align: center; margin-top: 28px;">
          <a href="${data.portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #7c3aed); color: #ffffff; text-decoration: none; padding: 12px 36px; border-radius: 6px; font-size: 14px; font-weight: 600;">View in Portal</a>
        </div>` : ""}
      </div>
      <div style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #9ca3af;">You're receiving this because you have an account with AI Powered Sites.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendNotificationEmail(data: NotificationEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const result = await client.emails.send({
      from: fromEmail || "AI Powered Sites <onboarding@resend.dev>",
      to: [data.customerEmail],
      subject: data.title,
      html: buildNotificationHtml(data),
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send notification email" };
  }
}

export async function createResendAudience(name: string) {
  const { client } = await getResendClient();
  const result = await client.audiences.create({ name });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
}

interface QuoteEmailData {
  customerName: string;
  customerEmail: string;
  quoteNumber: string;
  totalAmount: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  notes?: string | null;
  quoteUrl: string;
}

function buildQuoteHtml(data: QuoteEmailData): string {
  const lineItemRows = data.lineItems.map((item, i) => `
    <tr style="background: ${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 12px 16px; font-size: 14px; color: #334155;">${item.description}</td>
      <td style="padding: 12px 16px; font-size: 14px; color: #64748b; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 16px; font-size: 14px; color: #64748b; text-align: right;">${formatMoney(item.unitPrice)}</td>
      <td style="padding: 12px 16px; font-size: 14px; color: #0f172a; text-align: right; font-weight: 600;">${formatMoney(item.total)}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #0f0f1a; border-radius: 12px 12px 0 0; padding: 36px 40px;">
      <table style="width: 100%;" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700;">AI Powered Sites</h2>
            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">hello@aipoweredsites.com</p>
          </td>
          <td style="text-align: right;">
            <p style="margin: 0; color: #34d399; font-size: 24px; font-weight: 800; letter-spacing: -1px;">QUOTE</p>
            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${data.quoteNumber}</p>
          </td>
        </tr>
      </table>
      <div style="height: 3px; background: linear-gradient(90deg, #10b981, #34d399, #10b981); border-radius: 2px; margin-top: 24px;"></div>
    </div>

    <div style="background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
      <div style="padding: 32px 40px 0;">
        <p style="margin: 0 0 8px; font-size: 15px; color: #334155; line-height: 1.6;">Hi ${data.customerName},</p>
        <p style="margin: 0 0 28px; font-size: 15px; color: #64748b; line-height: 1.6;">
          We've prepared a project quote for you. Please review the details below and let us know if you'd like to proceed or have any questions.
        </p>
      </div>

      <div style="padding: 0 40px;">
        <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden;" cellpadding="0" cellspacing="0">
          <thead>
            <tr style="background: #0f0f1a;">
              <th style="padding: 12px 16px; text-align: left; font-size: 10px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Description</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 10px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Qty</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 10px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Rate</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 10px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemRows}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 16px 20px; background: #0f0f1a; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 700;">Total</td>
            <td style="padding: 16px 20px; background: #0f0f1a; border-radius: 8px; color: #ffffff; font-size: 18px; font-weight: 800; text-align: right;">${data.totalAmount}</td>
          </tr>
        </table>
      </div>

      ${data.notes ? `
      <div style="padding: 24px 40px 0;">
        <p style="margin: 0 0 8px; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Notes</p>
        <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6; white-space: pre-wrap;">${data.notes}</p>
      </div>
      ` : ""}

      <div style="padding: 32px 40px 8px; text-align: center;">
        <a href="${data.quoteUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; padding: 14px 48px; border-radius: 8px; font-size: 15px; font-weight: 700;">Review & Respond</a>
        <p style="margin: 12px 0 0; font-size: 12px; color: #94a3b8;">You can approve, request changes, or leave comments</p>
      </div>

      <div style="padding: 28px 40px; margin-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8;">Thank you for considering AI Powered Sites.</p>
        <p style="margin: 0; font-size: 11px; color: #cbd5e1;">hello@aipoweredsites.com  |  aipoweredsites.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendQuoteEmail(data: QuoteEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const result = await client.emails.send({
      from: fromEmail || "AI Powered Sites <onboarding@resend.dev>",
      to: [data.customerEmail],
      subject: `Quote ${data.quoteNumber} - ${data.totalAmount} | AI Powered Sites`,
      html: buildQuoteHtml(data),
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, messageId: result.data?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send quote email" };
  }
}

interface QuoteAdminNotifyData {
  quoteNumber: string;
  customerName: string;
  action: "approved" | "denied" | "comment";
  comment?: string;
}

export async function sendQuoteAdminNotification(data: QuoteAdminNotifyData): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const actionLabel = data.action === "approved" ? "Approved" : data.action === "denied" ? "Declined" : "New Comment";
    const actionColor = data.action === "approved" ? "#10b981" : data.action === "denied" ? "#ef4444" : "#6366f1";
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden;">
      <div style="background: #0f0f1a; padding: 28px 32px;">
        <h2 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600;">Quote Update</h2>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">${data.quoteNumber}</p>
      </div>
      <div style="padding: 28px 32px;">
        <div style="display: inline-block; background: ${actionColor}; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 20px;">${actionLabel}</div>
        <p style="margin: 0 0 8px; font-size: 15px; color: #334155;"><strong>${data.customerName}</strong> has ${data.action === "comment" ? "left a comment on" : data.action} quote ${data.quoteNumber}.</p>
        ${data.comment ? `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 16px; border-left: 4px solid ${actionColor};">
          <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6; white-space: pre-wrap;">${data.comment}</p>
        </div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>`;

    const result = await client.emails.send({
      from: fromEmail || "AI Powered Sites <onboarding@resend.dev>",
      to: ["hello@aipoweredsites.com"],
      subject: `[${actionLabel}] Quote ${data.quoteNumber} - ${data.customerName}`,
      html,
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send admin notification" };
  }
}

interface QuoteRequirementsEmailData {
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  requirements: string;
  lineItems: { description: string; quantity: number; totalCents: number }[];
  totalAmountCents: number;
  projectName: string;
}

export async function sendQuoteRequirementsEmail(data: QuoteRequirementsEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    const lineItemsHtml = data.lineItems.map(li =>
      `<tr>
        <td style="padding: 10px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;">${li.description}</td>
        <td style="padding: 10px 16px; font-size: 14px; color: #64748b; text-align: center; border-bottom: 1px solid #f1f5f9;">${li.quantity}</td>
        <td style="padding: 10px 16px; font-size: 14px; color: #334155; text-align: right; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${formatAmount(li.totalCents)}</td>
      </tr>`
    ).join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px;">
        <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700;">New Project Requirements</h2>
        <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">${data.quoteNumber} - ${data.customerName}</p>
      </div>
      <div style="padding: 28px 32px;">
        <div style="display: inline-block; background: #10b981; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 20px;">Project Created</div>

        <p style="margin: 0 0 6px; font-size: 14px; color: #64748b;">Customer</p>
        <p style="margin: 0 0 20px; font-size: 15px; color: #0f172a; font-weight: 600;">${data.customerName} (${data.customerEmail})</p>

        <p style="margin: 0 0 6px; font-size: 14px; color: #64748b;">Project</p>
        <p style="margin: 0 0 20px; font-size: 15px; color: #0f172a; font-weight: 600;">${data.projectName}</p>

        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Project Requirements</p>
          <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${data.requirements}</p>
        </div>

        <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Approved Services</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 10px 16px; font-size: 12px; color: #64748b; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">Service</th>
              <th style="padding: 10px 16px; font-size: 12px; color: #64748b; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
              <th style="padding: 10px 16px; font-size: 12px; color: #64748b; text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0f172a;">Total</td>
              <td style="padding: 12px 16px; font-size: 16px; font-weight: 800; color: #10b981; text-align: right;">${formatAmount(data.totalAmountCents)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;

    const result = await client.emails.send({
      from: fromEmail || "AI Powered Sites <onboarding@resend.dev>",
      to: ["hello@aipoweredsites.com"],
      subject: `[New Project] ${data.quoteNumber} - ${data.customerName} submitted requirements`,
      html,
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send requirements email" };
  }
}

export async function sendConversationNotificationToAdmin(data: {
  visitorName: string;
  visitorEmail: string;
  subject: string;
  message: string;
  conversationId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #0f0f1a; border-radius: 12px 12px 0 0; padding: 28px 32px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700;">New Message</h2>
      <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">From ${data.visitorName} (${data.visitorEmail})</p>
    </div>
    <div style="background: #ffffff; border-radius: 0 0 12px 12px; padding: 28px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
      <p style="margin: 0 0 6px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Subject</p>
      <p style="margin: 0 0 20px; font-size: 15px; color: #0f172a; font-weight: 600;">${data.subject}</p>
      <p style="margin: 0 0 6px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Message</p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${data.message}</p>
      <a href="${getSiteUrl()}/admin/conversations" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">View in Dashboard</a>
    </div>
  </div>
</body>
</html>`;
    const result = await client.emails.send({
      from: fromEmail || "AI Powered Sites <onboarding@resend.dev>",
      to: ["hello@aipoweredsites.com"],
      subject: `[New Message] ${data.subject} — from ${data.visitorName}`,
      html,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send notification" };
  }
}

export async function sendConversationReplyToVisitor(data: {
  visitorName: string;
  visitorEmail: string;
  subject: string;
  message: string;
  conversationToken: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const baseUrl = getSiteUrl();
    const conversationUrl = `${baseUrl}/conversation/${data.conversationToken}`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #0f0f1a; border-radius: 12px 12px 0 0; padding: 28px 32px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700;">AI Powered Sites</h2>
      <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">You have a new reply</p>
    </div>
    <div style="background: #ffffff; border-radius: 0 0 12px 12px; padding: 28px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
      <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6;">Hi ${data.visitorName},</p>
      <p style="margin: 0 0 20px; font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${data.message}</p>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
        <a href="${conversationUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">View Conversation</a>
        <p style="margin: 12px 0 0; font-size: 12px; color: #94a3b8;">Re: ${data.subject}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
    const result = await client.emails.send({
      from: fromEmail || "AI Powered Sites <onboarding@resend.dev>",
      to: [data.visitorEmail],
      subject: `Re: ${data.subject} — AI Powered Sites`,
      html,
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send reply email" };
  }
}

export async function sendAuditReportEmail(to: string, url: string, score: number, grade: string, pdfBuffer: Buffer): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const siteUrl = getSiteUrl();

    const gradeColor = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
    const gradeBg = score >= 75 ? '#0f291a' : score >= 50 ? '#291f0a' : '#2d0f0f';
    const issueCount = score < 75 ? `${Math.round((100 - score) / 5)}+` : 'a few';
    const urgency = score < 50
      ? 'Your site has critical issues that are likely costing you customers right now.'
      : score < 75
      ? 'We found several opportunities that could significantly improve your results.'
      : 'Your site is in good shape — a few tweaks could make it even stronger.';

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0;">
        <div style="background: #3b82f6; height: 4px;"></div>
        <div style="padding: 40px 30px 20px; text-align: center;">
          <p style="color: #3b82f6; font-weight: 700; font-size: 11px; letter-spacing: 2px; margin: 0 0 20px;">AI POWERED SITES</p>
          <h1 style="color: #ffffff; margin: 0 0 6px; font-size: 26px; font-weight: 700;">Your Website Audit Report</h1>
          <p style="color: #64748b; margin: 0; font-size: 13px;">for <strong style="color: #3b82f6;">${url}</strong></p>
        </div>

        <div style="padding: 0 30px 30px; text-align: center;">
          <div style="display: inline-block; background: ${gradeBg}; border: 2px solid ${gradeColor}; border-radius: 16px; padding: 20px 40px; margin: 10px 0 20px;">
            <div style="font-size: 48px; font-weight: 800; color: ${gradeColor}; line-height: 1;">${grade}</div>
            <div style="font-size: 14px; color: #94a3b8; margin-top: 4px;">${score} out of 100</div>
          </div>

          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.7; margin: 0 0 8px;">
            ${urgency}
          </p>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
            We found <strong style="color: #ffffff;">${issueCount} areas for improvement</strong> across SEO, performance, security, and more. Your full report is attached as a PDF.
          </p>
        </div>

        <div style="padding: 0 30px 20px;">
          <div style="background: #1e293b; border-radius: 12px; padding: 20px 24px;">
            <p style="color: #ffffff; font-weight: 700; font-size: 14px; margin: 0 0 12px;">What's inside your report:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #22c55e; font-size: 13px; width: 20px;">✓</td><td style="padding: 6px 0; color: #cbd5e1; font-size: 13px;">Detailed scoring across 9 categories</td></tr>
              <tr><td style="padding: 6px 0; color: #22c55e; font-size: 13px;">✓</td><td style="padding: 6px 0; color: #cbd5e1; font-size: 13px;">"Why This Matters" business impact for each issue</td></tr>
              <tr><td style="padding: 6px 0; color: #22c55e; font-size: 13px;">✓</td><td style="padding: 6px 0; color: #cbd5e1; font-size: 13px;">Step-by-step recommendations to fix problems</td></tr>
              <tr><td style="padding: 6px 0; color: #22c55e; font-size: 13px;">✓</td><td style="padding: 6px 0; color: #cbd5e1; font-size: 13px;">Keyword analysis & search visibility insights</td></tr>
              <tr><td style="padding: 6px 0; color: #22c55e; font-size: 13px;">✓</td><td style="padding: 6px 0; color: #cbd5e1; font-size: 13px;">Priority action items ranked by impact</td></tr>
            </table>
          </div>
        </div>

        <div style="padding: 10px 30px 30px; text-align: center;">
          <p style="color: #ffffff; font-weight: 600; font-size: 16px; margin: 0 0 8px;">Need help implementing the fixes?</p>
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px;">Most clients see measurable improvements within the first week.</p>
          <a href="${siteUrl}" style="display: inline-block; padding: 14px 36px; background: #3b82f6; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px;">Get a Free Consultation</a>
          <p style="color: #475569; font-size: 11px; margin-top: 12px;">No obligation · Fixed pricing · Results guaranteed</p>
        </div>

        <div style="background: #1e293b; padding: 20px 30px; text-align: center;">
          <p style="color: #475569; font-size: 11px; margin: 0;">
            © AI Powered Sites · <a href="${siteUrl}" style="color: #3b82f6; text-decoration: none;">aipoweredsites.com</a> · hello@aipoweredsites.com
          </p>
        </div>
      </div>
    `;

    const result = await client.emails.send({
      from: fromEmail,
      to,
      subject: `Your Website Audit Report — Score: ${score}/100 (${grade})`,
      html,
      attachments: [
        {
          filename: 'website-audit-report.pdf',
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to send audit email" };
  }
}

export async function addNewsletterContact(data: { email: string; firstName?: string; lastName?: string }): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const { client } = await getResendClient();
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      return { success: false, error: "Newsletter audience not configured" };
    }
    const result = await client.contacts.create({
      audienceId,
      email: data.email,
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
      unsubscribed: false,
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, contactId: result.data?.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add contact" };
  }
}
