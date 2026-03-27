/**
 * Electricity Admin — Payment Routes
 * Mounted at: /api/admin/payments
 * Used by: admin panel "Collect Payment" page
 */
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../../config/database');
const { verifyToken, isAdminOrStaff } = require('../../middleware/auth');
const { sendPaymentOtp, verifyPaymentOtp, sendReceiptEmail } = require('../../utils/paymentOtp');

const DEMO_AMOUNT_PAISE = 100; // ₹1 in paise (demo mode)
const DEPT_NAME = 'Electricity Department';

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

// POST /api/admin/payments/create-order
router.post('/create-order', verifyToken, isAdminOrStaff, async (req, res) => {
  try {
    const { consumer_number, amount } = req.body;
    if (!consumer_number) return res.status(400).json({ error: 'consumer_number is required' });

    const accResult = await pool.query(
      `SELECT ca.id, u.email, u.full_name
       FROM electricity_consumer_accounts ca
       LEFT JOIN electricity_users u ON ca.user_id = u.id
       WHERE ca.consumer_number = $1`,
      [consumer_number]
    );
    if (accResult.rows.length === 0) {
      return res.status(404).json({ error: `Consumer "${consumer_number}" not found` });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: DEMO_AMOUNT_PAISE,   // always ₹1 for demo
      currency: 'INR',
      receipt: `elec_${Date.now()}`,
      notes: { consumer_number, dept: 'electricity', demo: true },
    });

    const transactionId = `ETXN${Date.now()}`;
    await pool.query(
      `INSERT INTO electricity_payments
         (transaction_id, consumer_account_id, amount, payment_method, payment_status, razorpay_order_id)
       VALUES ($1, $2, $3, 'upi', 'pending', $4)`,
      [transactionId, accResult.rows[0].id, amount || 1, order.id]
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
    console.error('Electricity admin create-order error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment order' });
  }
});

// POST /api/admin/payments/verify
router.post('/verify', verifyToken, isAdminOrStaff, async (req, res) => {
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
      'SELECT ep.*, ca.consumer_number, u.email, u.full_name FROM electricity_payments ep JOIN electricity_consumer_accounts ca ON ep.consumer_account_id = ca.id LEFT JOIN electricity_users u ON ca.user_id = u.id WHERE ep.razorpay_order_id = $1',
      [razorpay_order_id]
    );
    if (payRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const pay = payRow.rows[0];
    const receiptNumber = `ERCPT${new Date().getFullYear()}${String(pay.id).padStart(8, '0')}`;

    await client.query(
      `UPDATE electricity_payments SET payment_status='success', razorpay_payment_id=$1, razorpay_signature=$2, receipt_number=$3, amount=$4 WHERE razorpay_order_id=$5`,
      [razorpay_payment_id, razorpay_signature, receiptNumber, amount || pay.amount, razorpay_order_id]
    );

    await client.query('COMMIT');

    // Send OTP to consumer email
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
      data: { receipt_number: receiptNumber, consumer_email: email ? email.replace(/(.{2}).*@/, '$1***@') : null },
    });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    console.error('Electricity admin verify error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  } finally {
    if (client) client.release();
  }
});

// POST /api/admin/payments/verify-otp
router.post('/verify-otp', verifyToken, isAdminOrStaff, async (req, res) => {
  try {
    const { otp, consumer_number } = req.body;

    // Look up consumer email
    const result = await pool.query(
      `SELECT u.email, u.full_name, ep.receipt_number, ep.amount, ep.transaction_id, ep.razorpay_payment_id, ep.razorpay_order_id, ep.payment_date
       FROM electricity_consumer_accounts ca
       LEFT JOIN electricity_users u ON ca.user_id = u.id
       LEFT JOIN electricity_payments ep ON ep.consumer_account_id = ca.id AND ep.payment_status = 'success'
       WHERE ca.consumer_number = $1
       ORDER BY ep.payment_date DESC LIMIT 1`,
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
    console.error('Electricity admin verify-otp error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/payments/send-receipt
router.post('/send-receipt', verifyToken, isAdminOrStaff, async (req, res) => {
  try {
    const { consumer_number, payment_id } = req.body;

    const result = await pool.query(
      `SELECT u.email, u.full_name, ep.receipt_number, ep.amount, ep.transaction_id, ep.razorpay_payment_id, ep.payment_date, ca.consumer_number
       FROM electricity_consumer_accounts ca
       LEFT JOIN electricity_users u ON ca.user_id = u.id
       LEFT JOIN electricity_payments ep ON ep.consumer_account_id = ca.id AND ep.payment_status = 'success'
       WHERE ca.consumer_number = $1
       ORDER BY ep.payment_date DESC LIMIT 1`,
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
    console.error('Electricity admin send-receipt error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/payments/history/:consumerNumber
router.get('/history/:consumerNumber', verifyToken, isAdminOrStaff, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ep.id, ep.transaction_id, ep.amount, ep.payment_method, ep.payment_status,
              ep.receipt_number, ep.payment_date, ep.razorpay_payment_id, ep.razorpay_order_id,
              'bill' AS payment_type
       FROM electricity_payments ep
       JOIN electricity_consumer_accounts ca ON ep.consumer_account_id = ca.id
       WHERE ca.consumer_number = $1
       ORDER BY ep.payment_date DESC LIMIT 30`,
      [req.params.consumerNumber]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Electricity admin payment history error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
