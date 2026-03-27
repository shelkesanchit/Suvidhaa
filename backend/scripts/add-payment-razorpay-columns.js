/**
 * Migration: Add Razorpay columns to gas_payments table
 * Run: node scripts/add-payment-razorpay-columns.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running payment Razorpay column migration...');

    // Add Razorpay columns to gas_payments if they don't exist
    await client.query(`
      ALTER TABLE gas_payments
        ADD COLUMN IF NOT EXISTS razorpay_order_id   VARCHAR(100),
        ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS razorpay_signature  VARCHAR(255)
    `);
    console.log('✓ gas_payments: Razorpay columns added (or already existed)');

    // Ensure water_payments has Razorpay columns (should already, but safe to re-run)
    await client.query(`
      ALTER TABLE water_payments
        ADD COLUMN IF NOT EXISTS razorpay_order_id   VARCHAR(100),
        ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS razorpay_signature  VARCHAR(255)
    `);
    console.log('✓ water_payments: Razorpay columns confirmed');

    console.log('\nMigration completed successfully.');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
