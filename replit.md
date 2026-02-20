# Billing Hub - Web Design Business Dashboard

## Overview
A project-based billing dashboard for a website design business. Track customers, projects, work deliverables, and generate invoices based on configurable per-unit rates. Includes a client portal for customers to view their invoices and automatic overdue invoice tracking.

## Recent Changes
- 2026-02-20: Added Git Code Backup system - admin enables backups per project, customer connects GitHub via OAuth from portal, admin selects repo/branch, manual push or autopilot (hourly/daily/weekly), backup history with commit SHAs, admin page at /admin/code-backups, client portal "Backups" tab
- 2026-02-20: Enhanced work entry management - edit existing work entries (type, qty, description), date picker for backdating entries, payment terms selector (Net 7/14/15/30/45/60/90) on invoice generation with due date preview
- 2026-02-20: Enhanced invoices page - status filter buttons (All/Draft/Pending/Paid/Overdue) with count badges, rich invoice detail dialog with project context, work breakdown table, line item totals
- 2026-02-15: Added client onboarding conversation system - visitors start secure conversations from landing page, back-and-forth messaging with admin, email notifications both ways via Resend, admin dashboard at /admin/conversations with reply/close/reopen, public conversation page at /conversation/:token with 10s auto-refresh
- 2026-02-14: Added Quote Proposal system - save quotes to DB, send via email with unique links (/quote/:token), customer approve/deny with comments, admin email notifications for responses, discussion thread on quotes
- 2026-02-13: Added Quote Builder page (/admin/quote-builder) - quick project cost estimator using billing rates, 4 project templates with suggested quantities, copy-to-clipboard quotes, estimation tips sidebar
- 2026-02-13: Added client file uploads and screenshot approval workflow (admin request approval, client approve/request revisions with notes, admin resubmit, admin view client files)
- 2026-02-13: Added client portal notification system - notification bell with dropdown, 5 event triggers (project_update, invoice_created, ticket_reply, screenshot_uploaded, payment_plan_created), email notifications via Resend, mark read/mark all read, 30s auto-refresh
- 2026-02-08: Added real-time project progress page (/progress/:projectId) - auto-generated shareable link, admin posts updates (milestones, deliverables, launches), clients see live timeline
- 2026-02-08: Added "Email Link" button on customer cards - sends portal welcome email with access link via Resend
- 2026-02-08: Added Preview Link feature - admin can set/edit/copy shareable preview URLs on projects, clients see "View Site Preview" link in portal
- 2026-02-08: Removed all tax calculations and display from invoices, emails, and client portal
- 2026-02-07: Added Stripe payment plans - admin creates installment plans from invoices, clients accept via portal, Stripe handles recurring collection
- 2026-02-07: Added Q&A system (Apache Answers-style) - public page at /questions, admin management at /admin/qa, visitors ask questions, admin answers
- 2026-02-07: Added Stripe payment method management in client portal (save/remove/set default cards via Setup Intents)
- 2026-02-07: Added inbound email webhook (POST /api/webhooks/resend/inbound) - creates tickets from emails to hello@aipoweredsites.com
- 2026-02-07: Quote form submissions now auto-create support tickets with customer find-or-create
- 2026-02-07: Added Stripe payment integration for client portal (Pay Now button, Checkout sessions)
- 2026-02-07: Added Replit Auth for admin routes, support ticket system with email notifications
- 2026-02-07: Added email invoice sending via Resend integration (send button on invoices page + detail dialog)
- 2026-02-07: Added client portal (public page clients access via unique link)
- 2026-02-07: Added overdue invoice tracking (auto-marks past-due invoices, alerts on dashboard)
- 2026-02-07: Built customer management, project tracking, work logging, invoice generation

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js with PostgreSQL (Drizzle ORM)
- **Font**: Poppins (configured via CSS custom properties)
- **Routing**: wouter for client-side, Express for API

### Key Files
- `shared/schema.ts` - Data models (customers with portalToken, projects, billing_rates, work_entries, invoices, invoice_line_items, payment_methods, qa_questions, payment_plans, agent_cost_entries, api_keys)
- `server/routes.ts` - API endpoints prefixed with `/api`
- `server/storage.ts` - Database storage layer with invoice generation and overdue tracking
- `server/seed.ts` - Demo seed data (web design clients, projects, work entries)
- `client/src/App.tsx` - Main app with sidebar layout + portal route (outside sidebar)
- `client/src/pages/` - Dashboard pages
- `client/src/pages/client-portal.tsx` - Public client portal page

### Pages
- `/` - Overview dashboard with stats, overdue alerts, recent invoices, active projects
- `/customers` - Customer management with portal link copy
- `/projects` - Project tracking with work logging and invoice generation
- `/invoices` - Invoice listing with overdue alerts, search, detail view
- `/billing-rates` - Configure per-unit pricing for work types + Agent Cost Tracker (log AI agent coding costs with auto-markup)
- `/payment-methods` - Saved payment method cards
- `/settings` - Step-by-step guide, notification settings, regional config
- `/portal/:token` - Public client portal (no sidebar, accessed by customers)
- `/questions` - Public Q&A page (community questions and answers)
- `/admin/quote-builder` - Quote Builder (estimate project costs, templates, copy quotes)
- `/admin/qa` - Admin Q&A management (answer questions, toggle visibility)
- `/admin/conversations` - Admin conversations dashboard (view all, reply, close/reopen)
- `/conversation/:token` - Public conversation page (secure token-based messaging)
- `/admin/api-keys` - Admin API key management (create, toggle, delete keys)
- `/api/docs` - Public API documentation page (beginner-friendly, interactive examples)

