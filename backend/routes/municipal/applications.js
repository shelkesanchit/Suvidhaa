const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const supabase = require('../../config/supabase');

const BUCKET = process.env.MUNICIPAL_STORAGE_BUCKET || 'municipal-documents';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Maps application_type → { department, prefix }
const TYPE_META = {
  // Vital records
  birth_certificate:               { department: 'vital_records',  prefix: 'MBIRTH' },
  death_certificate:               { department: 'vital_records',  prefix: 'MDEATH' },
  cert_correction:                 { department: 'vital_records',  prefix: 'MCORR'  },
  marriage_registration:           { department: 'vital_records',  prefix: 'MMARR'  },
  marriage_certificate_reprint:    { department: 'vital_records',  prefix: 'MMCRP'  },
  // Building
  building_plan_approval:          { department: 'building',       prefix: 'MBPA'   },
  construction_commencement_notice:{ department: 'building',       prefix: 'MCCN'   },
  occupancy_certificate:           { department: 'building',       prefix: 'MOCC'   },
  // Grievance
  grievance:                       { department: 'grievance',      prefix: 'MGRV'   },
  grievance_lodge:                 { department: 'grievance',      prefix: 'MGRV'   },
  rti_application:                 { department: 'grievance',      prefix: 'MRTI'   },
  appointment_booking:             { department: 'grievance',      prefix: 'MAPPT'  },
  // Health & Environment
  health_hygiene_license:          { department: 'health_env',     prefix: 'MHHL'   },
  food_establishment_license:      { department: 'health_env',     prefix: 'MFEL'   },
  fogging_vector_control:          { department: 'health_env',     prefix: 'MFVC'   },
  environmental_clearance:         { department: 'health_env',     prefix: 'MENCL'  },
  // Housing
  municipal_housing_application:   { department: 'housing',        prefix: 'MHAUS'  },
  municipal_quarter_rent_payment:  { department: 'housing',        prefix: 'MQRENT' },
  municipal_encroachment_report:   { department: 'housing',        prefix: 'MENCR'  },
  // Roads
  road_damage_report:              { department: 'roads',          prefix: 'MRDR'   },
  streetlight_complaint:           { department: 'roads',          prefix: 'MSLC'   },
  drain_manhole_complaint:         { department: 'roads',          prefix: 'MDMC'   },
  road_cutting_permit:             { department: 'roads',          prefix: 'MRCP'   },
  // Sanitation
  garbage_complaint:               { department: 'sanitation',     prefix: 'MGCO'   },
  bulk_waste_pickup:               { department: 'sanitation',     prefix: 'MBWP'   },
  solid_waste_payment:             { department: 'sanitation',     prefix: 'MSWP'   },
  sanitation_services_request:     { department: 'sanitation',     prefix: 'MSSR'   },
  // Admin services
  noc_certificate:                 { department: 'admin_services', prefix: 'MNOCC'  },
  domicile_certificate:            { department: 'admin_services', prefix: 'MDOMC'  },
  residence_certificate:           { department: 'admin_services', prefix: 'MRESC'  },
  annual_subscription:             { department: 'admin_services', prefix: 'MANSUB' },
  advertisement_permit:            { department: 'admin_services', prefix: 'MADVP'  },
  // Trade license
  new_trade_license:               { department: 'trade_license',  prefix: 'MNTL'   },
  trade_license_renewal:           { department: 'trade_license',  prefix: 'MTLR'   },
  // Property Tax
  property_tax_payment:            { department: 'property_tax',   prefix: 'MPTXP'  },
  property_self_assessment:        { department: 'property_tax',   prefix: 'MPSA'   },
  self_assessment:                 { department: 'property_tax',   prefix: 'MPSA'   },
  property_assessment_revision:    { department: 'property_tax',   prefix: 'MPAR'   },
  tax_revision:                    { department: 'property_tax',   prefix: 'MPAR'   },
  property_mutation:               { department: 'property_tax',   prefix: 'MPMUT'  },
};

async function ensureBucket() {
  try {
    const { data: list } = await supabase.storage.listBuckets();
    if (list && !list.some(b => b.name === BUCKET)) {
      const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
      if (error && !error.message.includes('already exists')) {
        console.warn('Municipal bucket auto-create warning:', error.message);
      }
    }
  } catch (e) {
    console.warn('Municipal ensureBucket warning:', e.message);
  }
}

