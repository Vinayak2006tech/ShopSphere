FROM node:20-alpine AS builder

WORKDIR /app

# Build shared package
COPY shared/package*.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Build service
WORKDIR /app/services/auth-service
COPY services/auth-service/package*.json ./
RUN npm install
COPY services/auth-service/tsconfig.json ./
COPY services/auth-service/src ./src
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/shared ./shared
COPY --from=builder /app/services/auth-service/package*.json ./services/auth-service/
COPY --from=builder /app/services/auth-service/node_modules ./services/auth-service/node_modules
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist

WORKDIR /app/services/auth-service
EXPOSE 5001

CMD ["node", "dist/index.js"]
