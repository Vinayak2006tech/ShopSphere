FROM node:20-alpine AS builder

WORKDIR /app

# Build shared package
COPY shared/package*.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Build product service
WORKDIR /app/services/product-service
COPY services/product-service/package*.json ./
RUN npm install
COPY services/product-service/tsconfig.json ./
COPY services/product-service/src ./src
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/product-service/package*.json ./services/product-service/
COPY --from=builder /app/services/product-service/node_modules ./services/product-service/node_modules
COPY --from=builder /app/services/product-service/dist ./services/product-service/dist

WORKDIR /app/services/product-service
EXPOSE 5002

CMD ["node", "dist/index.js"]
