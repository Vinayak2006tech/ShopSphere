import amqp, { ChannelModel, Channel } from 'amqplib';
import { PaymentService } from './payment.service';
import { setPublisherChannel } from './publisher';
import { logger } from './logger';
import {
  EVENTS_EXCHANGE,
  ROUTING_KEYS,
  OrderCreatedEvent,
} from '@shopsphere/shared';

export * from './publisher';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const PAYMENT_QUEUE = 'payment_service_queue';

export async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  let attempts = 0;
  const maxAttempts = 10;

  while (!channel && attempts < maxAttempts) {
    try {
      attempts++;
      logger.info(`Connecting to RabbitMQ in Payment Service (attempt ${attempts}/${maxAttempts})...`);
      const conn = await amqp.connect(url);
      const ch = await conn.createChannel();

      // Assert exchange
      await ch.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });

      // Assert queue
      const q = await ch.assertQueue(PAYMENT_QUEUE, { durable: true });

      // Bind to inventory.reserved (Saga step 2)
      await ch.bindQueue(q.queue, EVENTS_EXCHANGE, ROUTING_KEYS.INVENTORY_RESERVED);

      connection = conn;
      channel = ch;
      setPublisherChannel(ch);

      logger.info(`Payment Service RabbitMQ connected. Bound to ${ROUTING_KEYS.INVENTORY_RESERVED} on queue: ${PAYMENT_QUEUE}`);

      // Start consuming events
      ch.consume(q.queue, async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;

          if (routingKey === ROUTING_KEYS.INVENTORY_RESERVED) {
            const event = content as any;
            logger.info(`[SAGA] Payment Service received ${ROUTING_KEYS.INVENTORY_RESERVED} for Order ${event.payload.orderId}`, {
              amount: event.payload.totalAmount,
            });

            // Process simulated Stripe payment
            await PaymentService.processPayment({
              orderId: event.payload.orderId,
              userId: event.payload.userId,
              customerEmail: event.payload.customerEmail,
              amount: event.payload.totalAmount,
              items: event.payload.items,
            });
          }

          ch.ack(msg);
        } catch (err: any) {
          logger.error('Error handling order.created in Payment Service', { error: err.message });
          ch.nack(msg, false, false);
        }
      });

      conn.on('error', (err) => {
        logger.error('RabbitMQ connection error in Payment Service', { error: err.message });
        channel = null;
        connection = null;
        setPublisherChannel(null);
      });

      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed in Payment Service. Reconnecting in 5s...');
        channel = null;
        connection = null;
        setPublisherChannel(null);
        setTimeout(connectRabbitMQ, 5000);
      });

      break;
    } catch (err: any) {
      logger.warn(`RabbitMQ connection failed in Payment Service: ${err.message}. Retrying in 3s...`);
      if (attempts >= maxAttempts) {
        logger.error('Payment Service could not connect to RabbitMQ after max attempts');
        break;
      }
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

export function isRabbitMQConnected(): boolean {
  return channel !== null;
}
