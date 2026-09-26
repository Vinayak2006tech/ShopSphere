import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { optionalAuthMiddleware, requireAuthMiddleware } from './auth.middleware';
import { correlationMiddleware } from './correlation.middleware';
import { circuitBreakers } from './circuit-breaker';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:5003';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005';
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:5006';
const RECOMMENDATION_SERVICE_URL = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5007';
const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://localhost:5008';

// Global CORS setup
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-correlation-id',
      'x-user-id',
      'x-user-email',
      'x-user-role',
      'x-user-name',
    ],
    exposedHeaders: ['x-correlation-id'],
  })
);

// Global Rate Limiting: 5000 requests per 15 mins for development/demos
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Do not rate limit health checks
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

app.use(limiter);

// Correlation ID Tracking
app.use(correlationMiddleware);

// Request logging middleware with Correlation ID
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      `[Gateway] [CID:${req.correlationId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// Gateway Aggregated Health Check with Circuit Breaker statuses
app.get('/health', async (req: Request, res: Response) => {
  const checkService = async (name: string, url: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${url}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        return { status: 'UP', details: data };
      }
      return { status: 'DOWN', statusCode: response.status };
    } catch (err: any) {
      return { status: 'DOWN', error: err.message };
    }
  };

  const [auth, product, order, payment, notification, search, recommendation, review] = await Promise.all([
    checkService('auth-service', AUTH_SERVICE_URL),
    checkService('product-service', PRODUCT_SERVICE_URL),
    checkService('order-service', ORDER_SERVICE_URL),
    checkService('payment-service', PAYMENT_SERVICE_URL),
    checkService('notification-service', NOTIFICATION_SERVICE_URL),
    checkService('search-service', SEARCH_SERVICE_URL),
    checkService('recommendation-service', RECOMMENDATION_SERVICE_URL),
    checkService('review-service', REVIEW_SERVICE_URL),
  ]);

  const allUp =
    auth.status === 'UP' &&
    product.status === 'UP' &&
    order.status === 'UP' &&
    payment.status === 'UP' &&
    notification.status === 'UP' &&
    search.status === 'UP' &&
    recommendation.status === 'UP' &&
    review.status === 'UP';

  const breakers = Object.entries(circuitBreakers).reduce((acc, [key, breaker]) => {
    acc[key] = breaker.getStatus();
    return acc;
  }, {} as Record<string, any>);

  return res.status(allUp ? 200 : 207).json({
    status: allUp ? 'HEALTHY' : 'DEGRADED',
    gateway: 'ShopSphere API Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    correlationId: req.correlationId,
    services: {
      authService: auth,
      productService: product,
      orderService: order,
      paymentService: payment,
      notificationService: notification,
      searchService: search,
      recommendationService: recommendation,
      reviewService: review,
    },
    circuitBreakers: breakers,
  });
});

// Proxy error handler helper
const createErrorHandler = (serviceKey: string, serviceName: string) => (err: any, req: any, res: any) => {
  circuitBreakers[serviceKey]?.recordFailure();
  logger.error(`[CID:${req.correlationId}] Proxy error connecting to ${serviceName}`, {
    error: err.message,
    path: req.originalUrl,
  });
  if (!res.headersSent) {
    res.status(503).json({
      success: false,
      error: `Service Unavailable: ${serviceName} is temporarily unreachable or starting up.`,
      correlationId: req.correlationId,
      circuitState: circuitBreakers[serviceKey]?.getState(),
      details: err.message,
    });
  }
};

const attachProxyHeaders = (proxyReq: any, req: any) => {
  if (req.correlationId) {
    proxyReq.setHeader('x-correlation-id', req.correlationId);
  }
  if (req.user) {
    proxyReq.setHeader('x-user-id', req.user.id);
    proxyReq.setHeader('x-user-email', req.user.email);
    proxyReq.setHeader('x-user-role', req.user.role);
    if (req.user.name) {
      proxyReq.setHeader('x-user-name', encodeURIComponent(req.user.name));
    }
  }
};

// 1. Auth Service Routes
app.use(
  '/api/auth',
  circuitBreakers.auth.middleware(),
  optionalAuthMiddleware,
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
    on: {
      proxyReq: attachProxyHeaders,
      proxyRes: () => circuitBreakers.auth.recordSuccess(),
      error: createErrorHandler('auth', 'auth-service'),
    },
  })
);

// 2. Product Service Routes
app.use(
  '/api/products',
  circuitBreakers.product.middleware(),
  optionalAuthMiddleware,
  createProxyMiddleware({
    target: PRODUCT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/products${path === '/' ? '' : path}`,
    on: {
      proxyReq: attachProxyHeaders,
      proxyRes: () => circuitBreakers.product.recordSuccess(),
      error: createErrorHandler('product', 'product-service'),
    },
  })
);

