const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Water Department Database Migration
 * Creates all tables in Supabase (PostgreSQL)
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrations = [
  // Water Users table (admin/staff)
  `CREATE TABLE IF NOT EXISTS water_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_water_users_email ON water_users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_water_users_role ON water_users(role)`,

  // Water Consumers table
  `CREATE TABLE IF NOT EXISTS water_consumers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES water_users(id) ON DELETE SET NULL,
    consumer_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    mobile VARCHAR(15) NOT NULL,
    address TEXT NOT NULL,
    ward VARCHAR(100),
    category VARCHAR(30) NOT NULL DEFAULT 'domestic' CHECK (category IN ('domestic', 'commercial', 'industrial', 'institutional')),
    connection_status VARCHAR(20) DEFAULT 'active' CHECK (connection_status IN ('active', 'inactive', 'suspended', 'disconnected')),
    meter_number VARCHAR(50),
    pipe_size VARCHAR(20),
    connection_date DATE,
    last_reading DECIMAL(10,2) DEFAULT 0,
    last_reading_date DATE,
    total_dues DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_water_consumer_number ON water_consumers(consumer_number)`,
  `CREATE INDEX IF NOT EXISTS idx_water_consumer_category ON water_consumers(category)`,
  `CREATE INDEX IF NOT EXISTS idx_water_consumer_status ON water_consumers(connection_status)`,
  `CREATE INDEX IF NOT EXISTS idx_water_consumer_mobile ON water_consumers(mobile)`,

  // Water Applications table
  `CREATE TABLE IF NOT EXISTS water_applications (
    id SERIAL PRIMARY KEY,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT REFERENCES water_users(id) ON DELETE SET NULL,
    consumer_id INT REFERENCES water_consumers(id) ON DELETE SET NULL,
    application_type VARCHAR(50) NOT NULL CHECK (application_type IN (
      'new_connection', 'reconnection', 'disconnection', 'transfer',
      'pipe_size_change', 'meter_change', 'tanker_service', 'connection_management'
    )),
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN (
      'submitted', 'document_verification', 'site_inspection', 'approval_pending',
      'approved', 'rejected', 'work_in_progress', 'completed'
    )),
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    ward VARCHAR(100),
    application_data JSONB NOT NULL DEFAULT '{}',
    documents JSONB DEFAULT '[]',
    remarks TEXT,
    current_stage VARCHAR(100) DEFAULT 'Application Submitted',
    stage_history JSONB DEFAULT '[]',
    assigned_engineer VARCHAR(255),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by INT REFERENCES water_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
  )`,

  `CREATE INDEX IF NOT EXISTS idx_water_app_number ON water_applications(application_number)`,
  `CREATE INDEX IF NOT EXISTS idx_water_app_status ON water_applications(status)`,
  `CREATE INDEX IF NOT EXISTS idx_water_app_type ON water_applications(application_type)`,
  `CREATE INDEX IF NOT EXISTS idx_water_app_mobile ON water_applications(mobile)`,

  // Water Complaints table
  `CREATE TABLE IF NOT EXISTS water_complaints (
    id SERIAL PRIMARY KEY,
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    consumer_id INT REFERENCES water_consumers(id) ON DELETE SET NULL,
    user_id INT REFERENCES water_users(id) ON DELETE SET NULL,
    contact_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    consumer_number VARCHAR(50),
    complaint_category VARCHAR(50) NOT NULL CHECK (complaint_category IN (
      'no_water_supply', 'low_pressure', 'water_quality', 'pipeline_leakage',
      'meter_fault', 'billing_dispute', 'sewerage_blockage', 'tanker_delay', 'other'
    )),
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    address TEXT,
    ward VARCHAR(100),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
    assigned_to INT REFERENCES water_users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    documents JSONB DEFAULT '[]',
    stage_history JSONB DEFAULT '[]',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  )`,

  `CREATE INDEX IF NOT EXISTS idx_water_complaint_number ON water_complaints(complaint_number)`,
  `CREATE INDEX IF NOT EXISTS idx_water_complaint_status ON water_complaints(status)`,
  `CREATE INDEX IF NOT EXISTS idx_water_complaint_priority ON water_complaints(priority)`,
  `CREATE INDEX IF NOT EXISTS idx_water_complaint_mobile ON water_complaints(mobile)`,

  // Water Bills table
  `CREATE TABLE IF NOT EXISTS water_bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    consumer_id INT NOT NULL REFERENCES water_consumers(id) ON DELETE CASCADE,
    bill_month VARCHAR(7) NOT NULL,
    previous_reading DECIMAL(10,2) DEFAULT 0,
    current_reading DECIMAL(10,2) DEFAULT 0,
    consumption_kl DECIMAL(10,2) DEFAULT 0,
    water_charges DECIMAL(10,2) NOT NULL,
    sewerage_charges DECIMAL(10,2) DEFAULT 0,
    service_tax DECIMAL(10,2) DEFAULT 0,
    arrears DECIMAL(10,2) DEFAULT 0,
    late_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'partial')),
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_water_bill_number ON water_bills(bill_number)`,
  `CREATE INDEX IF NOT EXISTS idx_water_bill_consumer ON water_bills(consumer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_water_bill_status ON water_bills(status)`,
  `CREATE INDEX IF NOT EXISTS idx_water_bill_month ON water_bills(bill_month)`,

  // Water Payments table
  `CREATE TABLE IF NOT EXISTS water_payments (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    bill_id INT REFERENCES water_bills(id) ON DELETE SET NULL,
    consumer_id INT REFERENCES water_consumers(id) ON DELETE SET NULL,
    consumer_number VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('upi', 'card', 'netbanking', 'cash', 'counter')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded')),
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    receipt_number VARCHAR(50),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_water_payment_txn ON water_payments(transaction_id)`,
  `CREATE INDEX IF NOT EXISTS idx_water_payment_consumer ON water_payments(consumer_number)`,
  `CREATE INDEX IF NOT EXISTS idx_water_payment_status ON water_payments(payment_status)`,

  // Water Meter Readings table
  `CREATE TABLE IF NOT EXISTS water_meter_readings (
    id SERIAL PRIMARY KEY,
    consumer_id INT NOT NULL REFERENCES water_consumers(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    reading_value DECIMAL(10,2) NOT NULL,
    reading_type VARCHAR(20) NOT NULL CHECK (reading_type IN ('self', 'official', 'estimated')),
    submitted_by INT REFERENCES water_users(id) ON DELETE SET NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_water_meter_consumer ON water_meter_readings(consumer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_water_meter_date ON water_meter_readings(reading_date)`,

  // Water System Settings table
  `CREATE TABLE IF NOT EXISTS water_system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INT REFERENCES water_users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Default settings
  `INSERT INTO water_system_settings (setting_key, setting_value, description)
   VALUES
     ('tariff_domestic_upto_10kl', '3.0', 'Domestic rate per KL up to 10 KL'),
     ('tariff_domestic_11_25kl', '5.0', 'Domestic rate per KL 11-25 KL'),
     ('tariff_domestic_above_25kl', '8.0', 'Domestic rate per KL above 25 KL'),
     ('tariff_commercial', '12.0', 'Commercial rate per KL'),
     ('tariff_industrial', '15.0', 'Industrial rate per KL'),
     ('sewerage_charge_rate', '30', 'Sewerage charge as percentage of water charges'),
     ('service_tax_rate', '5', 'Service tax percentage'),
     ('late_fee_per_month', '50', 'Late fee per month for overdue bills')
   ON CONFLICT (setting_key) DO NOTHING`,

  // Make user_id nullable on applications
  `DO $$
   BEGIN
     ALTER TABLE water_applications
       ALTER COLUMN user_id DROP NOT NULL;
   EXCEPTION WHEN others THEN NULL;
   END
   $$`
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Starting Supabase (PostgreSQL) migrations for Water department...\n');

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

    console.log('\n✅ All water migrations completed successfully!');

    // Seed default admin user
    const hashedPwd = await bcrypt.hash('WaterAdmin@123', 10);
    await client.query(`
      INSERT INTO water_users (email, password, role, full_name, phone, is_active)
      VALUES ('water.admin@municipal.gov', $1, 'admin', 'Water Admin', '9999999999', true)
      ON CONFLICT (email) DO NOTHING
    `, [hashedPwd]);
    console.log('\n👤 Default admin created (or already exists):');
    console.log('   Email   : water.admin@municipal.gov');
    console.log('   Password: WaterAdmin@123');
    console.log('   ⚠️  Change this password after first login!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('\n❌ Water migration failed:', err.message);
  process.exit(1);
});
