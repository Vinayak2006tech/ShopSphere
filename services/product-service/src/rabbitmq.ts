import amqp, { ChannelModel, Channel } from 'amqplib';
import { logger } from './logger';
import {
  EVENTS_EXCHANGE,
  ROUTING_KEYS,
  StockUpdatedEvent,
  InventoryReservedEvent,
  InventoryFailedEvent,
  OrderCreatedEvent,
  PaymentFailedEvent,
} from '@shopsphere/shared';
import { Product } from './product.model';
import { invalidateCachePattern } from './redis';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  let attempts = 0;
  const maxAttempts = 10;

  while (!channel && attempts < maxAttempts) {
    try {
      attempts++;
      logger.info(`Attempting to connect to RabbitMQ (attempt ${attempts}/${maxAttempts})...`);
      const conn = await amqp.connect(url);
      const ch = await conn.createChannel();

      // Assert the main topic exchange
      await ch.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });

      connection = conn;
      channel = ch;

      logger.info(`Connected to RabbitMQ and declared exchange: ${EVENTS_EXCHANGE}`);

      // Set up Saga Consumer Queue for Product Service
      await setupSagaConsumer(ch);

      conn.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
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
      logger.warn(`RabbitMQ connection failed: ${err.message}. Retrying in 3s...`);
      if (attempts >= maxAttempts) {
        logger.error('Could not connect to RabbitMQ after max attempts');
        break;
      }
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

