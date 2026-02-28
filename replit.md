# Billing Hub - Web Design Business Dashboard

## Overview
Billing Hub is a project-based billing dashboard tailored for a website design business. It enables tracking of customers, projects, work deliverables, and the generation of invoices based on configurable per-unit rates. A key feature is the integrated client portal, allowing customers to view their invoices, manage payments, access project updates, and utilize self-service tools like a knowledge base and server provisioning. The system also includes automatic overdue invoice tracking, a lead generation tool, an AI-powered PDF audit report generator, and a multi-platform deployment system. The vision is to provide a comprehensive business management solution for web design agencies, streamlining operations from lead generation to project delivery and billing.

## User Preferences
- Clean, elegant, modern design ("super sexy, super clean, super elegant")
- Poppins font
- Icons throughout UI (lucide-react)
- Web design business context (pages designed, images created, revisions, etc.)
- Settings page should be beginner-friendly with step-by-step instructions

## System Architecture
The application features a modern full-stack architecture.
- **Frontend**: Developed with React, Vite, Tailwind CSS, and shadcn/ui for a highly responsive and visually appealing user interface.
- **Backend**: Powered by Express.js, interacting with a PostgreSQL database via the Drizzle ORM.
- **Font**: Poppins is used globally for a consistent and modern typographic style.
- **Routing**: `wouter` handles client-side routing, while Express manages API endpoints.

**Key Features and Implementations:**
- **Customer & Project Management**: Core CRUD operations for customers and projects, including unique portal links for clients.
- **Invoice Generation & Tracking**: Configurable billing rates, work entry logging, automated invoice generation from unbilled work, and overdue tracking.
- **Client Portal**: A secure, token-based public portal (`/portal/:token`) for clients to view invoices, make payments via Stripe, manage payment methods, accept payment plans, view project progress, access a knowledge base, and provision Linode servers.
- **Communication Systems**: Secure client onboarding conversations, notification system within the client portal, and a Q&A system.
- **Lead Generation**: Admin-only tool utilizing Google Places API for prospecting local businesses, including AI-powered email guessing and website auditing.
- **AI-Powered Audit Reports**: Generates personalized PDF audit reports with business impact explanations and recommendations using OpenAI's `gpt-4o-mini`.
- **Deployment System**: Unified interface for multi-platform deployments (Netlify, Vercel, Railway) with GitHub integration for auto-deploys and deploy history.
- **Server Provisioning**: Linode API integration for one-click server provisioning with billing markups.
- **Git Code Backup**: Admin-enabled GitHub integration for project code backups with manual or automated scheduling.
- **Quote Management**: A comprehensive quote proposal system including a builder, email sending, client approval/denial, and discussion threads.
- **Amazon SNS Notifications**: Admin interface for managing notification topics, subscribers (email/phone), and sending targeted or broadcast messages. Stores subscribers in PostgreSQL. AWS keys can be added later to enable actual SNS delivery. Features a fully custom trigger system: create your own triggers (e.g. "Contract Signed", "Website Launched"), assign them to topics, and fire them manually or have them fire automatically. Triggers are stored in `sns_triggers` table with name, slug, icon, and color. Topics store assigned trigger slugs in a comma-separated `triggers` column. The `triggerSnsEvent` function matches by slug against topic triggers. Built-in system triggers also exist for invoice/payment/project/support/customer events.
- **Web Push Notifications**: Browser-based push notifications using the Web Push API with VAPID authentication. Push subscriptions stored in `push_subscriptions` table. When SNS triggers fire, all subscribed browsers receive instant push notifications (even when the tab is closed). Admin "Web Push" tab on SNS Notifications page allows subscribing/unsubscribing the current browser, viewing all active subscriptions, and sending test pushes. Service worker (`sw.js`) handles push events with notification display and click-to-open behavior.
- **API**: A well-defined RESTful API (`/api/*`) for all core functionalities, with a public API (`/api/v1/*`) for external integrations using API key authentication.
- **UI/UX**: Emphasis on a clean, modern design with consistent use of icons (`lucide-react`) and beginner-friendly settings pages.

## External Dependencies
- **PostgreSQL**: Primary database for all application data, accessed via Drizzle ORM.
- **Stripe**: Payment gateway for invoice payments, recurring payment plans, and payment method management within the client portal.
- **Resend**: Email service for sending invoices, portal welcome emails, support ticket notifications, and managing inbound email webhooks.
- **OpenAI**: Utilized for AI-powered PDF audit reports (specifically `gpt-4o-mini`).
- **Google Places API**: Used in the Lead Generator tool for local business prospecting.
- **GitHub**: Integration for Git code backups and linking repositories for deployment platforms.
- **Linode API**: For server provisioning directly from the admin and client portals.
- **Netlify**: Deployment platform integration.
- **Vercel**: Deployment platform integration.
- **Railway**: Deployment platform integration.
- **Notion API**: Used for syncing Knowledge Base articles.