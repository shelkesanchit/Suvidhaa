import React, { useState, useCallback, useContext } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Typography,
  Fade,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Check as CheckIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { TranslationContext } from './TranslationContext';

/**
 * Hook to use language context
 */
export function useLanguage() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useLanguage must be used within TranslationProvider');
  }
  return context;
}

/**
 * LanguageSelector - Dropdown to select language
 */
export function LanguageSelector({
  variant = 'button',
  size = 'small',
  showFlag = true,
  color = 'inherit',
  sx = {},
}) {
  const { language, languageDetails, supportedLanguages, changeLanguage, isLoading } = useLanguage();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((e) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSelect = useCallback(async (code) => {
    handleClose();
    if (code !== language) {
      await changeLanguage(code);
    }
  }, [language, changeLanguage, handleClose]);

  if (variant === 'compact') {
    return (
      <>
        <Button
          onClick={handleClick}
          color={color}
          size={size}
          disabled={isLoading}
          sx={{
            minWidth: 'auto',
            px: 1.5,
            py: 0.75,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            gap: 0.5,
            ...sx,
          }}
        >
          {isLoading ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', flex: 1, overflow: 'hidden' }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2, color: 'text.secondary', textTransform: 'none', whiteSpace: 'nowrap' }}>
                  Choose Language
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.3, textTransform: 'none', whiteSpace: 'nowrap' }}>
                  अपनी भाषा चुनें
                </Typography>
              </Box>
              <ArrowDownIcon sx={{ fontSize: 24, color: 'inherit' }} />
            </>
          )}
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          sx={{ zIndex: 1405 }}
          TransitionComponent={Fade}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            elevation: 8,
            sx: {
              zIndex: 1406,
              minWidth: 200,
              maxHeight: 400,
              borderRadius: 2,
              mt: 0.5,
            },
          }}
        >
          {supportedLanguages.map((lang) => (
            <MenuItem
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              selected={lang.code === language}
              sx={{ py: 1.25, px: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <span style={{ fontSize: '1.25rem' }}>{lang.flag}</span>
              </ListItemIcon>
              <ListItemText
                primary={lang.nativeName}
                secondary={lang.name !== lang.nativeName ? lang.name : null}
                primaryTypographyProps={{
                  fontWeight: lang.code === language ? 700 : 500,
                  fontSize: '0.95rem',
                }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
              {lang.code === language && (
                <CheckIcon color="primary" fontSize="small" />
              )}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  // Default button variant
  return (
    <>
      <Button
        onClick={handleClick}
        color={color}
        size={size}
        variant="text"
        disabled={isLoading}
        sx={{
          textTransform: 'none',
          borderRadius: 2,
          px: 2,
          py: 1,
          fontWeight: 600,
          ...sx,
        }}
        startIcon={
          isLoading ? (
            <CircularProgress size={18} color="inherit" />
          ) : showFlag && languageDetails?.flag ? (
            <span style={{ fontSize: '1.25rem' }}>{languageDetails.flag}</span>
          ) : (
            <LanguageIcon />
          )
        }
        endIcon={<ArrowDownIcon />}
      >
        {languageDetails?.nativeName}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        sx={{ zIndex: 1405 }}
        TransitionComponent={Fade}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          elevation: 8,
          sx: {
            zIndex: 1406,
            minWidth: 220,
            maxHeight: 450,
            borderRadius: 2,
            mt: 0.5,
          },
        }}
      >
        {supportedLanguages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            selected={lang.code === language}
            sx={{ py: 1.25, px: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <span style={{ fontSize: '1.25rem' }}>{lang.flag}</span>
            </ListItemIcon>
            <ListItemText
              primary={lang.nativeName}
              secondary={lang.name !== lang.nativeName ? lang.name : null}
              primaryTypographyProps={{
                fontWeight: lang.code === language ? 700 : 500,
                fontSize: '0.95rem',
              }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
            {lang.code === language && (
              <CheckIcon color="primary" fontSize="small" />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/**
 * FloatingLanguageSelector - Fixed position selector visible on all pages
 */
export function FloatingLanguageSelector({ position = 'top-right' }) {
  const positions = {
    'top-right': { top: 20, right: 16 },
    'top-left': { top: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        ...positions[position],
        zIndex: 1302,
        width: '184px',
        height: '68px',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderRadius: 3,
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(25, 118, 210, 0.18)',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 10px 28px rgba(15, 23, 42, 0.24)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <LanguageSelector
        variant="compact"
        color="primary"
        sx={{
          color: 'primary.main',
          width: '100%',
          minHeight: '100%',
          px: 1.6,
          py: 0.8,
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 0.4,
          borderRadius: 2.5,
        }}
      />
    </Box>
  );
}

export default LanguageSelector;
