const express = require('express');
const router  = express.Router();
const { pool } = require('../../config/database');
const supabase  = require('../../config/supabase');

const BUCKET = process.env.MUNICIPAL_STORAGE_BUCKET || 'municipal-documents';

async function ensureBucket() {
  try {
    const { data: list } = await supabase.storage.listBuckets();
    if (list && !list.some(b => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    }
  } catch (e) { /* ignore */ }
}

async function uploadDocs(complaintId, documents) {
  if (!documents || !documents.length) return [];
  await ensureBucket();
  const out = [];
  for (const doc of documents) {
    try {
      const raw = doc.data || doc.file_data;
      if (raw) {
        const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
        const buffer = Buffer.from(base64, 'base64');
        const ext    = (doc.name || doc.file_name || 'file').split('.').pop();
        const path   = `complaints/${complaintId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, buffer, { contentType: doc.type || 'application/octet-stream', upsert: false });
        if (error) throw new Error(error.message);
        const { data: u } = supabase.storage.from(BUCKET).getPublicUrl(path);
        out.push({ name: doc.name || doc.file_name, url: u.publicUrl, uploadedAt: new Date().toISOString() });
      } else if (doc.url) {
        out.push({ name: doc.name || doc.file_name, url: doc.url, uploadedAt: new Date().toISOString() });
      }
    } catch (e) {
      console.error('Complaint doc upload failed:', e.message);
    }
  }
  return out;
}

// ─── POST /complaints/submit ──────────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const {
      contact_name, mobile, email, ward, address,
      department, complaint_category, urgency, description, documents
    } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, message: 'description is required' });
    }

    // Look up consumer by mobile (optional link)
    let consumerId = null;
    if (mobile) {
      const con = await client.query(
        'SELECT id FROM municipal_consumers WHERE mobile = $1 LIMIT 1', [mobile]
      );
      if (con.rows.length > 0) consumerId = con.rows[0].id;
    }

    const stageHistory = [{
      stage: 'Complaint Submitted', status: 'open',
      timestamp: new Date().toISOString(), remarks: 'Complaint registered'
    }];

    const ins = await client.query(
      `INSERT INTO municipal_complaints
         (complaint_number, consumer_id, contact_name, mobile, email, ward, address,
          department, complaint_category, urgency, description, stage_history)
       VALUES ('PENDING', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [consumerId, contact_name || '', mobile || '', email || null, ward || null, address || null,
       department || 'general', complaint_category || 'general', urgency || 'medium',
       description, JSON.stringify(stageHistory)]
    );

    const complaintId     = ins.rows[0].id;
    const complaintNumber = `MCR${new Date().getFullYear()}${String(complaintId).padStart(6, '0')}`;

    await client.query(
      'UPDATE municipal_complaints SET complaint_number = $1 WHERE id = $2',
      [complaintNumber, complaintId]
    );

    // Upload documents
    const docsArray = Array.isArray(documents) ? documents : [];
    const processedDocs = await uploadDocs(complaintId, docsArray);
    if (processedDocs.length > 0) {
      await client.query(
        'UPDATE municipal_complaints SET documents = $1 WHERE id = $2',
        [JSON.stringify(processedDocs), complaintId]
      );
    }

    // Insert notification
    await client.query(
      `INSERT INTO municipal_notifications (consumer_id, mobile, email, title, message, type, reference_number)
       VALUES ($1, $2, $3, $4, $5, 'info', $6)`,
      [consumerId, mobile || null, email || null,
       'Complaint Registered', `Your complaint ${complaintNumber} has been registered successfully.`,
       complaintNumber]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: { complaint_number: complaintNumber, complaint_id: complaintId }
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Submit complaint error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (client) client.release();
  }
});

// ─── GET /complaints/track/:complaintNumber ───────────────────────────────────
router.get('/track/:complaintNumber', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.complaint_number, c.department, c.complaint_category, c.urgency,
              c.contact_name, c.mobile, c.ward, c.description,
              c.status, c.stage_history, c.resolution_notes,
              c.submitted_at, c.resolved_at
       FROM municipal_complaints c
       WHERE c.complaint_number = $1`,
      [req.params.complaintNumber]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Track complaint error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /complaints/my-complaints/:mobile ───────────────────────────────────
router.get('/my-complaints/:mobile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, complaint_number, department, complaint_category,
              urgency, status, submitted_at, resolved_at
       FROM municipal_complaints
       WHERE mobile = $1
       ORDER BY submitted_at DESC`,
      [req.params.mobile]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get my complaints error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
