import amqp, { ChannelModel, Channel } from 'amqplib';
import { logger } from './logger';
import {
  sendOrderCreatedNotification,
  sendPaymentCompletedNotification,
  sendPaymentFailedNotification,
} from './mailer';
import {
  EVENTS_EXCHANGE,
  ROUTING_KEYS,
  OrderCreatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '@shopsphere/shared';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const NOTIFICATION_QUEUE = 'notification_service_queue';

export async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  let attempts = 0;
  const maxAttempts = 10;

  while (!channel && attempts < maxAttempts) {
    try {
      attempts++;
      logger.info(`Connecting to RabbitMQ in Notification Service (attempt ${attempts}/${maxAttempts})...`);
      const conn = await amqp.connect(url);
      const ch = await conn.createChannel();

      // Assert exchange
      await ch.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });

      // Assert queue
      const q = await ch.assertQueue(NOTIFICATION_QUEUE, { durable: true });

      // Bind to order and payment events
      await ch.bindQueue(q.queue, EVENTS_EXCHANGE, ROUTING_KEYS.ORDER_CREATED);
      await ch.bindQueue(q.queue, EVENTS_EXCHANGE, ROUTING_KEYS.PAYMENT_COMPLETED);
      await ch.bindQueue(q.queue, EVENTS_EXCHANGE, ROUTING_KEYS.PAYMENT_FAILED);

      connection = conn;
      channel = ch;

      logger.info(`Notification Service connected. Bound to order & payment events on queue: ${NOTIFICATION_QUEUE}`);

      // Start consuming events
      ch.consume(q.queue, async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;

          logger.info(`Notification Service handling event: [${routingKey}]`, { eventId: content.eventId });

          if (routingKey === ROUTING_KEYS.ORDER_CREATED) {
            await sendOrderCreatedNotification(content as OrderCreatedEvent);
          } else if (routingKey === ROUTING_KEYS.PAYMENT_COMPLETED) {
            await sendPaymentCompletedNotification(content as PaymentCompletedEvent);
          } else if (routingKey === ROUTING_KEYS.PAYMENT_FAILED) {
            await sendPaymentFailedNotification(content as PaymentFailedEvent);
          }

          ch.ack(msg);
        } catch (err: any) {
          logger.error('Error processing notification event', { error: err.message });
          ch.nack(msg, false, false);
        }
      });

      conn.on('error', (err) => {
        logger.error('RabbitMQ connection error in Notification Service', { error: err.message });
        channel = null;
        connection = null;
      });

      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed in Notification Service. Reconnecting in 5s...');
        channel = null;
        connection = null;
        setTimeout(connectRabbitMQ, 5000);
      });

      break;
    } catch (err: any) {
      logger.warn(`RabbitMQ connection failed in Notification Service: ${err.message}. Retrying in 3s...`);
      if (attempts >= maxAttempts) {
        logger.error('Notification Service could not connect to RabbitMQ after max attempts');
        break;
      }
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

export function isRabbitMQConnected(): boolean {
  return channel !== null;
}