app.use(
  '/api/categories',
  circuitBreakers.product.middleware(),
  optionalAuthMiddleware,
  createProxyMiddleware({
    target: PRODUCT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/categories${path === '/' ? '' : path}`,
    on: {
      proxyReq: attachProxyHeaders,
      proxyRes: () => circuitBreakers.product.recordSuccess(),
      error: createErrorHandler('product', 'product-service'),
    },
  })
);

// 3. Order Service Routes
app.use(
  '/api/orders',
  circuitBreakers.order.middleware(),
  requireAuthMiddleware,
  createProxyMiddleware({
    target: ORDER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/orders${path === '/' ? '' : path}`,
    on: {
      proxyReq: attachProxyHeaders,
      proxyRes: () => circuitBreakers.order.recordSuccess(),
      error: createErrorHandler('order', 'order-service'),
    },
  })
);

// 4. Payment Service Routes
app.use(
  '/api/payments',
  circuitBreakers.payment.middleware(),
  requireAuthMiddleware,
  createProxyMiddleware({
    target: PAYMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/payments${path === '/' ? '' : path}`,
    on: {
      proxyReq: attachProxyHeaders,
      proxyRes: () => circuitBreakers.payment.recordSuccess(),
      error: createErrorHandler('payment', 'payment-service'),
    },
  })
);

// 5. Notification Service Routes
app.use(
  '/api/notifications',
  circuitBreakers.notification.middleware(),
  optionalAuthMiddleware,
  createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/notifications${path === '/' ? '' : path}`,
    on: {
      proxyReq: attachProxyHeaders,
      proxyRes: () => circuitBreakers.notification.recordSuccess(),
      error: createErrorHandler('notification', 'notification-service'),
    },
  })
);

// 6. Search Service Routes
app.use(
  '/api/search',
  circuitBreakers.search.middleware(),
  optionalAuthMiddleware,
  createProxyMiddleware({
    target: SEARCH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/search${path === '/' ? '' : path}`,
    on: {
      proxyReq: attachProxyHeaders,
      proxyRes: () => circuitBreakers.search.recordSuccess(),
      error: createErrorHandler('search', 'search-service'),
    },
  })
);

// 7. Recommendation Service Routes (Python Polyglot Service)
app.use(
  '/api/recommendations',
  circuitBreakers.recommendation.middleware(),
  optionalAuthMiddleware,
  createProxyMiddleware({
    target: RECOMMENDATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/recommendations${path === '/' ? '' : path}`,
    on: {
      proxyReq: attachProxyHeaders,
      proxyRes: () => circuitBreakers.recommendation.recordSuccess(),
      error: createErrorHandler('recommendation', 'recommendation-service'),
    },
  })
);

// 8. Review & Rating Service Routes
app.use(
  '/api/reviews',
  circuitBreakers.review.middleware(),
  optionalAuthMiddleware,
  createProxyMiddleware({
    target: REVIEW_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/reviews${path === '/' ? '' : path}`,
    on: {
      proxyReq: attachProxyHeaders,
      proxyRes: () => circuitBreakers.review.recordSuccess(),
      error: createErrorHandler('review', 'review-service'),
    },
  })
);

// Fallback 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Gateway route ${req.method} ${req.path} not matched`,
    correlationId: req.correlationId,
  });
});

app.listen(PORT, () => {
  logger.info(`ShopSphere API Gateway is running on port ${PORT}`);
  logger.info(`Circuit Breaker protection active for all microservices.`);
});
