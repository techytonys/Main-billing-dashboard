FROM node:20-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

WORKDIR /app
COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app
ENV PORT=5000
ENV NODE_ENV=production

COPY package.json package-lock.json tsconfig.json drizzle.config.ts ./
COPY shared ./shared
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 5000
CMD ["node", "dist/index.cjs"]
