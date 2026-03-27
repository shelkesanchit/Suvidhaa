const nodemailer = require('nodemailer');

// In-memory OTP store for payment confirmations: key = `PAY:${email}`
const paymentOtpStore = new Map();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of paymentOtpStore.entries()) {
    if (now > record.expiresAt) paymentOtpStore.delete(key);
  }
}, 5 * 60 * 1000);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    tls: { rejectUnauthorized: false },
  });
}

async function sendPaymentOtp(email, { consumerName, amount, deptName }) {
  const key = `PAY:${email}`;
  const otp = generateOTP();
  paymentOtpStore.set(key, { otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"SUVIDHA ${deptName}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Payment Confirmation OTP – SUVIDHA ${deptName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;background:#fff">
        <div style="text-align:center;margin-bottom:20px">
          <h2 style="background:#1976d2;color:#fff;display:inline-block;padding:12px 24px;border-radius:8px;margin:0;letter-spacing:2px">SUVIDHA</h2>
          <p style="color:#888;font-size:12px;margin:6px 0 0">${deptName}</p>
        </div>
        <h3 style="color:#333">Payment OTP Verification</h3>
        <p style="color:#555;font-size:14px">Dear <strong>${consumerName || 'Consumer'}</strong>,</p>
        <p style="color:#555;font-size:14px">Your payment of <strong>₹${amount}</strong> via Razorpay has been received. Use the OTP below to confirm and generate your receipt.</p>
        <div style="background:#e3f2fd;border:2px dashed #1976d2;border-radius:10px;padding:28px;text-align:center;margin:20px 0">
          <p style="color:#888;font-size:12px;margin:0 0 8px">One-Time Password</p>
          <span style="font-size:42px;font-weight:bold;letter-spacing:10px;color:#1976d2">${otp}</span>
        </div>
        <p style="color:#e53935;font-size:13px">⏱ Valid for <strong>10 minutes</strong> only. Do not share this OTP.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="color:#aaa;font-size:11px;text-align:center">SUVIDHA – Smart Utility Kiosk | Government of India</p>
      </div>
    `,
  });
}

function verifyPaymentOtp(email, otp) {
  const key = `PAY:${email}`;
  const record = paymentOtpStore.get(key);
  if (!record) return { ok: false, error: 'No OTP found. Please request again.' };
  if (Date.now() > record.expiresAt) {
    paymentOtpStore.delete(key);
    return { ok: false, error: 'OTP has expired. Please request a new one.' };
  }
  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    paymentOtpStore.delete(key);
    return { ok: false, error: 'Too many incorrect attempts.' };
  }
  if (record.otp !== String(otp).trim()) {
    return { ok: false, error: `Incorrect OTP. ${5 - record.attempts} attempts remaining.` };
  }
  paymentOtpStore.delete(key);
  return { ok: true };
}

async function sendReceiptEmail(email, { receiptNumber, consumerName, consumerId, amount, transactionId, razorpayPaymentId, deptName, paymentDate }) {
  const transporter = createTransporter();
  const dateStr = paymentDate
    ? new Date(paymentDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' });

  const rows = [
    ['Receipt No.', receiptNumber || '—'],
    ['Consumer ID', consumerId || '—'],
    ['Consumer Name', consumerName || '—'],
    ['Department', deptName],
    ['Amount Paid', `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Transaction ID', transactionId || '—'],
    ['Razorpay Payment ID', razorpayPaymentId || '—'],
    ['Date & Time', dateStr],
    ['Status', 'PAID — SUCCESS'],
  ];

  const rowsHtml = rows.map(([label, value]) =>
    `<tr>
      <td style="padding:8px 14px;background:#f6f7f8;font-weight:600;color:#666;font-size:13px;border-bottom:1px solid #f0f0f0;width:180px">${label}</td>
      <td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #f0f0f0;${label === 'Amount Paid' ? 'font-weight:900;font-size:16px;color:#1976d2' : label === 'Status' ? 'font-weight:700;color:green' : ''}">${value}</td>
    </tr>`
  ).join('');

  await transporter.sendMail({
    from: `"SUVIDHA ${deptName}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Payment Receipt ${receiptNumber} – SUVIDHA ${deptName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:0;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1976d2,#42a5f5);color:#fff;padding:28px 32px;text-align:center">
          <h1 style="margin:0;font-size:24px;letter-spacing:2px">SUVIDHA</h1>
          <p style="margin:4px 0 0;font-size:13px;opacity:0.85">${deptName}</p>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.7">Official Payment Receipt</p>
        </div>
        <div style="padding:24px 32px">
          <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;overflow:hidden">
            ${rowsHtml}
          </table>
        </div>
        <div style="padding:16px 32px;background:#f5f5f5;text-align:center">
          <p style="margin:0;color:#999;font-size:11px;font-style:italic">This is a computer-generated receipt. No signature required. | SUVIDHA – Smart Utility Kiosk</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendPaymentOtp, verifyPaymentOtp, sendReceiptEmail };