async function uploadDocuments(applicationId, documents) {
  if (!documents || documents.length === 0) return [];
  await ensureBucket();
  const processed = [];
  for (const doc of documents) {
    try {
      if (doc.data || doc.file_data) {
        const raw = doc.data || doc.file_data;
        // Strip data URL prefix if present
        const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
        const buffer = Buffer.from(base64, 'base64');
        const ext = (doc.name || doc.file_name || 'file').split('.').pop().toLowerCase() || 'bin';
        const filename = `applications/${applicationId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(filename, buffer, {
            contentType: doc.type || doc.mime_type || 'application/octet-stream',
            upsert: false
          });
        if (error) throw new Error(error.message);
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        processed.push({
          name: doc.name || doc.file_name,
          type: doc.type || doc.mime_type,
          size: doc.size,
          documentType: doc.documentType || doc.document_type || '',
          url: urlData.publicUrl,
          uploadedAt: new Date().toISOString()
        });
      } else if (doc.url) {
        processed.push({
          name: doc.name || doc.file_name,
          type: doc.type || doc.mime_type,
          size: doc.size,
          documentType: doc.documentType || doc.document_type || '',
          url: doc.url,
          uploadedAt: doc.uploadedAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Municipal document upload failed for', doc.name || doc.file_name, ':', err.message);
    }
  }
  return processed;
}

// Extract common contact fields from application_data (each form uses different key names)
function extractContact(appData) {
  return {
    full_name: appData.full_name || appData.fullName || appData.groom_first_name
      || appData.name || appData.applicant_name || appData.contact_name
      || appData.tl_proprietor_name || appData.bp_owner_name
      || appData.hl_name || appData.fe_proprietor_name || '',
    mobile: appData.mobile || appData.contact_number || appData.groom_mobile
      || appData.informant_mobile || appData.tl_mobile || appData.bp_mobile
      || appData.hl_mobile || appData.fe_proprietor_mobile || '',
    email: appData.email || appData.groom_email || appData.tl_email
      || appData.bp_email || appData.hl_email || null,
    ward: appData.ward || appData.birth_ward || appData.deceased_ward
      || appData.tl_ward || appData.bp_ward || appData.hl_ward || null,
    address: appData.address || appData.parent_address || appData.informant_address
      || appData.tl_business_address || appData.bp_plot_address || null,
  };
}

// ─── POST /applications/submit ───────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { application_type, application_data, documents } = req.body;

    if (!application_type) {
      return res.status(400).json({ success: false, message: 'application_type is required' });
    }

    const meta = TYPE_META[application_type];
    if (!meta) {
      return res.status(400).json({ success: false, message: `Unknown application_type: ${application_type}` });
    }

    const year   = new Date().getFullYear();
    const appData = application_data || {};
    const contact = extractContact(appData);

    const stageHistory = [{
      stage: 'Application Submitted',
      status: 'submitted',
      timestamp: new Date().toISOString(),
      remarks: 'Application submitted successfully'
    }];

    // Insert with placeholder application_number, then update once we have the id
    const insertResult = await client.query(
      `INSERT INTO municipal_applications
         (application_number, application_type, department,
          full_name, mobile, email, ward, address,
          application_data, documents, status, current_stage, stage_history)
       VALUES ('PENDING', $1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', 'Application Submitted', $10)
       RETURNING id`,
      [
        application_type, meta.department,
        contact.full_name, contact.mobile, contact.email, contact.ward, contact.address,
        JSON.stringify(appData), JSON.stringify([]), JSON.stringify(stageHistory)
      ]
    );

    const applicationId     = insertResult.rows[0].id;
    const applicationNumber = `${meta.prefix}${year}${String(applicationId).padStart(6, '0')}`;

    await client.query(
      'UPDATE municipal_applications SET application_number = $1 WHERE id = $2',
      [applicationNumber, applicationId]
    );

    // Upload documents if provided
    const docsArray = Array.isArray(documents)
      ? documents
      : (documents && typeof documents === 'object' ? Object.values(documents) : []);

    const processedDocs = await uploadDocuments(applicationId, docsArray);
    if (processedDocs.length > 0) {
      await client.query(
        'UPDATE municipal_applications SET documents = $1 WHERE id = $2',
        [JSON.stringify(processedDocs), applicationId]
      );
    }

    // Auto-insert notification for the applicant
    try {
      const typeLabel = application_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      await client.query(
        `INSERT INTO municipal_notifications
           (mobile, email, title, message, type, reference_number)
         VALUES ($1, $2, $3, $4, 'success', $5)`,
        [contact.mobile || null, contact.email || null,
         'Application Submitted',
         `Your ${typeLabel} application ${applicationNumber} has been received and is under review.`,
         applicationNumber]
      );
    } catch (_) { /* notification failure must not block submission */ }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application_number: applicationNumber,
        application_id: applicationId,
        department: meta.department,
        status: 'submitted'
      }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Submit municipal application error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (client) client.release();
  }
});

// ─── GET /applications/track/:applicationNumber ──────────────────────────────
router.get('/track/:applicationNumber', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT application_number, application_type, department,
              full_name, mobile, email, ward, address,
              status, current_stage, stage_history,
              submitted_at, reviewed_at, completed_at, remarks
       FROM municipal_applications
       WHERE application_number = $1`,
      [req.params.applicationNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Track municipal application error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /applications/my-applications/:mobile ───────────────────────────────
router.get('/my-applications/:mobile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, application_number, application_type, department,
              status, current_stage, submitted_at
       FROM municipal_applications
       WHERE mobile = $1
       ORDER BY submitted_at DESC`,
      [req.params.mobile]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get municipal applications by mobile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
