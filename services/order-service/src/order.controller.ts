import { Request, Response, NextFunction } from 'express';
import { pool } from './db';
import { publishOrderCreated, isRabbitMQConnected } from './rabbitmq';
import { logger } from './logger';
import { OrderItemPayload } from '@shopsphere/shared';

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002';

export class OrderController {
  static async createOrder(req: Request, res: Response, next: NextFunction) {
    const client = await pool.connect();
    try {
      const headerUserId = req.headers['x-user-id'] as string;
      const headerEmail = req.headers['x-user-email'] as string;
      const rawHeaderName = req.headers['x-user-name'] as string;
      const headerName = rawHeaderName ? decodeURIComponent(rawHeaderName) : undefined;

      const {
        userId = headerUserId,
        customerEmail = headerEmail,
        customerName = headerName || 'ShopSphere Customer',
        items,
        shippingAddress,
      } = req.body;

      if (!userId || !customerEmail) {
        return res.status(400).json({
          success: false,
          error: 'User ID and customer email are required to create an order',
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Order must contain at least one item',
        });
      }

      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
        return res.status(400).json({
          success: false,
          error: 'Valid shipping address is required',
        });
      }

      // Calculate total amount
      let totalAmount = 0;
      for (const item of items) {
        if (!item.productId || !item.productName || item.price === undefined || !item.quantity) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have productId, productName, price, and quantity',
          });
        }
        totalAmount += Number(item.price) * Number(item.quantity);
      }
      totalAmount = Math.round(totalAmount * 100) / 100;

      await client.query('BEGIN');

      // 1. Insert order
      const orderInsertRes = await client.query(
        `INSERT INTO orders (user_id, customer_email, customer_name, total_amount, status, shipping_address)
         VALUES ($1, $2, $3, $4, 'PENDING', $5)
         RETURNING *`,
        [userId, customerEmail, customerName, totalAmount, JSON.stringify(shippingAddress)]
      );

      const createdOrder = orderInsertRes.rows[0];

      // 2. Insert order items
      const insertedItems: OrderItemPayload[] = [];
      for (const item of items) {
        const itemRes = await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image_url)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [createdOrder.id, item.productId, item.productName, item.price, item.quantity, item.imageUrl || null]
        );
        insertedItems.push({
          productId: item.productId,
          productName: item.productName,
          price: Number(item.price),
          quantity: Number(item.quantity),
          imageUrl: item.imageUrl,
        });

        // Deduct inventory in product service (fire-and-forget / non-blocking)
        fetch(`${PRODUCT_SERVICE_URL}/products/${item.productId}/stock`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: -item.quantity,
            reason: 'ORDER_PLACED',
            orderId: createdOrder.id,
          }),
        }).catch((err) => {
          logger.warn(`Could not sync stock with product service for product ${item.productId}: ${err.message}`);
        });
      }

      await client.query('COMMIT');

      // 3. Publish order.created event to RabbitMQ
      await publishOrderCreated({
        orderId: createdOrder.id,
        userId: createdOrder.user_id,
        customerEmail: createdOrder.customer_email,
        customerName: createdOrder.customer_name,
        items: insertedItems,
        totalAmount: Number(createdOrder.total_amount),
        shippingAddress,
      });

      return res.status(201).json({
        success: true,
        message: 'Order created successfully and queued for payment processing',
        data: {
          ...createdOrder,
          items: insertedItems,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }

  static async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const headerUserId = req.headers['x-user-id'] as string;
      const headerRole = req.headers['x-user-role'] as string;

      let query = `
        SELECT o.*, 
               COALESCE(json_agg(
                 json_build_object(
                   'id', oi.id,
                   'productId', oi.product_id,
                   'productName', oi.product_name,
                   'price', oi.price,
                   'quantity', oi.quantity,
                   'imageUrl', oi.image_url
                 )
               ) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
      `;

      const params: any[] = [];
      if (headerRole !== 'admin' && headerUserId) {
        query += ` WHERE o.user_id = $1`;
        params.push(headerUserId);
      }

      query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

      const result = await pool.query(query, params);

      return res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT o.*, 
                COALESCE(json_agg(
                  json_build_object(
                    'id', oi.id,
                    'productId', oi.product_id,
                    'productName', oi.product_name,
                    'price', oi.price,
                    'quantity', oi.quantity,
                    'imageUrl', oi.image_url
                  )
                ) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.id = $1
         GROUP BY o.id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Order '${id}' not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrdersByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        `SELECT o.*, 
                COALESCE(json_agg(
                  json_build_object(
                    'id', oi.id,
                    'productId', oi.product_id,
                    'productName', oi.product_name,
                    'price', oi.price,
                    'quantity', oi.quantity,
                    'imageUrl', oi.image_url
                  )
                ) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.user_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC`,
        [userId]
      );

      return res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELLED', 'SHIPPED', 'COMPLETED'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        });
      }

      const result = await pool.query(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Order '${id}' not found`,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Order status updated to ${status}`,
        data: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  static async health(req: Request, res: Response) {
    try {
      const dbCheck = await pool.query('SELECT 1 as healthy');
      const isDbHealthy = dbCheck.rows.length > 0;
      const isRabbitConnected = isRabbitMQConnected();

      return res.status(200).json({
        status: isDbHealthy ? 'UP' : 'DEGRADED',
        service: 'order-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dependencies: {
          database: isDbHealthy ? 'HEALTHY' : 'UNHEALTHY',
          messageQueue: isRabbitConnected ? 'HEALTHY' : 'CONNECTING',
        },
      });
    } catch (err: any) {
      return res.status(503).json({
        status: 'DOWN',
        service: 'order-service',
        error: err.message,
      });
    }
  }
}
