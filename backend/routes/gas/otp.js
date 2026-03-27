const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// In-memory OTP store: email -> { otp, expiresAt, attempts }
const otpStore = new Map();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (now > record.expiresAt) otpStore.delete(email);
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
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });
}

// POST /api/gas/otp/send
router.post('/send', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const existing = otpStore.get(email);
  if (existing && existing.expiresAt - Date.now() > 9 * 60 * 1000) {
    return res.status(429).json({ error: 'Please wait before requesting another OTP.' });
  }

  const otp = generateOTP();
  otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"SUVIDHA Gas Services" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'OTP for Gas Application Submission – SUVIDHA Smart Utility Services',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;background:#fff">
          <div style="text-align:center;margin-bottom:20px">
            <div style="background:#e65100;color:#fff;padding:12px 24px;border-radius:8px;display:inline-block">
              <h2 style="margin:0;font-size:22px;letter-spacing:1px">SUVIDHA</h2>
              <p style="margin:2px 0 0;font-size:11px;opacity:0.85">Smart Utility Kiosk - Gas Services</p>
            </div>
          </div>
          <h3 style="color:#e65100;margin-bottom:8px">Email Verification Required</h3>
          <p style="color:#555;font-size:14px;margin-bottom:4px">To complete your gas application submission, please enter the OTP below:</p>
          <div style="background:#fff3e0;border:2px dashed #e65100;border-radius:10px;padding:28px;text-align:center;margin:20px 0">
            <p style="color:#888;font-size:12px;margin:0 0 8px">Your One-Time Password</p>
            <span style="font-size:42px;font-weight:bold;letter-spacing:10px;color:#e65100">${otp}</span>
          </div>
          <p style="color:#e53935;font-size:13px;margin-bottom:4px">⏱ This OTP is valid for <strong>10 minutes</strong> only.</p>
          <p style="color:#888;font-size:12px">Do not share this OTP with anyone. SUVIDHA never asks for your OTP.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="color:#aaa;font-size:11px;text-align:center">Government of India &nbsp;|&nbsp; SUVIDHA – Smart Utility Kiosk</p>
        </div>
      `,
    });
    res.json({ message: 'OTP sent successfully. Please check your email.' });
  } catch (err) {
    console.error('Gas OTP email send error:', err);
    otpStore.delete(email);
    res.status(500).json({ error: 'Failed to send OTP. Please verify the email address and try again.' });
  }
});

// POST /api/gas/otp/verify
router.post('/verify', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const record = otpStore.get(email);
  if (!record) {
    return res.status(400).json({ error: 'No OTP found for this email. Please request a new one.' });
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
  }

  if (record.otp !== String(otp).trim()) {
    return res.status(400).json({ error: `Incorrect OTP. ${5 - record.attempts} attempts remaining.` });
  }

  otpStore.delete(email);
  res.json({ message: 'Email verified successfully.' });
});

// POST /api/gas/otp/send-receipt
router.post('/send-receipt', async (req, res) => {
  const { email, application_number, application_type, application_data, submitted_at } = req.body;
  if (!email || !application_number) {
    return res.status(400).json({ error: 'Email and application number are required.' });
  }

  const typeLabels = {
    new_connection: 'New Gas Connection',
    reconnection: 'Gas Reconnection',
    disconnection: 'Gas Disconnection',
    transfer: 'Gas Connection Transfer',
    cylinder_booking: 'LPG Cylinder Booking',
    conversion: 'Gas Conversion (PNG/LPG)',
    complaint: 'Gas Complaint Registration',
    emergency_leak: 'Emergency Gas Leak Report',
  };

  const typeLabel = typeLabels[application_type] || application_type?.replace(/_/g, ' ') || 'Application';
  const submittedDate = submitted_at
    ? new Date(submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const d = application_data || {};
  const excludeKeys = ['password', 'otp', 'token', 'documents', 'agreed_to_terms'];
  const detailRows = Object.entries(d)
    .filter(([k, v]) => !excludeKeys.includes(k) && v !== null && v !== undefined && v !== '')
    .slice(0, 25)
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;white-space:nowrap">${label}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#333;font-size:13px">${String(v).substring(0, 200)}</td>
      </tr>`;
    }).join('');

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"SUVIDHA Gas Services" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Application Receipt: ${application_number} – SUVIDHA Gas Services`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:0;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#e65100,#f57c00);color:#fff;padding:28px 32px">
            <h1 style="margin:0;font-size:24px;letter-spacing:1px">SUVIDHA</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.85">Smart Utility Kiosk - Gas Services – Government of India</p>
          </div>
          <!-- Title -->
          <div style="padding:24px 32px;background:#fff3e0;border-bottom:1px solid #ffe0b2">
            <h2 style="margin:0 0 4px;color:#e65100;font-size:18px">Application Receipt</h2>
            <p style="margin:0;color:#666;font-size:13px">Thank you for submitting your application. Keep this for future reference.</p>
          </div>
          <!-- Application Summary -->
          <div style="padding:24px 32px;background:#fff">
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr>
                <td style="padding:10px;background:#fff3e0;border-radius:8px;text-align:center" colspan="2">
                  <p style="margin:0;color:#555;font-size:12px;text-transform:uppercase;letter-spacing:1px">Application Number</p>
                  <p style="margin:4px 0 0;color:#e65100;font-size:28px;font-weight:bold;letter-spacing:3px">${application_number}</p>
                </td>
              </tr>
            </table>
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;width:40%">Service Type</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#333;font-size:13px;font-weight:600">${typeLabel}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px">Date &amp; Time</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#333;font-size:13px">${submittedDate}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px">Status</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">
                  <span style="background:#e8f5e9;color:#2e7d32;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">Submitted – Under Review</span>
                </td>
              </tr>
            </table>
          </div>
          <!-- Application Details -->
          ${detailRows ? `
          <div style="padding:0 32px 24px;background:#fff">
            <h3 style="color:#e65100;font-size:15px;margin-bottom:12px;border-bottom:2px solid #ffe0b2;padding-bottom:8px">Application Details</h3>
            <table style="width:100%;border-collapse:collapse">
              ${detailRows}
            </table>
          </div>` : ''}
          <!-- Next Steps -->
          <div style="padding:20px 32px;background:#fff3e0;border-top:1px solid #ffe0b2">
            <h3 style="color:#555;font-size:14px;margin:0 0 8px">Next Steps</h3>
            <ol style="color:#666;font-size:13px;margin:0;padding-left:20px;line-height:1.8">
              <li>Your application has been received and will be reviewed within <strong>7 working days</strong>.</li>
              <li>You can track your application status using your Application Number at the kiosk or online portal.</li>
              <li>A field inspection may be scheduled if required. Ensure premises access is available.</li>
              <li>For gas emergencies, call the helpline immediately: <strong>1906</strong></li>
            </ol>
          </div>
          <!-- Footer -->
          <div style="padding:16px 32px;background:#e65100;text-align:center">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px">This is a computer-generated receipt. No signature required. | SUVIDHA – Smart Utility Kiosk</p>
          </div>
        </div>
      `,
    });
    res.json({ message: 'Receipt sent to email.' });
  } catch (err) {
    console.error('Gas receipt email error:', err);
    res.status(500).json({ error: 'Failed to send receipt email.' });
  }
});

module.exports = router;
