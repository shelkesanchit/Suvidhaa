import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  WaterDrop,
  Email,
  Lock,
} from '@mui/icons-material';
import { useAuth } from "../../contexts/AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await login({ email, password }, 'water');
      // AuthContext handles toast + redirect on success
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0288d1 0%, #4fc3f7 50%, #00bcd4 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated water bubbles */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.3 }}>
        {[...Array(20)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: Math.random() * 60 + 20,
              height: Math.random() * 60 + 20,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.3)',
              left: `${Math.random() * 100}%`,
              bottom: '-100px',
              animation: `rise ${Math.random() * 10 + 10}s infinite ease-in`,
              animationDelay: `${Math.random() * 5}s`,
              '@keyframes rise': {
                '0%': { transform: 'translateY(0) scale(1)', opacity: 0.6 },
                '100%': { transform: 'translateY(-100vh) scale(0.5)', opacity: 0 },
              },
            }}
          />
        ))}
      </Box>

      <Card
        sx={{
          maxWidth: 450,
          width: '90%',
          mx: 2,
          borderRadius: 4,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0288d1 0%, #4fc3f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                boxShadow: '0 4px 20px rgba(2, 136, 209, 0.4)',
              }}
            >
              <WaterDrop sx={{ fontSize: 45, color: 'white' }} />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary.dark">
              Water Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Municipal Water Supply Department
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #0288d1 0%, #03a9f4 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #01579b 0%, #0288d1 100%)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Demo credentials */}
          <Box sx={{ mt: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
              <strong>Demo Credentials:</strong><br />
              Email: water.admin@municipal.gov | Password: WaterAdmin@123
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
