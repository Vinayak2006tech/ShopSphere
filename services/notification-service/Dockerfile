FROM node:20-alpine AS builder

WORKDIR /app

# Build shared package
COPY shared/package*.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Build Notification service
WORKDIR /app/services/notification-service
COPY services/notification-service/package*.json ./
RUN npm install
COPY services/notification-service/tsconfig.json ./
COPY services/notification-service/src ./src
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/notification-service/package*.json ./services/notification-service/
COPY --from=builder /app/services/notification-service/node_modules ./services/notification-service/node_modules
COPY --from=builder /app/services/notification-service/dist ./services/notification-service/dist

WORKDIR /app/services/notification-service
EXPOSE 5005

CMD ["node", "dist/index.js"]