async function setupSagaConsumer(ch: Channel) {
  const queueName = 'product_saga_queue';
  await ch.assertQueue(queueName, { durable: true });

  // Bind to order.created, payment.failed, and review.created
  await ch.bindQueue(queueName, EVENTS_EXCHANGE, ROUTING_KEYS.ORDER_CREATED);
  await ch.bindQueue(queueName, EVENTS_EXCHANGE, ROUTING_KEYS.PAYMENT_FAILED);
  await ch.bindQueue(queueName, EVENTS_EXCHANGE, ROUTING_KEYS.REVIEW_CREATED);

  logger.info(`Product Saga Queue initialized & bound to ${ROUTING_KEYS.ORDER_CREATED}, ${ROUTING_KEYS.PAYMENT_FAILED}, and ${ROUTING_KEYS.REVIEW_CREATED}`);

  ch.consume(
    queueName,
    async (msg) => {
      if (!msg) return;

      const routingKey = msg.fields.routingKey;
      try {
        const content = JSON.parse(msg.content.toString());

        if (routingKey === ROUTING_KEYS.ORDER_CREATED) {
          await handleOrderCreatedSaga(content as OrderCreatedEvent);
        } else if (routingKey === ROUTING_KEYS.PAYMENT_FAILED) {
          await handlePaymentFailedCompensatingSaga(content as PaymentFailedEvent);
        } else if (routingKey === ROUTING_KEYS.REVIEW_CREATED) {
          await handleReviewCreated(content);
        }

        ch.ack(msg);
      } catch (err: any) {
        logger.error(`Error processing Saga message with key ${routingKey}`, { error: err.message });
        // Ack on fatal unrecoverable parsing error, or nack with requeue=false
        ch.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

// SAGA STEP 1: Reserve Inventory or Fail
async function handleOrderCreatedSaga(event: OrderCreatedEvent) {
  const { orderId, userId, customerEmail, customerName, items, totalAmount } = event.payload;
  logger.info(`[SAGA] Received ${ROUTING_KEYS.ORDER_CREATED} for order ${orderId}. Verifying stock availability...`);

  const productsToUpdate: { doc: any; newStock: number; qty: number }[] = [];
  const failedItems: { productId: string; requestedQuantity: number; availableStock: number }[] = [];

  for (const item of items) {
    try {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        failedItems.push({
          productId: item.productId,
          requestedQuantity: item.quantity,
          availableStock: product ? product.stock : 0,
        });
      } else {
        productsToUpdate.push({
          doc: product,
          newStock: product.stock - item.quantity,
          qty: item.quantity,
        });
      }
    } catch (e: any) {
      failedItems.push({
        productId: item.productId,
        requestedQuantity: item.quantity,
        availableStock: 0,
      });
    }
  }

  if (failedItems.length > 0) {
    logger.warn(`[SAGA] Inventory reservation FAILED for order ${orderId}`, { failedItems });
    await publishInventoryFailed({
      orderId,
      userId,
      customerEmail,
      reason: `Insufficient inventory for item(s): ${failedItems.map((f) => f.productId).join(', ')}`,
      failedItems,
    });
  } else {
    // Deduct stock for all items atomically
    for (const update of productsToUpdate) {
      update.doc.stock = update.newStock;
      await update.doc.save();
    }

    // Invalidate Redis catalog cache
    await invalidateCachePattern('products:*');

    logger.info(`[SAGA] Inventory successfully RESERVED for order ${orderId}. Emitting ${ROUTING_KEYS.INVENTORY_RESERVED}`);
    await publishInventoryReserved({
      orderId,
      userId,
      customerEmail,
      customerName,
      items,
      totalAmount,
    });
  }
}

// SAGA COMPENSATING TRANSACTION: Restore stock if payment failed
async function handlePaymentFailedCompensatingSaga(event: PaymentFailedEvent) {
  const { orderId, reason, items } = event.payload;
  logger.warn(`[SAGA] Compensating rollback triggered for order ${orderId}: Payment failed (${reason})`);

  if (!items || items.length === 0) {
    logger.warn(`[SAGA] No item list attached to payment.failed event for order ${orderId}; skipping stock restock.`);
    return;
  }

  for (const item of items) {
    try {
      const product = await Product.findById(item.productId);
      if (product) {
        const previous = product.stock;
        product.stock += item.quantity;
        await product.save();
        logger.info(`[SAGA] Restored stock for product ${product.name}: ${previous} -> ${product.stock}`);
      }
    } catch (err: any) {
      logger.error(`[SAGA] Failed to restore stock for product ${item.productId}: ${err.message}`);
    }
  }

  await invalidateCachePattern('products:*');
  logger.info(`[SAGA] Compensating transaction complete for order ${orderId}. Stock successfully rolled back.`);
}

export async function publishInventoryReserved(payload: InventoryReservedEvent['payload']) {
  if (!channel) return false;
  const event: InventoryReservedEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType: ROUTING_KEYS.INVENTORY_RESERVED,
    payload,
  };

  return channel.publish(
    EVENTS_EXCHANGE,
    ROUTING_KEYS.INVENTORY_RESERVED,
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );
}

export async function publishInventoryFailed(payload: InventoryFailedEvent['payload']) {
  if (!channel) return false;
  const event: InventoryFailedEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType: ROUTING_KEYS.INVENTORY_FAILED,
    payload,
  };

  return channel.publish(
    EVENTS_EXCHANGE,
    ROUTING_KEYS.INVENTORY_FAILED,
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );
}

export async function publishStockUpdated(payload: StockUpdatedEvent['payload']) {
  if (!channel) return false;
  const event: StockUpdatedEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType: ROUTING_KEYS.STOCK_UPDATED,
    payload,
  };

  return channel.publish(
    EVENTS_EXCHANGE,
    ROUTING_KEYS.STOCK_UPDATED,
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );
}

async function handleReviewCreated(event: any) {
  try {
    const { productId, rating } = event.payload;
    logger.info(`[Product-Service] Received review.created for product ${productId} with rating ${rating}`);
    const product = await Product.findById(productId);
    if (product) {
      const currentCount = product.reviewsCount || 0;
      const currentRating = product.rating || 5.0;
      const newCount = currentCount + 1;
      const newRating = Math.round(((currentRating * currentCount + rating) / newCount) * 10) / 10;

      product.reviewsCount = newCount;
      product.rating = newRating;
      await product.save();

      await invalidateCachePattern('products:*');
      logger.info(`[Product-Service] Updated product ${product.name} rating to ${newRating} (${newCount} reviews)`);
    }
  } catch (err: any) {
    logger.error('Error updating product rating on review.created', { error: err.message });
  }
}

export function isRabbitMQConnected(): boolean {
  return channel !== null;
}
