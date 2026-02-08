FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `npm run build` runs an env preflight. Provide safe placeholders at image build time.
ARG NEXTAUTH_URL=http://localhost:3000
ARG NEXTAUTH_SECRET=dummy_secret_for_build_only
ARG DATABASE_URL=postgresql://user:pass@localhost:5432/db?schema=public
ARG REDIS_URL=redis://localhost:6379
ENV NEXTAUTH_URL=$NEXTAUTH_URL \
  NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
  DATABASE_URL=$DATABASE_URL \
  REDIS_URL=$REDIS_URL

RUN npm run -s prisma:generate
RUN npm run -s build

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
  PORT=3000

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1001 nodejs

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

USER nodejs

EXPOSE 3000
CMD ["npm", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
