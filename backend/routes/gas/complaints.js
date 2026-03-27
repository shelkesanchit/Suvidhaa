const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// =====================================================
// GAS COMPLAINTS ROUTES
// =====================================================

// Submit new complaint
router.post('/submit', async (req, res) => {
  try {
    const { complaint_data } = req.body;

    if (!complaint_data) {
      return res.status(400).json({ success: false, message: 'complaint_data is required' });
    }

    if (!complaint_data.description || !complaint_data.complaint_category || !complaint_data.contact_name) {
      return res.status(400).json({ success: false, message: 'contact_name, complaint_category and description are required' });
    }

    if (!complaint_data.consumer_id && !complaint_data.mobile) {
      return res.status(400).json({ success: false, message: 'consumer_id or mobile is required' });
    }

    if (complaint_data.mobile && !/^\d{10}$/.test(String(complaint_data.mobile))) {
      return res.status(400).json({ success: false, message: 'mobile must be 10 digits' });
    }

    // Generate complaint number
    const year = new Date().getFullYear();
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM gas_complaints WHERE EXTRACT(YEAR FROM submitted_at) = $1`,
      [year]
    );
    const complaintNumber = `GCP${year}${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

    // Look up consumer by consumer_number or phone
    let customerId = null;

    if (complaint_data.consumer_id) {
      const res1 = await pool.query(
        'SELECT id FROM gas_consumers WHERE consumer_number = $1',
        [complaint_data.consumer_id]
      );
      if (res1.rows.length > 0) customerId = res1.rows[0].id;
    }

    if (!customerId && complaint_data.mobile) {
      const res2 = await pool.query(
        'SELECT id FROM gas_consumers WHERE phone = $1',
        [complaint_data.mobile]
      );
      if (res2.rows.length > 0) customerId = res2.rows[0].id;
    }

    const typeMap = {
      'delivery': 'delivery_issue', 'delivery_issue': 'delivery_issue',
      'billing': 'billing', 'safety': 'safety', 'gas-leak': 'safety',
      'quality': 'quality', 'other': 'other'
    };
    const complaintType = typeMap[complaint_data.complaint_category] || 'other';

    const priorityMap = { 'critical': 'urgent', 'high': 'high', 'medium': 'medium', 'low': 'low' };
    const priority = priorityMap[complaint_data.urgency] || 'medium';

    const detailsSuffix = complaint_data.additional_info
      ? `\n\n[Additional Info]\n${JSON.stringify(complaint_data.additional_info)}`
      : '';
    const description = `${complaint_data.description || ''}${detailsSuffix}`;

    const result = await pool.query(
      `INSERT INTO gas_complaints
       (complaint_number, consumer_id, complaint_type, description, attachment_url, status, priority)
       VALUES ($1, $2, $3, $4, $5, 'open', $6) RETURNING id`,
      [
        complaintNumber,
        customerId,
        complaintType,
        description,
        complaint_data.attachment_url || null,
        priority
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully',
      data: {
        complaint_number: complaintNumber,
        complaint_id: result.rows[0].id
      }
    });

  } catch (error) {
    console.error('Submit gas complaint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track complaint status
router.get('/track/:complaintNumber', async (req, res) => {
  try {
    const { complaintNumber } = req.params;
    const { mobile, email } = req.query;

    const result = await pool.query(
      `SELECT gc.complaint_number, gc.consumer_id, gc.complaint_type,
              gc.description, gc.status, gc.priority, gc.assigned_to,
              gc.resolution_notes, gc.submitted_at as created_at, gc.resolved_at,
              c.full_name, c.phone as mobile, c.email,
              CONCAT(c.address_line1, ', ', c.city) as address
       FROM gas_complaints gc
       LEFT JOIN gas_consumers c ON gc.consumer_id = c.id
       WHERE gc.complaint_number = $1`,
      [complaintNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const complaint = result.rows[0];

    if (mobile && String(complaint.mobile || '') !== String(mobile)) {
      return res.status(403).json({ success: false, message: 'Mobile verification failed for this complaint' });
    }

    if (email && String(complaint.email || '').toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Email verification failed for this complaint' });
    }

    res.json({ success: true, data: complaint });

  } catch (error) {
    console.error('Track complaint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's complaints by mobile
router.get('/my-complaints/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;

    const result = await pool.query(
      `SELECT gc.id, gc.complaint_number, gc.complaint_type, gc.status, gc.priority,
              gc.submitted_at as created_at, gc.resolved_at
       FROM gas_complaints gc
       INNER JOIN gas_consumers c ON gc.consumer_id = c.id
       WHERE c.phone = $1
       ORDER BY gc.submitted_at DESC`,
      [mobile]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get my complaints error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Report gas leak (Emergency)
router.post('/emergency-leak', async (req, res) => {
  try {
    const { mobile, description } = req.body;

    const year = new Date().getFullYear();
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM gas_complaints WHERE EXTRACT(YEAR FROM submitted_at) = $1`,
      [year]
    );
    const complaintNumber = `GLEAK${year}${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

    let customerId = null;
    if (mobile) {
      const res1 = await pool.query(
        'SELECT id FROM gas_consumers WHERE phone = $1',
        [mobile]
      );
      if (res1.rows.length > 0) customerId = res1.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO gas_complaints
       (complaint_number, consumer_id, complaint_type, description, status, priority)
       VALUES ($1, $2, 'safety', $3, 'open', 'urgent') RETURNING id`,
      [
        complaintNumber,
        customerId,
        description || 'Gas leak reported - Emergency'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Emergency gas leak reported! Response team will reach shortly.',
      data: {
        complaint_number: complaintNumber,
        complaint_id: result.rows[0].id,
        priority: 'URGENT',
        estimated_response: '15-30 minutes'
      }
    });

  } catch (error) {
    console.error('Emergency leak report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
