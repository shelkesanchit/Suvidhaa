/**
 * Update Municipal Applications CHECK constraints
 * Run this to fix the "violates check constraint" error
 *
 * Usage: node scripts/update-municipal-constraints.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function updateConstraints() {
  const client = await pool.connect();

  try {
    console.log('🔧 Updating municipal_applications constraints...\n');

    // Drop existing constraints
    const dropQueries = [
      'ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_application_type_ch',
      'ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_application_type_check',
      'ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_department_check',
    ];

    for (const query of dropQueries) {
      try {
        await client.query(query);
        console.log('✓ Dropped old constraint');
      } catch (e) {
        // Constraint might not exist
      }
    }

    // Add updated application_type constraint
    const appTypeConstraint = `
      ALTER TABLE municipal_applications ADD CONSTRAINT municipal_applications_application_type_check
      CHECK (application_type IN (
        'birth_certificate', 'death_certificate', 'cert_correction',
        'marriage_registration', 'marriage_certificate_reprint',
        'building_plan_approval', 'construction_commencement_notice',
        'occupancy_certificate',
        'grievance', 'grievance_lodge', 'rti_application', 'appointment_booking',
        'health_hygiene_license', 'food_establishment_license',
        'fogging_vector_control', 'environmental_clearance',
        'municipal_housing_application', 'municipal_quarter_rent_payment',
        'municipal_encroachment_report',
        'road_damage_report', 'streetlight_complaint',
        'drain_manhole_complaint', 'road_cutting_permit',
        'garbage_complaint', 'bulk_waste_pickup',
        'solid_waste_payment', 'sanitation_services_request',
        'noc_certificate', 'domicile_certificate', 'residence_certificate',
        'annual_subscription', 'advertisement_permit',
        'new_trade_license', 'trade_license_renewal',
        'property_tax_payment', 'property_self_assessment', 'self_assessment',
        'property_assessment_revision', 'tax_revision', 'property_mutation'
      ))
    `;

    await client.query(appTypeConstraint);
    console.log('✓ Added application_type constraint with all types');

    // Add updated department constraint
    const deptConstraint = `
      ALTER TABLE municipal_applications ADD CONSTRAINT municipal_applications_department_check
      CHECK (department IN (
        'vital_records', 'building', 'grievance', 'health_env',
        'housing', 'roads', 'sanitation', 'trade_license',
        'admin_services', 'property_tax', 'general'
      ))
    `;

    await client.query(deptConstraint);
    console.log('✓ Added department constraint with property_tax');

    console.log('\n✅ Constraints updated successfully!');
    console.log('   You can now submit Municipal Service forms.\n');

  } catch (error) {
    console.error('❌ Error updating constraints:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updateConstraints();
