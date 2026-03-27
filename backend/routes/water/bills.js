const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// Fetch bill by consumer number (via query param or path param)
router.get('/fetch', async (req, res) => {
  try {
    const consumerNumber = req.query.consumer_number || req.query.consumerNumber;
    
    if (!consumerNumber) {
      return res.status(400).json({ success: false, message: 'consumer_number is required' });
    }

    const consumerResult = await pool.query(
      'SELECT * FROM water_consumers WHERE consumer_number = $1',
      [consumerNumber]
    );
    if (consumerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Consumer not found' });
    }

    const consumer = consumerResult.rows[0];

    // Get latest unpaid bill
    const billResult = await pool.query(
      `SELECT * FROM water_bills
       WHERE consumer_id = $1 AND status != 'paid'
       ORDER BY created_at DESC LIMIT 1`,
      [consumer.id]
    );

    let billData;
    if (billResult.rows.length > 0) {
      billData = billResult.rows[0];
    } else {
      // Auto-generate current bill if none exists
      const prevReading = parseFloat(consumer.last_reading || 0);
      const consumption = 15;
      const currentReading = prevReading + consumption;
      const waterCharges = consumption * 5;
      const sewerageCharges = waterCharges * 0.3;
      const serviceTax = (waterCharges + sewerageCharges) * 0.05;
      const arrears = parseFloat(consumer.total_dues || 0);
      const totalAmount = waterCharges + sewerageCharges + serviceTax + arrears;
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 15);
      const now = new Date();

      billData = {
        bill_number: `WB${now.getFullYear()}${String(consumer.id).padStart(6, '0')}`,
        consumer_number: consumerNumber,
        bill_month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        previous_reading: prevReading,
        current_reading: currentReading,
        consumption_kl: consumption,
        water_charges: waterCharges,
        sewerage_charges: sewerageCharges,
        service_tax: serviceTax,
        arrears,
        late_fee: 0,
        total_amount: totalAmount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'unpaid'
      };
    }

    res.json({
      success: true,
      data: {
        consumer: {
          consumer_number: consumer.consumer_number,
          full_name: consumer.full_name,
          address: consumer.address,
          category: consumer.category,
          meter_number: consumer.meter_number,
          connection_status: consumer.connection_status
        },
        bill: billData
      }
    });
  } catch (error) {
    console.error('Fetch water bill error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get bill history
router.get('/history', async (req, res) => {
  try {
    const consumerNumber = req.query.consumer_number || req.query.consumerNumber;
    if (!consumerNumber) {
      return res.status(400).json({ success: false, message: 'consumer_number is required' });
    }
    const consumerResult = await pool.query(
      'SELECT id FROM water_consumers WHERE consumer_number = $1', [consumerNumber]
    );
    if (consumerResult.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const consumerId = consumerResult.rows[0].id;
    const result = await pool.query(
      `SELECT bill_number, bill_month, consumption_kl, total_amount, status, payment_date, due_date, created_at
       FROM water_bills WHERE consumer_id = $1 ORDER BY created_at DESC LIMIT 12`,
      [consumerId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get water bill history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
