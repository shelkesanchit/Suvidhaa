import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogActions,
  Box, Typography, TextField, Button,
  CircularProgress, Alert, InputAdornment, Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

/**
 * EmailOtpVerification — Municipal department email OTP verification dialog.
 *
 * Props:
 *  open           {boolean}
 *  onClose        {function}
 *  onVerified     {function}  — called with (email) when OTP is verified
 *  initialEmail   {string}
 *  initialMobile  {string}
 *  title          {string}
 */
const EmailOtpVerification = ({
  open, onClose, onVerified,
  initialEmail = '',
  initialMobile = '',
  title = 'Verify Contact',
}) => {
  const [mode, setMode]           = useState('email'); // 'email' | 'mobile'
  const [step, setStep]           = useState('contact'); // 'contact' | 'otp' | 'verified'
  const [email, setEmail]         = useState(initialEmail);
  const [mobile, setMobile]       = useState(initialMobile);
  const [otp, setOtp]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (open && initialEmail && step === 'contact') setEmail(initialEmail);
  }, [open, initialEmail, step]);

  useEffect(() => {
    if (open && initialMobile && step === 'contact') setMobile(initialMobile);
  }, [open, initialMobile, step]);

  useEffect(() => {
    if (!open) {
      setMode('email');
      setStep('contact');
      setEmail(initialEmail || '');
      setMobile(initialMobile || '');
      setOtp('');
      setError('');
      setCountdown(0);
    }
  }, [open, initialEmail, initialMobile]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const resetForModeSwitch = nextMode => {
    if (loading) return;
    setMode(nextMode);
    setStep('contact');
    setOtp('');
    setError('');
    setCountdown(0);
  };

  const handleSendOtp = async () => {
    setError('');
    if (mode === 'email') {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address.');
        return;
      }
    } else {
      if (!mobile || !/^\d{10}$/.test(mobile)) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    if (mode === 'mobile') {
      setStep('otp');
      setCountdown(60);
      toast.success('Mobile OTP sent. Use 123456 to verify.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/municipal/otp/send', { email });
      setStep('otp');
      setCountdown(60);
      toast.success('OTP sent! Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    if (mode === 'mobile') {
      if (otp !== '123456') {
        setError('Invalid OTP. Enter 123456.');
        return;
      }
      setStep('verified');
      toast.success('Mobile verified successfully!');
      setTimeout(() => { onVerified((email || initialEmail || '').trim()); }, 1200);
      return;
    }

    setLoading(true);
    try {
      await api.post('/municipal/otp/verify', { email, otp });
      setStep('verified');
      toast.success('Email verified successfully!');
      setTimeout(() => { onVerified((email || initialEmail || '').trim()); }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtp(''); setError(''); setLoading(true);

    if (mode === 'mobile') {
      setLoading(false);
      setCountdown(60);
      toast.success('Mobile OTP resent. Use 123456.');
      return;
    }

    try {
      await api.post('/municipal/otp/send', { email });
      setCountdown(60);
      toast.success('New OTP sent!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* ── Header ── */}
      <Box sx={{ background: 'linear-gradient(135deg, #2e7d32, #388e3c)', px: 3, py: 2.5 }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
          Verify via email or mobile to continue
        </Typography>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        {step === 'contact' && (
          <Box key={`contact-${mode}`}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                fullWidth
                variant={mode === 'email' ? 'contained' : 'outlined'}
                onClick={() => resetForModeSwitch('email')}
                disabled={loading}
                startIcon={<EmailIcon />}
                sx={mode === 'email' ? { background: '#2e7d32', '&:hover': { background: '#1b5e20' } } : undefined}
              >
                Email
              </Button>
              <Button
                fullWidth
                variant={mode === 'mobile' ? 'contained' : 'outlined'}
                onClick={() => resetForModeSwitch('mobile')}
                disabled={loading}
                startIcon={<PhoneIcon />}
                sx={mode === 'mobile' ? { background: '#2e7d32', '&:hover': { background: '#1b5e20' } } : undefined}
              >
                Mobile
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              {mode === 'email' ? (
                <EmailIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
              ) : (
                <PhoneIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
              )}
              <Typography variant="body1" fontWeight={600}>
                {mode === 'email' ? 'Enter your email address' : 'Enter your mobile number'}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              {mode === 'email'
                ? 'An OTP will be sent to this email. The receipt will also be delivered here after submission.'
                : 'A mobile OTP will be generated for this number. Use 123456 to verify in demo mode.'}
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              key={`contact-input-${mode}`}
              fullWidth
              label={mode === 'email' ? 'Email Address' : 'Mobile Number'}
              type={mode === 'email' ? 'email' : 'tel'}
              value={mode === 'email' ? email : mobile}
              onChange={e => {
                if (mode === 'email') {
                  setEmail(e.target.value);
                } else {
                  setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                }
                setError('');
              }}
              onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {mode === 'email' ? (
                      <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    ) : (
                      <PhoneIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    )}
                  </InputAdornment>
                ),
              }}
              inputProps={mode === 'mobile' ? { maxLength: 10 } : undefined}
              autoComplete={mode === 'email' ? 'email' : 'tel'}
              autoFocus
            />
          </Box>
        )}

        {step === 'otp' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <LockIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
              <Typography variant="body1" fontWeight={600}>Enter OTP</Typography>
            </Box>
            <Alert severity="success" icon={mode === 'email' ? <EmailIcon /> : <PhoneIcon />} sx={{ mb: 2 }}>
              {mode === 'email' ? (
                <>OTP sent to <strong>{email}</strong></>
              ) : (
                <>OTP sent to <strong>{mobile}</strong>. Use <strong>123456</strong></>
              )}
            </Alert>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              fullWidth
              label="6-Digit OTP"
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
              inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: 28, letterSpacing: 8, fontWeight: 700 } }}
              autoFocus
              placeholder="• • • • • •"
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                sx={{ textTransform: 'none' }}
              >
                Resend OTP {countdown > 0 ? `(${countdown}s)` : ''}
              </Button>
              <Button
                size="small"
                onClick={() => { setStep('contact'); setError(''); setOtp(''); }}
                disabled={loading}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Change {mode === 'email' ? 'Email' : 'Mobile'}
              </Button>
            </Box>
          </Box>
        )}

        {step === 'verified' && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} color="success.main">
              {mode === 'email' ? 'Email Verified!' : 'Mobile Verified!'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Submitting your application...
            </Typography>
          </Box>
        )}
      </DialogContent>

      {step !== 'verified' && (
        <>
          <Divider sx={{ mx: 2 }} />
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={onClose} disabled={loading} color="inherit">Cancel</Button>
            {step === 'contact' && (
              <Button
                variant="contained"
                onClick={handleSendOtp}
                disabled={loading}
                endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
                sx={{ background: '#2e7d32', '&:hover': { background: '#1b5e20' } }}
              >
                Send {mode === 'email' ? 'OTP' : 'Mobile OTP'}
              </Button>
            )}
            {step === 'otp' && (
              <Button
                variant="contained"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                sx={{ background: '#2e7d32', '&:hover': { background: '#1b5e20' } }}
              >
                Verify &amp; Submit
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default EmailOtpVerification;
