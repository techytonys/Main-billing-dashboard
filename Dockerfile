FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps 2>&1 | tail -5

COPY tsconfig.json drizzle.config.ts vite.config.ts ./
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY attached_assets ./attached_assets

ENV NODE_ENV=production
RUN npm run build

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts 2>&1 | tail -5

COPY --from=builder /app/dist ./dist
COPY deploy/migrations ./deploy/migrations

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