### API Endpoints
- `GET /api/dashboard/stats` - Dashboard summary (auto-marks overdue invoices)
- `GET/POST /api/customers` - Customer CRUD (includes portalToken)
- `GET /api/portal/:token` - Public client portal data (customer, invoices with line items, projects)
- `GET /api/overdue-invoices` - Fetch overdue invoices (auto-marks pending past-due)
- `GET/POST /api/projects` - Project CRUD (query: customerId)
- `GET/POST /api/billing-rates` - Billing rate CRUD
- `GET/POST /api/work-entries` - Work entry CRUD
- `GET /api/invoices` - Invoice listing
- `POST /api/invoices/generate` - Generate invoice from unbilled work
- `POST /api/invoices/:id/send` - Email invoice to customer via Resend
- `GET /api/payment-methods` - Payment methods
- `POST /api/webhooks/resend/inbound` - Inbound email webhook (creates tickets from emails)
- `POST /api/portal/:token/invoices/:invoiceId/pay` - Create Stripe checkout session for invoice payment
- `GET /api/portal/:token/payment-methods` - List saved payment methods (Stripe)
- `POST /api/portal/:token/setup-intent` - Create SetupIntent for adding new card
- `DELETE /api/portal/:token/payment-methods/:pmId` - Remove a payment method
- `POST /api/portal/:token/default-payment-method` - Set default payment method
- `GET/POST /api/support/tickets` - Support ticket CRUD
- `POST /api/portal/:token/tickets` - Client creates support ticket via portal
- `POST /api/quote-requests` - Quote form submission (also creates support ticket + customer)
- `GET/POST /api/quotes` - Admin quote proposal CRUD
- `GET /api/quotes/:id` - Admin quote detail with line items and comments
- `POST /api/quotes/:id/send` - Send quote to customer via email
- `DELETE /api/quotes/:id` - Delete a quote
- `POST /api/quotes/:id/comments` - Admin add comment to quote
- `GET /api/public/quotes/:token` - Public quote view (no auth)
- `POST /api/public/quotes/:token/respond` - Customer approve/deny quote
- `POST /api/public/quotes/:token/comments` - Customer add comment to quote
- `GET/PATCH/DELETE /api/qa/questions` - Admin Q&A CRUD
- `GET /api/public/qa/questions` - Public Q&A (public questions only)
- `POST /api/public/qa/questions` - Submit a new question (public)
- `GET /api/payment-plans` - Admin list all payment plans
- `POST /api/invoices/:id/payment-plan` - Admin create payment plan from invoice
- `DELETE /api/payment-plans/:id` - Admin cancel payment plan
- `GET /api/portal/:token/payment-plans` - Client view their payment plans
- `POST /api/portal/:token/payment-plans/:planId/accept` - Client accept and start payment plan via Stripe
- `GET /api/portal/:token/notifications` - Client notifications with unread count
- `PATCH /api/portal/:token/notifications/:id/read` - Mark single notification read
- `POST /api/portal/:token/notifications/read-all` - Mark all notifications read
- `GET/POST/DELETE /api/agent-costs` - Agent cost tracking CRUD (log AI coding costs with auto-markup)
- `GET /api/agent-costs/summary` - Agent cost summary with totals and per-project breakdown
- `POST /api/public/conversations` - Start a new conversation (public, no auth)
- `GET /api/public/conversations/:token` - Get conversation with messages (public, token-based)
- `POST /api/public/conversations/:token/messages` - Visitor sends a message (blocks if closed)
- `GET /api/conversations` - Admin list all conversations (auth required)
- `GET /api/conversations/:id` - Admin get conversation detail with messages
- `POST /api/conversations/:id/messages` - Admin reply to conversation
- `PATCH /api/conversations/:id` - Update conversation status (close/reopen)
- `GET/POST/PATCH/DELETE /api/api-keys` - Admin API key management (CRUD)
- `GET /api/v1/customers` - Public API: list customers (API key auth, read scope)
- `GET /api/v1/customers/:id` - Public API: get customer details
- `GET /api/v1/projects` - Public API: list projects (filter by customerId)
- `GET /api/v1/projects/:id` - Public API: get project details
- `GET /api/v1/projects/:id/updates` - Public API: get project progress updates
- `GET /api/v1/invoices` - Public API: list invoices (filter by status)
- `GET /api/v1/invoices/:id` - Public API: get invoice with line items
- `POST /api/v1/work-entries` - Public API: create work entry (write scope)

### Key Backend Files
- `server/email.ts` - Resend integration for sending invoice and ticket notification emails
- `server/stripeClient.ts` - Stripe client initialization and credential management
- `server/webhookHandlers.ts` - Stripe webhook processing via stripe-replit-sync

### Billing Flow
1. Create customers and projects
2. Configure billing rates (per page, per asset, per session, etc.)
3. Log work entries against projects (manual or via API)
4. Generate invoices from unbilled work entries
5. Email invoices to clients (auto-marks draft invoices as pending)
6. Share client portal link so clients can view invoices
7. System auto-marks invoices as overdue when past due date
8. Mark invoices as paid when payment received

## User Preferences
- Clean, elegant, modern design ("super sexy, super clean, super elegant")
- Poppins font
- Icons throughout UI (lucide-react)
- Web design business context (pages designed, images created, revisions, etc.)
- Settings page should be beginner-friendly with step-by-step instructions
