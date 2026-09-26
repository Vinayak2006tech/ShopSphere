import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { globalSearchIndex } from './search-index';
import { connectRabbitMQ, isRabbitMQConnected } from './rabbitmq';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5006;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002';

app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Full-text Search endpoint with Typo Tolerance, Facets, and Filters
app.get('/search', (req: Request, res: Response) => {
  const {
    q = '',
    category,
    minPrice,
    maxPrice,
    inStock,
    sort,
    limit = '20',
    offset = '0',
  } = req.query;

  const result = globalSearchIndex.search({
    query: q as string,
    category: category as string,
    minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    inStock: inStock === 'true',
    sort: sort as any,
    limit: parseInt(limit as string, 10),
    offset: parseInt(offset as string, 10),
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

// Autocomplete suggestions
app.get('/search/suggest', (req: Request, res: Response) => {
  const { q = '' } = req.query;
  const suggestions = globalSearchIndex.getSuggestions(q as string, 6);

  return res.status(200).json({
    success: true,
    data: {
      query: q,
      suggestions,
    },
  });
});

// Manual / Scheduled Index Resync
app.post('/search/sync', async (req: Request, res: Response) => {
  try {
    const count = await syncProductsFromCatalog();
    return res.status(200).json({
      success: true,
      message: `Successfully synchronized ${count} products into Search index`,
      indexedCount: globalSearchIndex.getCount(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Sync failed: ${err.message}`,
    });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'UP',
    service: 'search-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    indexedItems: globalSearchIndex.getCount(),
    dependencies: {
      messageQueue: isRabbitMQConnected() ? 'HEALTHY' : 'CONNECTING',
    },
  });
});

async function syncProductsFromCatalog(): Promise<number> {
  logger.info(`Syncing catalog products from ${PRODUCT_SERVICE_URL}/products...`);
  const response = await fetch(`${PRODUCT_SERVICE_URL}/products?limit=500`);
  if (!response.ok) {
    throw new Error(`Product service returned ${response.status}`);
  }

  const json: any = await response.json();
  const products = json?.data?.products || [];

  for (const p of products) {
    globalSearchIndex.indexProduct({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      category: p.category,
      stock: p.stock,
      images: p.images || [],
      featured: p.featured,
      editorialTag: p.editorialTag,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
    });
  }

  logger.info(`Search index populated with ${products.length} products.`);
  return products.length;
}

async function startServer() {
  try {
    // Initial catalog synchronization
    setTimeout(async () => {
      try {
        await syncProductsFromCatalog();
      } catch (e: any) {
        logger.warn(`Initial search sync warning: ${e.message}. Will retry on demand.`);
      }
    }, 1500);

    // Connect to RabbitMQ event bus
    connectRabbitMQ().catch((err) => {
      logger.warn('Initial RabbitMQ connection failed for Search Service', { error: err.message });
    });

    app.listen(PORT, () => {
      logger.info(`ShopSphere Search Service running on port ${PORT}`);
    });
  } catch (err: any) {
    logger.error('Failed to start Search Service', { error: err.message });
    process.exit(1);
  }
}

startServer();
