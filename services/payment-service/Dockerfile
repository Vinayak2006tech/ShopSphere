FROM node:20-alpine AS builder

WORKDIR /app

# Build shared package
COPY shared/package*.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Build Payment service
WORKDIR /app/services/payment-service
COPY services/payment-service/package*.json ./
RUN npm install
COPY services/payment-service/tsconfig.json ./
COPY services/payment-service/src ./src
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/payment-service/package*.json ./services/payment-service/
COPY --from=builder /app/services/payment-service/node_modules ./services/payment-service/node_modules
COPY --from=builder /app/services/payment-service/dist ./services/payment-service/dist

WORKDIR /app/services/payment-service
EXPOSE 5004

CMD ["node", "dist/index.js"]
