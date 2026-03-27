/**
 * Run Municipal Applications Constraint Update
 *
 * This script updates the PostgreSQL CHECK constraints on municipal_applications
 * table to allow all application types used by the frontend forms.
 *
 * Usage: node scripts/run-constraint-update.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const dns = require('dns');

// Force IPv4 resolution on Windows (fixes ENOTFOUND errors)
dns.setDefaultResultOrder('ipv4first');

// Use pooler URL if available (same as main database config)
const DATABASE_URL = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set in .env file');
  console.error('Please add your Supabase PostgreSQL connection string to backend/.env');
  console.error('Example: DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres');
  console.error('\nTip: If you have IPv6 issues, set DATABASE_URL_POOLER to your Supabase Session Pooler URL');
  process.exit(1);
}

console.log('Using database URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateConstraints() {
  const client = await pool.connect();

  try {
    console.log('Connecting to database...');

    // Step 1: Drop ALL existing constraints (including variant names)
    console.log('Dropping existing constraints...');
    await client.query('ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_application_type_ch');
    await client.query('ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_application_type_check');
    await client.query('ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_department_ch');
    await client.query('ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_department_check');
    await client.query('ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_status_ch');
    await client.query('ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_status_check');
    console.log('✓ Existing constraints dropped');

    // Step 2: Add updated application_type constraint with ALL types
    console.log('Adding new application_type constraint...');
    await client.query(`
      ALTER TABLE municipal_applications ADD CONSTRAINT municipal_applications_application_type_check
      CHECK (application_type IN (
        -- Vital Records
        'birth_certificate', 'death_certificate', 'cert_correction',
        'marriage_registration', 'marriage_certificate_reprint',
        -- Building
        'building_plan_approval', 'construction_commencement_notice',
        'occupancy_certificate',
        -- Grievance / RTI
        'grievance', 'grievance_lodge', 'rti_application', 'appointment_booking',
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
        'new_trade_license', 'trade_license_renewal',
        -- Property Tax
        'property_tax_payment', 'property_self_assessment', 'self_assessment',
        'property_assessment_revision', 'tax_revision', 'property_mutation'
      ))
    `);
    console.log('✓ Application type constraint added');

    // Step 3: Add updated department constraint
    console.log('Adding new department constraint...');
    await client.query(`
      ALTER TABLE municipal_applications ADD CONSTRAINT municipal_applications_department_check
      CHECK (department IN (
        'vital_records', 'building', 'grievance', 'health_env',
        'housing', 'roads', 'sanitation', 'trade_license',
        'admin_services', 'property_tax', 'general'
      ))
    `);
    console.log('✓ Department constraint added');

    // Step 4: Verify
    console.log('Verifying constraints...');
    const result = await client.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'municipal_applications'::regclass
      AND contype = 'c'
    `);
    console.log('Current CHECK constraints:');
    result.rows.forEach(row => {
      console.log(`  - ${row.conname}`);
    });

    console.log('\n✅ SUCCESS: All constraints updated!');
    console.log('You can now submit municipal applications without constraint errors.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('\nThe municipal_applications table may not exist yet.');
      console.error('Make sure you have run the initial database setup first.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

updateConstraints();
