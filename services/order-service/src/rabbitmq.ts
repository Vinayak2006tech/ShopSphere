import amqp, { ChannelModel, Channel } from 'amqplib';
import { pool } from './db';
import { logger } from './logger';
import {
  EVENTS_EXCHANGE,
  ROUTING_KEYS,
  OrderCreatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '@shopsphere/shared';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const ORDER_QUEUE = 'order_service_queue';

export async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  let attempts = 0;
  const maxAttempts = 10;

  while (!channel && attempts < maxAttempts) {
    try {
      attempts++;
      logger.info(`Connecting to RabbitMQ (attempt ${attempts}/${maxAttempts})...`);
      const conn = await amqp.connect(url);
      const ch = await conn.createChannel();

      // Assert topic exchange
      await ch.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });

      // Assert queue for order service
      const q = await ch.assertQueue(ORDER_QUEUE, { durable: true });

      // Bind to payment and inventory events
      await ch.bindQueue(q.queue, EVENTS_EXCHANGE, ROUTING_KEYS.PAYMENT_COMPLETED);
      await ch.bindQueue(q.queue, EVENTS_EXCHANGE, ROUTING_KEYS.PAYMENT_FAILED);
      await ch.bindQueue(q.queue, EVENTS_EXCHANGE, ROUTING_KEYS.INVENTORY_FAILED);

      connection = conn;
      channel = ch;

      logger.info(`Order Service RabbitMQ connected. Bound to payment events on queue: ${ORDER_QUEUE}`);

      // Start consuming events
      ch.consume(q.queue, async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          logger.info(`Received event in Order Service: [${routingKey}]`, { eventId: content.eventId });

          if (routingKey === ROUTING_KEYS.PAYMENT_COMPLETED) {
            await handlePaymentCompleted(content as PaymentCompletedEvent);
          } else if (routingKey === ROUTING_KEYS.PAYMENT_FAILED) {
            await handlePaymentFailed(content as PaymentFailedEvent);
          } else if (routingKey === ROUTING_KEYS.INVENTORY_FAILED) {
            await handleInventoryFailed(content);
          }

          ch.ack(msg);
        } catch (err: any) {
          logger.error('Error processing event message in Order Service', { error: err.message });
          // Reject and don't requeue if malformed
          ch.nack(msg, false, false);
        }
      });

      conn.on('error', (err) => {
        logger.error('RabbitMQ connection error in Order Service', { error: err.message });
        channel = null;
        connection = null;
      });

      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed. Reconnecting in 5s...');
        channel = null;
        connection = null;
        setTimeout(connectRabbitMQ, 5000);
      });

      break;
    } catch (err: any) {
      logger.warn(`RabbitMQ connection failed in Order Service: ${err.message}. Retrying in 3s...`);
      if (attempts >= maxAttempts) {
        logger.error('Order Service could not connect to RabbitMQ after max attempts');
        break;
      }
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

async function handlePaymentCompleted(event: PaymentCompletedEvent) {
  const { orderId } = event.payload;
  logger.info(`Updating order ${orderId} status to 'PAID' following payment confirmation`);
  await pool.query(
    `UPDATE orders SET status = 'PAID', updated_at = NOW() WHERE id = $1`,
    [orderId]
  );
}

async function handlePaymentFailed(event: PaymentFailedEvent) {
  const { orderId, reason } = event.payload;
  logger.warn(`Updating order ${orderId} status to 'PAYMENT_FAILED'. Reason: ${reason}`);
  await pool.query(
    `UPDATE orders SET status = 'PAYMENT_FAILED', updated_at = NOW() WHERE id = $1`,
    [orderId]
  );
}

async function handleInventoryFailed(event: any) {
  const { orderId, reason } = event.payload;
  logger.warn(`[SAGA] Updating order ${orderId} status to 'CANCELLED' due to inventory failure: ${reason}`);
  await pool.query(
    `UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
    [orderId]
  );
}

export async function publishOrderCreated(eventPayload: OrderCreatedEvent['payload']) {
  if (!channel) {
    logger.warn('RabbitMQ channel not ready. Unable to publish order.created event.');
    return false;
  }

  const event: OrderCreatedEvent = {
    eventId: `evt_ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType: ROUTING_KEYS.ORDER_CREATED,
    payload: eventPayload,
  };

  try {
    const published = channel.publish(
      EVENTS_EXCHANGE,
      ROUTING_KEYS.ORDER_CREATED,
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    logger.info(`Published ${ROUTING_KEYS.ORDER_CREATED} for Order ${eventPayload.orderId}`, {
      eventId: event.eventId,
      total: eventPayload.totalAmount,
    });
    return published;
  } catch (err: any) {
    logger.error('Failed to publish order.created event', { error: err.message });
    return false;
  }
}

export function isRabbitMQConnected(): boolean {
  return channel !== null;
}
