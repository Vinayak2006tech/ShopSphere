import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from './product.model';
import { publishStockUpdated, isRabbitMQConnected } from './rabbitmq';
import { getCached, setCached, invalidateCachePattern, isRedisReady } from './redis';
import { logger } from './logger';

export class ProductController {
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, search, minPrice, maxPrice, sort, featured, page = '1', limit = '20' } = req.query;

      // Construct a unique deterministic cache key from query params
      const cacheKey = `products:list:${JSON.stringify({
        category,
        search,
        minPrice,
        maxPrice,
        sort,
        featured,
        page,
        limit,
      })}`;

      const cached = await getCached<any>(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }

      const query: any = {};

      if (category && typeof category === 'string' && category !== 'All') {
        query.category = category;
      }

      if (featured === 'true') {
        query.featured = true;
      }

      if (search && typeof search === 'string') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ];
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }

      let sortOption: any = { createdAt: -1 };
      if (sort === 'price-asc') sortOption = { price: 1 };
      else if (sort === 'price-desc') sortOption = { price: -1 };
      else if (sort === 'rating') sortOption = { rating: -1 };
      else if (sort === 'name') sortOption = { name: 1 };

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.max(1, parseInt(limit as string, 10));
      const skip = (pageNum - 1) * limitNum;

      const [products, total] = await Promise.all([
        Product.find(query).sort(sortOption).skip(skip).limit(limitNum),
        Product.countDocuments(query),
      ]);

      const responsePayload = {
        success: true,
        data: {
          products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      };

      // Cache for 2 minutes (120s)
      await setCached(cacheKey, responsePayload, 120);

      res.setHeader('X-Cache', 'MISS');
      return res.status(200).json(responsePayload);
    } catch (err) {
      next(err);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cacheKey = `products:detail:${id}`;

      const cached = await getCached<any>(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }

      let product = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        product = await Product.findById(id);
      }
      if (!product) {
        product = await Product.findOne({ slug: id });
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Product with id or slug '${id}' not found`,
        });
      }

      const responsePayload = {
        success: true,
        data: product,
      };

      // Cache for 5 minutes (300s)
      await setCached(cacheKey, responsePayload, 300);

      res.setHeader('X-Cache', 'MISS');
      return res.status(200).json(responsePayload);
    } catch (err) {
      next(err);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const cacheKey = 'products:categories';
      const cached = await getCached<any>(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }

      const categories = await Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { name: '$_id', count: 1, _id: 0 } },
        { $sort: { name: 1 } },
      ]);

      const responsePayload = {
        success: true,
        data: categories,
      };

      await setCached(cacheKey, responsePayload, 600);

      res.setHeader('X-Cache', 'MISS');
      return res.status(200).json(responsePayload);
    } catch (err) {
      next(err);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, price, category, stock, description, images, attributes, featured } = req.body;
      if (!name || price === undefined || !category || !description) {
        return res.status(400).json({
          success: false,
          error: 'Name, price, category, and description are required',
        });
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString(36);

      const product = await Product.create({
        name,
        slug,
        description,
        price,
        category,
        stock: stock || 0,
        images: images || [],
        attributes: attributes || {},
        featured: !!featured,
      });

      // Invalidate cache
      await invalidateCachePattern('products:*');

      logger.info(`Product created: ${product.name} (${product.id})`);
      return res.status(201).json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Product with id '${id}' not found`,
        });
      }

      // Invalidate cache
      await invalidateCachePattern('products:*');

      logger.info(`Product updated: ${product.name} (${product.id})`);
      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantity, reason = 'MANUAL_ADJUSTMENT', orderId } = req.body;

      if (quantity === undefined || typeof quantity !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Valid numeric quantity change is required',
        });
      }

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Product with id '${id}' not found`,
        });
      }

      const previousStock = product.stock;
      const currentStock = Math.max(0, previousStock + quantity);
      product.stock = currentStock;
      await product.save();

      // Invalidate cache
      await invalidateCachePattern('products:*');

      // Publish stock.updated event to RabbitMQ
      await publishStockUpdated({
        productId: product.id,
        currentStock,
        previousStock,
        changeReason: 'MANUAL_ADJUSTMENT',
        orderId,
      });

      logger.info(`Stock adjusted for product ${product.id}: ${previousStock} -> ${currentStock} (${quantity})`);

      return res.status(200).json({
        success: true,
        data: {
          productId: product.id,
          name: product.name,
          previousStock,
          currentStock,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await Product.findByIdAndDelete(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Product with id '${id}' not found`,
        });
      }

      // Invalidate cache
      await invalidateCachePattern('products:*');

      logger.info(`Product deleted: ${product.name} (${product.id})`);
      return res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async health(req: Request, res: Response) {
    const isMongoConnected = mongoose.connection.readyState === 1;
    const isRabbitConnected = isRabbitMQConnected();
    const isRedis = isRedisReady();

    const isHealthy = isMongoConnected;
    const statusCode = isHealthy ? 200 : 503;

    return res.status(statusCode).json({
      status: isHealthy ? 'UP' : 'DEGRADED',
      service: 'product-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: isMongoConnected ? 'HEALTHY' : 'UNHEALTHY',
        messageQueue: isRabbitConnected ? 'HEALTHY' : 'CONNECTING',
        cache: isRedis ? 'HEALTHY' : 'DEGRADED',
      },
    });
  }
}
