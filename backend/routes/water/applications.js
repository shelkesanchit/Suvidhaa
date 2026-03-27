const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const supabase = require('../../config/supabase');

const BUCKET = process.env.WATER_STORAGE_BUCKET || 'water-documents';

async function ensureBucket() {
  try {
    const { data: list } = await supabase.storage.listBuckets();
    if (list && !list.some(b => b.name === BUCKET)) {
      const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
      if (error && !error.message.includes('already exists')) {
        console.warn('Water bucket auto-create warning:', error.message);
      }
    }
  } catch (e) {
    console.warn('ensureBucket warning:', e.message);
  }
}

async function uploadDocuments(applicationId, documents) {
  if (!documents || documents.length === 0) return [];
  await ensureBucket();
  const processed = [];
  for (const doc of documents) {
    try {
      if (doc.data) {
        const buffer = Buffer.from(doc.data, 'base64');
        const ext = (doc.name || 'file').split('.').pop().toLowerCase() || 'bin';
        const filename = `applications/${applicationId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(filename, buffer, { contentType: doc.type || 'application/octet-stream', upsert: false });
        if (error) throw new Error(error.message);
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        processed.push({ name: doc.name, type: doc.type, size: doc.size, documentType: doc.documentType || '', url: urlData.publicUrl, uploadedAt: new Date().toISOString() });
      } else if (doc.url) {
        processed.push({ name: doc.name, type: doc.type, size: doc.size, documentType: doc.documentType || '', url: doc.url, uploadedAt: doc.uploadedAt || new Date().toISOString() });
      }
    } catch (err) {
      console.error('Water document upload failed for', doc.name, ':', err.message);
    }
  }
  return processed;
}

// Submit new water application
router.post('/submit', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { application_type, application_data, documents } = req.body;

    // Validation
    if (!application_type || !application_data) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'application_type and application_data are required' });
    }

    const appData = application_data || {};
    const fullName = appData.full_name || appData.applicant_name || '';
    const mobile = appData.mobile || appData.contact_number || '';

    if (!fullName || !mobile) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Full name and mobile number are required' });
    }

    if (!/^\d{10}$/.test(String(mobile))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Mobile number must be 10 digits' });
    }

    const year = new Date().getFullYear();
    const typePrefix = {
      'new_connection': 'WNC', 'reconnection': 'WRC', 'disconnection': 'WDC',
      'transfer': 'WTR', 'pipe_size_change': 'WPS', 'meter_change': 'WMC',
      'tanker_service': 'WTS', 'connection_management': 'WCM'
    }[application_type] || 'WAPP';

    const stageHistory = [{
      stage: 'Application Submitted', status: 'submitted',
      timestamp: new Date().toISOString(), remarks: 'Application submitted successfully'
    }];

    const email = appData.email || null;

    // Construct address from property details if not directly provided
    let address = appData.address || appData.property_address || appData.delivery_address || '';
    if (!address && (appData.house_flat_no || appData.building_name || appData.landmark)) {
      const addressParts = [
        appData.house_flat_no,
        appData.building_name,
        appData.landmark,
        appData.ward ? `Ward ${appData.ward}` : ''
      ].filter(Boolean);
      address = addressParts.join(', ');
    }

    const ward = appData.ward || null;

    const insertResult = await client.query(
      `INSERT INTO water_applications
       (application_number, application_type, full_name, mobile, email, address, ward,
        application_data, documents, status, current_stage, stage_history)
       VALUES ('PENDING', $1, $2, $3, $4, $5, $6, $7, $8, 'submitted', 'Application Submitted', $9)
       RETURNING id`,
      [application_type, fullName, mobile, email, address, ward,
       JSON.stringify(appData), JSON.stringify([]), JSON.stringify(stageHistory)]
    );

    const applicationId = insertResult.rows[0].id;
    const applicationNumber = `${typePrefix}${year}${String(applicationId).padStart(6, '0')}`;

    await client.query('UPDATE water_applications SET application_number = $1 WHERE id = $2', [applicationNumber, applicationId]);

    const processedDocs = await uploadDocuments(applicationId, documents);
    if (processedDocs.length > 0) {
      await client.query('UPDATE water_applications SET documents = $1 WHERE id = $2', [JSON.stringify(processedDocs), applicationId]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Water application submitted successfully',
      data: { application_number: applicationNumber, application_id: applicationId }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Submit water application error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (client) client.release();
  }
});

// Track application status
router.get('/track/:applicationNumber', async (req, res) => {
  try {
    const { applicationNumber } = req.params;
    const result = await pool.query(
      `SELECT application_number, application_type, full_name, mobile, email, address, ward,
              status, current_stage, stage_history, submitted_at, reviewed_at, completed_at,
              assigned_engineer, remarks, application_data
       FROM water_applications WHERE application_number = $1`,
      [applicationNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Track water application error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get applications by mobile number
router.get('/my-applications/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const result = await pool.query(
      `SELECT id, application_number, application_type, status, current_stage, submitted_at
       FROM water_applications WHERE mobile = $1 ORDER BY submitted_at DESC`,
      [mobile]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get water applications by mobile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
