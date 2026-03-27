/**
 * Create Electricity Admin User
 * Run: node scripts/create-admin.js
 *
 * Creates the default admin account for the electricity department.
 * Safe to run multiple times — skips if the email already exists.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ADMINS = [
  {
    email: 'admin@electricity.gov.in',
    password: 'Admin@123',
    full_name: 'Electricity Admin',
    phone: '9000000001',
    role: 'admin',
  },
  {
    email: 'staff@electricity.gov.in',
    password: 'Staff@123',
    full_name: 'Electricity Staff',
    phone: '9000000002',
    role: 'staff',
  },
];

async function createAdmins() {
  const client = await pool.connect();
  try {
    for (const admin of ADMINS) {
      const existing = await client.query(
        'SELECT id, role FROM electricity_users WHERE email = $1',
        [admin.email]
      );

      if (existing.rows.length > 0) {
        console.log(`⚠  Already exists: ${admin.email} (${existing.rows[0].role})`);
        continue;
      }

      const hashed = await bcrypt.hash(admin.password, 10);

      const result = await client.query(
        `INSERT INTO electricity_users (email, password, role, full_name, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
        [admin.email, hashed, admin.role, admin.full_name, admin.phone]
      );

      console.log(`✓ Created ${admin.role}: ${admin.email} (id: ${result.rows[0].id})`);
      console.log(`  Password: ${admin.password}`);
    }

    console.log('\n--- Login credentials ---');
    console.log('Admin   → admin@electricity.gov.in  /  Admin@123');
    console.log('Staff   → staff@electricity.gov.in  /  Staff@123');
    console.log('-------------------------');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmins();
