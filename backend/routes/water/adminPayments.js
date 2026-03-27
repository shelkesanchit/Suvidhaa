/**
 * Water Admin — Payment Routes
 * Mounted at: /api/water/admin/payments
 * Used by: admin panel "Collect Payment" page for Water dept
 */
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../../config/database');
const { sendPaymentOtp, verifyPaymentOtp, sendReceiptEmail } = require('../../utils/paymentOtp');

const DEMO_AMOUNT_PAISE = 100; // ₹1 in paise (demo mode)
const DEPT_NAME = 'Water Department';

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

// POST /api/water/admin/payments/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { consumer_number, amount } = req.body;
    if (!consumer_number) return res.status(400).json({ error: 'consumer_number is required' });

    const consResult = await pool.query(
      'SELECT id, full_name, email, mobile FROM water_consumers WHERE consumer_number = $1',
      [consumer_number]
    );
    if (consResult.rows.length === 0) {
      return res.status(404).json({ error: `Consumer "${consumer_number}" not found` });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: DEMO_AMOUNT_PAISE,   // always ₹1 for demo
      currency: 'INR',
      receipt: `water_${Date.now()}`,
      notes: { consumer_number, dept: 'water', demo: true },
    });

    const transactionId = `WTXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const receiptNumber = `WRCPT${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    await pool.query(
      `INSERT INTO water_payments
         (transaction_id, consumer_id, consumer_number, amount, payment_method, payment_status,
          receipt_number, razorpay_order_id)
       VALUES ($1, $2, $3, $4, 'upi', 'pending', $5, $6)`,
      [transactionId, consResult.rows[0].id, consumer_number, amount || 1, receiptNumber, order.id]
    );

    res.json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        transaction_id: transactionId,
        razorpay_key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error('Water admin create-order error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment order' });
  }
});

// POST /api/water/admin/payments/verify
router.post('/verify', async (req, res) => {
  let client;
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, consumer_number, amount } = req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const payRow = await client.query(
      `SELECT wp.*, wc.full_name, wc.email, wc.mobile
       FROM water_payments wp
       JOIN water_consumers wc ON wp.consumer_id = wc.id
       WHERE wp.razorpay_order_id = $1`,
      [razorpay_order_id]
    );
    if (payRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const pay = payRow.rows[0];

    await client.query(
      `UPDATE water_payments SET payment_status='success', razorpay_payment_id=$1, razorpay_signature=$2, amount=$3 WHERE razorpay_order_id=$4`,
      [razorpay_payment_id, razorpay_signature, amount || pay.amount, razorpay_order_id]
    );

    await client.query('COMMIT');

    const email = pay.email;
    if (email) {
      try {
        await sendPaymentOtp(email, {
          consumerName: pay.full_name,
          amount: amount || pay.amount,
          deptName: DEPT_NAME,
        });
      } catch (otpErr) {
        console.error('OTP send error (non-fatal):', otpErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Payment verified. OTP sent to consumer email.',
      data: {
        receipt_number: pay.receipt_number,
        consumer_email: email ? email.replace(/(.{2}).*@/, '$1***@') : null,
      },
    });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    console.error('Water admin verify error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  } finally {
    if (client) client.release();
  }
});

// POST /api/water/admin/payments/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { otp, consumer_number } = req.body;

    const result = await pool.query(
      `SELECT wc.email, wc.full_name, wp.receipt_number, wp.amount, wp.transaction_id,
              wp.razorpay_payment_id, wp.razorpay_order_id, wp.payment_date
       FROM water_consumers wc
       LEFT JOIN water_payments wp ON wp.consumer_id = wc.id AND wp.payment_status = 'success'
       WHERE wc.consumer_number = $1
       ORDER BY wp.payment_date DESC LIMIT 1`,
      [consumer_number]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Consumer not found' });
    const row = result.rows[0];

    const check = verifyPaymentOtp(row.email, otp);
    if (!check.ok) return res.status(400).json({ error: check.error });

    res.json({
      success: true,
      data: {
        receipt_number: row.receipt_number,
        amount: row.amount,
        transaction_id: row.transaction_id,
        razorpay_payment_id: row.razorpay_payment_id,
        razorpay_order_id: row.razorpay_order_id,
        payment_date: row.payment_date,
      },
    });
  } catch (err) {
    console.error('Water admin verify-otp error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/water/admin/payments/send-receipt
router.post('/send-receipt', async (req, res) => {
  try {
    const { consumer_number } = req.body;

    const result = await pool.query(
      `SELECT wc.email, wc.full_name, wc.consumer_number, wp.receipt_number, wp.amount,
              wp.transaction_id, wp.razorpay_payment_id, wp.payment_date
       FROM water_consumers wc
       LEFT JOIN water_payments wp ON wp.consumer_id = wc.id AND wp.payment_status = 'success'
       WHERE wc.consumer_number = $1
       ORDER BY wp.payment_date DESC LIMIT 1`,
      [consumer_number]
    );

    if (result.rows.length === 0 || !result.rows[0].email) {
      return res.status(404).json({ error: 'No email found for consumer' });
    }

    const row = result.rows[0];
    await sendReceiptEmail(row.email, {
      receiptNumber: row.receipt_number,
      consumerName: row.full_name,
      consumerId: consumer_number,
      amount: row.amount,
      transactionId: row.transaction_id,
      razorpayPaymentId: row.razorpay_payment_id,
      deptName: DEPT_NAME,
      paymentDate: row.payment_date,
    });

    res.json({ success: true, message: 'Receipt emailed.' });
  } catch (err) {
    console.error('Water admin send-receipt error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/water/admin/payments/history/:consumerNumber
router.get('/history/:consumerNumber', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wp.id, wp.transaction_id, wp.amount, wp.payment_method, wp.payment_status,
              wp.receipt_number, wp.payment_date, wp.razorpay_payment_id, wp.razorpay_order_id,
              'bill' AS payment_type
       FROM water_payments wp
       WHERE wp.consumer_number = $1
       ORDER BY wp.payment_date DESC LIMIT 30`,
      [req.params.consumerNumber]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Water admin payment history error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
