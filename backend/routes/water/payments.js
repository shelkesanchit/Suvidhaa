const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// Process payment
router.post('/process', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { consumer_number, bill_number, amount, payment_method, mobile } = req.body;
    if (!consumer_number || !amount || !payment_method) {
      return res.status(400).json({ success: false, message: 'consumer_number, amount, and payment_method are required' });
    }

    const transactionId = `WTR${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const receiptNumber = `WRCP${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    // Lookup consumer
    const consumerResult = await client.query(
      'SELECT id, total_dues FROM water_consumers WHERE consumer_number = $1',
      [consumer_number]
    );
    const consumerId = consumerResult.rows.length > 0 ? consumerResult.rows[0].id : null;

    // Lookup bill if provided
    let billId = null;
    if (bill_number) {
      const billResult = await client.query('SELECT id FROM water_bills WHERE bill_number = $1', [bill_number]);
      billId = billResult.rows.length > 0 ? billResult.rows[0].id : null;
    }

    await client.query(
      `INSERT INTO water_payments
       (transaction_id, bill_id, consumer_id, consumer_number, amount, payment_method,
        payment_status, receipt_number, payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, 'success', $7, NOW())`,
      [transactionId, billId, consumerId, consumer_number, parseFloat(amount), payment_method, receiptNumber]
    );

    if (billId) {
      await client.query(
        "UPDATE water_bills SET status = 'paid', payment_date = NOW() WHERE id = $1",
        [billId]
      );
    }

    if (consumerId) {
      await client.query(
        'UPDATE water_consumers SET total_dues = GREATEST(0, total_dues - $1) WHERE id = $2',
        [parseFloat(amount), consumerId]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment successful',
      data: { transaction_id: transactionId, receipt_number: receiptNumber, amount, payment_method, consumer_number }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Process water payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (client) client.release();
  }
});

// Get payment history
router.get('/history/:consumerNumber', async (req, res) => {
  try {
    const { consumerNumber } = req.params;
    const result = await pool.query(
      `SELECT transaction_id, bill_id, amount, payment_method, payment_status,
              receipt_number, payment_date
       FROM water_payments WHERE consumer_number = $1 ORDER BY payment_date DESC LIMIT 20`,
      [consumerNumber]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get water payment history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
