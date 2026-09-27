const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_VZJe2mDYjif5@ep-small-resonance-b510dlyf-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to Neon DB successfully!");

  await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  // 1. Auth Service tables
  console.log("Creating auth tables...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'customer',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);`);

  // 2. Order Service tables
  console.log("Creating order tables...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      total_amount NUMERIC(10, 2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      shipping_address JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id VARCHAR(255) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      quantity INTEGER NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);`);

  // 3. Payment Service tables
  console.log("Creating payment tables...");
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

  // Seed default admin and test user if not exists
  const adminCheck = await client.query(`SELECT id FROM users WHERE email = 'admin@shopsphere.io'`);
  if (adminCheck.rows.length === 0) {
    console.log("Seeding initial admin and demo users...");
    // bcrypt hash for 'admin123'
    const adminHash = '$2b$10$wT8K8U1s.95Y6Kk82EHQ.u2yR5jT6eM1x.d8u2R5jT6eM1xd8u2R5'; // or generated with bcrypt
    await client.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES 
        ('admin@shopsphere.io', '${adminHash}', 'ShopSphere Curator', 'admin'),
        ('customer@shopsphere.io', '${adminHash}', 'Elena Rostova', 'customer')
      ON CONFLICT (email) DO NOTHING;
    `);
  }

  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log("Deployed tables in Neon Postgres:", tables.rows.map(r => r.table_name));

  const countUsers = await client.query(`SELECT count(*) FROM users`);
  console.log("Total users in Neon Postgres:", countUsers.rows[0].count);

  await client.end();
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
