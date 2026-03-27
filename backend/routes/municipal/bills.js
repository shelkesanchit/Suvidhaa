const express = require('express');
const router  = express.Router();
const { pool } = require('../../config/database');

// ─── GET /bills/fetch/:consumerNumber ────────────────────────────────────────
// Returns all unpaid/overdue bills for a consumer
router.get('/fetch/:consumerNumber', async (req, res) => {
  try {
    const conResult = await pool.query(
      'SELECT id, full_name, mobile, ward, consumer_type FROM municipal_consumers WHERE consumer_number = $1',
      [req.params.consumerNumber]
    );
    if (conResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Consumer not found' });
    }
    const consumer = conResult.rows[0];

    const bills = await pool.query(
      `SELECT id, bill_number, bill_type, bill_period,
              base_amount, tax_amount, penalty_amount, arrears, total_amount,
              due_date, status, created_at
       FROM municipal_bills
       WHERE consumer_id = $1 AND status IN ('unpaid', 'overdue', 'partial')
       ORDER BY due_date ASC`,
      [consumer.id]
    );

    res.json({ success: true, data: { consumer, bills: bills.rows } });
  } catch (err) {
    console.error('Fetch bills error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /bills/history/:consumerNumber ──────────────────────────────────────
// Returns all bills (paid and unpaid) for a consumer
router.get('/history/:consumerNumber', async (req, res) => {
  try {
    const conResult = await pool.query(
      'SELECT id FROM municipal_consumers WHERE consumer_number = $1',
      [req.params.consumerNumber]
    );
    if (conResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Consumer not found' });
    }

    const bills = await pool.query(
      `SELECT id, bill_number, bill_type, bill_period, total_amount,
              status, due_date, payment_date, created_at
       FROM municipal_bills
       WHERE consumer_id = $1
       ORDER BY created_at DESC
       LIMIT 24`,
      [conResult.rows[0].id]
    );

    res.json({ success: true, data: bills.rows });
  } catch (err) {
    console.error('Bill history error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /bills/:billNumber ───────────────────────────────────────────────────
// Returns a single bill with consumer info
router.get('/:billNumber', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, c.full_name, c.mobile, c.consumer_number, c.ward
       FROM municipal_bills b
       JOIN municipal_consumers c ON c.id = b.consumer_id
       WHERE b.bill_number = $1`,
      [req.params.billNumber]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get bill error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /bills/calculate ────────────────────────────────────────────────────
// Calculate bill amount from settings (no DB write)
router.post('/calculate', async (req, res) => {
  try {
    const { bill_type, consumer_type, base_value } = req.body;

    const settings = await pool.query(
      `SELECT setting_key, setting_value FROM municipal_system_settings
       WHERE setting_key IN (
         'property_tax_residential_rate', 'property_tax_commercial_rate',
         'sw_charges_monthly', 'housing_rent_monthly'
       )`
    );

    const cfg = {};
    for (const row of settings.rows) cfg[row.setting_key] = parseFloat(row.setting_value);

    let base   = parseFloat(base_value) || 0;
    let amount = 0;

    if (bill_type === 'property_tax') {
      const rate = consumer_type === 'commercial'
        ? (cfg.property_tax_commercial_rate || 1.0)
        : (cfg.property_tax_residential_rate || 0.5);
      amount = (base * rate) / 100;
    } else if (bill_type === 'solid_waste_charges') {
      amount = cfg.sw_charges_monthly || 80;
    } else if (bill_type === 'housing_rent') {
      amount = cfg.housing_rent_monthly || 500;
    } else {
      amount = base;
    }

    const tax   = parseFloat((amount * 0.05).toFixed(2));
    const total = parseFloat((amount + tax).toFixed(2));

    res.json({ success: true, data: { base_amount: amount, tax_amount: tax, total_amount: total } });
  } catch (err) {
    console.error('Calculate bill error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
