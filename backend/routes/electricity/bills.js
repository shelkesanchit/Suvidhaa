const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const { verifyToken } = require('../../middleware/auth');

// ── Public fetch: GET /fetch/:consumerNumber (no auth — used by consumer kiosk) ──
router.get('/fetch/:consumerNumber', async (req, res) => {
  try {
    const consumerNumber = req.params.consumerNumber.toUpperCase();

    const accountResult = await pool.query(
      `SELECT ca.id, ca.consumer_number, u.full_name AS consumer_name
       FROM electricity_consumer_accounts ca
       LEFT JOIN electricity_users u ON ca.user_id = u.id
       WHERE ca.consumer_number = $1`,
      [consumerNumber]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Consumer "${consumerNumber}" not found` });
    }

    const account = accountResult.rows[0];

    const billsResult = await pool.query(
      `SELECT id, bill_number, billing_month AS billing_period, created_at AS billing_date, due_date,
              units_consumed AS consumption_units, energy_charges, fixed_charges,
              tax_amount AS taxes, total_amount, status
       FROM electricity_bills
       WHERE consumer_account_id = $1
       ORDER BY due_date DESC
       LIMIT 10`,
      [account.id]
    );

    res.json({
      success: true,
      data: {
        consumer_number: account.consumer_number,
        consumer_name: account.consumer_name || 'Registered Consumer',
        bills: billsResult.rows,
      },
    });
  } catch (error) {
    console.error('Electricity bill fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bill' });
  }
});

// Get all bills for a consumer
router.get('/consumer/:consumerNumber', verifyToken, async (req, res) => {
  try {
    const account = await pool.query(
      'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1 AND user_id = $2',
      [req.params.consumerNumber, req.user.id]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    const bills = await pool.query(
      'SELECT * FROM electricity_bills WHERE consumer_account_id = $1 ORDER BY billing_month DESC',
      [account.rows[0].id]
    );

    res.json(bills.rows);
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Get specific bill
router.get('/:billNumber', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, ca.consumer_number, ca.address_line1, ca.city, ca.state, ca.pincode
       FROM electricity_bills b
       JOIN electricity_consumer_accounts ca ON b.consumer_account_id = ca.id
       WHERE b.bill_number = $1 AND ca.user_id = $2`,
      [req.params.billNumber, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// Calculate bill
router.post('/calculate', verifyToken, async (req, res) => {
  try {
    const { category, units, sanctioned_load } = req.body;

    const settingsResult = await pool.query(
      `SELECT setting_key, setting_value FROM electricity_system_settings
       WHERE setting_key LIKE 'tariff_%' OR setting_key LIKE 'fixed_charge_%' OR setting_key = 'tax_rate'`
    );

    const settingsMap = {};
    settingsResult.rows.forEach(s => {
      settingsMap[s.setting_key] = parseFloat(s.setting_value);
    });

    let energyCharges = 0;
    let fixedCharges = 0;

    if (category === 'residential') {
      if (units <= 100) {
        energyCharges = units * settingsMap.tariff_residential_upto_100;
      } else if (units <= 300) {
        energyCharges = (100 * settingsMap.tariff_residential_upto_100) +
                       ((units - 100) * settingsMap.tariff_residential_101_300);
      } else {
        energyCharges = (100 * settingsMap.tariff_residential_upto_100) +
                       (200 * settingsMap.tariff_residential_101_300) +
                       ((units - 300) * settingsMap.tariff_residential_above_300);
      }
      fixedCharges = settingsMap.fixed_charge_residential || 50;
    } else if (category === 'commercial') {
      energyCharges = units * settingsMap.tariff_commercial;
      fixedCharges = settingsMap.fixed_charge_commercial || 200;
    } else if (category === 'industrial') {
      energyCharges = units * settingsMap.tariff_industrial;
      fixedCharges = sanctioned_load * 100;
    } else if (category === 'agricultural') {
      energyCharges = units * settingsMap.tariff_agricultural;
      fixedCharges = sanctioned_load * 50;
    }

    const subtotal = energyCharges + fixedCharges;
    const taxAmount = subtotal * (settingsMap.tax_rate / 100);
    const totalAmount = subtotal + taxAmount;

    res.json({
      units, category,
      energy_charges: parseFloat(energyCharges.toFixed(2)),
      fixed_charges: parseFloat(fixedCharges.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2))
    });
  } catch (error) {
    console.error('Calculate bill error:', error);
    res.status(500).json({ error: 'Failed to calculate bill' });
  }
});

// Get unpaid bills
router.get('/consumer/:consumerNumber/unpaid', verifyToken, async (req, res) => {
  try {
    const account = await pool.query(
      'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1 AND user_id = $2',
      [req.params.consumerNumber, req.user.id]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    const bills = await pool.query(
      `SELECT * FROM electricity_bills
       WHERE consumer_account_id = $1 AND status IN ('unpaid', 'overdue', 'partial')
       ORDER BY billing_month ASC`,
      [account.rows[0].id]
    );

    res.json(bills.rows);
  } catch (error) {
    console.error('Get unpaid bills error:', error);
    res.status(500).json({ error: 'Failed to fetch unpaid bills' });
  }
});

module.exports = router;
