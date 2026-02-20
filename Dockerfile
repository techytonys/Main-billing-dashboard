FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV PORT=5000

COPY package.json package-lock.json ./
COPY tsconfig.json drizzle.config.ts ./
COPY shared ./shared

RUN npm ci --ignore-scripts

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
