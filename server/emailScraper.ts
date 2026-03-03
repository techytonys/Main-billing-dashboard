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
  "noreply@",
  "no-reply@",
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
  "sentry-next.wixpress.com",
  "jquery.com",
  "bootstrapcdn.com",
  "fontawesome.com",
  "gstatic.com",
  "googletagmanager.com",
  "doubleclick.net",
  "hotjar.com",
  "hubspot.com",
  "mailchimp.com",
  "intercom.io",
  "zendesk.com",
  "crisp.chat",
  "tawk.to",
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
  ".map",
  ".ico",
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
  "/get-in-touch",
  "/reach-us",
  "/our-team",
  "/leadership",
  "/people",
  "/connect",
  "/inquire",
  "/footer",
  "/privacy",
  "/privacy-policy",
  "/legal",
  "/imprint",
  "/impressum",
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
  if (/^(wpadmin|admin|webmaster|postmaster|root|mailer-daemon|daemon)@/i.test(lower)) return false;

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
  timeoutMs: number = 10000,
): Promise<string | null> {
  try {
    if (!isUrlSafe(url)) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
    .replace(/\(dot\)/gi, ".")
    .replace(/ at /gi, "@")
    .replace(/ dot /gi, ".");

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

  const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdBlocks) {
    for (const block of jsonLdBlocks) {
      const content = block.replace(/<\/?script[^>]*>/gi, "");
      try {
        const data = JSON.parse(content);
        const extractFromObj = (obj: any) => {
          if (!obj || typeof obj !== "object") return;
          if (obj.email) {
            const e = String(obj.email).replace(/^mailto:/i, "").trim().toLowerCase();
            if (isValidEmail(e)) emails.add(e);
          }
          if (obj.contactPoint) {
            const points = Array.isArray(obj.contactPoint) ? obj.contactPoint : [obj.contactPoint];
            for (const p of points) {
              if (p?.email) {
                const e = String(p.email).replace(/^mailto:/i, "").trim().toLowerCase();
                if (isValidEmail(e)) emails.add(e);
              }
            }
          }
          if (obj.author?.email) {
            const e = String(obj.author.email).replace(/^mailto:/i, "").trim().toLowerCase();
            if (isValidEmail(e)) emails.add(e);
          }
        };
        if (Array.isArray(data)) data.forEach(extractFromObj);
        else extractFromObj(data);
      } catch {}
    }
  }

  const vcardMatches = decoded.match(/EMAIL[^:]*:([^\s<]+)/gi);
  if (vcardMatches) {
    for (const m of vcardMatches) {
      const email = m.split(":").pop()?.trim();
      if (email && isValidEmail(email)) emails.add(email.toLowerCase());
    }
  }

  const metaMatches = html.match(/<meta[^>]*content=["'][^"']*@[^"']*["'][^>]*>/gi);
  if (metaMatches) {
    for (const m of metaMatches) {
      const contentMatch = m.match(/content=["']([^"']+)["']/i);
      if (contentMatch) {
        const emailMatches = contentMatch[1].match(EMAIL_REGEX);
        if (emailMatches) {
          for (const email of emailMatches) {
            if (isValidEmail(email)) emails.add(email.toLowerCase());
          }
        }
      }
    }
  }

  return Array.from(emails);
}

function extractLinkedPages(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const hrefMatches = html.match(/href=["']([^"']+)["']/gi);
  if (!hrefMatches) return [];

  const contactKeywords = /contact|about|team|staff|people|leadership|get-in-touch|reach|connect|impressum|imprint/i;

  for (const match of hrefMatches) {
    const href = match.replace(/href=["']/i, "").replace(/["']$/, "");
    if (contactKeywords.test(href)) {
      try {
        const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
        if (isUrlSafe(fullUrl) && fullUrl.startsWith(baseUrl)) {
          links.add(fullUrl);
        }
      } catch {}
    }
  }

  return Array.from(links).slice(0, 5);
}

export interface HunterContact {
  email: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  department: string | null;
  confidence: number;
  type: "personal" | "generic";
  linkedin: string | null;
  twitter: string | null;
  phone: string | null;
}

export interface HunterResult {
  emails: string[];
  contacts: HunterContact[];
  emailPattern: string | null;
  organization: string | null;
  source: string;
}

const DECISION_MAKER_TITLES = [
  "owner", "founder", "co-founder", "ceo", "president", "principal",
  "director", "managing", "partner", "chief", "head", "vp",
  "vice president", "general manager", "gm", "proprietor",
];

function isDecisionMaker(position: string | null): boolean {
  if (!position) return false;
  const lower = position.toLowerCase();
  return DECISION_MAKER_TITLES.some(title => lower.includes(title));
}

async function searchHunterIo(domain: string): Promise<HunterResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return { emails: [], contacts: [], emailPattern: null, organization: null, source: "none" };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!response.ok) return { emails: [], contacts: [], emailPattern: null, organization: null, source: "none" };

    const data = await response.json();
    const emails: string[] = [];
    const contacts: HunterContact[] = [];

    const emailPattern = data.data?.pattern || null;
    const organization = data.data?.organization || null;

    if (data.data?.emails) {
      const decisionMakers: HunterContact[] = [];
      const otherContacts: HunterContact[] = [];

      for (const entry of data.data.emails) {
        if (entry.value && isValidEmail(entry.value)) {
          emails.push(entry.value.toLowerCase());

          const contact: HunterContact = {
            email: entry.value.toLowerCase(),
            firstName: entry.first_name || null,
            lastName: entry.last_name || null,
            position: entry.position || null,
            department: entry.department || null,
            confidence: entry.confidence || 0,
            type: entry.type || "generic",
            linkedin: entry.linkedin || null,
            twitter: entry.twitter || null,
            phone: entry.phone_number || null,
          };

          if (isDecisionMaker(contact.position)) {
            decisionMakers.push(contact);
          } else {
            otherContacts.push(contact);
          }
        }
      }

      contacts.push(
        ...decisionMakers.sort((a, b) => b.confidence - a.confidence),
        ...otherContacts.sort((a, b) => b.confidence - a.confidence),
      );
    }

    return {
      emails,
      contacts,
      emailPattern,
      organization,
      source: emails.length > 0 ? "hunter" : "none",
    };
  } catch {
    return { emails: [], contacts: [], emailPattern: null, organization: null, source: "none" };
  }
}

export async function findEmailByName(domain: string, firstName: string, lastName: string): Promise<HunterContact | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!response.ok) return null;

    const data = await response.json();
    if (data.data?.email && isValidEmail(data.data.email)) {
      return {
        email: data.data.email.toLowerCase(),
        firstName: data.data.first_name || firstName,
        lastName: data.data.last_name || lastName,
        position: data.data.position || null,
        department: data.data.department || null,
        confidence: data.data.score || 0,
        type: "personal",
        linkedin: data.data.linkedin || null,
        twitter: data.data.twitter || null,
        phone: data.data.phone_number || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function verifyEmailExists(email: string): Promise<boolean> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!response.ok) return false;

    const data = await response.json();
    return data.data?.result === "deliverable" || data.data?.result === "risky";
  } catch {
    return false;
  }
}

