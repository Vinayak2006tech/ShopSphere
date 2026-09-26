import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Review } from './review.model';
import { connectRabbitMQ, publishReviewCreated, isRabbitMQConnected } from './rabbitmq';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5008;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopsphere_review';

app.use(cors());
app.use(express.json());

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Create Review
app.post('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, rating, comment, title, orderId } = req.body;
    const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'guest_user';
    const userName = (req.headers['x-user-name'] as string)
      ? decodeURIComponent(req.headers['x-user-name'] as string)
      : req.body.userName || 'Artisan Collector';

    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        error: 'productId, rating (1-5), and comment are required',
      });
    }

    const numRating = Math.max(1, Math.min(5, Number(rating)));

    const review = await Review.create({
      productId,
      userId,
      userName,
      orderId,
      rating: numRating,
      title: title || '',
      comment,
      verifiedPurchase: true,
    });

    logger.info(`Review created for product ${productId} by user ${userName} with rating ${numRating}`);

    // Emit event for Product Service to recalculate aggregate ratings
    await publishReviewCreated({
      reviewId: review.id,
      productId,
      userId,
      userName,
      rating: numRating,
      comment,
    });

    return res.status(201).json({
      success: true,
      data: review,
    });
  } catch (err) {
    next(err);
  }
});

// Get Reviews for Product with Aggregated Summary
app.get('/reviews/product/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });

    const total = reviews.length;
    let averageRating = 5.0;
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (total > 0) {
      const sum = reviews.reduce((acc, r) => {
        const rounded = Math.round(r.rating);
        breakdown[rounded] = (breakdown[rounded] || 0) + 1;
        return acc + r.rating;
      }, 0);
      averageRating = Math.round((sum / total) * 10) / 10;
    }

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        stats: {
          total,
          averageRating,
          breakdown,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const isRabbitConnected = isRabbitMQConnected();

  return res.status(isMongoConnected ? 200 : 503).json({
    status: isMongoConnected ? 'UP' : 'DEGRADED',
    service: 'review-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      database: isMongoConnected ? 'HEALTHY' : 'UNHEALTHY',
      messageQueue: isRabbitConnected ? 'HEALTHY' : 'CONNECTING',
    },
  });
});

async function seedInitialReviewsIfEmpty() {
  const count = await Review.countDocuments();
  if (count > 0) return;

  logger.info('Seeding initial artisanal product reviews...');
  const sampleReviews = [
    {
      productId: '6ab7d0449cbac705295433ae',
      userId: 'user_artisan_1',
      userName: 'Julian Barnes',
      rating: 5,
      title: 'Flawless balance and spout control',
      comment: 'The unglazed terracotta exterior feels grounding in hand, and the flow rate when pouring warmed olive oil is seamless.',
      verifiedPurchase: true,
      helpfulVotes: 12,
    },
    {
      productId: '6ab7d0449cbac705295433ae',
      userId: 'user_artisan_2',
      userName: 'Camilla Thorne',
      rating: 5,
      title: 'A daily ritual staple',
      comment: 'Beautiful wood-kiln color variation. You can feel the artisan fingerprints gently on the handle. Exceptional.',
      verifiedPurchase: true,
      helpfulVotes: 8,
    },
    {
      productId: '6ab7d0449cbac705295433b1',
      userId: 'user_artisan_3',
      userName: 'Marcus Vance',
      rating: 5,
      title: 'Stunning walnut grain',
      comment: 'Heavier than expected in the best way. Holds my brass pen, watch, and keys without sliding on the table.',
      verifiedPurchase: true,
      helpfulVotes: 14,
    },
  ];

  await Review.insertMany(sampleReviews);
  logger.info(`Seeded ${sampleReviews.length} initial reviews.`);
}

async function startServer() {
  try {
    let mongoConnected = false;
    let attempts = 0;
    while (!mongoConnected && attempts < 10) {
      try {
        attempts++;
        await mongoose.connect(MONGO_URI);
        mongoConnected = true;
        logger.info(`Review Service connected to MongoDB at ${MONGO_URI}`);
      } catch (e: any) {
        logger.warn(`MongoDB retry ${attempts}: ${e.message}`);
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (mongoConnected) {
      await seedInitialReviewsIfEmpty();
    }

    connectRabbitMQ().catch((err) => {
      logger.warn('Initial RabbitMQ connection warning', { error: err.message });
    });

    app.listen(PORT, () => {
      logger.info(`ShopSphere Review Service running on port ${PORT}`);
    });
  } catch (err: any) {
    logger.error('Failed to start Review Service', { error: err.message });
    process.exit(1);
  }
}

startServer();
