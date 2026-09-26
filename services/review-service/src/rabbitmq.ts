import amqp, { ChannelModel, Channel } from 'amqplib';
import { logger } from './logger';
import { EVENTS_EXCHANGE, ROUTING_KEYS, ReviewCreatedEvent } from '@shopsphere/shared';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  let attempts = 0;
  const maxAttempts = 10;

  while (!channel && attempts < maxAttempts) {
    try {
      attempts++;
      logger.info(`Connecting to RabbitMQ in Review Service (attempt ${attempts}/${maxAttempts})...`);
      const conn = await amqp.connect(url);
      const ch = await conn.createChannel();

      await ch.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
      connection = conn;
      channel = ch;

      logger.info(`Review Service RabbitMQ connected & exchange declared: ${EVENTS_EXCHANGE}`);
      break;
    } catch (err: any) {
      logger.warn(`RabbitMQ connection attempt ${attempts} failed in Review Service: ${err.message}`);
      if (attempts >= maxAttempts) break;
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

export async function publishReviewCreated(payload: ReviewCreatedEvent['payload']) {
  if (!channel) {
    logger.warn('RabbitMQ channel unavailable; skipping review.created publication');
    return false;
  }

  const event: ReviewCreatedEvent = {
    eventId: `evt_rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType: ROUTING_KEYS.REVIEW_CREATED,
    payload,
  };

  try {
    const published = channel.publish(
      EVENTS_EXCHANGE,
      ROUTING_KEYS.REVIEW_CREATED,
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    logger.info(`Published ${ROUTING_KEYS.REVIEW_CREATED} for product ${payload.productId} (rating ${payload.rating})`);
    return published;
  } catch (err: any) {
    logger.error('Failed to publish review.created event', { error: err.message });
    return false;
  }
}

export function isRabbitMQConnected(): boolean {
  return channel !== null;
}
