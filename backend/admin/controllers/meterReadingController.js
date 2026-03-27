const { pool } = require('../../config/database');

// Get all active consumer accounts with their latest reading
const getAllCustomers = async (req, res) => {
  try {
    const { state, city, pincode } = req.query;

    let query = `
      SELECT ca.id, ca.consumer_number, ca.meter_number, ca.category,
             ca.connection_status, ca.address_line1, ca.city, ca.state, ca.pincode,
             u.full_name AS name, u.email, u.phone AS mobile,
             mr.reading_value AS "previousReading",
             mr.reading_date AS "lastReadingDate"
      FROM electricity_consumer_accounts ca
      LEFT JOIN electricity_users u ON ca.user_id = u.id
      LEFT JOIN (
        SELECT consumer_account_id, reading_value, reading_date
        FROM electricity_meter_readings
        WHERE id IN (
          SELECT MAX(id) FROM electricity_meter_readings GROUP BY consumer_account_id
        )
      ) mr ON ca.id = mr.consumer_account_id
      WHERE ca.connection_status = 'active'
    `;
    const params = [];
    let idx = 1;

    if (state) { query += ` AND ca.state = $${idx++}`; params.push(state); }
    if (city)  { query += ` AND ca.city = $${idx++}`; params.push(city); }
    if (pincode) { query += ` AND ca.pincode = $${idx++}`; params.push(pincode); }
    query += ' ORDER BY ca.id';

    const result = await pool.query(query, params);
    const formatted = result.rows.map(c => ({
      ...c,
      previousReading: c.previousReading ? Number(c.previousReading) : 0,
      lastReadingDate: c.lastReadingDate
        ? new Date(c.lastReadingDate).toISOString().split('T')[0]
        : null,
      connectionType: c.category ? c.category.charAt(0).toUpperCase() + c.category.slice(1) : 'Residential',
    }));

    res.json({ success: true, data: formatted, total: formatted.length });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: calculate bill from system settings (flat rate fallback)
async function calculateBill(consumption, consumerId) {
  try {
    const settingsRes = await pool.query(
      `SELECT setting_key, setting_value FROM electricity_system_settings
       WHERE setting_key LIKE 'tariff_%' OR setting_key = 'tax_rate'`
    );
    const s = {};
    settingsRes.rows.forEach(r => { s[r.setting_key] = parseFloat(r.setting_value); });

    const accRes = await pool.query(
      'SELECT category FROM electricity_consumer_accounts WHERE id = $1',
      [consumerId]
    );
    const category = accRes.rows[0]?.category || 'residential';
    const catKey = category.toLowerCase().replace(/[^a-z]/g, '_');

    let energyCharges = 0;
    const rate = s[`tariff_${catKey}`] || 8.0;
    if (catKey === 'residential' || catKey.includes('lt_i')) {
      if (consumption <= 100)
        energyCharges = consumption * (s.tariff_residential_upto_100 || 4.0);
      else if (consumption <= 300)
        energyCharges = (100 * (s.tariff_residential_upto_100 || 4.0)) +
          ((consumption - 100) * (s.tariff_residential_101_300 || 6.0));
      else
        energyCharges = (100 * (s.tariff_residential_upto_100 || 4.0)) +
          (200 * (s.tariff_residential_101_300 || 6.0)) +
          ((consumption - 300) * (s.tariff_residential_above_300 || 8.0));
    } else {
      energyCharges = consumption * rate;
    }

    const fixedCharges = s[`fixed_charge_${catKey}`] || 50;
    const taxRate = s.tax_rate || 5;
    const taxAmount = Math.round((energyCharges + fixedCharges) * (taxRate / 100) * 100) / 100;
    const totalAmount = Math.round((energyCharges + fixedCharges + taxAmount) * 100) / 100;

    return {
      energyCharges: Math.round(energyCharges * 100) / 100,
      fixedCharges,
      taxAmount,
      totalAmount,
      category,
    };
  } catch (err) {
    console.error('Bill calculation error, using fallback:', err.message);
    const total = Math.round(consumption * 8.0 * 100) / 100;
    return { energyCharges: total, fixedCharges: 0, taxAmount: 0, totalAmount: total, category: 'domestic' };
  }
}

// Helper: generate bill number
function generateBillNumber(consumerId, readingDate) {
  const d = new Date(readingDate);
  return `BILL-${consumerId}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Helper: create or update bill in electricity_bills
async function createBill(consumerId, consumption, billData, readingDate) {
  const d = new Date(readingDate);
  const billingMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const billNumber = generateBillNumber(consumerId, readingDate);
  const dueDate = new Date(d.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const existRes = await pool.query(
    'SELECT id FROM electricity_bills WHERE consumer_account_id = $1 AND billing_month = $2',
    [consumerId, billingMonth]
  );

  if (existRes.rows.length > 0) {
    await pool.query(
      `UPDATE electricity_bills
       SET units_consumed = $1, energy_charges = $2, fixed_charges = $3,
           tax_amount = $4, total_amount = $5, due_date = $6, status = 'unpaid'
       WHERE id = $7`,
      [consumption, billData.energyCharges, billData.fixedCharges,
       billData.taxAmount, billData.totalAmount, dueDate, existRes.rows[0].id]
    );
    return existRes.rows[0].id;
  }

  const insertRes = await pool.query(
    `INSERT INTO electricity_bills
     (bill_number, consumer_account_id, billing_month, units_consumed,
      energy_charges, fixed_charges, tax_amount, total_amount, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unpaid') RETURNING id`,
    [billNumber, consumerId, billingMonth, consumption,
     billData.energyCharges, billData.fixedCharges,
     billData.taxAmount, billData.totalAmount, dueDate]
  );
  return insertRes.rows[0].id;
}

// Submit single meter reading and generate bill
const submitMeterReading = async (req, res) => {
  try {
    const { customerId, currentReading, previousReading, readingDate } = req.body;

    if (Number(currentReading) <= Number(previousReading)) {
      return res.status(400).json({ success: false, message: 'Current reading must be greater than previous reading' });
    }

    const consumption = Number(currentReading) - Number(previousReading);
    const billData = await calculateBill(consumption, customerId);

    await pool.query(
      `INSERT INTO electricity_meter_readings
       (consumer_account_id, reading_date, reading_value, reading_type, submitted_by)
       VALUES ($1, $2, $3, 'official', $4)`,
      [customerId, readingDate, currentReading, req.user?.id || null]
    );

    await createBill(customerId, consumption, billData, readingDate);

    res.json({
      success: true,
      message: 'Meter reading submitted and bill generated successfully',
      data: {
        customerId, consumption,
        calculatedBill: billData.totalAmount,
        readingDate, previousReading, currentReading,
      },
    });
  } catch (error) {
    console.error('Error submitting meter reading:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit bulk meter readings
const submitBulkMeterReadings = async (req, res) => {
  try {
    const { readings } = req.body;
    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ success: false, message: 'No readings provided' });
    }

    const results = [];
    const errors = [];

    for (const reading of readings) {
      try {
        if (Number(reading.currentReading) <= Number(reading.previousReading)) {
          errors.push({ customerId: reading.customerId, error: 'Current reading must be greater than previous reading' });
          continue;
        }

        const consumption = Number(reading.currentReading) - Number(reading.previousReading);
        const billData = await calculateBill(consumption, reading.customerId);

        await pool.query(
          `INSERT INTO electricity_meter_readings
           (consumer_account_id, reading_date, reading_value, reading_type, submitted_by)
           VALUES ($1, $2, $3, 'official', $4)`,
          [reading.customerId, reading.readingDate, reading.currentReading, req.user?.id || null]
        );

        await createBill(reading.customerId, consumption, billData, reading.readingDate);

        results.push({
          customerId: reading.customerId,
          consumption, calculatedBill: billData.totalAmount,
          readingDate: reading.readingDate,
          previousReading: reading.previousReading,
          currentReading: reading.currentReading,
          status: 'success',
        });
      } catch (err) {
        errors.push({ customerId: reading.customerId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `${results.length} readings submitted${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      data: { successful: results, failed: errors, totalProcessed: results.length + errors.length, successCount: results.length, errorCount: errors.length },
    });
  } catch (error) {
    console.error('Error submitting bulk readings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get meter reading history for a consumer
const getMeterReadingHistory = async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await pool.query(
      `SELECT mr.id,
              mr.consumer_account_id AS "customerId",
              mr.reading_value AS reading,
              mr.reading_date AS date,
              COALESCE(b.total_amount, 0) AS bill
       FROM electricity_meter_readings mr
       LEFT JOIN electricity_bills b
         ON b.consumer_account_id = mr.consumer_account_id
         AND b.billing_month = TO_CHAR(mr.reading_date, 'YYYY-MM')
       WHERE mr.consumer_account_id = $1
       ORDER BY mr.reading_date DESC
       LIMIT 12`,
      [customerId]
    );

    const formatted = result.rows.map(h => ({
      ...h,
      reading: Number(h.reading),
      bill: Number(h.bill),
      date: h.date ? new Date(h.date).toISOString().split('T')[0] : null,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching meter reading history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllCustomers, submitMeterReading, submitBulkMeterReadings, getMeterReadingHistory };
