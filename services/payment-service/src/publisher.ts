import { Channel } from 'amqplib';
import { logger } from './logger';
import {
  EVENTS_EXCHANGE,
  ROUTING_KEYS,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '@shopsphere/shared';

let activeChannel: Channel | null = null;

export function setPublisherChannel(channel: Channel | null) {
  activeChannel = channel;
}

export function isPublisherConnected(): boolean {
  return activeChannel !== null;
}

export async function publishPaymentCompleted(payload: PaymentCompletedEvent['payload']) {
  if (!activeChannel) {
    logger.warn('RabbitMQ channel not ready. Unable to publish payment.completed.');
    return false;
  }

  const event: PaymentCompletedEvent = {
    eventId: `evt_pay_ok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType: ROUTING_KEYS.PAYMENT_COMPLETED,
    payload,
  };

  try {
    const published = activeChannel.publish(
      EVENTS_EXCHANGE,
      ROUTING_KEYS.PAYMENT_COMPLETED,
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    logger.info(`Published ${ROUTING_KEYS.PAYMENT_COMPLETED} for Order ${payload.orderId}`, {
      eventId: event.eventId,
      transactionId: payload.transactionId,
    });
    return published;
  } catch (err: any) {
    logger.error('Failed to publish payment.completed event', { error: err.message });
    return false;
  }
}

export async function publishPaymentFailed(payload: PaymentFailedEvent['payload']) {
  if (!activeChannel) {
    logger.warn('RabbitMQ channel not ready. Unable to publish payment.failed.');
    return false;
  }

  const event: PaymentFailedEvent = {
    eventId: `evt_pay_fail_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType: ROUTING_KEYS.PAYMENT_FAILED,
    payload,
  };

  try {
    const published = activeChannel.publish(
      EVENTS_EXCHANGE,
      ROUTING_KEYS.PAYMENT_FAILED,
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    logger.info(`Published ${ROUTING_KEYS.PAYMENT_FAILED} for Order ${payload.orderId}`, {
      eventId: event.eventId,
      reason: payload.reason,
    });
    return published;
  } catch (err: any) {
    logger.error('Failed to publish payment.failed event', { error: err.message });
    return false;
  }
}
