import type { Request, Response, NextFunction } from "express";

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
}

const SITE = "https://aipoweredsites.com";
const SITE_NAME = "AI Powered Sites";
const OG_IMAGE = `${SITE}/images/og-cover.png`;

const PAGE_META: Record<string, PageMeta> = {
  "/": {
    title: "AI Web Design Agency — Custom AI-Powered Websites & Web Development | AI Powered Sites",
    description: "AI web design agency offering custom website development, community forums, backend systems, Docker deployment, and support portals. Affordable AI-powered web development for small businesses and startups.",
    canonical: SITE,
    ogType: "website",
  },
  "/questions": {
    title: "Q&A — Get Answers About Web Design & Development | AI Powered Sites",
    description: "Ask questions and get expert answers about web design, web development, AI-powered websites, SEO, hosting, and more from the AI Powered Sites community.",
    canonical: `${SITE}/questions`,
  },
  "/community": {
    title: "Community Forum — Connect with Web Designers & Developers | AI Powered Sites",
    description: "Join the AI Powered Sites community. Share ideas, ask questions, showcase projects, and connect with fellow web designers, developers, and business owners.",
    canonical: `${SITE}/community`,
  },
  "/help": {
    title: "Help Center — Guides, Tutorials & Support | AI Powered Sites",
    description: "Find answers in our help center. Browse knowledge base articles, tutorials, and guides about using AI Powered Sites services, client portal, billing, and more.",
    canonical: `${SITE}/help`,
  },
  "/api/docs": {
    title: "API Documentation — Developer Reference | AI Powered Sites",
    description: "Complete API documentation for AI Powered Sites. RESTful endpoints for customers, projects, invoices, work entries, and more. API key authentication with rate limiting.",
    canonical: `${SITE}/api/docs`,
  },
  "/subscribe": {
    title: "Subscribe to SMS Updates | AI Powered Sites",
    description: "Stay informed with SMS updates from AI Powered Sites. Get project updates, special offers, and important notifications delivered to your phone.",
    canonical: `${SITE}/subscribe`,
  },
  "/privacy": {
    title: "Privacy Policy | AI Powered Sites",
    description: "Read our privacy policy. Learn how AI Powered Sites collects, uses, and protects your personal data including analytics, cookies, SMS, and payment information.",
    canonical: `${SITE}/privacy`,
  },
  "/terms": {
    title: "Terms of Service | AI Powered Sites",
    description: "Review our terms of service. Understand the rules and guidelines for using AI Powered Sites services, client portal, community features, and API access.",
    canonical: `${SITE}/terms`,
  },
};

function isCrawler(userAgent: string): boolean {
  const crawlerPatterns = [
    "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider",
    "yandexbot", "sogou", "facebookexternalhit", "twitterbot",
    "linkedinbot", "whatsapp", "telegrambot", "discordbot",
    "pinterestbot", "redditbot", "applebot", "petalbot",
    "semrushbot", "ahrefsbot", "dotbot", "rogerbot",
    "embedly", "quora link preview", "outbrain", "vkshare",
    "w3c_validator", "lighthouse", "chrome-lighthouse",
  ];
  const ua = userAgent.toLowerCase();
  return crawlerPatterns.some(p => ua.includes(p));
}

export function seoMiddleware(req: Request, res: Response, next: NextFunction) {
  const ua = req.headers["user-agent"] || "";
  if (!isCrawler(ua)) return next();

  const urlPath = req.path;
  const meta = PAGE_META[urlPath];
  if (!meta) return next();

  const originalEnd = res.end.bind(res);
  (res as any).end = function(chunk: any, ...args: any[]) {
    if (chunk && res.getHeader("content-type")?.toString().includes("text/html")) {
      const html = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
      const modified = replaceMeta(html, meta);
      res.setHeader("content-length", Buffer.byteLength(modified));
      return originalEnd(modified, ...args);
    }
    return originalEnd(chunk, ...args);
  };
  next();
}

function replaceMeta(html: string, meta: PageMeta): string {

  let modified = html;

  modified = modified.replace(
    /<title>[^<]*<\/title>/,
    `<title>${meta.title}</title>`
  );

  modified = modified.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${meta.description}" />`
  );

  modified = modified.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${meta.canonical}" />`
  );

  modified = modified.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${meta.title}" />`
  );

  modified = modified.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${meta.description}" />`
  );

  modified = modified.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${meta.canonical}" />`
  );

  modified = modified.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${meta.title}" />`
  );

  modified = modified.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${meta.description}" />`
  );

  return modified;
}
