import { Pool } from 'pg';
import { logger } from './logger';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shopsphere_payment',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client (payment-service)', { error: err.message });
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    logger.info('Initializing Payment Service database schema...');

    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        transaction_id VARCHAR(255) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'card_stripe_simulated',
        failure_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);`);

    logger.info('Payment Service database schema initialized successfully');
  } catch (err: any) {
    logger.error('Failed to initialize Payment database schema', { error: err.message, stack: err.stack });
    throw err;
  } finally {
    client.release();
  }
}
