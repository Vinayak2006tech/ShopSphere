import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectRabbitMQ, isRabbitMQConnected } from './rabbitmq';
import { initMailer } from './mailer';
import { NotificationLog } from './notification.model';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopsphere_notification';

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
app.get('/health', (req: Request, res: Response) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const isRabbitConnected = isRabbitMQConnected();

  const isHealthy = isMongoConnected;
  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: isHealthy ? 'UP' : 'DEGRADED',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      database: isMongoConnected ? 'HEALTHY' : 'UNHEALTHY',
      messageQueue: isRabbitConnected ? 'HEALTHY' : 'CONNECTING',
    },
  });
});

// Notification logs REST endpoints (helpful for inspecting email delivery & preview URLs)
app.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const recipient = req.query.recipient as string;
    const orderId = req.query.orderId as string;

    const query: any = {};
    if (recipient) query.recipientEmail = recipient;
    if (orderId) query.orderId = orderId;

    const logs = await NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/notifications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = await NotificationLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, error: 'Notification log not found' });
    }
    return res.status(200).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.path} not found on notification-service`,
  });
});

// Centralized Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled notification-service error', {
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
        logger.info('Notification Service connected to MongoDB successfully');
      } catch (err: any) {
        logger.warn(`MongoDB connection attempt ${attempts} failed: ${err.message}. Retrying in 3s...`);
        if (attempts >= maxAttempts) {
          logger.error('Max MongoDB connection attempts reached. Proceeding anyway...');
          break;
        }
        await new Promise((res) => setTimeout(res, 3000));
      }
    }

    // Initialize Mailer
    await initMailer();

    // Connect to RabbitMQ asynchronously in background
    connectRabbitMQ().catch((err) => {
      logger.warn('Initial RabbitMQ connection failed in Notification Service; will retry in background', {
        error: err.message,
      });
    });

    app.listen(PORT, () => {
      logger.info(`Notification Service is running on port ${PORT}`);
    });
  } catch (err: any) {
    logger.error('Failed to start Notification Service', { error: err.message });
    process.exit(1);
  }
}

startServer();
