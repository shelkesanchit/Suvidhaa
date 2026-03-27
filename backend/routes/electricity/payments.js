const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../../config/database');
const { verifyToken } = require('../../middleware/auth');
const { sendPaymentOtp, verifyPaymentOtp, sendReceiptEmail } = require('../../utils/paymentOtp');

const DEMO_AMOUNT_PAISE = 100; // ₹1 — demo mode

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} else {
  console.warn('Razorpay keys not configured - payment features disabled');
}

// ── Public Razorpay: POST /create-order-public (consumer kiosk, no auth) ──
router.post('/create-order-public', async (req, res) => {
  try {
    if (!razorpay) return res.status(503).json({ error: 'Payment gateway not configured' });

    const { consumer_number, bill_number } = req.body;
    if (!consumer_number) return res.status(400).json({ error: 'consumer_number is required' });

    const accResult = await pool.query(
      `SELECT ca.id, u.email, u.full_name
       FROM electricity_consumer_accounts ca
       JOIN electricity_users u ON ca.user_id = u.id
       WHERE ca.consumer_number = $1`,
      [consumer_number]
    );
    if (accResult.rows.length === 0) {
      return res.status(404).json({ error: `Consumer "${consumer_number}" not found` });
    }

    const acc = accResult.rows[0];
    const order = await razorpay.orders.create({
      amount: DEMO_AMOUNT_PAISE,
      currency: 'INR',
      receipt: `elec_${Date.now()}`,
      notes: { consumer_number, dept: 'electricity', demo: true },
    });

    const transactionId = `ELE${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const receiptNumber = `ERCPT${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    let billId = null;
    if (bill_number) {
      const bRes = await pool.query('SELECT id FROM electricity_bills WHERE bill_number = $1', [bill_number]);
      if (bRes.rows.length > 0) billId = bRes.rows[0].id;
    }

    await pool.query(
      `INSERT INTO electricity_payments
         (transaction_id, consumer_account_id, bill_id, amount, payment_method, payment_status, receipt_number, razorpay_order_id)
       VALUES ($1, $2, $3, $4, 'upi', 'pending', $5, $6)`,
      [transactionId, acc.id, billId, 1, receiptNumber, order.id]
    );

    res.json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        transaction_id: transactionId,
        razorpay_key: process.env.RAZORPAY_KEY_ID,
        consumer_name: acc.full_name,
        consumer_email: acc.email,
      },
    });
  } catch (err) {
    console.error('Electricity create-order-public error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment order' });
  }
});

