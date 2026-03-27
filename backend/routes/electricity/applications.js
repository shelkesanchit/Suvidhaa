const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../../config/database');
const { verifyToken } = require('../../middleware/auth');
const multer = require('multer');
const supabase = require('../../config/supabase');
const path = require('path');

// Use memory storage for Supabase upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDF, and document files are allowed'));
    }
  }
});

// Ensure the storage bucket exists (best-effort — logs warning but never throws)
async function ensureBucket(bucket) {
  try {
    const { data: list } = await supabase.storage.listBuckets();
    const exists = list && list.some(b => b.name === bucket);
    if (!exists) {
      const { error } = await supabase.storage.createBucket(bucket, { public: true });
      if (error && !error.message.includes('already exists')) {
        console.warn('Storage bucket auto-create failed (create it manually in Supabase Dashboard):', error.message);
      }
    }
  } catch (e) {
    console.warn('ensureBucket warning:', e.message);
  }
}

// Upload file to Supabase Storage
async function uploadToSupabase(file, folder) {
  const filename = folder + '/' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'electricity-documents';

  await ensureBucket(bucket);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw new Error('Storage upload failed: ' + error.message);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
  return urlData.publicUrl;
}

// Optional auth — attaches req.user from JWT if provided, otherwise resolves user from form data
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query(
        'SELECT id, email, role, full_name, is_active FROM electricity_users WHERE id = $1',
        [decoded.id]
      );
      if (result.rows.length > 0 && result.rows[0].is_active) {
        req.user = result.rows[0];
      }
    } catch (_) { /* invalid/expired token — continue as guest */ }
  }
  next();
};

