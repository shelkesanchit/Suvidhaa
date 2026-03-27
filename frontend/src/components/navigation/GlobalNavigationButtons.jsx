import React, { useEffect, useState } from 'react';
import { Box, Button, Tooltip, Fade } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

export function GlobalNavigationButtons() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dialogContext, setDialogContext] = useState(null);

  // Poll for open dialog and its action buttons (Robust Kiosk Pattern)
  useEffect(() => {
    const interval = setInterval(() => {
      const dialog = document.querySelector('.MuiDialog-root[role="presentation"]');
      if (dialog) {
        const buttons = Array.from(dialog.querySelectorAll('.MuiDialogActions-root button'));
        const backBtn = buttons.find((b) => b.textContent && b.textContent.toLowerCase().includes('back'));
        const nextBtn = buttons.find(
          (b) =>
            b.textContent &&
            (b.textContent.toLowerCase().includes('next') ||
              b.textContent.toLowerCase().includes('submit'))
        );
        const cancelBtn = buttons.find((b) => b.textContent && b.textContent.toLowerCase().includes('cancel'));

        setDialogContext({
          isOpen: true,
          hasBack: !!backBtn,
          canGoBack: backBtn && !backBtn.disabled,
          backElem: backBtn,
          hasNext: !!nextBtn,
          canGoNext: nextBtn && !nextBtn.disabled,
          nextLabel: nextBtn ? nextBtn.textContent.trim() : 'Next',
          nextElem: nextBtn,
          cancelElem: cancelBtn,
        });

        // Optional: Hide the default dialog actions visually since we control them now, 
        // or just leave them. Leaving them is safer.
      } else {
        setDialogContext(null);
      }
    }, 250); // Fast polling for snappy UI updates

    return () => clearInterval(interval);
  }, []);

  // Normal behavior if no dialog is open: hidden on home page.
  if (location.pathname === '/' && !dialogContext?.isOpen) {
    return null;
  }

  const handleBack = () => {
    if (dialogContext?.isOpen && dialogContext.backElem && !dialogContext.backElem.disabled) {
      dialogContext.backElem.click();
    } else if (!dialogContext?.isOpen) {
      navigate(-1);
    }
  };

  const handleNext = () => {
    if (dialogContext?.isOpen && dialogContext.nextElem && !dialogContext.nextElem.disabled) {
      dialogContext.nextElem.click();
    }
  };

  const handleCancel = () => {
    if (dialogContext?.isOpen && dialogContext.cancelElem) {
      dialogContext.cancelElem.click();
    }
    navigate('/');
  };

  return (
    <Fade in={true}>
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 16,
          zIndex: 1400, // Higher than MuiDialog (1300)
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {/* Next / Submit Button (Only shows when forms have one) */}
        {dialogContext?.isOpen && dialogContext?.hasNext && (
          <Tooltip title={dialogContext.nextLabel} placement="left" arrow>
            <Button
              onClick={handleNext}
              disabled={!dialogContext.canGoNext}
              aria-label={dialogContext.nextLabel}
              sx={{
                width: 'var(--kiosk-control-width, 166px)',
                height: 'var(--kiosk-control-height, 58px)',
                backgroundColor: '#2e7d32',
                background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1rem',
                boxShadow: '0 6px 20px rgba(27, 94, 32, 0.24)',
                display: 'flex',
                gap: 1,
                opacity: dialogContext.canGoNext ? 1 : 0.6,
                '&:hover': {
                  background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(27, 94, 32, 0.32)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(255,255,255,0.7)',
                  background: '#9e9e9e',
                  boxShadow: 'none',
                  transform: 'none',
                },
              }}
            >
              {dialogContext.nextLabel} <ArrowForwardIcon />
            </Button>
          </Tooltip>
        )}

        <Tooltip title="Go Back" placement="left" arrow>
          <Button
            onClick={handleBack}
            disabled={dialogContext?.isOpen && !dialogContext.canGoBack}
            aria-label="Go Back"
            sx={{
              width: 'var(--kiosk-control-width, 166px)',
              height: 'var(--kiosk-control-height, 58px)',
              backgroundColor: 'rgba(255, 255, 255, 0.96)',
              color: '#123a72',
              border: '2px solid rgba(13, 71, 161, 0.25)',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.16)',
              display: 'flex',
              gap: 1,
              opacity: (dialogContext?.isOpen && !dialogContext.canGoBack) ? 0.6 : 1,
              '&:hover': {
                backgroundColor: '#f2f7ff',
                borderColor: '#1565c0',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.22)',
              },
              '&.Mui-disabled': {
                color: 'rgba(18, 58, 114, 0.5)',
                borderColor: 'rgba(13, 71, 161, 0.1)',
                backgroundColor: 'rgba(255,255,255,0.7)',
                transform: 'none',
                boxShadow: 'none',
              },
            }}
          >
            <ArrowBackIcon /> Back
          </Button>
        </Tooltip>

        <Tooltip title="Cancel & Return Home" placement="left" arrow>
          <Button
            onClick={handleCancel}
            aria-label="Cancel and Return Home"
            sx={{
              width: 'var(--kiosk-control-width, 166px)',
              height: 'var(--kiosk-control-height, 58px)',
              backgroundColor: '#e53935',
              background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
              color: '#ffffff',
              border: '1px solid rgba(198, 40, 40, 0.35)',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 6px 20px rgba(198, 40, 40, 0.24)',
              display: 'flex',
              gap: 1,
              '&:hover': {
                background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(198, 40, 40, 0.32)',
              },
            }}
          >
            <HomeIcon /> Cancel
          </Button>
        </Tooltip>
      </Box>
    </Fade>
  );
}
