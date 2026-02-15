FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
COPY tsconfig.json drizzle.config.ts ./
COPY shared ./shared
RUN npm ci --omit=dev
RUN npm install --save drizzle-kit tsx

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
