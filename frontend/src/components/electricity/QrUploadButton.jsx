import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, CircularProgress, Alert, Tooltip, Chip,
} from '@mui/material';
import { QrCode2, CheckCircle, PhoneAndroid, Wifi, Public } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../utils/api';

/**
 * QrUploadButton
 * Adds a "Upload via Mobile QR" button next to a document upload slot.
 *
 * Props:
 *   docKey        — unique key for the document (e.g. 'identity_proof')
 *   docLabel      — human-readable label shown on phone (e.g. 'Identity Proof')
 *   onFileReceived(fileData) — called with { name, type, size, data } when upload is done
 */
export default function QrUploadButton({ docKey, docLabel, onFileReceived }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | creating | waiting | received | error
  const [qrUrl, setQrUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [externalAccess, setExternalAccess] = useState(false);
  const pollRef = useRef(null);
  const tokenRef = useRef('');

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  const handleOpen = async () => {
    setOpen(true);
    setPhase('creating');
    setErrorMsg('');
    try {
      const r = await api.post('/electricity/mobile-upload/create-session', { docKey, docLabel });
      const t = r.data.token;
      tokenRef.current = t;
      const url = r.data.qrUrl;
      setQrUrl(url);
      setExternalAccess(r.data.externalAccess || false);
      setPhase('waiting');

      // Poll every 2 seconds
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.get(`/electricity/mobile-upload/status/${t}`);
          if (s.data.ready) {
            stopPolling();
            onFileReceived(s.data.file);
            setPhase('received');
            setTimeout(() => handleClose(), 2000);
          }
        } catch {
          stopPolling();
          setPhase('error');
          setErrorMsg('QR code expired. Please close and try again.');
        }
      }, 2000);
    } catch {
      setPhase('error');
      setErrorMsg('Failed to create upload session. Please try again.');
    }
  };

  const handleClose = () => {
    stopPolling();
    setOpen(false);
    // Reset phase after dialog closes
    setTimeout(() => {
      setPhase('idle');
      setQrUrl('');
      setErrorMsg('');
      setExternalAccess(false);
    }, 300);
  };

  return (
    <>
      <Tooltip title="Generate a QR code to upload this document from your mobile phone">
        <Button
          variant="outlined"
          size="small"
          startIcon={<QrCode2 />}
          onClick={handleOpen}
          fullWidth
          sx={{
            mt: 1,
            borderStyle: 'dashed',
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': { borderColor: 'primary.main', color: 'primary.main', borderStyle: 'solid' },
          }}
        >
          Upload via Mobile QR
        </Button>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
          <PhoneAndroid sx={{ color: 'primary.main', verticalAlign: 'middle', mr: 0.5 }} />
          Mobile Upload
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* Creating session */}
          {phase === 'creating' && (
            <Box textAlign="center" py={3}>
              <CircularProgress />
              <Typography mt={2} color="text.secondary">Generating QR Code…</Typography>
            </Box>
          )}

          {/* Waiting for phone scan */}
          {phase === 'waiting' && (
            <Box textAlign="center">
              <Alert severity="info" sx={{ mb: 2 }}>
                Scan with your phone to upload <strong>{docLabel}</strong>
              </Alert>

              {/* Network access indicator */}
              <Chip
                icon={externalAccess ? <Public /> : <Wifi />}
                label={externalAccess ? "Works from any network" : "Same WiFi required"}
                color={externalAccess ? "success" : "warning"}
                size="small"
                sx={{ mb: 2 }}
              />

              {/* QR Code */}
              <Box
                sx={{
                  display: 'inline-block',
                  p: 1.5,
                  border: '3px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  bgcolor: '#fff',
                  mb: 1.5,
                }}
              >
                <QRCodeSVG value={qrUrl} size={200} level="M" includeMargin />
              </Box>

              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
                sx={{ wordBreak: 'break-all', mb: 2 }}
              >
                {qrUrl}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Waiting for upload… (expires in 10 min)
                </Typography>
              </Box>

              {!externalAccess && (
                <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                  <Typography variant="caption">
                    Your phone must be connected to the <strong>same WiFi network</strong> as this device.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          {/* File received */}
          {phase === 'received' && (
            <Box textAlign="center" py={3}>
              <CheckCircle sx={{ fontSize: 72, color: 'success.main' }} />
              <Typography variant="h6" color="success.main" mt={1} fontWeight={600}>
                Document Received!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Closing automatically…
              </Typography>
            </Box>
          )}

          {/* Error */}
          {phase === 'error' && (
            <Box py={2}>
              <Alert severity="error">{errorMsg}</Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
