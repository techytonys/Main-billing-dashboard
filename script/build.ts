import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

const allowlist = [
  "@google/generative-ai",
  "@google-cloud/storage",
  "@notionhq/client",
  "@octokit/rest",
  "axios",
  "bcryptjs",
  "cheerio",
  "connect-pg-simple",
  "cookie-parser",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "google-auth-library",
  "jsonwebtoken",
  "memoizee",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "openid-client",
  "otpauth",
  "p-limit",
  "p-retry",
  "passport",
  "passport-local",
  "pg",
  "qrcode",
  "react",
  "react-dom",
  "resend",
  "stripe",
  "stripe-replit-sync",
  "uuid",
  "web-push",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

const alwaysExternal = [
  "pdfkit",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild({
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    logLevel: "info",
  });

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = [
    ...allDeps.filter((dep) => !allowlist.includes(dep)),
    ...alwaysExternal,
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
