/**
 * Gas Admin — Payment Routes
 * Mounted at: /api/gas/admin/payments
 * Used by: admin panel "Collect Payment" page for Gas dept
 */
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../../config/database');
const { sendPaymentOtp, verifyPaymentOtp, sendReceiptEmail } = require('../../utils/paymentOtp');

const DEMO_AMOUNT_PAISE = 100; // ₹1 in paise (demo mode)
const DEPT_NAME = 'Gas Department';

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

// POST /api/gas/admin/payments/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { consumer_number, amount } = req.body;
    if (!consumer_number) return res.status(400).json({ error: 'consumer_number is required' });

    const consResult = await pool.query(
      'SELECT id, full_name, email, phone FROM gas_consumers WHERE consumer_number = $1',
      [consumer_number]
    );
    if (consResult.rows.length === 0) {
      return res.status(404).json({ error: `Consumer "${consumer_number}" not found` });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: DEMO_AMOUNT_PAISE,   // always ₹1 for demo
      currency: 'INR',
      receipt: `gas_${Date.now()}`,
      notes: { consumer_number, dept: 'gas', demo: true },
    });

    const transactionId = `GTXN${Date.now()}`;
    const receiptNumber = `GRCPT${new Date().getFullYear()}${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`;

    await pool.query(
      `INSERT INTO gas_payments
         (customer_id, payment_method, amount, transaction_id, payment_status, receipt_number, razorpay_order_id)
       VALUES ($1, 'online', $2, $3, 'pending', $4, $5)`,
      [consResult.rows[0].id, amount || 1, transactionId, receiptNumber, order.id]
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
    console.error('Gas admin create-order error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment order' });
  }
});

// POST /api/gas/admin/payments/verify
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
      `SELECT gp.*, gc.consumer_number, gc.email, gc.full_name, gc.phone
       FROM gas_payments gp
       JOIN gas_consumers gc ON gp.customer_id = gc.id
       WHERE gp.razorpay_order_id = $1`,
      [razorpay_order_id]
    );
    if (payRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const pay = payRow.rows[0];

    await client.query(
      `UPDATE gas_payments SET payment_status='success', razorpay_payment_id=$1, razorpay_signature=$2, amount=$3 WHERE razorpay_order_id=$4`,
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
    console.error('Gas admin verify error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  } finally {
    if (client) client.release();
  }
});

// POST /api/gas/admin/payments/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { otp, consumer_number } = req.body;

    const result = await pool.query(
      `SELECT gc.email, gc.full_name, gp.receipt_number, gp.amount, gp.transaction_id,
              gp.razorpay_payment_id, gp.razorpay_order_id, gp.payment_date
       FROM gas_consumers gc
       LEFT JOIN gas_payments gp ON gp.customer_id = gc.id AND gp.payment_status = 'success'
       WHERE gc.consumer_number = $1
       ORDER BY gp.payment_date DESC LIMIT 1`,
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
    console.error('Gas admin verify-otp error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gas/admin/payments/send-receipt
router.post('/send-receipt', async (req, res) => {
  try {
    const { consumer_number } = req.body;

    const result = await pool.query(
      `SELECT gc.email, gc.full_name, gc.consumer_number, gp.receipt_number, gp.amount,
              gp.transaction_id, gp.razorpay_payment_id, gp.payment_date
       FROM gas_consumers gc
       LEFT JOIN gas_payments gp ON gp.customer_id = gc.id AND gp.payment_status = 'success'
       WHERE gc.consumer_number = $1
       ORDER BY gp.payment_date DESC LIMIT 1`,
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
    console.error('Gas admin send-receipt error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gas/admin/payments/history/:consumerId
router.get('/history/:consumerId', async (req, res) => {
  try {
    const consResult = await pool.query(
      'SELECT id FROM gas_consumers WHERE consumer_number = $1',
      [req.params.consumerId]
    );
    if (consResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer not found' });
    }

    const result = await pool.query(
      `SELECT gp.id, gp.transaction_id, gp.amount, gp.payment_method, gp.payment_status,
              gp.receipt_number, gp.payment_date, gp.razorpay_payment_id, gp.razorpay_order_id,
              'bill' AS payment_type
       FROM gas_payments gp
       WHERE gp.customer_id = $1
       ORDER BY gp.payment_date DESC LIMIT 30`,
      [consResult.rows[0].id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Gas admin payment history error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
