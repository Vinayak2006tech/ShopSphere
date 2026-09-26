import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ProductController } from './product.controller';
import { connectRabbitMQ } from './rabbitmq';
import { initRedis } from './redis';
import { seedProductsIfEmpty } from './seed';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopsphere_product';

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', ProductController.health);

// Product REST endpoints
app.get('/products', ProductController.getProducts);
app.get('/products/:id', ProductController.getProductById);
app.post('/products', ProductController.createProduct);
app.put('/products/:id', ProductController.updateProduct);
app.patch('/products/:id/stock', ProductController.updateStock);
app.delete('/products/:id', ProductController.deleteProduct);
app.get('/categories', ProductController.getCategories);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.path} not found on product-service`,
  });
});

// Centralized Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled product-service error', {
    error: err.message,
    statusCode: err.statusCode || 500,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

async function startServer() {
  try {
    // Connect to MongoDB with retry logic
    let mongoConnected = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!mongoConnected && attempts < maxAttempts) {
      try {
        attempts++;
        logger.info(`Connecting to MongoDB at ${MONGO_URI} (attempt ${attempts}/${maxAttempts})...`);
        await mongoose.connect(MONGO_URI);
        mongoConnected = true;
        logger.info('Connected to MongoDB successfully');
      } catch (err: any) {
        logger.warn(`MongoDB connection attempt ${attempts} failed: ${err.message}. Retrying in 3s...`);
        if (attempts >= maxAttempts) {
          logger.error('Max MongoDB connection attempts reached. Proceeding anyway...');
          break;
        }
        await new Promise((res) => setTimeout(res, 3000));
      }
    }

    if (mongoConnected) {
      // Seed products if catalog is empty
      await seedProductsIfEmpty();
    }

    // Initialize Redis cache connection
    initRedis();

    // Connect to RabbitMQ asynchronously in background
    connectRabbitMQ().catch((err) => {
      logger.warn('Initial RabbitMQ connection failed; will retry in background', { error: err.message });
    });

    app.listen(PORT, () => {
      logger.info(`Product Service is running on port ${PORT}`);
    });
  } catch (err: any) {
    logger.error('Failed to start Product Service', { error: err.message });
    process.exit(1);
  }
}

startServer();
