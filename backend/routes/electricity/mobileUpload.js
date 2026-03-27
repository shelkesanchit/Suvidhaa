const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const os = require('os');
const multer = require('multer');
const supabase = require('../../config/supabase');

// Detect the machine's LAN IPv4 (first non-loopback)
function getLanIp() {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost'; // fallback
}

/**
 * Get the base URL for QR code generation.
 * Priority:
 *   1. EXTERNAL_URL env var (for Ngrok/Cloudflare tunnels - works from any network)
 *   2. LAN IP (for same-network access)
 *
 * When using tunneling services like Ngrok:
 *   - Run: ngrok http 3000 (for frontend)
 *   - Set EXTERNAL_URL=https://abc123.ngrok.io in your .env file
 *   - The QR code will then contain a publicly accessible URL
 */
function getQrBaseUrl() {
  // If an external tunnel URL is configured, use it (works from any network/mobile data)
  if (process.env.EXTERNAL_URL) {
    // Remove trailing slash if present
    return process.env.EXTERNAL_URL.replace(/\/$/, '');
  }

  // Fallback to LAN IP (only works on same network)
  const frontendPort = process.env.FRONTEND_PORT || 3000;
  const lanIp = getLanIp();
  return `http://${lanIp}:${frontendPort}`;
}

// Configure multer for memory storage (files stored in memory as Buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (increased from 5MB)
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowed = /jpeg|jpg|png|gif|pdf/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    const mimeOk = allowed.test(file.mimetype);
    const extOk = allowed.test(ext);

    if (mimeOk && extOk) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF) and PDF files are allowed'));
    }
  }
});

// In-memory session store: token -> { docKey, docLabel, expiresAt, file, applicationId }
const sessions = new Map();

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions.entries()) {
    if (now > s.expiresAt) sessions.delete(token);
  }
}, 5 * 60 * 1000);

// POST /create-session  { docKey, docLabel, applicationId }
router.post('/create-session', (req, res) => {
  const { docKey, docLabel, applicationId } = req.body;
  if (!docKey) return res.status(400).json({ error: 'docKey is required' });

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    docKey,
    docLabel: docLabel || 'Document',
    applicationId: applicationId || null, // Optional: link to specific application
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    file: null,
  });

  const baseUrl = getQrBaseUrl();
  const qrUrl = `${baseUrl}/mobile-upload/${token}`;

  // Log for debugging tunnel setup
  if (process.env.EXTERNAL_URL) {
    console.log(`📱 QR Session created with tunnel URL: ${qrUrl}`);
  } else {
    console.log(`📱 QR Session created with LAN URL: ${qrUrl}`);
    console.log(`   💡 Tip: Set EXTERNAL_URL env var for access from any network`);
  }

  res.json({ token, qrUrl, externalAccess: !!process.env.EXTERNAL_URL });
});

// GET /info/:token  — used by mobile page to display document name
router.get('/info/:token', (req, res) => {
  const session = sessions.get(req.params.token);
  if (!session || Date.now() > session.expiresAt) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }
  res.json({ docKey: session.docKey, docLabel: session.docLabel });
});

// GET /status/:token  — polled by desktop; consumes session on success
router.get('/status/:token', (req, res) => {
  const session = sessions.get(req.params.token);
  if (!session || Date.now() > session.expiresAt) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }
  if (session.file) {
    const fileData = { ...session.file };
    sessions.delete(req.params.token);
    return res.json({ ready: true, file: fileData });
  }
  res.json({ ready: false });
});

// POST /upload/:token - Upload file using multipart/form-data (IMPROVED - uses FormData instead of base64)
router.post('/upload/:token', upload.single('file'), async (req, res) => {
  try {
    const session = sessions.get(req.params.token);
    if (!session || Date.now() > session.expiresAt) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Option 1: Store file in session (for desktop polling)
    // Convert buffer to base64 for consistent storage format
    const base64Data = req.file.buffer.toString('base64');

    session.file = {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      data: base64Data,
    };

    // Option 2: If you want to upload directly to Supabase (uncomment below)
    /*
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'electricity-documents';
    const filename = `mobile-uploads/${Date.now()}-${Math.round(Math.random() * 1e9)}-${req.file.originalname}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      throw new Error('Storage upload failed: ' + error.message);
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);

    session.file = {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      url: urlData.publicUrl,
    };
    */

    console.log(`✅ File uploaded via mobile: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);

    res.json({ success: true });
  } catch (error) {
    console.error('Mobile upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

module.exports = router;
