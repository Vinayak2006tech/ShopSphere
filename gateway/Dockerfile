FROM node:20-alpine AS builder

WORKDIR /app

# Build shared package
COPY shared/package*.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Build Gateway
WORKDIR /app/gateway
COPY gateway/package*.json ./
RUN npm install
COPY gateway/tsconfig.json ./
COPY gateway/src ./src
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/gateway/package*.json ./gateway/
COPY --from=builder /app/gateway/node_modules ./gateway/node_modules
COPY --from=builder /app/gateway/dist ./gateway/dist

WORKDIR /app/gateway
EXPOSE 5000

CMD ["node", "dist/index.js"]
