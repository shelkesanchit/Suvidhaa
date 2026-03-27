const express = require('express');
const router  = express.Router();
const { pool } = require('../../config/database');

// ─── POST /consumers/register ────────────────────────────────────────────────
// Auto-generates a consumer_number (MCCYYYYnnnnnn)
router.post('/register', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const {
      full_name, email, mobile, aadhaar_number, pan_number,
      dob, gender, address, ward, city, pincode, consumer_type
    } = req.body;

    if (!full_name || !mobile) {
      return res.status(400).json({ success: false, message: 'full_name and mobile are required' });
    }

    // Check for duplicate mobile or aadhaar
    const dupCheck = await client.query(
      'SELECT id FROM municipal_consumers WHERE mobile = $1 OR (aadhaar_number IS NOT NULL AND aadhaar_number = $2) LIMIT 1',
      [mobile, aadhaar_number || null]
    );
    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Consumer with this mobile or Aadhaar already exists' });
    }

    // Insert placeholder, get id
    const ins = await client.query(
      `INSERT INTO municipal_consumers
         (consumer_number, full_name, email, mobile, aadhaar_number, pan_number,
          dob, gender, address, ward, city, pincode, consumer_type)
       VALUES ('PENDING', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [full_name, email || null, mobile, aadhaar_number || null, pan_number || null,
       dob || null, gender || null, address || null, ward || null,
       city || null, pincode || null, consumer_type || 'resident']
    );

    const consumerId     = ins.rows[0].id;
    const consumerNumber = `MCC${new Date().getFullYear()}${String(consumerId).padStart(6, '0')}`;

    await client.query(
      'UPDATE municipal_consumers SET consumer_number = $1 WHERE id = $2',
      [consumerNumber, consumerId]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Consumer registered successfully',
      data: { consumer_id: consumerId, consumer_number: consumerNumber }
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Register consumer error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (client) client.release();
  }
});

// ─── GET /consumers/lookup/:mobile ──────────────────────────────────────────
router.get('/lookup/:mobile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, consumer_number, full_name, email, mobile, ward,
              consumer_type, is_active, created_at
       FROM municipal_consumers WHERE mobile = $1 LIMIT 1`,
      [req.params.mobile]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Consumer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Lookup consumer error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /consumers/:consumerNumber ─────────────────────────────────────────
router.get('/:consumerNumber', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, consumer_number, full_name, email, mobile, aadhaar_number,
              pan_number, dob, gender, address, ward, city, pincode,
              consumer_type, is_active, created_at, updated_at
       FROM municipal_consumers WHERE consumer_number = $1`,
      [req.params.consumerNumber]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Consumer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get consumer error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
