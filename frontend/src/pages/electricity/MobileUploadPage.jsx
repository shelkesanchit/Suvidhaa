import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Button, CircularProgress, Alert, Paper,
} from '@mui/material';
import {
  CloudUpload, CheckCircle, ErrorOutline, PhoneAndroid, CameraAlt,
} from '@mui/icons-material';
import api from '../../utils/api';

// Bare fetch helper using window.location.origin — works on any host
// (kiosk localhost, LAN IP on same WiFi, or Cloudflare tunnel URL)
const mobileApi = {
  get: (path) => fetch(`${window.location.origin}/api${path}`).then(r => r.ok ? r.json() : Promise.reject(r)),
  post: (path, body) => fetch(`${window.location.origin}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.ok ? r.json() : Promise.reject(r)),
};

export default function MobileUploadPage() {
  const { token } = useParams();
  const [phase, setPhase] = useState('checking'); // checking | ready | uploading | done | expired | error
  const [docLabel, setDocLabel] = useState('Document');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    mobileApi.get(`/electricity/mobile-upload/info/${token}`)
      .then(data => {
        setDocLabel(data.docLabel || 'Document');
        setPhase('ready');
      })
      .catch(() => setPhase('expired'));
  }, [token]);

  const processFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds 5MB. Please choose a smaller file.');
      setPhase('error');
      return;
    }
    setPhase('uploading');
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const data = reader.result.split(',')[1];
        await mobileApi.post(`/electricity/mobile-upload/upload/${token}`, {
          name: file.name,
          type: file.type,
          size: file.size,
          data,
        });
        setPhase('done');
      } catch {
        setErrorMsg('Upload failed. Please try again.');
        setPhase('error');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Could not read the file. Please try again.');
      setPhase('error');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const renderContent = () => {
    switch (phase) {
      case 'checking':
        return (
          <Box textAlign="center" py={4}>
            <CircularProgress size={48} />
            <Typography mt={2} color="text.secondary">Verifying session…</Typography>
          </Box>
        );

      case 'ready':
        return (
          <Box textAlign="center">
            <PhoneAndroid sx={{ fontSize: 64, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Upload: {docLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Take a clear photo or choose a file. Max 5MB.
            </Typography>

            {/* Camera / direct capture */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              component="label"
              startIcon={<CameraAlt />}
              sx={{ mb: 2, py: 1.5, borderRadius: 2 }}
            >
              Take Photo
              <input
                type="file"
                hidden
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
            </Button>

            {/* Gallery / files */}
            <Button
              variant="outlined"
              size="large"
              fullWidth
              component="label"
              startIcon={<CloudUpload />}
              sx={{ mb: 2, py: 1.5, borderRadius: 2 }}
            >
              Choose from Gallery / Files
              <input
                type="file"
                hidden
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
            </Button>

            <Typography variant="caption" color="text.secondary">
              Accepted: JPEG, PNG, PDF · Max 5 MB
            </Typography>
          </Box>
        );

      case 'uploading':
        return (
          <Box textAlign="center" py={4}>
            <CircularProgress size={60} />
            <Typography variant="h6" mt={2}>Uploading…</Typography>
            <Typography variant="body2" color="text.secondary">Please keep this page open</Typography>
          </Box>
        );

      case 'done':
        return (
          <Box textAlign="center" py={2}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main" fontWeight={600}>
              Upload Successful!
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Your document has been received at the kiosk.
              <br />You can now close this page.
            </Typography>
          </Box>
        );

      case 'expired':
        return (
          <Box textAlign="center" py={2}>
            <ErrorOutline sx={{ fontSize: 72, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={600}>Session Expired</Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              This QR code has expired or already been used.
              <br />Please go back to the kiosk and generate a new QR code.
            </Typography>
          </Box>
        );

      case 'error':
        return (
          <Box textAlign="center" py={1}>
            <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" color="error.main" fontWeight={600} gutterBottom>
              Upload Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
            <Button
              variant="outlined"
              onClick={() => { setPhase('ready'); setErrorMsg(''); }}
            >
              Try Again
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f0f4f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 420, width: '100%', borderRadius: 3, boxShadow: 4 }}>
        {/* Header */}
        <Box textAlign="center" mb={3}>
          <Typography variant="h5" fontWeight="bold" color="primary">
            SUVIDHA
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Document Upload Portal
          </Typography>
        </Box>

        {renderContent()}
      </Paper>
    </Box>
  );
}
