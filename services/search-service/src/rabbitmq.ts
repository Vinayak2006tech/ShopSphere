import amqp, { ChannelModel, Channel } from 'amqplib';
import { logger } from './logger';
import { EVENTS_EXCHANGE, ROUTING_KEYS, StockUpdatedEvent } from '@shopsphere/shared';
import { globalSearchIndex } from './search-index';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const SEARCH_QUEUE = 'search_service_queue';

export async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  let attempts = 0;
  const maxAttempts = 10;

  while (!channel && attempts < maxAttempts) {
    try {
      attempts++;
      logger.info(`Connecting to RabbitMQ in Search Service (attempt ${attempts}/${maxAttempts})...`);
      const conn = await amqp.connect(url);
      const ch = await conn.createChannel();

      await ch.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
      const q = await ch.assertQueue(SEARCH_QUEUE, { durable: true });

      // Bind to stock updates and product changes
      await ch.bindQueue(q.queue, EVENTS_EXCHANGE, ROUTING_KEYS.STOCK_UPDATED);
      await ch.bindQueue(q.queue, EVENTS_EXCHANGE, 'product.*');

      connection = conn;
      channel = ch;

      logger.info(`Search Service RabbitMQ connected & listening on ${SEARCH_QUEUE}`);

      ch.consume(q.queue, (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          const key = msg.fields.routingKey;

          if (key === ROUTING_KEYS.STOCK_UPDATED) {
            const stockEvent = content as StockUpdatedEvent;
            globalSearchIndex.updateStock(stockEvent.payload.productId, stockEvent.payload.currentStock);
            logger.info(`Live index updated stock for product ${stockEvent.payload.productId}: ${stockEvent.payload.currentStock}`);
          }

          ch.ack(msg);
        } catch (err: any) {
          logger.error('Error handling RabbitMQ message in Search Service', { error: err.message });
          ch.nack(msg, false, false);
        }
      });

      break;
    } catch (err: any) {
      logger.warn(`RabbitMQ connection attempt ${attempts} failed in Search Service: ${err.message}`);
      if (attempts >= maxAttempts) break;
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

export function isRabbitMQConnected(): boolean {
  return channel !== null;
}
