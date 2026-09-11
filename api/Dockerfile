FROM node:22-alpine AS builder
RUN apk add --no-cache openssl openssl-dev
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production image ──────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

RUN addgroup -S dlr && adduser -S dlr -G dlr && \
    mkdir -p /app/uploads /app/backups && \
    chown -R dlr:dlr /app

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

USER dlr
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
