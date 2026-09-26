import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { pool } from './db';
import { isRabbitMQConnected } from './rabbitmq';

export class PaymentController {
  static async processPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, userId, customerEmail, amount, simulateFailure, paymentMethod } = req.body;
      if (!orderId || !userId || !customerEmail || amount === undefined) {
        return res.status(400).json({
          success: false,
          error: 'orderId, userId, customerEmail, and amount are required',
        });
      }

      const result = await PaymentService.processPayment({
        orderId,
        userId,
        customerEmail,
        amount: Number(amount),
        simulateFailure: !!simulateFailure,
        paymentMethod,
      });

      return res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const payments = await PaymentService.getPayments(limit);
      return res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const payment = await PaymentService.getPaymentById(id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: `Payment '${id}' not found`,
        });
      }
      return res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentByOrderId(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const payments = await PaymentService.getPaymentByOrderId(orderId);
      return res.status(200).json({
        success: true,
        data: payments,
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
        service: 'payment-service',
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
        service: 'payment-service',
        error: err.message,
      });
    }
  }
}
