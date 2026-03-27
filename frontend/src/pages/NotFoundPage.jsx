import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h1" color="primary" fontWeight={700}>
            404
          </Typography>
          <Typography variant="h5" gutterBottom>
            Page Not Found
          </Typography>
          <Typography color="text.secondary" paragraph>
            The page you are looking for does not exist.
          </Typography>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            size="large"
          >
            Go Home
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFoundPage;
