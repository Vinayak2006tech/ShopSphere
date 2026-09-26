import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AuthController } from './auth.controller';
import { initDatabase } from './db';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

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
app.get('/health', AuthController.health);

// Auth REST endpoints
app.post('/register', AuthController.register);
app.post('/login', AuthController.login);
app.post('/refresh', AuthController.refresh);
app.get('/verify-token', AuthController.verifyToken);
app.post('/verify-token', AuthController.verifyToken);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.path} not found on auth-service`,
  });
});

// Centralized Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled request error', {
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
    // Attempt DB connection with retries for container initialization
    let connected = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!connected && attempts < maxAttempts) {
      try {
        attempts++;
        await initDatabase();
        connected = true;
      } catch (err: any) {
        logger.warn(`Database connection attempt ${attempts}/${maxAttempts} failed: ${err.message}. Retrying in 3s...`);
        if (attempts >= maxAttempts) {
          logger.error('Max database connection attempts reached. Starting server anyway...');
          break;
        }
        await new Promise((res) => setTimeout(res, 3000));
      }
    }

    app.listen(PORT, () => {
      logger.info(`Auth Service is running on port ${PORT}`);
    });
  } catch (err: any) {
    logger.error('Failed to start Auth Service', { error: err.message });
    process.exit(1);
  }
}

startServer();
