const { Pool } = require('pg');
const dns = require('dns');
require('./loadEnv');

// Force IPv4 resolution on Windows (fixes ENOTFOUND errors)
dns.setDefaultResultOrder('ipv4first');

const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;

let pool = null;

// Only create pool if database URL is configured
if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  // Prevent unhandled pool errors from crashing the process
  pool.on('error', (err) => {
    console.error('Unexpected idle client error:', err.message);
  });

  // Test connection on startup
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to database:', err.message);
      if (err.code === 'ENOTFOUND') {
        console.error('Hint: this host currently resolves to IPv6-only on many networks.');
        console.error('Set DATABASE_URL_POOLER to your Supabase Session/Transaction Pooler URL (IPv4) and restart.');
      }
    } else {
      console.log('✓ Database connected successfully');
      release();
    }
  });
} else {
  console.warn('⚠️  DATABASE_URL not configured - database features will be disabled');
}

module.exports = { pool };
