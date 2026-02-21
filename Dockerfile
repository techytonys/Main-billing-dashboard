FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild

COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV PORT=5000
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.json drizzle.config.ts ./
COPY shared ./shared
RUN npm ci --omit=dev && npm cache clean --force

RUN apt-get purge -y python3 make g++ && apt-get autoremove -y

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
