const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// =====================================================
// GAS PAYMENTS ROUTES
// =====================================================

// Process payment
router.post('/process', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { consumer_id, booking_number, amount, payment_method } = req.body;

    const transactionId = `GTR${Date.now()}`;
    const receiptNumber = `GRCP${new Date().getFullYear()}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

    const customerResult = await client.query(
      'SELECT id FROM gas_consumers WHERE consumer_number = $1',
      [consumer_id]
    );

    if (customerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customerId = customerResult.rows[0].id;

    let bookingId = null;
    if (booking_number) {
      const bookingResult = await client.query(
        'SELECT id FROM gas_cylinder_bookings WHERE booking_number = $1',
        [booking_number]
      );
      bookingId = bookingResult.rows.length > 0 ? bookingResult.rows[0].id : null;
    }

    const methodMap = {
      'cash': 'cash', 'online': 'online', 'upi': 'online',
      'card': 'online', 'bank_transfer': 'bank_transfer', 'neft': 'bank_transfer'
    };
    const validMethod = methodMap[payment_method] || 'online';

    await client.query(
      `INSERT INTO gas_payments
       (booking_id, customer_id, payment_method, amount, transaction_id, payment_status, receipt_number)
       VALUES ($1, $2, $3, $4, $5, 'success', $6)`,
      [bookingId, customerId, validMethod, amount, transactionId, receiptNumber]
    );

    if (bookingId) {
      await client.query(
        `UPDATE gas_cylinder_bookings SET payment_status = 'paid' WHERE id = $1`,
        [bookingId]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payment successful',
      data: {
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        amount: amount,
        payment_method: validMethod,
        consumer_id: consumer_id
      }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Process gas payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (client) client.release();
  }
});

// Get payment history
router.get('/history/:consumerId', async (req, res) => {
  try {
    const { consumerId } = req.params;

    const customerResult = await pool.query(
      'SELECT id FROM gas_consumers WHERE consumer_number = $1',
      [consumerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const result = await pool.query(
      `SELECT gp.transaction_id, gp.amount, gp.subsidy_amount, gp.payment_method,
              gp.payment_status, gp.receipt_number, gp.payment_date,
              cb.booking_number
       FROM gas_payments gp
       LEFT JOIN gas_cylinder_bookings cb ON gp.booking_id = cb.id
       WHERE gp.customer_id = $1
       ORDER BY gp.payment_date DESC LIMIT 20`,
      [customerResult.rows[0].id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pay for cylinder booking
router.post('/cylinder-payment', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { booking_number, payment_method } = req.body;

    const bookingResult = await client.query(
      'SELECT * FROM gas_cylinder_bookings WHERE booking_number = $1',
      [booking_number]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    const transactionId = `GCTR${Date.now()}`;
    const receiptNumber = `GCRCP${new Date().getFullYear()}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

    const methodMap = {
      'cash': 'cash', 'online': 'online', 'upi': 'online',
      'card': 'online', 'bank_transfer': 'bank_transfer', 'neft': 'bank_transfer'
    };
    const validMethod = methodMap[payment_method] || 'online';

    await client.query(
      `INSERT INTO gas_payments
       (booking_id, customer_id, payment_method, amount, transaction_id, payment_status, receipt_number)
       VALUES ($1, $2, $3, $4, $5, 'success', $6)`,
      [
        booking.id,
        booking.customer_id,
        validMethod,
        booking.total_amount,
        transactionId,
        receiptNumber
      ]
    );

    await client.query(
      `UPDATE gas_cylinder_bookings SET payment_status = 'paid' WHERE id = $1`,
      [booking.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Cylinder payment successful',
      data: {
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        amount: booking.total_amount,
        booking_number: booking_number
      }
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Cylinder payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
