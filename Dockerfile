FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --ignore-scripts --no-optional 2>&1 | tail -5

COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV PORT=5000
ENV NODE_ENV=production

COPY package.json package-lock.json tsconfig.json drizzle.config.ts ./
COPY shared ./shared
RUN npm install --omit=dev --ignore-scripts --no-optional 2>&1 | tail -5

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
