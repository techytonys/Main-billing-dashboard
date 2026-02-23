import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { WebhookHandlers } from "./webhookHandlers";
import * as fs from "fs";

const port = parseInt(process.env.PORT || "5000", 10);
const portHex = port.toString(16).toUpperCase().padStart(4, '0');
try {
  const tcpData = fs.readFileSync('/proc/net/tcp', 'utf8');
  const inodes = new Set<string>();
  for (const line of tcpData.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts[1]?.endsWith(':' + portHex) && parts[3] === '0A') {
      inodes.add(parts[9]);
    }
  }
  if (inodes.size > 0) {
    const myPid = String(process.pid);
    const pids = fs.readdirSync('/proc').filter(d => /^\d+$/.test(d) && d !== myPid);
    for (const pid of pids) {
      try {
        const fds = fs.readdirSync(`/proc/${pid}/fd`);
        for (const fd of fds) {
          try {
            const link = fs.readlinkSync(`/proc/${pid}/fd/${fd}`);
            for (const inode of inodes) {
              if (link === `socket:[${inode}]`) {
                process.kill(Number(pid), 'SIGKILL');
                console.log(`Killed stale process ${pid} holding port ${port}`);
              }
            }
          } catch {}
        }
      } catch {}
    }
    const { execSync } = require("child_process");
    try { execSync("sleep 1"); } catch {}
  }
} catch {}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Stripe webhook route MUST be registered BEFORE express.json()
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

import cookieParser from "cookie-parser";
app.use(cookieParser());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { ensureTables } = await import("./db");
  await ensureTables();

  const { seedDatabase } = await import("./seed");

  // Initialize Stripe
  try {
    const usingDirectKeys = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);

    if (usingDirectKeys) {
      log("Using direct Stripe API keys", "stripe");
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const bal = await stripe.balance.retrieve();
      log(`Stripe connected successfully (balance available: ${bal.available?.length ?? 0} currencies)`, "stripe");
    } else {
      const { runMigrations } = await import("stripe-replit-sync");
      const { getStripeSync } = await import("./stripeClient");

      await runMigrations({ databaseUrl: process.env.DATABASE_URL! });
      log("Stripe schema ready", "stripe");

      const stripeSync = await getStripeSync();

      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
      if (replitDomain) {
        try {
          const webhookBaseUrl = `https://${replitDomain}`;
          const result = await stripeSync.findOrCreateManagedWebhook(
            `${webhookBaseUrl}/api/stripe/webhook`
          );
          log(`Webhook configured: ${result?.webhook?.url ?? 'pending'}`, "stripe");
        } catch (whErr) {
          log("Webhook setup deferred — will configure on first request", "stripe");
        }
      } else {
        log("REPLIT_DOMAINS not set, skipping webhook setup", "stripe");
      }

      stripeSync.syncBackfill()
        .then(() => log("Stripe data synced", "stripe"))
        .catch((err: any) => console.error("Error syncing Stripe data:", err));
    }
  } catch (err: any) {
    log(`Stripe init warning: ${err.message}`, "stripe");
  }

  await setupAuth(app);
  registerAuthRoutes(app);

  // Seed disabled — clean slate
  // await seedDatabase();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
