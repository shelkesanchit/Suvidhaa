import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { TranslationProvider, FloatingLanguageSelector, AutoTranslator } from './i18n';
import { VirtualKeyboardProvider, VirtualKeyboard, KeyboardGlobalListener, KeyboardToggle } from './components/keyboard';
import { VoiceInputProvider, VoiceInput } from './components/voice';
import { AccessibilityModeProvider, AccessibilityModeToggle, AccessibilityOverlay } from './components/accessibility';
import { GlobalNavigationButtons } from './components/navigation/GlobalNavigationButtons';
import './index.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#f57c00',
      light: '#ff9800',
      dark: '#e65100',
    },
    success: {
      main: '#2e7d32',
    },
    error: {
      main: '#d32f2f',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          padding: '12px 22px',
          fontSize: '0.98rem',
          fontWeight: 700,
          minHeight: 52,
          letterSpacing: '0.01em',
          borderWidth: 2,
        },
        contained: {
          background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
          color: '#ffffff',
          border: '1px solid rgba(13, 71, 161, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0f55ad 0%, #083a85 100%)',
            boxShadow: '0 8px 20px rgba(13, 71, 161, 0.25)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #ef6c00 0%, #e65100 100%)',
          border: '1px solid rgba(230, 81, 0, 0.35)',
          '&:hover': {
            background: 'linear-gradient(135deg, #df6400 0%, #cf4900 100%)',
            boxShadow: '0 8px 20px rgba(230, 81, 0, 0.22)',
          },
        },
        containedError: {
          background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
          border: '1px solid rgba(198, 40, 40, 0.35)',
          '&:hover': {
            background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
            boxShadow: '0 8px 20px rgba(198, 40, 40, 0.24)',
          },
        },
        outlined: {
          background: 'linear-gradient(135deg, #f8fbff 0%, #edf4ff 100%)',
          borderColor: '#8faedd',
          color: '#123a72',
          '&:hover': {
            borderColor: '#6f94d0',
            background: 'linear-gradient(135deg, #f1f7ff 0%, #e2eeff 100%)',
          },
        },
        outlinedError: {
          background: '#fff5f5',
          borderColor: '#ef9a9a',
          color: '#b71c1c',
          '&:hover': {
            background: '#ffecec',
            borderColor: '#e57373',
          },
        },
        text: {
          color: '#123a72',
          background: 'rgba(18, 58, 114, 0.06)',
          '&:hover': {
            background: 'rgba(18, 58, 114, 0.12)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TranslationProvider>
          <AutoTranslator>
            <VirtualKeyboardProvider>
              <VoiceInputProvider>
                <AccessibilityModeProvider>
                  <div className="kiosk-control-rail" aria-hidden="true" />
                  <KeyboardGlobalListener />
                  <FloatingLanguageSelector position="top-right" />
                  <VoiceInput position="top-right" showLanguageSelector={true} />
                  <KeyboardToggle />
                  <AccessibilityModeToggle position="top-right" showLabel={false} size="medium" />
                  <GlobalNavigationButtons />
                  <div className="kiosk-content-safe-area">
                    <App />
                  </div>
                  <VirtualKeyboard />
                  <AccessibilityOverlay />
                </AccessibilityModeProvider>
              </VoiceInputProvider>
            </VirtualKeyboardProvider>
          </AutoTranslator>
        </TranslationProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#4caf50',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#f44336',
                secondary: '#fff',
              },
            },
          }}
        />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