async function checkMxRecords(domain: string): Promise<boolean> {
  try {
    const { promises: dns } = await import("dns");
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

export interface ScrapeResult {
  scrapedEmails: string[];
  guessedEmails: string[];
  hunterEmails: string[];
  verifiedEmails: string[];
  hunterContacts: HunterContact[];
  emailPattern: string | null;
  organization: string | null;
  source: "scraped" | "guessed" | "hunter" | "verified" | "both" | "none";
  hasMx: boolean;
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

  const mxCheck = checkMxRecords(domain);

  for (const page of PAGES_TO_CHECK) {
    const url = `${baseUrl}${page}`;
    const html = await fetchPageSafe(url);
    if (html) {
      const found = extractEmailsFromHtml(html);
      for (const email of found) {
        allEmails.add(email);
      }

      if (page === "" && allEmails.size === 0) {
        const dynamicLinks = extractLinkedPages(html, baseUrl);
        for (const link of dynamicLinks) {
          if (!PAGES_TO_CHECK.some(p => link === `${baseUrl}${p}`)) {
            const subHtml = await fetchPageSafe(link);
            if (subHtml) {
              const subEmails = extractEmailsFromHtml(subHtml);
              for (const email of subEmails) {
                allEmails.add(email);
              }
            }
          }
        }
      }
    }
  }

  const facebookUrl = `${baseUrl}`.replace(/\/$/, "");
  const socialPages = ["/facebook", "/linkedin", "/yelp"];
  for (const page of socialPages) {
    if (allEmails.size > 0) break;
    const html = await fetchPageSafe(`${baseUrl}${page}`);
    if (html) {
      const found = extractEmailsFromHtml(html);
      for (const email of found) allEmails.add(email);
    }
  }

  const scrapedEmails = Array.from(allEmails);
  const guessedEmails = generateGuessedEmailList(domain);
  const hasMx = await mxCheck;

  let hunterEmails: string[] = [];
  let hunterContacts: HunterContact[] = [];
  let emailPattern: string | null = null;
  let organization: string | null = null;

  if (process.env.HUNTER_API_KEY) {
    const hunterResult = await searchHunterIo(domain);
    hunterEmails = hunterResult.emails;
    hunterContacts = hunterResult.contacts;
    emailPattern = hunterResult.emailPattern;
    organization = hunterResult.organization;
  }

  let verifiedEmails: string[] = [];
  if (scrapedEmails.length === 0 && hunterEmails.length === 0 && hasMx && process.env.HUNTER_API_KEY) {
    const topGuess = guessedEmails[0];
    if (topGuess) {
      const isValid = await verifyEmailExists(topGuess);
      if (isValid) {
        verifiedEmails = [topGuess];
      }
    }
  }

  let source: ScrapeResult["source"] = "none";
  if (scrapedEmails.length > 0) source = "scraped";
  else if (hunterEmails.length > 0) source = "hunter";
  else if (verifiedEmails.length > 0) source = "verified";
  else source = "guessed";

  return {
    scrapedEmails,
    guessedEmails: guessedEmails.filter(
      (e) => !scrapedEmails.includes(e) && !hunterEmails.includes(e),
    ),
    hunterEmails,
    verifiedEmails,
    hunterContacts,
    emailPattern,
    organization,
    source,
    hasMx,
  };
}

function generateGuessedEmailList(domain: string): string[] {
  const baseName = domain.split(".")[0];
  return [
    `info@${domain}`,
    `contact@${domain}`,
    `hello@${domain}`,
    `sales@${domain}`,
    `admin@${domain}`,
    `support@${domain}`,
    `office@${domain}`,
    `mail@${domain}`,
    `inquiries@${domain}`,
    `${baseName}@gmail.com`,
    `${baseName}@yahoo.com`,
    `${baseName}@outlook.com`,
  ];
}

function generateGuessedEmails(websiteUrl: string): ScrapeResult {
  try {
    const parsed = new URL(websiteUrl);
    const domain = parsed.hostname.replace(/^www\./, "");
    return {
      scrapedEmails: [],
      guessedEmails: generateGuessedEmailList(domain),
      hunterEmails: [],
      verifiedEmails: [],
      hunterContacts: [],
      emailPattern: null,
      organization: null,
      source: "guessed",
      hasMx: false,
    };
  } catch {
    return { scrapedEmails: [], guessedEmails: [], hunterEmails: [], verifiedEmails: [], hunterContacts: [], emailPattern: null, organization: null, source: "none", hasMx: false };
  }
}
