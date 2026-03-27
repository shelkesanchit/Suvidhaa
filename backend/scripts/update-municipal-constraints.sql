-- Update Municipal Applications CHECK Constraints
-- Run this to fix the "violates check constraint" error

-- Step 1: Drop ALL existing constraints (including any variant names)
ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_application_type_ch;
ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_application_type_check;
ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_department_ch;
ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_department_check;
ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_status_check;
ALTER TABLE municipal_applications DROP CONSTRAINT IF EXISTS municipal_applications_status_ch;

-- Step 2: Add updated application_type constraint with ALL types
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
));

-- Step 3: Add updated department constraint
ALTER TABLE municipal_applications ADD CONSTRAINT municipal_applications_department_check
CHECK (department IN (
  'vital_records', 'building', 'grievance', 'health_env',
  'housing', 'roads', 'sanitation', 'trade_license',
  'admin_services', 'property_tax', 'general'
));

-- Verify the update
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'municipal_applications'::regclass;
