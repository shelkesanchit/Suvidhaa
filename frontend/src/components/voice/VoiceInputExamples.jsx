/**
 * Voice Input Example Component
 *
 * This is a reference component showing how to integrate voice input
 * with existing forms. Use this as a guide for adding voice input to your forms.
 *
 * NOTE: This is an EXAMPLE component - not used in production.
 *       Copy patterns from here to your actual forms.
 */

import React, { useRef } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { VoiceInputButton } from './VoiceInputButton';

/**
 * Example 1: Basic Form with Voice Input
 * Shows how to add voice input to regular text fields
 */
export function VoiceInputBasicExample() {
  const { register, handleSubmit, setValue } = useForm();
  const nameRef = useRef();
  const emailRef = useRef();
  const addressRef = useRef();

  const onSubmit = (data) => {
    console.log('Form data:', data);
    alert(`Submitted:\nName: ${data.name}\nEmail: ${data.email}\nAddress: ${data.address}`);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Voice Input Example - Basic Form
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Name field with voice input */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TextField
                  label="Full Name"
                  placeholder="Enter your full name or use voice"
                  fullWidth
                  {...register('name')}
                  inputRef={nameRef}
                />
                <VoiceInputButton
                  inputId="name"
                  inputRef={nameRef}
                  setValue={setValue}
                  fieldName="name"
                  size="medium"
                  variant="contained"
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Click the mic button and speak your name
              </Typography>
            </Grid>

            {/* Email field with voice input */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TextField
                  label="Email Address"
                  placeholder="Enter your email or use voice"
                  fullWidth
                  {...register('email')}
                  inputRef={emailRef}
                />
                <VoiceInputButton
                  inputId="email"
                  inputRef={emailRef}
                  setValue={setValue}
                  fieldName="email"
                  size="medium"
                  variant="outlined"
                />
              </Box>
            </Grid>

            {/* Address field with voice input */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TextField
                  label="Address"
                  placeholder="Enter your address or use voice"
                  fullWidth
                  multiline
                  rows={3}
                  {...register('address')}
                  inputRef={addressRef}
                />
                <VoiceInputButton
                  inputId="address"
                  inputRef={addressRef}
                  setValue={setValue}
                  fieldName="address"
                  size="large"
                  variant="contained"
                  append={true}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Voice input will append to existing text (multiple voice inputs)
              </Typography>
            </Grid>

            {/* Submit button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                sx={{ mt: 2 }}
              >
                Submit Form
              </Button>
            </Grid>
          </Grid>
        </form>

        {/* Instructions */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            💡 How to use:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>Click on any input field</li>
            <li>Click the microphone button next to the field</li>
            <li>Speak clearly in English, Hindi, or Marathi</li>
            <li>Your speech will be converted to text automatically</li>
            <li>You can also use the floating mic button at the bottom-left</li>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

/**
 * Example 2: Form Without Inline Buttons (Using Floating Mic Only)
 * The floating mic button works automatically with focused inputs
 */
export function VoiceInputFloatingExample() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    console.log('Form data:', data);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Voice Input Example - Using Floating Mic
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="First Name"
                placeholder="Focus here, then click floating mic"
                fullWidth
                {...register('firstName')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Last Name"
                fullWidth
                {...register('lastName')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Phone Number"
                fullWidth
                {...register('phone')}
              />
            </Grid>

            <Grid item xs={12}>
              <Button type="submit" variant="contained" size="large" fullWidth>
                Submit
              </Button>
            </Grid>
          </Grid>
        </form>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            ✨ Using the floating mic button:
          </Typography>
          <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
            <li>Focus on ANY input field (click inside it)</li>
            <li>Look at the bottom-left corner - you'll see a microphone button</li>
            <li>Click that button and speak</li>
            <li>Voice input goes into the focused field automatically</li>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

/**
 * Example 3: Custom Voice Input Handler
 * Shows how to use custom callback for advanced processing
 */
export function VoiceInputCustomExample() {
  const [result, setResult] = React.useState('');
  const { register, handleSubmit, setValue } = useForm();
  const inputRef = useRef();

  const handleVoiceInput = (text) => {
    // Custom processing
    const processed = text.toUpperCase();
    setResult(`Original: "${text}" | Processed: "${processed}"`);
    setValue('customField', processed);
  };

  const onSubmit = (data) => {
    console.log('Form data:', data);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Voice Input Example - Custom Processing
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TextField
                  label="Custom Processed Field"
                  placeholder="Voice input will be converted to UPPERCASE"
                  fullWidth
                  {...register('customField')}
                  inputRef={inputRef}
                />
                <VoiceInputButton
                  inputId="customField"
                  onResult={handleVoiceInput}
                  size="medium"
                  variant="contained"
                  showStatus={true}
                />
              </Box>
            </Grid>

            {result && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="body2">{result}</Typography>
                </Paper>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button type="submit" variant="contained" size="large" fullWidth>
                Submit
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default VoiceInputBasicExample;