// Submit new application
router.post('/submit', optionalAuth, [
  body('application_type').isIn([
    'new_connection','change_of_load','change_of_name','address_correction',
    'reconnection','category_change','solar_rooftop','ev_charging','prepaid_recharge','meter_reading'
  ]),
  body('application_data').isObject()
], async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await client.query('BEGIN');

    const { application_type, application_data, documents } = req.body;
    // user_id is optional — only set if an admin/staff token was provided
    const userId = req.user?.id || null;

    const year = new Date().getFullYear();
    const typePrefix = {
      'new_connection': 'NC','change_of_load': 'CL','change_of_name': 'CN',
      'address_correction': 'AC','reconnection': 'RC','category_change': 'CC',
      'solar_rooftop': 'SR','ev_charging': 'EV','prepaid_recharge': 'PR','meter_reading': 'MR'
    }[application_type] || 'APP';

    const stageHistory = [{
      stage: 'Application Submitted', status: 'submitted',
      timestamp: new Date().toISOString(), remarks: 'Application submitted successfully'
    }];

    // Insert first to get the auto-generated id, then derive a race-condition-free application_number from it
    const result = await client.query(
      `INSERT INTO electricity_applications
       (application_number, user_id, application_type, application_data, documents, status, current_stage, stage_history)
       VALUES ('PENDING', $1, $2, $3, $4, 'submitted', 'Application Submitted', $5) RETURNING id`,
      [userId, application_type,
       JSON.stringify(application_data), JSON.stringify([]), JSON.stringify(stageHistory)]
    );

    const applicationId = result.rows[0].id;
    const applicationNumber = typePrefix + year + String(applicationId).padStart(6, '0');

    await client.query(
      'UPDATE electricity_applications SET application_number = $1 WHERE id = $2',
      [applicationNumber, applicationId]
    );

    // Upload base64 documents to Supabase Storage and replace with public URLs
    let processedDocuments = [];
    if (documents && documents.length > 0) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'electricity-documents';
      for (const doc of documents) {
        try {
          if (doc.data) {
            // base64 → Buffer
            const buffer = Buffer.from(doc.data, 'base64');
            const ext = (doc.name || 'file').split('.').pop().toLowerCase() || 'bin';
            const filename = `applications/${applicationId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(filename, buffer, { contentType: doc.type || 'application/octet-stream', upsert: false });
            if (uploadError) throw new Error(uploadError.message);
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
            processedDocuments.push({
              name: doc.name,
              type: doc.type,
              size: doc.size,
              documentType: doc.documentType || '',
              url: urlData.publicUrl,
              uploadedAt: new Date().toISOString(),
            });
          } else if (doc.url) {
            // Already a URL (e.g. re-submission), keep as-is without the base64
            processedDocuments.push({ name: doc.name, type: doc.type, size: doc.size, documentType: doc.documentType || '', url: doc.url, uploadedAt: doc.uploadedAt || new Date().toISOString() });
          }
        } catch (uploadErr) {
          console.error('Document upload failed for', doc.name, ':', uploadErr.message);
          // Skip failed uploads rather than failing the whole application
        }
      }
      if (processedDocuments.length > 0) {
        await client.query(
          'UPDATE electricity_applications SET documents = $1 WHERE id = $2',
          [JSON.stringify(processedDocuments), applicationId]
        );
      }
    }

    if (application_type === 'new_connection') {
      const d = application_data;
      const required = ['full_name','father_husband_name','date_of_birth','gender','identity_type','identity_number','email','mobile','premises_address','plot_number','district','city','state','pincode','ownership_type','category','load_type','required_load','purpose','supply_voltage','phases','number_of_floors','built_up_area'];
      const missing = required.filter(f => !d[f] || d[f] === '');
      if (missing.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Missing required fields: ' + missing.join(', ') });
      }

      await client.query(
        `INSERT INTO electricity_new_connection_applications
         (application_id, full_name, father_husband_name, date_of_birth, gender,
          identity_type, identity_number, pan_number, email, mobile, alternate_mobile,
          premises_address, landmark, plot_number, khata_number, district, city, state, pincode, ownership_type,
          category, load_type, required_load, purpose, existing_consumer_number,
          supply_voltage, phases, connected_load, number_of_floors, built_up_area)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)`,
        [applicationId, d.full_name, d.father_husband_name, d.date_of_birth || null, d.gender,
         d.identity_type, d.identity_number, d.pan_number || null, d.email, d.mobile, d.alternate_mobile || null,
         d.premises_address, d.landmark || null, d.plot_number, d.khata_number || null,
         d.district, d.city, d.state, d.pincode, d.ownership_type,
         d.category, d.load_type, d.required_load, d.purpose, d.existing_consumer_number || null,
         d.supply_voltage, d.phases, d.connected_load || null, d.number_of_floors || 1, d.built_up_area]
      );
    }

    if (userId) {
      await client.query(
        'INSERT INTO electricity_notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [userId, 'Application Submitted',
         'Your ' + application_type.replace(/_/g, ' ') + ' application ' + applicationNumber + ' has been submitted successfully.',
         'success']
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Application submitted successfully',
      application_number: applicationNumber,
      application_id: applicationId
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        // Ignore rollback failures when connection itself is unavailable.
      }
    }
    console.error('Submit application error:', error.message);
    const statusCode = error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' ? 503 : 500;
    res.status(statusCode).json({ error: 'Failed to submit application', details: error.message });
  } finally {
    if (client) client.release();
  }
});

// Get user applications
router.get('/my-applications', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, application_number, application_type, status,
              application_data, submitted_at, reviewed_at, completed_at
       FROM electricity_applications
       WHERE user_id = $1
       ORDER BY submitted_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get application by number
router.get('/:applicationNumber', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name as reviewed_by_name
       FROM electricity_applications a
       LEFT JOIN electricity_users u ON a.reviewed_by = u.id
       WHERE a.application_number = $1 AND a.user_id = $2`,
      [req.params.applicationNumber, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Track application status (public)
router.get('/track/:applicationNumber', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT application_number, application_type, status, current_stage, stage_history,
              submitted_at, reviewed_at, completed_at, remarks, application_data
       FROM electricity_applications
       WHERE application_number = $1`,
      [req.params.applicationNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Track application error:', error);
    res.status(500).json({ error: 'Failed to track application' });
  }
});

// Upload documents for an application (stores in Supabase Storage)
router.post('/:id/documents', upload.array('documents', 10), async (req, res) => {
  try {
    const applicationId = req.params.id;

    const appResult = await pool.query(
      'SELECT documents FROM electricity_applications WHERE id = $1',
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const existingDocuments = appResult.rows[0].documents || [];

    const newDocuments = await Promise.all(req.files.map(async (file) => {
      const publicUrl = await uploadToSupabase(file, 'applications/' + applicationId);
      return {
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.id || 'admin'
      };
    }));

    const allDocuments = [...existingDocuments, ...newDocuments];

    await pool.query(
      'UPDATE electricity_applications SET documents = $1 WHERE id = $2',
      [JSON.stringify(allDocuments), applicationId]
    );

    res.json({ success: true, message: 'Documents uploaded successfully', data: { documents: allDocuments } });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({ error: 'Failed to upload documents', details: error.message });
  }
});

module.exports = router;
