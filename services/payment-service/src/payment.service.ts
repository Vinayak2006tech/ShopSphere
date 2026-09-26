import { pool } from './db';
import { publishPaymentCompleted, publishPaymentFailed } from './publisher';
import { logger } from './logger';

import { OrderItemPayload } from '@shopsphere/shared';

export interface ProcessPaymentParams {
  orderId: string;
  userId: string;
  customerEmail: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  simulateFailure?: boolean;
  items?: OrderItemPayload[];
}

export class PaymentService {
  static async processPayment(params: ProcessPaymentParams) {
    const {
      orderId,
      userId,
      customerEmail,
      amount,
      currency = 'USD',
      paymentMethod = 'card_stripe_simulated',
      simulateFailure = false,
      items,
    } = params;

    logger.info(`Initiating payment processing for Order ${orderId} ($${amount})`);

    // Simulate Stripe payment gateway latency (750ms)
    await new Promise((res) => setTimeout(res, 750));

    // Determine success or failure
    const shouldFail =
      simulateFailure ||
      customerEmail.toLowerCase().includes('fail') ||
      amount === 9999.99;

    const transactionId = `ch_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (shouldFail) {
      const reason = 'Card declined: Insufficient funds or invalid security code (test simulation)';
      logger.warn(`Payment failed for Order ${orderId}`, { reason, transactionId });

      // Save failed payment record
      const res = await pool.query(
        `INSERT INTO payments (order_id, user_id, customer_email, amount, currency, status, transaction_id, payment_method, failure_reason)
         VALUES ($1, $2, $3, $4, $5, 'FAILED', $6, $7, $8)
         RETURNING *`,
        [orderId, userId, customerEmail, amount, currency, transactionId, paymentMethod, reason]
      );

      const record = res.rows[0];

      // Publish payment.failed event
      await publishPaymentFailed({
        paymentId: record.id,
        orderId,
        userId,
        customerEmail,
        amount,
        currency,
        reason,
        errorCode: 'CARD_DECLINED',
        items,
      });

      return { success: false, payment: record, reason };
    }

    // Payment Successful
    logger.info(`Payment succeeded for Order ${orderId}`, { transactionId });

    // Save completed payment record
    const res = await pool.query(
      `INSERT INTO payments (order_id, user_id, customer_email, amount, currency, status, transaction_id, payment_method)
       VALUES ($1, $2, $3, $4, $5, 'COMPLETED', $6, $7)
       RETURNING *`,
      [orderId, userId, customerEmail, amount, currency, transactionId, paymentMethod]
    );

    const record = res.rows[0];

    // Publish payment.completed event
    await publishPaymentCompleted({
      paymentId: record.id,
      orderId,
      userId,
      customerEmail,
      amount,
      currency,
      paymentMethod,
      transactionId,
    });

    return { success: true, payment: record, transactionId };
  }

  static async getPayments(limit = 50) {
    const res = await pool.query(
      `SELECT * FROM payments ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.rows;
  }

  static async getPaymentById(id: string) {
    const res = await pool.query(`SELECT * FROM payments WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  static async getPaymentByOrderId(orderId: string) {
    const res = await pool.query(`SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC`, [orderId]);
    return res.rows;
  }
}
