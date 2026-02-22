FROM node:20-slim

WORKDIR /app

ENV PORT=5000
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm install --omit=dev --ignore-scripts --legacy-peer-deps 2>&1 | tail -3

COPY dist ./dist
COPY tsconfig.json drizzle.config.ts ./
COPY shared ./shared
COPY deploy/migrations ./deploy/migrations

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
