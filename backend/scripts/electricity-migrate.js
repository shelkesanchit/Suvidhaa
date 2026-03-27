const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Electricity Department Database Migration
 * Creates all tables in Supabase (PostgreSQL)
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS electricity_users (
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

  `CREATE INDEX IF NOT EXISTS idx_electricity_users_email ON electricity_users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_electricity_users_role ON electricity_users(role)`,

  // Consumer Accounts table
  `CREATE TABLE IF NOT EXISTS electricity_consumer_accounts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES electricity_users(id) ON DELETE CASCADE,
    consumer_number VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('residential', 'commercial', 'industrial', 'agricultural')),
    tariff_type VARCHAR(50) NOT NULL,
    sanctioned_load DECIMAL(10,2) NOT NULL,
    meter_number VARCHAR(50),
    connection_status VARCHAR(20) DEFAULT 'active' CHECK (connection_status IN ('active', 'disconnected', 'suspended')),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_consumer_number ON electricity_consumer_accounts(consumer_number)`,
  `CREATE INDEX IF NOT EXISTS idx_consumer_category ON electricity_consumer_accounts(category)`,

  // Applications table
  `CREATE TABLE IF NOT EXISTS electricity_applications (
    id SERIAL PRIMARY KEY,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT REFERENCES electricity_users(id) ON DELETE SET NULL,
    application_type VARCHAR(50) NOT NULL CHECK (application_type IN (
      'new_connection','change_of_load','change_of_name','address_correction',
      'reconnection','category_change','solar_rooftop','ev_charging','prepaid_recharge','meter_reading'
    )),
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN (
      'submitted','document_verification','site_inspection','approval_pending',
      'approved','rejected','work_in_progress','completed'
    )),
    application_data JSONB NOT NULL DEFAULT '{}',
    documents JSONB DEFAULT '[]',
    remarks TEXT,
    current_stage VARCHAR(100) DEFAULT 'Application Submitted',
    stage_history JSONB DEFAULT '[]',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by INT REFERENCES electricity_users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
  )`,

  `CREATE INDEX IF NOT EXISTS idx_app_number ON electricity_applications(application_number)`,
  `CREATE INDEX IF NOT EXISTS idx_app_status ON electricity_applications(status)`,
  `CREATE INDEX IF NOT EXISTS idx_app_type ON electricity_applications(application_type)`,

  // Bills table
  `CREATE TABLE IF NOT EXISTS electricity_bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    consumer_account_id INT NOT NULL REFERENCES electricity_consumer_accounts(id) ON DELETE CASCADE,
    billing_month VARCHAR(7) NOT NULL,
    units_consumed DECIMAL(10,2) NOT NULL,
    previous_reading DECIMAL(10,2),
    current_reading DECIMAL(10,2),
    energy_charges DECIMAL(10,2) NOT NULL,
    fixed_charges DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    subsidy_amount DECIMAL(10,2) DEFAULT 0,
    late_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'partial')),
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_bill_number ON electricity_bills(bill_number)`,
  `CREATE INDEX IF NOT EXISTS idx_bill_consumer ON electricity_bills(consumer_account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bill_status ON electricity_bills(status)`,
  `CREATE INDEX IF NOT EXISTS idx_bill_month ON electricity_bills(billing_month)`,

  // Payments table
  `CREATE TABLE IF NOT EXISTS electricity_payments (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    bill_id INT REFERENCES electricity_bills(id) ON DELETE SET NULL,
    consumer_account_id INT NOT NULL REFERENCES electricity_consumer_accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('upi','card','netbanking','cash','prepaid')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending','success','failed','refunded')),
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    receipt_number VARCHAR(50),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_payment_txn ON electricity_payments(transaction_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payment_consumer ON electricity_payments(consumer_account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payment_status ON electricity_payments(payment_status)`,

  // Complaints table
  `CREATE TABLE IF NOT EXISTS electricity_complaints (
    id SERIAL PRIMARY KEY,
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    consumer_account_id INT REFERENCES electricity_consumer_accounts(id) ON DELETE CASCADE,
    user_id INT REFERENCES electricity_users(id) ON DELETE CASCADE,
    complaint_type VARCHAR(30) NOT NULL CHECK (complaint_type IN (
      'power_outage','voltage_fluctuation','meter_fault','billing_dispute','service_quality','other'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    description TEXT NOT NULL,
    location TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','resolved','closed')),
    assigned_to INT REFERENCES electricity_users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    stage_history JSONB DEFAULT '[]',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  )`,

  `CREATE INDEX IF NOT EXISTS idx_complaint_number ON electricity_complaints(complaint_number)`,
  `CREATE INDEX IF NOT EXISTS idx_complaint_status ON electricity_complaints(status)`,
  `CREATE INDEX IF NOT EXISTS idx_complaint_priority ON electricity_complaints(priority)`,

  // Meter Readings table
  `CREATE TABLE IF NOT EXISTS electricity_meter_readings (
    id SERIAL PRIMARY KEY,
    consumer_account_id INT NOT NULL REFERENCES electricity_consumer_accounts(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    reading_value DECIMAL(10,2) NOT NULL,
    reading_type VARCHAR(20) NOT NULL CHECK (reading_type IN ('self','official','estimated')),
    submitted_by INT REFERENCES electricity_users(id) ON DELETE SET NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_meter_consumer ON electricity_meter_readings(consumer_account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_meter_date ON electricity_meter_readings(reading_date)`,

  // Prepaid Recharges table
  `CREATE TABLE IF NOT EXISTS electricity_prepaid_recharges (
    id SERIAL PRIMARY KEY,
    recharge_number VARCHAR(50) UNIQUE NOT NULL,
    consumer_account_id INT NOT NULL REFERENCES electricity_consumer_accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    units_credited DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
    recharged_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_recharge_number ON electricity_prepaid_recharges(recharge_number)`,
  `CREATE INDEX IF NOT EXISTS idx_recharge_consumer ON electricity_prepaid_recharges(consumer_account_id)`,

  // Notifications table
  `CREATE TABLE IF NOT EXISTS electricity_notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES electricity_users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info','warning','success','error')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_notif_user ON electricity_notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notif_read ON electricity_notifications(is_read)`,

  // Audit Log table
  `CREATE TABLE IF NOT EXISTS electricity_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES electricity_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_audit_user ON electricity_audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_entity ON electricity_audit_logs(entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON electricity_audit_logs(created_at)`,

  // System Settings table
  `CREATE TABLE IF NOT EXISTS electricity_system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INT REFERENCES electricity_users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // New Connection Applications table
  `CREATE TABLE IF NOT EXISTS electricity_new_connection_applications (
    id SERIAL PRIMARY KEY,
    application_id INT NOT NULL REFERENCES electricity_applications(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    father_husband_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male','female','other')),
    identity_type VARCHAR(30) NOT NULL CHECK (identity_type IN ('aadhar','pan','passport','voter_id','driving_license')),
    identity_number VARCHAR(50) NOT NULL,
    pan_number VARCHAR(10),
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    alternate_mobile VARCHAR(15),
    premises_address TEXT NOT NULL,
    landmark VARCHAR(255),
    plot_number VARCHAR(100) NOT NULL,
    khata_number VARCHAR(100),
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    ownership_type VARCHAR(20) NOT NULL CHECK (ownership_type IN ('owned','rented','leased','government')),
    category VARCHAR(50) NOT NULL,
    load_type VARCHAR(20) NOT NULL CHECK (load_type IN ('single_phase','three_phase')),
    required_load DECIMAL(10,2) NOT NULL,
    purpose TEXT NOT NULL,
    existing_consumer_number VARCHAR(50),
    supply_voltage VARCHAR(10) NOT NULL,
    phases VARCHAR(5) NOT NULL,
    connected_load DECIMAL(10,2),
    number_of_floors INT NOT NULL,
    built_up_area DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_nca_mobile ON electricity_new_connection_applications(mobile)`,
  `CREATE INDEX IF NOT EXISTS idx_nca_identity ON electricity_new_connection_applications(identity_type, identity_number)`,
  `CREATE INDEX IF NOT EXISTS idx_nca_category ON electricity_new_connection_applications(category)`,
  `CREATE INDEX IF NOT EXISTS idx_nca_pincode ON electricity_new_connection_applications(pincode)`,

  // Default system settings
  `INSERT INTO electricity_system_settings (setting_key, setting_value, description)
   VALUES
     ('tariff_residential_upto_100', '3.5', 'Residential tariff rate per unit up to 100 units'),
     ('tariff_residential_101_300', '5.0', 'Residential tariff rate per unit 101-300 units'),
     ('tariff_residential_above_300', '7.0', 'Residential tariff rate per unit above 300 units'),
     ('tariff_commercial', '8.5', 'Commercial tariff rate per unit'),
     ('tariff_industrial', '7.0', 'Industrial tariff rate per unit'),
     ('tariff_agricultural', '1.5', 'Agricultural tariff rate per unit'),
     ('fixed_charge_residential', '50', 'Fixed charge for residential connections'),
     ('fixed_charge_commercial', '200', 'Fixed charge for commercial connections'),
     ('tax_rate', '5', 'Tax percentage on electricity bills')
   ON CONFLICT (setting_key) DO NOTHING`,

  // Patch existing ownership_type constraint to include 'government'
  `DO $$
   BEGIN
     ALTER TABLE electricity_new_connection_applications
       DROP CONSTRAINT IF EXISTS electricity_new_connection_applications_ownership_type_check;
     ALTER TABLE electricity_new_connection_applications
       ADD CONSTRAINT electricity_new_connection_applications_ownership_type_check
       CHECK (ownership_type IN ('owned','rented','leased','government'));
   EXCEPTION WHEN others THEN NULL;
   END
   $$`,

  // Option A: make user_id nullable — customers don't need accounts
  `DO $$
   BEGIN
     ALTER TABLE electricity_applications
       ALTER COLUMN user_id DROP NOT NULL;
     ALTER TABLE electricity_applications
       DROP CONSTRAINT IF EXISTS electricity_applications_user_id_fkey;
     ALTER TABLE electricity_applications
       ADD CONSTRAINT electricity_applications_user_id_fkey
         FOREIGN KEY (user_id) REFERENCES electricity_users(id) ON DELETE SET NULL;
   EXCEPTION WHEN others THEN NULL;
   END
   $$`
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Starting Supabase (PostgreSQL) migrations for Electricity department...\n');

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

    console.log('\n✅ All migrations completed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});

