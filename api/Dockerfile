FROM node:22-alpine
RUN apk add --no-cache openssl openssl-dev
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
RUN ls dist/

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
