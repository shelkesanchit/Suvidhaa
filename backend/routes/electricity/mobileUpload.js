const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const os = require('os');

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

// POST /upload/:token  { name, type, size, data (base64) }
router.post('/upload/:token', (req, res) => {
  const session = sessions.get(req.params.token);
  if (!session || Date.now() > session.expiresAt) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }
  const { name, type, size, data } = req.body;
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'No file data provided' });
  }
  // Base64 of 5MB raw ≈ 6.7MB string — reject anything over 8MB string length
  if (data.length > 8 * 1024 * 1024) {
    return res.status(413).json({ error: 'File too large (max 5MB)' });
  }
  session.file = {
    name: name || 'upload',
    type: type || 'application/octet-stream',
    size: size || 0,
    data,
  };
  res.json({ success: true });
});

module.exports = router;
