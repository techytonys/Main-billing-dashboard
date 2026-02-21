const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const IGNORED_EMAILS = new Set([
  "example@example.com",
  "user@example.com",
  "email@example.com",
  "name@example.com",
  "info@example.com",
  "your@email.com",
  "youremail@email.com",
  "username@domain.com",
  "test@test.com",
]);

const IGNORED_DOMAINS = new Set([
  "sentry.io",
  "wixpress.com",
  "w3.org",
  "schema.org",
  "googleapis.com",
  "google.com",
  "facebook.com",
  "twitter.com",
  "instagram.com",
  "cloudflare.com",
  "wordpress.org",
  "wordpress.com",
  "gravatar.com",
  "wp.com",
  "squarespace.com",
  "shopify.com",
  "wix.com",
  "godaddy.com",
  "example.com",
  "domain.com",
  "email.com",
  "yourdomain.com",
]);

const IGNORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".css",
  ".js",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
]);

const PAGES_TO_CHECK = [
  "",
  "/contact",
  "/contact-us",
  "/about",
  "/about-us",
  "/team",
  "/staff",
  "/support",
  "/help",
  "/info",
];

function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase();

  if (IGNORED_EMAILS.has(lower)) return false;

  const domain = lower.split("@")[1];
  if (!domain) return false;
  if (IGNORED_DOMAINS.has(domain)) return false;

  if (Array.from(IGNORED_EXTENSIONS).some((ext) => lower.endsWith(ext))) return false;

  if (/^\d+@/.test(lower)) return false;
  if (lower.includes("..")) return false;
  if (lower.length > 100) return false;

  const localPart = lower.split("@")[0];
  if (localPart.length < 2) return false;

  if (/^[0-9a-f]{20,}@/.test(lower)) return false;

  return true;
}

function isUrlSafe(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return false;
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname === "::1") return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    if (hostname.startsWith("169.254.")) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchPageSafe(
  url: string,
  timeoutMs: number = 8000,
): Promise<string | null> {
  try {
    if (!isUrlSafe(url)) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null;
    }

    const text = await response.text();
    return text.slice(0, 500000);
  } catch {
    return null;
  }
}

function extractEmailsFromHtml(html: string): string[] {
  const emails = new Set<string>();

  const decoded = html
    .replace(/&#64;/g, "@")
    .replace(/&#x40;/g, "@")
    .replace(/\[at\]/gi, "@")
    .replace(/\(at\)/gi, "@")
    .replace(/\[dot\]/gi, ".")
    .replace(/\(dot\)/gi, ".");

  const mailtoMatches = decoded.match(/mailto:([^"'\s?&]+)/gi);
  if (mailtoMatches) {
    for (const m of mailtoMatches) {
      const email = m.replace(/^mailto:/i, "").trim();
      if (isValidEmail(email)) emails.add(email.toLowerCase());
    }
  }

  const allMatches = decoded.match(EMAIL_REGEX);
  if (allMatches) {
    for (const email of allMatches) {
      if (isValidEmail(email)) emails.add(email.toLowerCase());
    }
  }

  return Array.from(emails);
}

export interface ScrapeResult {
  scrapedEmails: string[];
  guessedEmails: string[];
  source: "scraped" | "guessed" | "both" | "none";
}

export async function scrapeEmailsFromWebsite(
  websiteUrl: string,
): Promise<ScrapeResult> {
  const allEmails = new Set<string>();

  let baseUrl: string;
  try {
    const parsed = new URL(websiteUrl);
    baseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return generateGuessedEmails(websiteUrl);
  }

  const domain = new URL(baseUrl).hostname.replace(/^www\./, "");

  for (const page of PAGES_TO_CHECK) {
    const url = `${baseUrl}${page}`;
    const html = await fetchPageSafe(url);
    if (html) {
      const found = extractEmailsFromHtml(html);
      for (const email of found) {
        allEmails.add(email);
      }
    }
  }

  const scrapedEmails = Array.from(allEmails);
  const guessedEmails = generateGuessedEmailList(domain);

  if (scrapedEmails.length > 0) {
    return {
      scrapedEmails,
      guessedEmails: guessedEmails.filter(
        (e) => !scrapedEmails.includes(e),
      ),
      source: "scraped",
    };
  }

  return {
    scrapedEmails: [],
    guessedEmails,
    source: "guessed",
  };
}

function generateGuessedEmailList(domain: string): string[] {
  const baseName = domain.split(".")[0];
  return [
    `info@${domain}`,
    `contact@${domain}`,
    `hello@${domain}`,
    `${baseName}@gmail.com`,
  ];
}

function generateGuessedEmails(websiteUrl: string): ScrapeResult {
  try {
    const parsed = new URL(websiteUrl);
    const domain = parsed.hostname.replace(/^www\./, "");
    return {
      scrapedEmails: [],
      guessedEmails: generateGuessedEmailList(domain),
      source: "guessed",
    };
  } catch {
    return { scrapedEmails: [], guessedEmails: [], source: "none" };
  }
}
