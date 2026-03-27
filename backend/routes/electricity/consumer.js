const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const { verifyToken } = require('../../middleware/auth');

// Get consumer account info
router.get('/account', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM electricity_consumer_accounts WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get consumer account error:', error);
    res.status(500).json({ error: 'Failed to fetch consumer account' });
  }
});

// Get specific consumer account by consumer number
router.get('/account/:consumerNumber', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM electricity_consumer_accounts WHERE consumer_number = $1 AND user_id = $2',
      [req.params.consumerNumber, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get consumer account error:', error);
    res.status(500).json({ error: 'Failed to fetch consumer account' });
  }
});

// Get bills for consumer
router.get('/account/:consumerNumber/bills', verifyToken, async (req, res) => {
  try {
    const account = await pool.query(
      'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1 AND user_id = $2',
      [req.params.consumerNumber, req.user.id]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    const bills = await pool.query(
      'SELECT * FROM electricity_bills WHERE consumer_account_id = $1 ORDER BY billing_month DESC LIMIT 12',
      [account.rows[0].id]
    );

    res.json(bills.rows);
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Submit meter reading
router.post('/meter-reading', verifyToken, async (req, res) => {
  try {
    const { consumer_number, reading_value } = req.body;

    const account = await pool.query(
      'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1 AND user_id = $2',
      [consumer_number, req.user.id]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    await pool.query(
      `INSERT INTO electricity_meter_readings
       (consumer_account_id, reading_date, reading_value, reading_type, submitted_by)
       VALUES ($1, CURRENT_DATE, $2, 'self', $3)`,
      [account.rows[0].id, reading_value, req.user.id]
    );

    res.status(201).json({ message: 'Meter reading submitted successfully' });
  } catch (error) {
    console.error('Submit meter reading error:', error);
    res.status(500).json({ error: 'Failed to submit meter reading' });
  }
});

// Get meter reading history
router.get('/meter-reading/:consumerNumber', verifyToken, async (req, res) => {
  try {
    const account = await pool.query(
      'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1 AND user_id = $2',
      [req.params.consumerNumber, req.user.id]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    const readings = await pool.query(
      'SELECT * FROM electricity_meter_readings WHERE consumer_account_id = $1 ORDER BY reading_date DESC LIMIT 12',
      [account.rows[0].id]
    );

    res.json(readings.rows);
  } catch (error) {
    console.error('Get meter readings error:', error);
    res.status(500).json({ error: 'Failed to fetch meter readings' });
  }
});

module.exports = router;
