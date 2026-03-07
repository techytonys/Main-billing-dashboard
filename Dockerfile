FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update -qq && apt-get install -y --no-install-recommends build-essential python3 pkg-config libvips-dev && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps 2>&1 | tail -5

COPY tsconfig.json drizzle.config.ts vite.config.ts ./
COPY tailwind.config.ts postcss.config.js components.json ./
RUN mkdir -p attached_assets
COPY script ./script
COPY client ./client
COPY server ./server
COPY shared ./shared

RUN npm run build && echo "Build OK" && ls -la dist/

RUN npm prune --production --legacy-peer-deps 2>&1 | tail -3

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN apt-get update -qq && apt-get install -y --no-install-recommends curl ca-certificates libvips42 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/public ./client/public
COPY deploy/migrations ./deploy/migrations

RUN test -f dist/index.cjs && echo "Runtime binary verified" || (echo "FATAL: dist/index.cjs missing" && exit 1)
RUN test -d dist/public && echo "Static assets verified" || (echo "FATAL: dist/public missing" && exit 1)

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
