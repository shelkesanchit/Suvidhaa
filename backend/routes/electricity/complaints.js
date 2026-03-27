const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../../config/database');
const { verifyToken } = require('../../middleware/auth');

// Submit complaint
router.post('/submit', [
  body('complaint_category').notEmpty().withMessage('Complaint category is required'),
  body('complaint_type').notEmpty().withMessage('Complaint type is required'),
  body('description').notEmpty().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('mobile').notEmpty().isLength({ min: 10, max: 10 }).withMessage('Valid mobile number is required'),
], async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array(), error: errors.array()[0]?.msg });
    }

    await client.query('BEGIN');

    const {
      consumer_number, complaint_category, complaint_type, description, priority,
      full_name, father_husband_name, mobile, alternate_mobile, email,
      address, landmark, city, district, state, pincode,
      is_consumer, consumer_name, subject, affected_since,
      location_details, nearby_transformer, pole_number, documents
    } = req.body;

    let consumerAccountId = null;
    const userId = req.user?.id || null;

    if (consumer_number) {
      const acc = await client.query(
        'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1',
        [consumer_number]
      );
      if (acc.rows.length > 0) consumerAccountId = acc.rows[0].id;
    }

    const year = new Date().getFullYear();
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM electricity_complaints WHERE EXTRACT(YEAR FROM submitted_at) = $1',
      [year]
    );
    const complaintNumber = `CMP${year}${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

    let assignedPriority = priority || 'medium';
    if (complaint_category === 'supply_related') assignedPriority = 'high';
    else if (complaint_category === 'meter_related' && complaint_type?.includes('Burnt')) assignedPriority = 'critical';

    const stageHistory = [{
      stage: 'Complaint Registered',
      status: 'open',
      timestamp: new Date().toISOString(),
      remarks: 'Complaint registered successfully'
    }];

    const typeMapping = {
      'supply_related': 'power_outage',
      'voltage_related': 'voltage_fluctuation',
      'meter_related': 'meter_fault',
      'billing_related': 'billing_dispute',
      'service_related': 'service_quality',
    };
    const dbComplaintType = typeMapping[complaint_category] || 'other';

    const result = await client.query(
      `INSERT INTO electricity_complaints
       (complaint_number, consumer_account_id, user_id, complaint_type, priority, description, location, status, stage_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8) RETURNING id`,
      [complaintNumber, consumerAccountId, userId, dbComplaintType, assignedPriority,
       description, location_details || '', JSON.stringify(stageHistory)]
    );

    if (userId) {
      await client.query(
        `INSERT INTO electricity_notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
        [userId, 'Complaint Registered',
         `Your complaint ${complaintNumber} has been registered successfully. We will address it soon.`,
         'info']
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint_number: complaintNumber,
      complaint_id: result.rows[0].id
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Submit complaint error:', error.message);
    res.status(500).json({ error: 'Failed to submit complaint', details: error.message });
  } finally {
    if (client) client.release();
  }
});

// Get user complaints
router.get('/my-complaints', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, ca.consumer_number
       FROM electricity_complaints c
       JOIN electricity_consumer_accounts ca ON c.consumer_account_id = ca.id
       WHERE ca.user_id = $1
       ORDER BY c.submitted_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// Track complaint status
router.get('/track/:complaintNumber', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.complaint_number, c.complaint_type, c.priority, c.status,
              c.description, c.resolution_notes, c.submitted_at, c.resolved_at, c.stage_history,
              ca.consumer_number
       FROM electricity_complaints c
       LEFT JOIN electricity_consumer_accounts ca ON c.consumer_account_id = ca.id
       WHERE c.complaint_number = $1`,
      [req.params.complaintNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Track complaint error:', error);
    res.status(500).json({ error: 'Failed to track complaint' });
  }
});

// Get complaint details
router.get('/:complaintNumber', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, ca.consumer_number, u.full_name as assigned_to_name
       FROM electricity_complaints c
       JOIN electricity_consumer_accounts ca ON c.consumer_account_id = ca.id
       LEFT JOIN electricity_users u ON c.assigned_to = u.id
       WHERE c.complaint_number = $1 AND ca.user_id = $2`,
      [req.params.complaintNumber, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

module.exports = router;
