const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const supabase = require('../../config/supabase');

const BUCKET = process.env.WATER_STORAGE_BUCKET || 'water-documents';

// Map frontend complaint categories to database-valid values
const categoryMap = {
  'no-water': 'no_water_supply',
  'low-pressure': 'low_pressure',
  'contaminated': 'water_quality',
  'pipeline-leak': 'pipeline_leakage',
  'pipe-burst': 'pipeline_leakage',
  'meter-stopped': 'meter_fault',
  'meter-reading-dispute': 'billing_dispute',
  'high-bill': 'billing_dispute',
  'water-sampling': 'water_quality',
  'other': 'other',
};

// Map frontend urgency values to database-valid values
const urgencyMap = {
  'normal': 'medium',
  'urgent': 'high',
  'emergency': 'critical',
  'low': 'low',
  'medium': 'medium',
  'high': 'high',
  'critical': 'critical',
};

async function uploadDocToSupabase(doc, folder) {
  if (!doc || !doc.data) return null;
  try {
    const buffer = Buffer.from(doc.data, 'base64');
    const ext = (doc.name || 'file').split('.').pop().toLowerCase() || 'bin';
    const filename = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType: doc.type || 'application/octet-stream', upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) {
    console.error('Complaint doc upload failed:', e.message);
    return null;
  }
}

// Submit new complaint
router.post('/submit', async (req, res) => {
  try {
    const { complaint_data, documents } = req.body;
    const year = new Date().getFullYear();

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM water_complaints WHERE EXTRACT(YEAR FROM submitted_at) = $1",
      [year]
    );
    const nextNum = parseInt(countResult.rows[0].count, 10) + 1;
    const complaintNumber = `WCP${year}${String(nextNum).padStart(6, '0')}`;

    let consumerId = null;
    if (complaint_data.consumer_number) {
      const consumerRes = await pool.query(
        'SELECT id FROM water_consumers WHERE consumer_number = $1',
        [complaint_data.consumer_number]
      );
      if (consumerRes.rows.length > 0) consumerId = consumerRes.rows[0].id;
    }

    const stageHistory = [{
      stage: 'Complaint Registered', status: 'open',
      timestamp: new Date().toISOString(), remarks: 'Complaint submitted successfully'
    }];

    // Upload photo/documents if provided
    let processedDocs = [];
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        const url = await uploadDocToSupabase(doc, 'complaints');
        if (url) processedDocs.push({ name: doc.name, type: doc.type, url, uploadedAt: new Date().toISOString() });
      }
    }

    // Map frontend values to database-valid values
    const dbCategory = categoryMap[complaint_data.complaint_category] || 'other';
    const dbUrgency = urgencyMap[complaint_data.urgency] || 'medium';

    const insertResult = await pool.query(
      `INSERT INTO water_complaints
       (complaint_number, consumer_id, consumer_number, contact_name, mobile, email,
        address, ward, complaint_category, description, urgency, priority, status,
        documents, stage_history)
       VALUES ('PENDING', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, 'open', $11, $12)
       RETURNING id`,
      [
        consumerId,
        complaint_data.consumer_number || null,
        complaint_data.contact_name,
        complaint_data.mobile,
        complaint_data.email || null,
        complaint_data.address || null,
        complaint_data.ward || null,
        dbCategory,
        complaint_data.description,
        dbUrgency,
        JSON.stringify(processedDocs),
        JSON.stringify(stageHistory)
      ]
    );

    const complaintId = insertResult.rows[0].id;
    const finalNumber = `WCP${year}${String(complaintId).padStart(6, '0')}`;
    await pool.query('UPDATE water_complaints SET complaint_number = $1 WHERE id = $2', [finalNumber, complaintId]);

    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully',
      data: { complaint_number: finalNumber, complaint_id: complaintId }
    });
  } catch (error) {
    console.error('Submit water complaint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track complaint status
router.get('/track/:complaintNumber', async (req, res) => {
  try {
    const { complaintNumber } = req.params;
    const result = await pool.query(
      `SELECT complaint_number, consumer_number, contact_name, mobile, email,
              address, ward, complaint_category, description, urgency, priority,
              status, resolution_notes, stage_history, documents,
              submitted_at, resolved_at
       FROM water_complaints WHERE complaint_number = $1`,
      [complaintNumber]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Track water complaint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get complaints by mobile
router.get('/my-complaints/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const result = await pool.query(
      `SELECT id, complaint_number, complaint_category, status, urgency, submitted_at, resolved_at
       FROM water_complaints WHERE mobile = $1 ORDER BY submitted_at DESC`,
      [mobile]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get water complaints by mobile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
