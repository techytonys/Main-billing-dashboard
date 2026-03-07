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
- **Client Portal**: A secure, token-based public portal (`/portal/:token`) for clients to view invoices, make payments via Stripe, manage payment methods, accept payment plans, view project progress, access a knowledge base, provision Linode servers, and complete onboarding questionnaires.
- **Client Onboarding Questionnaires**: Customizable intake forms built by admin at `/admin/onboarding`. Supports 6 field types (text, textarea, select, checkbox, radio, file_upload) with drag-to-reorder, required toggles, and default questionnaire designation. Clients fill out forms in the portal's "Onboarding" tab. Admin can review and mark responses as reviewed. Backed by `onboarding_questionnaires` and `onboarding_responses` DB tables.
- **Communication Systems**: Secure client onboarding conversations, notification system within the client portal, and a Q&A system.
- **Lead Generation**: Admin-only tool utilizing Google Places API for prospecting local businesses, including AI-powered email guessing, website auditing, one-click outreach email sending via Resend with 4 pre-built templates (Cold Intro, Audit Follow-up, No Website Pitch, Follow-up), "No Website" hot lead highlighting, 40+ business type categories, and auto-status tracking when emails are sent.
- **Directory Submissions**: Admin tool to track SEO directory submissions across 50+ major directories (Google Business, Yelp, Clutch, etc.) with bulk load, status tracking (pending/submitted/skipped), category filtering, priority badges, quick-copy business info section, and custom directory support. Page at `/admin/directories`.
- **Content Creator**: AI-powered social media content generator supporting 8 platforms (Instagram, Facebook, TikTok, YouTube, X/Twitter, LinkedIn, Pinterest, Threads) with content types (post, reel, story, carousel, short, video, thread, article, pin). Generates full content with hooks, hashtags, keywords, call-to-action, best posting time, and engagement tips. Video/reel content includes scene-by-scene scripts with music mood. Carousel content includes slide-by-slide breakdown. One-click copy and share. Pro tips generator. 15 built-in topic ideas. Admin page at `/admin/content-creator`.
- **AI-Powered Audit Reports**: Generates personalized PDF audit reports with business impact explanations and recommendations using OpenAI's `gpt-4o-mini`.
- **Deployment System**: Unified interface for multi-platform deployments (Netlify, Vercel, Railway) with GitHub integration for auto-deploys and deploy history.
- **Server Provisioning**: Linode API integration for one-click server provisioning with billing markups. Includes **WordPress one-click provisioning** with Caddy (auto-SSL), MariaDB, PHP 8.3, and WP-CLI. WordPress installs in the background and sends push notification + email when ready. Server cards show WordPress status (installing/ready) with direct links to site and wp-admin.
- **DNS Management**: Linode DNS Manager API integration. Clients can add domains, create DNS zones, manage A/AAAA/CNAME/MX/TXT/NS/SRV records, and view Linode nameservers (ns1-ns5.linode.com). DNS zones auto-link to servers with A records for root and www. Stored in `dns_zones` table.
- **Git Code Backup**: Admin-enabled GitHub integration for project code backups with manual or automated scheduling.
- **Quote Management**: A comprehensive quote proposal system including a builder, email sending, client approval/denial, and discussion threads.
- **Web Push Notifications**: Browser-based push notifications using the Web Push API with VAPID authentication. Push subscriptions stored in `push_subscriptions` table. Built-in system events (new customer, invoice paid, project update, support ticket, payment received) automatically send web push notifications to all subscribed browsers. Service worker (`sw.js`) handles push events with notification display and click-to-open behavior.
- **Analytics System**: Full website analytics tracking with `analytics_page_views`, `analytics_events`, and `analytics_sessions` tables. Client-side tracker (`tracker.js`) handles page views, clicks, form submissions, UTM parameters, social platform detection (Facebook, Instagram, TikTok, etc.), session management. Admin dashboard at `/admin/analytics` with stats, daily charts, social media breakdown, traffic sources, top pages, events, devices, browsers, and embeddable script.
- **Link Tracker**: Social media link tracking system using `tracked_links` and `tracked_link_clicks` tables. Create trackable short links per platform and content type (Reel, Story, Bio, Group Post, Pin, Tweet, etc.) for 12+ platforms. Public redirect at `/go/:slug` records clicks with device/browser/OS info, then redirects with UTM parameters. Admin dashboard at `/admin/link-tracker` with click stats, device breakdown, daily charts, and platform filtering.
- **SMS Messaging**: Twilio-ready SMS messaging system with `sms_subscribers`, `sms_events`, `sms_messages`, `sms_lists`, and `sms_list_members` tables. Subscriber management (active, unsubscribed, deleted states with soft/hard delete). 8 pre-configured system event triggers (community signup, invoice created, payment received, payment plan started, project update, support reply, invoice overdue, quote ready). Custom event creation with message templates supporting variables ({{name}}, {{link}}, {{amount}}, etc.). Compose/broadcast messaging, message queue/log, and targeted sends to selected subscribers. **Contact Lists** for organizing subscribers into named, color-coded groups (like email lists but for phone numbers) with add/remove members, edit/delete lists, and send to entire list. **SMS Analytics** tab with delivery/open/click/unsubscribe rates, message volume charts, subscriber growth charts, and event performance breakdown. Admin dashboard at `/admin/sms`. Twilio integration pending — messages queue until connected.
- **Legal Pages**: Privacy Policy (`/privacy`) and Terms of Service (`/terms`) covering data collection, cookies, SMS/TCPA compliance, Stripe payments, analytics tracking, link tracking, AI audit tools, community rules, and data retention. Linked from landing page footer and SMS subscribe form.
- **API**: A well-defined RESTful API (`/api/*`) for all core functionalities, with a public API (`/api/v1/*`) for external integrations using API key authentication.
- **Client File Sharing**: Upload/download area in both admin projects page and client portal. Admin can share deliverables, design files, and brand assets with category tagging. Client can upload their own files. Files are organized by "Shared by You" (admin) and "Uploaded by Client" sections. Uses object storage for file persistence.
- **SEO Keyword Research & Rank Tracker**: Full keyword research tool at `/admin/seo-keywords` with Google Autocomplete suggestions (free, no API key), keyword tracking with position history, ranking change visualization (up/down arrows, point changes), ranking history charts, status management (tracking/saved/archived), bulk keyword add, tag support, and seed keyword suggestions. Uses `seo_keywords` and `seo_keyword_history` tables.
- **SEO Optimization**: Server-side meta tag injection for crawlers via `server/seo.ts`. Each public page (`/`, `/questions`, `/community`, `/help`, `/api/docs`, `/subscribe`, `/privacy`, `/terms`) gets unique title, description, canonical URL, and OG tags when accessed by search engines. Client-side `usePageMeta` hook updates meta tags for SPA navigation. Dynamic sitemap at `/sitemap.xml` includes Q&A pages. Comprehensive robots.txt with proper allow/disallow rules.
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