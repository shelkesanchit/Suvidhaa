const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

/**
 * Municipal Department Database Migration
 * Creates all tables in Supabase (PostgreSQL)
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrations = [
  // ─── 1. Users table (admin / staff) ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS municipal_users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  DEFAULT 'staff'
                  CHECK (role IN ('customer', 'admin', 'staff')),
    full_name     VARCHAR(255) NOT NULL,
    phone         VARCHAR(15)  NOT NULL,
    department    VARCHAR(100),
    is_active     BOOLEAN      DEFAULT true,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_users_email ON municipal_users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_users_role  ON municipal_users(role)`,

  // ─── 2. Applications table (universal – all service types stored here) ───────
  `CREATE TABLE IF NOT EXISTS municipal_applications (
    id                 SERIAL PRIMARY KEY,
    application_number VARCHAR(60)  UNIQUE NOT NULL,
    application_type   VARCHAR(60)  NOT NULL CHECK (application_type IN (
      -- Vital Records
      'birth_certificate', 'death_certificate', 'cert_correction',
      'marriage_registration',
      -- Building
      'building_plan_approval', 'construction_commencement_notice',
      'occupancy_certificate',
      -- Grievance / RTI
      'grievance_lodge', 'rti_application', 'appointment_booking',
      -- Health & Environment
      'health_hygiene_license', 'food_establishment_license',
      'fogging_vector_control', 'environmental_clearance',
      -- Housing
      'municipal_housing_application', 'municipal_quarter_rent_payment',
      'municipal_encroachment_report',
      -- Roads & Infrastructure
      'road_damage_report', 'streetlight_complaint',
      'drain_manhole_complaint', 'road_cutting_permit',
      -- Sanitation
      'garbage_complaint', 'bulk_waste_pickup',
      'solid_waste_payment', 'sanitation_services_request',
      -- Admin / Certificates
      'noc_certificate', 'domicile_certificate', 'residence_certificate',
      'annual_subscription', 'advertisement_permit',
      -- Trade License
      'new_trade_license'
    )),
    department         VARCHAR(50)  NOT NULL DEFAULT 'general' CHECK (department IN (
      'vital_records', 'building', 'grievance', 'health_env',
      'housing', 'roads', 'sanitation', 'trade_license', 'admin_services', 'general'
    )),
    -- Applicant contact (top-level for quick search/display)
    full_name          VARCHAR(255) NOT NULL DEFAULT '',
    mobile             VARCHAR(15)  NOT NULL DEFAULT '',
    email              VARCHAR(255),
    ward               VARCHAR(100),
    address            TEXT,
    -- Payload
    application_data   JSONB        NOT NULL DEFAULT '{}',
    documents          JSONB                 DEFAULT '[]',
    -- Workflow
    status             VARCHAR(50)  DEFAULT 'submitted' CHECK (status IN (
      'submitted', 'document_verification', 'under_review',
      'approval_pending', 'approved', 'rejected',
      'work_in_progress', 'completed', 'closed'
    )),
    current_stage      VARCHAR(150) DEFAULT 'Application Submitted',
    stage_history      JSONB                 DEFAULT '[]',
    remarks            TEXT,
    assigned_to        INT REFERENCES municipal_users(id) ON DELETE SET NULL,
    reviewed_by        INT REFERENCES municipal_users(id) ON DELETE SET NULL,
    submitted_at       TIMESTAMPTZ  DEFAULT NOW(),
    reviewed_at        TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_app_number   ON municipal_applications(application_number)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_app_type     ON municipal_applications(application_type)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_app_dept     ON municipal_applications(department)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_app_status   ON municipal_applications(status)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_app_mobile   ON municipal_applications(mobile)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_app_ward     ON municipal_applications(ward)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_app_submitted ON municipal_applications(submitted_at DESC)`,

  // ─── 3. Payments table ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS municipal_payments (
    id                  SERIAL PRIMARY KEY,
    transaction_id      VARCHAR(100) UNIQUE NOT NULL,
    application_id      INT REFERENCES municipal_applications(id) ON DELETE SET NULL,
    application_number  VARCHAR(60),
    payer_name          VARCHAR(255) NOT NULL,
    mobile              VARCHAR(15)  NOT NULL,
    amount              DECIMAL(10,2) NOT NULL,
    payment_type        VARCHAR(60)  NOT NULL DEFAULT 'application_fee',
    payment_method      VARCHAR(20)  NOT NULL CHECK (payment_method IN (
      'upi', 'card', 'netbanking', 'cash', 'counter', 'online'
    )),
    payment_status      VARCHAR(20)  DEFAULT 'pending' CHECK (payment_status IN (
      'pending', 'success', 'failed', 'refunded'
    )),
    razorpay_order_id   VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature  VARCHAR(255),
    receipt_number      VARCHAR(60),
    payment_date        TIMESTAMPTZ  DEFAULT NOW(),
    remarks             TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_pay_txn    ON municipal_payments(transaction_id)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_pay_app    ON municipal_payments(application_number)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_pay_status ON municipal_payments(payment_status)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_pay_mobile ON municipal_payments(mobile)`,

  // ─── 4. System Settings table ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS municipal_system_settings (
    id            SERIAL PRIMARY KEY,
    setting_key   VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT         NOT NULL,
    description   TEXT,
    updated_by    INT REFERENCES municipal_users(id) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
  )`,

  // Default settings
  `INSERT INTO municipal_system_settings (setting_key, setting_value, description)
   VALUES
     ('birth_cert_fee',           '50',   'Birth certificate issuance fee (INR)'),
     ('death_cert_fee',           '50',   'Death certificate issuance fee (INR)'),
     ('marriage_reg_fee',         '100',  'Marriage registration fee (INR)'),
     ('trade_license_fee_min',    '500',  'Minimum trade license fee (INR)'),
     ('building_permit_fee_rate', '5',    'Building plan approval fee per sqm (INR)'),
     ('noc_fee',                  '200',  'NOC certificate fee (INR)'),
     ('domicile_cert_fee',        '30',   'Domicile certificate fee (INR)'),
     ('advertisement_fee_monthly','1000', 'Advertisement/hoarding fee per month (INR)'),
     ('road_cutting_permit_fee',  '2000', 'Road cutting permit base fee (INR)'),
     ('grievance_sla_days',       '15',   'SLA days to resolve grievance'),
     ('rti_response_days',        '30',   'RTI response days as per RTI Act')
   ON CONFLICT (setting_key) DO NOTHING`,

  // ─── 5. Consumers table (registered citizens / property owners) ─────────────
  `CREATE TABLE IF NOT EXISTS municipal_consumers (
    id              SERIAL PRIMARY KEY,
    consumer_number VARCHAR(60)  UNIQUE NOT NULL,
    user_id         INT REFERENCES municipal_users(id) ON DELETE SET NULL,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    mobile          VARCHAR(15)  NOT NULL,
    aadhaar_number  VARCHAR(12),
    pan_number      VARCHAR(10),
    dob             DATE,
    gender          VARCHAR(10)  CHECK (gender IN ('male', 'female', 'other')),
    address         TEXT,
    ward            VARCHAR(100),
    city            VARCHAR(100),
    pincode         VARCHAR(10),
    consumer_type   VARCHAR(20)  DEFAULT 'resident'
                    CHECK (consumer_type IN ('resident', 'commercial', 'institution')),
    is_active       BOOLEAN      DEFAULT true,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_con_number  ON municipal_consumers(consumer_number)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_con_mobile  ON municipal_consumers(mobile)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_con_aadhaar ON municipal_consumers(aadhaar_number)`,

  // ─── 6. Complaints table ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS municipal_complaints (
    id                 SERIAL PRIMARY KEY,
    complaint_number   VARCHAR(60)  UNIQUE NOT NULL,
    consumer_id        INT REFERENCES municipal_consumers(id) ON DELETE SET NULL,
    contact_name       VARCHAR(255) NOT NULL DEFAULT '',
    mobile             VARCHAR(15)  NOT NULL DEFAULT '',
    email              VARCHAR(255),
    ward               VARCHAR(100),
    address            TEXT,
    department         VARCHAR(30)  DEFAULT 'general'
                       CHECK (department IN (
                         'roads', 'sanitation', 'water_supply',
                         'electricity', 'health', 'housing', 'general'
                       )),
    complaint_category VARCHAR(80)  NOT NULL,
    urgency            VARCHAR(20)  DEFAULT 'medium'
                       CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    description        TEXT         NOT NULL,
    status             VARCHAR(20)  DEFAULT 'open'
                       CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
    assigned_to        INT REFERENCES municipal_users(id) ON DELETE SET NULL,
    resolution_notes   TEXT,
    documents          JSONB        DEFAULT '[]',
    stage_history      JSONB        DEFAULT '[]',
    submitted_at       TIMESTAMPTZ  DEFAULT NOW(),
    resolved_at        TIMESTAMPTZ
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_comp_number  ON municipal_complaints(complaint_number)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_comp_status  ON municipal_complaints(status)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_comp_dept    ON municipal_complaints(department)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_comp_mobile  ON municipal_complaints(mobile)`,

  // ─── 7. Bills table (property tax / SW charges / housing rent) ───────────────
  `CREATE TABLE IF NOT EXISTS municipal_bills (
    id               SERIAL PRIMARY KEY,
    bill_number      VARCHAR(60)   UNIQUE NOT NULL,
    consumer_id      INT           NOT NULL REFERENCES municipal_consumers(id) ON DELETE CASCADE,
    bill_type        VARCHAR(30)   NOT NULL DEFAULT 'property_tax'
                     CHECK (bill_type IN (
                       'property_tax', 'solid_waste_charges',
                       'housing_rent', 'water_tax', 'other'
                     )),
    bill_period      VARCHAR(7)    NOT NULL,
    base_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount       DECIMAL(10,2) DEFAULT 0,
    penalty_amount   DECIMAL(10,2) DEFAULT 0,
    arrears          DECIMAL(10,2) DEFAULT 0,
    total_amount     DECIMAL(10,2) NOT NULL,
    due_date         DATE,
    status           VARCHAR(20)   DEFAULT 'unpaid'
                     CHECK (status IN ('unpaid', 'paid', 'overdue', 'partial')),
    payment_date     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_bill_number     ON municipal_bills(bill_number)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_bill_consumer   ON municipal_bills(consumer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_bill_status     ON municipal_bills(status)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_bill_type       ON municipal_bills(bill_type)`,

  // ─── 8. Licenses table (issued trade / health / food / advertisement) ─────────
  `CREATE TABLE IF NOT EXISTS municipal_licenses (
    id              SERIAL PRIMARY KEY,
    license_number  VARCHAR(60)  UNIQUE NOT NULL,
    application_id  INT REFERENCES municipal_applications(id) ON DELETE SET NULL,
    consumer_id     INT REFERENCES municipal_consumers(id) ON DELETE SET NULL,
    license_type    VARCHAR(40)  NOT NULL
                    CHECK (license_type IN (
                      'trade_license', 'health_hygiene', 'food_establishment',
                      'advertisement_permit', 'building_permit', 'road_cutting'
                    )),
    business_name   VARCHAR(255),
    owner_name      VARCHAR(255) NOT NULL DEFAULT '',
    mobile          VARCHAR(15)  NOT NULL DEFAULT '',
    address         TEXT,
    ward            VARCHAR(100),
    valid_from      DATE,
    valid_until     DATE,
    status          VARCHAR(20)  DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'suspended', 'cancelled')),
    issued_by       INT REFERENCES municipal_users(id) ON DELETE SET NULL,
    issued_at       TIMESTAMPTZ  DEFAULT NOW(),
    license_data    JSONB        DEFAULT '{}'
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_lic_number  ON municipal_licenses(license_number)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_lic_type    ON municipal_licenses(license_type)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_lic_status  ON municipal_licenses(status)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_lic_mobile  ON municipal_licenses(mobile)`,

  // ─── 9. Certificates table (issued birth / death / marriage / domicile) ───────
  `CREATE TABLE IF NOT EXISTS municipal_certificates (
    id                 SERIAL PRIMARY KEY,
    certificate_number VARCHAR(60)  UNIQUE NOT NULL,
    application_id     INT REFERENCES municipal_applications(id) ON DELETE SET NULL,
    certificate_type   VARCHAR(40)  NOT NULL
                       CHECK (certificate_type IN (
                         'birth_certificate', 'death_certificate',
                         'marriage_certificate', 'domicile_certificate',
                         'residence_certificate', 'noc_certificate'
                       )),
    full_name          VARCHAR(255) NOT NULL DEFAULT '',
    mobile             VARCHAR(15),
    email              VARCHAR(255),
    ward               VARCHAR(100),
    event_date         DATE,
    certificate_data   JSONB        DEFAULT '{}',
    issued_by          INT REFERENCES municipal_users(id) ON DELETE SET NULL,
    issued_at          TIMESTAMPTZ  DEFAULT NOW(),
    status             VARCHAR(20)  DEFAULT 'issued'
                       CHECK (status IN ('issued', 'cancelled'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_cert_number  ON municipal_certificates(certificate_number)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_cert_type    ON municipal_certificates(certificate_type)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_cert_mobile  ON municipal_certificates(mobile)`,

  // ─── 10. Notifications table ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS municipal_notifications (
    id               SERIAL PRIMARY KEY,
    consumer_id      INT REFERENCES municipal_consumers(id) ON DELETE SET NULL,
    mobile           VARCHAR(15),
    email            VARCHAR(255),
    title            VARCHAR(255) NOT NULL,
    message          TEXT         NOT NULL,
    type             VARCHAR(20)  DEFAULT 'info'
                     CHECK (type IN ('info', 'success', 'warning', 'error')),
    reference_number VARCHAR(60),
    is_read          BOOLEAN      DEFAULT false,
    created_at       TIMESTAMPTZ  DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_notif_mobile  ON municipal_notifications(mobile)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_notif_email   ON municipal_notifications(email)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_notif_is_read ON municipal_notifications(is_read)`,

  // ─── 11. Audit logs table ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS municipal_audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES municipal_users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INT,
    details     JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ  DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_muni_audit_user   ON municipal_audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_audit_entity ON municipal_audit_logs(entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_muni_audit_time   ON municipal_audit_logs(created_at DESC)`,

  // ─── Extra settings for new tables ───────────────────────────────────────────
  `INSERT INTO municipal_system_settings (setting_key, setting_value, description)
   VALUES
     ('property_tax_residential_rate', '0.5',  'Annual property tax rate % for residential'),
     ('property_tax_commercial_rate',  '1.0',  'Annual property tax rate % for commercial'),
     ('sw_charges_monthly',            '80',   'Solid waste charges per month per household (INR)'),
     ('housing_rent_monthly',          '500',  'Base monthly rent for govt quarter (INR)'),
     ('license_renewal_reminder_days', '30',   'Days before expiry to send license renewal reminder'),
     ('complaint_escalation_days',     '7',    'Days after which unresolved complaint is escalated'),
     ('helpline_number',               '1800',  'Municipal helpline number')
   ON CONFLICT (setting_key) DO NOTHING`,

  // ─── 12. Make nullable columns safe after creation ───────────────────────────
  `DO $$
   BEGIN
     ALTER TABLE municipal_applications ALTER COLUMN full_name DROP NOT NULL;
   EXCEPTION WHEN others THEN NULL;
   END $$`,

   `DO $$
   BEGIN
     ALTER TABLE municipal_applications ALTER COLUMN mobile DROP NOT NULL;
   EXCEPTION WHEN others THEN NULL;
   END $$`
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Starting Supabase (PostgreSQL) migrations for Municipal department...\n');

    for (let i = 0; i < migrations.length; i++) {
      const sql = migrations[i];
      const label = sql.trim().split('\n')[0].substring(0, 90);
      try {
        await client.query(sql);
        console.log(`✓ [${i + 1}/${migrations.length}] ${label}`);
      } catch (err) {
        console.error(`✗ [${i + 1}/${migrations.length}] ${label}`);
        console.error('  Error:', err.message);
        throw err;
      }
    }

    console.log('\n✅ All municipal migrations completed successfully!');

    // Seed default admin user
    const hashedPwd = await bcrypt.hash('MuniAdmin@123', 10);
    await client.query(`
      INSERT INTO municipal_users (email, password, role, full_name, phone, department, is_active)
      VALUES ('municipal.admin@municipal.gov', $1, 'admin', 'Municipal Admin', '9999999999', 'general', true)
      ON CONFLICT (email) DO NOTHING
    `, [hashedPwd]);
    console.log('\n👤 Default admin created (or already exists):');
    console.log('   Email   : municipal.admin@municipal.gov');
    console.log('   Password: MuniAdmin@123');
    console.log('   ⚠️  Change this password after first login!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('\n❌ Municipal migration failed:', err.message);
  process.exit(1);
});