// ── Public Razorpay: POST /verify-public (consumer kiosk, no auth) ──
router.post('/verify-public', async (req, res) => {
  let client;
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email: providedEmail } = req.body;

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
      `SELECT ep.*, ca.consumer_number, u.email, u.full_name
       FROM electricity_payments ep
       JOIN electricity_consumer_accounts ca ON ep.consumer_account_id = ca.id
       JOIN electricity_users u ON ca.user_id = u.id
       WHERE ep.razorpay_order_id = $1`,
      [razorpay_order_id]
    );
    if (payRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const pay = payRow.rows[0];

    await client.query(
      `UPDATE electricity_payments
       SET payment_status='success', razorpay_payment_id=$1, razorpay_signature=$2
       WHERE razorpay_order_id=$3`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    if (pay.bill_id) {
      await client.query(
        `UPDATE electricity_bills SET status='paid', payment_date=NOW() WHERE id=$1`,
        [pay.bill_id]
      );
    }

    await client.query('COMMIT');

    const otpEmail = providedEmail || pay.email;
    if (otpEmail) {
      try {
        await sendPaymentOtp(otpEmail, {
          consumerName: pay.full_name,
          amount: 1,
          deptName: 'Electricity Department',
        });
      } catch (otpErr) {
        console.error('OTP send error (non-fatal):', otpErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Payment verified. OTP sent to your email.',
      data: {
        receipt_number: pay.receipt_number,
        consumer_email: pay.email ? pay.email.replace(/(.{2}).*@/, '$1***@') : null,
        consumer_number: pay.consumer_number,
      },
    });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    console.error('Electricity verify-public error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  } finally {
    if (client) client.release();
  }
});

// ── Public OTP: POST /verify-otp-public (consumer kiosk, no auth) ──
router.post('/verify-otp-public', async (req, res) => {
  try {
    const { otp, consumer_number, email: providedEmail } = req.body;

    const result = await pool.query(
      `SELECT u.email, u.full_name, ep.receipt_number, ep.amount, ep.transaction_id,
              ep.razorpay_payment_id, ep.payment_date
       FROM electricity_consumer_accounts ca
       JOIN electricity_users u ON ca.user_id = u.id
       LEFT JOIN electricity_payments ep ON ep.consumer_account_id = ca.id AND ep.payment_status = 'success'
       WHERE ca.consumer_number = $1
       ORDER BY ep.payment_date DESC LIMIT 1`,
      [consumer_number]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Consumer not found' });
    const row = result.rows[0];

    // Use the email the consumer entered (OTP was sent there), fall back to DB email
    const otpEmail = providedEmail || row.email;
    const check = verifyPaymentOtp(otpEmail, otp);
    if (!check.ok) return res.status(400).json({ error: check.error });

    res.json({
      success: true,
      data: {
        receipt_number:     row.receipt_number,
        transaction_id:     row.transaction_id,
        razorpay_payment_id: row.razorpay_payment_id,
        consumer_name:      row.full_name,
        amount:             row.amount,
        payment_date:       row.payment_date,
      },
    });
  } catch (err) {
    console.error('Electricity verify-otp-public error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Public: POST /send-receipt-public (consumer kiosk, no auth) ──
router.post('/send-receipt-public', async (req, res) => {
  try {
    const { consumer_number, email } = req.body;
    if (!consumer_number || !email) {
      return res.status(400).json({ error: 'consumer_number and email are required' });
    }

    const result = await pool.query(
      `SELECT u.full_name, ep.receipt_number, ep.amount, ep.transaction_id,
              ep.razorpay_payment_id, ep.payment_date
       FROM electricity_consumer_accounts ca
       JOIN electricity_users u ON ca.user_id = u.id
       LEFT JOIN electricity_payments ep ON ep.consumer_account_id = ca.id AND ep.payment_status = 'success'
       WHERE ca.consumer_number = $1
       ORDER BY ep.payment_date DESC LIMIT 1`,
      [consumer_number]
    );

    if (result.rows.length === 0 || !result.rows[0].receipt_number) {
      return res.status(404).json({ error: 'No completed payment found for this consumer' });
    }

    const row = result.rows[0];
    await sendReceiptEmail(email, {
      receiptNumber:     row.receipt_number,
      consumerName:      row.full_name,
      consumerId:        consumer_number,
      amount:            row.amount,
      transactionId:     row.transaction_id,
      razorpayPaymentId: row.razorpay_payment_id,
      deptName:          'Electricity Department',
      paymentDate:       row.payment_date,
    });

    res.json({ success: true, message: 'Receipt sent to ' + email });
  } catch (err) {
    console.error('Electricity send-receipt-public error:', err);
    res.status(500).json({ error: err.message || 'Failed to send receipt' });
  }
});

// ── Public process: POST /process (no auth — consumer kiosk direct payment) ──
router.post('/process', async (req, res) => {
  try {
    const { customer_id, bill_number } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, error: 'customer_id is required' });

    const accountResult = await pool.query(
      'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1',
      [customer_id]
    );
    if (accountResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consumer not found' });
    }

    const accountId = accountResult.rows[0].id;
    const transactionId = `ELE${Date.now()}`;
    const receiptNumber = `ERCPT${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    let billId = null;
    let amount = 1; // demo ₹1
    if (bill_number) {
      const billResult = await pool.query(
        'SELECT id, total_amount FROM electricity_bills WHERE bill_number = $1',
        [bill_number]
      );
      if (billResult.rows.length > 0) {
        billId = billResult.rows[0].id;
        amount = billResult.rows[0].total_amount;
        await pool.query(
          `UPDATE electricity_bills SET status = 'paid' WHERE id = $1`,
          [billId]
        );
      }
    }

    await pool.query(
      `INSERT INTO electricity_payments
         (transaction_id, consumer_account_id, bill_id, amount, payment_method, payment_status, receipt_number)
       VALUES ($1, $2, $3, $4, 'upi', 'success', $5)`,
      [transactionId, accountId, billId, amount, receiptNumber]
    );

    res.json({ success: true, transaction_id: transactionId, receipt_number: receiptNumber });
  } catch (error) {
    console.error('Electricity process payment error:', error);
    res.status(500).json({ success: false, error: 'Payment processing failed' });
  }
});

// Create payment order
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const { amount, bill_id, consumer_number } = req.body;

    const accResult = await pool.query(
      'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1 AND user_id = $2',
      [consumer_number, req.user.id]
    );

    if (accResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: 'rcpt_' + Date.now(),
      notes: { consumer_number, bill_id: bill_id || '', user_id: req.user.id }
    };

    const order = await razorpay.orders.create(options);
    const transactionId = 'TXN' + Date.now();

    await pool.query(
      `INSERT INTO electricity_payments (transaction_id, bill_id, consumer_account_id, amount, payment_method, payment_status, razorpay_order_id)
       VALUES ($1, $2, $3, $4, 'upi', 'pending', $5)`,
      [transactionId, bill_id || null, accResult.rows[0].id, amount, order.id]
    );

    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, transaction_id: transactionId });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify payment
router.post('/verify', verifyToken, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const payRow = await client.query(
      'SELECT * FROM electricity_payments WHERE razorpay_order_id = $1',
      [razorpay_order_id]
    );
    const payment = payRow.rows[0];
    const receiptNumber = 'RCPT' + new Date().getFullYear() + String(payment.id).padStart(8, '0');

    await client.query(
      `UPDATE electricity_payments SET payment_status = 'success', razorpay_payment_id = $1, razorpay_signature = $2, receipt_number = $3 WHERE razorpay_order_id = $4`,
      [razorpay_payment_id, razorpay_signature, receiptNumber, razorpay_order_id]
    );

    if (payment.bill_id) {
      await client.query(
        `UPDATE electricity_bills SET status = 'paid', payment_date = NOW() WHERE id = $1`,
        [payment.bill_id]
      );
    }

    await client.query(
      'INSERT INTO electricity_notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'Payment Successful', 'Payment of Rs.' + payment.amount + ' completed. Receipt: ' + receiptNumber, 'success']
    );

    await client.query('COMMIT');

    res.json({ message: 'Payment verified successfully', receipt_number: receiptNumber, transaction_id: payment.transaction_id });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  } finally {
    if (client) client.release();
  }
});

// Get payment history
router.get('/history/:consumerNumber', verifyToken, async (req, res) => {
  try {
    const acc = await pool.query(
      'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1 AND user_id = $2',
      [req.params.consumerNumber, req.user.id]
    );

    if (acc.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    const result = await pool.query(
      `SELECT p.*, b.bill_number, b.billing_month
       FROM electricity_payments p
       LEFT JOIN electricity_bills b ON p.bill_id = b.id
       WHERE p.consumer_account_id = $1 AND p.payment_status = 'success'
       ORDER BY p.payment_date DESC LIMIT 20`,
      [acc.rows[0].id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get payment receipt
router.get('/receipt/:receiptNumber', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, ca.consumer_number, ca.address_line1, ca.city, u.full_name
       FROM electricity_payments p
       JOIN electricity_consumer_accounts ca ON p.consumer_account_id = ca.id
       JOIN electricity_users u ON ca.user_id = u.id
       WHERE p.receipt_number = $1 AND ca.user_id = $2`,
      [req.params.receiptNumber, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

// Prepaid recharge
router.post('/prepaid-recharge', verifyToken, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { consumer_number, amount } = req.body;

    const acc = await client.query(
      'SELECT id FROM electricity_consumer_accounts WHERE consumer_number = $1 AND user_id = $2',
      [consumer_number, req.user.id]
    );

    if (acc.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Consumer account not found' });
    }

    const rechargeNumber = 'RCH' + Date.now();
    const unitsCredited = (amount / 7.5).toFixed(2);

    await client.query(
      `INSERT INTO electricity_prepaid_recharges (recharge_number, consumer_account_id, amount, units_credited, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, 'success')`,
      [rechargeNumber, acc.rows[0].id, amount, unitsCredited, 'TXN' + Date.now()]
    );

    await client.query('COMMIT');

    res.json({ message: 'Recharge successful', recharge_number: rechargeNumber, units_credited: unitsCredited });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }
    console.error('Prepaid recharge error:', error);
    res.status(500).json({ error: 'Recharge failed' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
