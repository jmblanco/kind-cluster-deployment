FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "src/index.js"]
