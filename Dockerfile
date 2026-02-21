FROM node:20 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps 2>&1 | tail -3

COPY . .
RUN NODE_ENV=production npm run build

FROM node:20-slim

WORKDIR /app

ENV PORT=5000
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/shared ./shared

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
