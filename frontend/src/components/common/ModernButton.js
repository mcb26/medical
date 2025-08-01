import React from 'react';
import { 
  Button, 
  CircularProgress, 
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledButton = styled(Button)(({ theme, variant, size, fullWidth }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Base styles
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
  },
  
  '&:active': {
    transform: 'translateY(0)',
  },

  // Size variants
  ...(size === 'small' && {
    padding: '8px 16px',
    fontSize: '0.875rem',
    minHeight: 36,
  }),
  
  ...(size === 'medium' && {
    padding: '10px 20px',
    fontSize: '0.875rem',
    minHeight: 40,
  }),
  
  ...(size === 'large' && {
    padding: '12px 24px',
    fontSize: '1rem',
    minHeight: 48,
  }),

  // Variant styles
  ...(variant === 'contained' && {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
    
    '&:hover': {
      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.5)',
    },
    
    '&:disabled': {
      background: theme.palette.grey[300],
      color: theme.palette.grey[500],
      boxShadow: 'none',
    },
  }),

  ...(variant === 'outlined' && {
    border: '2px solid',
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    backgroundColor: 'transparent',
    
    '&:hover': {
      backgroundColor: theme.palette.primary[50],
      borderColor: theme.palette.primary.dark,
      color: theme.palette.primary.dark,
    },
    
    '&:disabled': {
      borderColor: theme.palette.grey[300],
      color: theme.palette.grey[500],
    },
  }),

  ...(variant === 'text' && {
    color: theme.palette.primary.main,
    backgroundColor: 'transparent',
    
    '&:hover': {
      backgroundColor: theme.palette.primary[50],
      color: theme.palette.primary.dark,
    },
    
    '&:disabled': {
      color: theme.palette.grey[500],
    },
  }),

  // Success variant
  ...(variant === 'success' && {
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
    
    '&:hover': {
      background: 'linear-gradient(135deg, #1ea54a 0%, #15803d 100%)',
      boxShadow: '0 8px 25px rgba(34, 197, 94, 0.5)',
    },
  }),

  // Warning variant
  ...(variant === 'warning' && {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
    
    '&:hover': {
      background: 'linear-gradient(135deg, #e0950a 0%, #c26505 100%)',
      boxShadow: '0 8px 25px rgba(245, 158, 11, 0.5)',
    },
  }),

  // Error variant
  ...(variant === 'error' && {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
    
    '&:hover': {
      background: 'linear-gradient(135deg, #e03e3e 0%, #c92525 100%)',
      boxShadow: '0 8px 25px rgba(239, 68, 68, 0.5)',
    },
  }),

  // Full width
  ...(fullWidth && {
    width: '100%',
  }),

  // Loading state
  '&.Mui-disabled': {
    transform: 'none',
    boxShadow: 'none',
  },
}));

const ModernButton = ({
  children,
  variant = 'contained',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  onClick,
  type = 'button',
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Adjust size for mobile
  const adjustedSize = isMobile && size === 'large' ? 'medium' : size;

  return (
    <StyledButton
      variant={variant}
      size={adjustedSize}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      startIcon={loading ? null : startIcon}
      endIcon={loading ? null : endIcon}
      onClick={onClick}
      type={type}
      sx={{
        ...sx,
        // Mobile optimizations
        ...(isMobile && {
          fontSize: '0.875rem',
          padding: '8px 16px',
          minHeight: 40,
        }),
      }}
      {...props}
    >
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress 
            size={16} 
            color="inherit" 
            sx={{ color: 'currentColor' }}
          />
          {children}
        </Box>
      ) : (
        children
      )}
    </StyledButton>
  );
};

export default ModernButton; 