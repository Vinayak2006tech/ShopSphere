FROM node:20-alpine AS builder

WORKDIR /app

# Build shared package
COPY shared/package*.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Build Order service
WORKDIR /app/services/order-service
COPY services/order-service/package*.json ./
RUN npm install
COPY services/order-service/tsconfig.json ./
COPY services/order-service/src ./src
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/order-service/package*.json ./services/order-service/
COPY --from=builder /app/services/order-service/node_modules ./services/order-service/node_modules
COPY --from=builder /app/services/order-service/dist ./services/order-service/dist

WORKDIR /app/services/order-service
EXPOSE 5003

CMD ["node", "dist/index.js"]
