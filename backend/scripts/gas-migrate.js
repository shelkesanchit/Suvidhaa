const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Gas Department Database Migration
 * Creates all tables in Supabase (PostgreSQL)
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrations = [
  // Gas Admin Users table
  `CREATE TABLE IF NOT EXISTS gas_admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    phone VARCHAR(15),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gas_admin_email ON gas_admin_users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_admin_username ON gas_admin_users(username)`,

  // Gas Consumers table
  `CREATE TABLE IF NOT EXISTS gas_consumers (
    id SERIAL PRIMARY KEY,
    consumer_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    aadhar_number VARCHAR(12),
    pan_number VARCHAR(10),
    state VARCHAR(100) DEFAULT 'Maharashtra',
    city VARCHAR(100),
    pincode VARCHAR(6),
    address_line1 TEXT,
    address TEXT,
    connection_type VARCHAR(30) DEFAULT 'LPG',
    consumer_type VARCHAR(30) DEFAULT 'residential',
    cylinder_type VARCHAR(20) DEFAULT '14kg' CHECK (cylinder_type IN ('14kg', '19kg', 'commercial')),
    connection_status VARCHAR(20) DEFAULT 'active' CHECK (connection_status IN ('active', 'inactive', 'suspended', 'disconnected')),
    bank_name VARCHAR(100),
    bank_account VARCHAR(20),
    bank_verified BOOLEAN DEFAULT false,
    lpg_consumer_id VARCHAR(50),
    connection_date DATE DEFAULT CURRENT_DATE,
    account_created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gas_consumer_number ON gas_consumers(consumer_number)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_consumer_status ON gas_consumers(connection_status)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_consumer_phone ON gas_consumers(phone)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_consumer_aadhar ON gas_consumers(aadhar_number)`,

  // Gas Applications table
  `CREATE TABLE IF NOT EXISTS gas_applications (
    id SERIAL PRIMARY KEY,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    application_type VARCHAR(50) NOT NULL,
    connection_type VARCHAR(10) DEFAULT 'LPG' CHECK (connection_type IN ('PNG', 'LPG')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
      'pending', 'document_verification', 'approved', 'rejected',
      'completed', 'in_progress', 'inspection_pending'
    )),
    applicant_name VARCHAR(255),
    applicant_phone VARCHAR(15),
    applicant_email VARCHAR(255),
    application_data JSONB DEFAULT '{}',
    documents JSONB DEFAULT '[]',
    remarks TEXT,
    submission_date TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gas_app_number ON gas_applications(application_number)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_app_status ON gas_applications(status)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_app_phone ON gas_applications(applicant_phone)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_app_type ON gas_applications(application_type)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_app_conn_type ON gas_applications(connection_type)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_app_submission ON gas_applications(submission_date)`,

  // Gas Complaints table
  `CREATE TABLE IF NOT EXISTS gas_complaints (
    id SERIAL PRIMARY KEY,
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    consumer_id INT REFERENCES gas_consumers(id) ON DELETE SET NULL,
    complaint_type VARCHAR(30) NOT NULL DEFAULT 'other' CHECK (complaint_type IN (
      'delivery_issue', 'billing', 'safety', 'quality', 'other'
    )),
    description TEXT NOT NULL,
    attachment_url TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN (
      'open', 'assigned', 'in_progress', 'resolved', 'closed'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to VARCHAR(255),
    resolution_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gas_complaint_number ON gas_complaints(complaint_number)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_complaint_status ON gas_complaints(status)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_complaint_priority ON gas_complaints(priority)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_complaint_consumer ON gas_complaints(consumer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_complaint_submitted ON gas_complaints(submitted_at)`,

  // Gas Cylinder Bookings table
  `CREATE TABLE IF NOT EXISTS gas_cylinder_bookings (
    id SERIAL PRIMARY KEY,
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL REFERENCES gas_consumers(id) ON DELETE CASCADE,
    cylinder_type VARCHAR(20) NOT NULL DEFAULT '14kg' CHECK (cylinder_type IN ('14kg', '19kg', 'commercial')),
    quantity INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_type VARCHAR(30) DEFAULT 'home_delivery',
    booking_status VARCHAR(20) DEFAULT 'placed' CHECK (booking_status IN (
      'placed', 'confirmed', 'dispatched', 'delivered', 'cancelled'
    )),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
      'pending', 'paid', 'failed', 'refunded'
    )),
    booking_date TIMESTAMPTZ DEFAULT NOW(),
    delivery_date DATE,
    booked_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gas_booking_number ON gas_cylinder_bookings(booking_number)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_booking_customer ON gas_cylinder_bookings(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_booking_status ON gas_cylinder_bookings(booking_status)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_booking_payment ON gas_cylinder_bookings(payment_status)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_booking_date ON gas_cylinder_bookings(booking_date)`,

  // Gas Payments table
  `CREATE TABLE IF NOT EXISTS gas_payments (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES gas_cylinder_bookings(id) ON DELETE SET NULL,
    customer_id INT NOT NULL REFERENCES gas_consumers(id) ON DELETE CASCADE,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (payment_method IN (
      'cash', 'online', 'bank_transfer'
    )),
    amount DECIMAL(10,2) NOT NULL,
    subsidy_amount DECIMAL(10,2) DEFAULT 0,
    transaction_id VARCHAR(100) UNIQUE,
    payment_status VARCHAR(20) DEFAULT 'success' CHECK (payment_status IN (
      'pending', 'success', 'failed', 'refunded'
    )),
    receipt_number VARCHAR(50)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gas_payment_customer ON gas_payments(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_payment_booking ON gas_payments(booking_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_payment_txn ON gas_payments(transaction_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_payment_date ON gas_payments(payment_date)`,

  // Gas Tariff Rates table
  `CREATE TABLE IF NOT EXISTS gas_tariff_rates (
    id SERIAL PRIMARY KEY,
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    city VARCHAR(100) NOT NULL DEFAULT 'Mumbai',
    cylinder_type VARCHAR(20) NOT NULL DEFAULT '14kg' CHECK (cylinder_type IN ('14kg', '19kg', 'commercial')),
    price_per_cylinder DECIMAL(10,2) NOT NULL,
    base_price DECIMAL(10,2) DEFAULT 0,
    subsidy_amount DECIMAL(10,2) DEFAULT 0,
    effective_from DATE DEFAULT CURRENT_DATE,
    supplier VARCHAR(255) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gas_tariff_state_city ON gas_tariff_rates(state, city)`,
  `CREATE INDEX IF NOT EXISTS idx_gas_tariff_cyl_type ON gas_tariff_rates(cylinder_type)`,

  // Gas System Settings table
  `CREATE TABLE IF NOT EXISTS gas_system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Default tariff rates
  `INSERT INTO gas_tariff_rates (state, city, cylinder_type, price_per_cylinder, base_price, subsidy_amount, supplier)
   VALUES
     ('Maharashtra', 'Mumbai', '14kg', 899.00, 950.00, 51.00, 'HP Gas'),
     ('Maharashtra', 'Mumbai', '19kg', 1755.00, 1800.00, 45.00, 'HP Gas'),
     ('Maharashtra', 'Mumbai', 'commercial', 2050.00, 2100.00, 50.00, 'HP Gas'),
     ('Maharashtra', 'Pune', '14kg', 895.00, 945.00, 50.00, 'Indane'),
     ('Maharashtra', 'Pune', '19kg', 1750.00, 1795.00, 45.00, 'Indane'),
     ('Delhi', 'Delhi', '14kg', 873.00, 920.00, 47.00, 'Bharat Gas'),
     ('Delhi', 'Delhi', '19kg', 1729.00, 1775.00, 46.00, 'Bharat Gas')
   ON CONFLICT DO NOTHING`,

  // Default system settings
  `INSERT INTO gas_system_settings (setting_key, setting_value, setting_type, description)
   VALUES
     ('gas_emergency_helpline', '1906', 'string', 'Gas emergency helpline number'),
     ('gas_customer_care', '1800-2333-555', 'string', 'Customer care number'),
     ('gas_booking_interval_days', '15', 'number', 'Minimum days between cylinder bookings (DAC rule)'),
     ('gas_max_cylinders_per_booking', '2', 'number', 'Max cylinders per booking'),
     ('gas_pmuy_subsidy_enabled', 'true', 'boolean', 'Whether PMUY subsidy is active')
   ON CONFLICT (setting_key) DO NOTHING`
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Starting Supabase (PostgreSQL) migrations for Gas department...\n');

    for (let i = 0; i < migrations.length; i++) {
      const sql = migrations[i];
      const label = sql.trim().split('\n')[0].substring(0, 80);
      try {
        await client.query(sql);
        console.log(`✓ [${i + 1}/${migrations.length}] ${label}`);
      } catch (err) {
        console.error(`✗ [${i + 1}/${migrations.length}] ${label}`);
        console.error('  Error:', err.message);
        throw err;
      }
    }

    console.log('\n✅ All gas migrations completed successfully!');

    // Seed default admin user
    const hashedPwd = await bcrypt.hash('GasAdmin@123', 10);
    await client.query(`
      INSERT INTO gas_admin_users (username, email, password, full_name, role, phone, is_active)
      VALUES ('gas_admin', 'gas.admin@municipal.gov', $1, 'Gas Admin', 'admin', '9999999999', true)
      ON CONFLICT (email) DO NOTHING
    `, [hashedPwd]);
    console.log('\n👤 Default admin created (or already exists):');
    console.log('   Email   : gas.admin@municipal.gov');
    console.log('   Username: gas_admin');
    console.log('   Password: GasAdmin@123');
    console.log('   ⚠️  Change this password after first login!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('\n❌ Gas migration failed:', err.message);
  process.exit(1);
});
