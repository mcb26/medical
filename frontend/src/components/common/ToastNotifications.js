import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  Slide
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const ToastContext = createContext();

// Toast Provider
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      ...options,
      timestamp: new Date()
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove nach der angegebenen Zeit (Standard: 6 Sekunden)
    const duration = options.duration || 6000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback((message, options) => addToast(message, 'success', options), [addToast]);
  const error = useCallback((message, options) => addToast(message, 'error', options), [addToast]);
  const warning = useCallback((message, options) => addToast(message, 'warning', options), [addToast]);
  const info = useCallback((message, options) => addToast(message, 'info', options), [addToast]);

  const value = {
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    toasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast Container
const ToastContainer = () => {
  const { toasts, removeToast } = useContext(ToastContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <SuccessIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'info':
      default:
        return <InfoIcon />;
    }
  };

  const getTitle = (type) => {
    switch (type) {
      case 'success':
        return 'Erfolgreich';
      case 'error':
        return 'Fehler';
      case 'warning':
        return 'Warnung';
      case 'info':
      default:
        return 'Information';
    }
  };

  return (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          anchorOrigin={{
            vertical: isMobile ? 'bottom' : 'top',
            horizontal: isMobile ? 'center' : 'right',
          }}
          TransitionComponent={Slide}
          transitionDuration={300}
          sx={{
            zIndex: theme.zIndex.snackbar + index,
            '& .MuiAlert-root': {
              minWidth: isMobile ? '90vw' : 400,
              maxWidth: isMobile ? '90vw' : 500,
              boxShadow: theme.shadows[8],
              borderRadius: 2,
            }
          }}
        >
          <Alert
            severity={toast.type}
            icon={getIcon(toast.type)}
            action={
              <IconButton
                aria-label="Schließen"
                color="inherit"
                size="small"
                onClick={() => removeToast(toast.id)}
                sx={{ ml: 1 }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
            sx={{
              width: '100%',
              '& .MuiAlert-message': {
                width: '100%'
              },
              '& .MuiAlert-action': {
                padding: 0,
                alignItems: 'flex-start'
              }
            }}
          >
            <Box>
              <AlertTitle sx={{ 
                fontWeight: 600,
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}>
                {getTitle(toast.type)}
              </AlertTitle>
              <Box sx={{ 
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                lineHeight: 1.4
              }}>
                {toast.message}
              </Box>
              {toast.details && (
                <Box sx={{ 
                  mt: 1,
                  fontSize: '0.75rem',
                  opacity: 0.8,
                  fontStyle: 'italic'
                }}>
                  {toast.details}
                </Box>
              )}
            </Box>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

// Hook für Toast Notifications
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Spezielle Toast Funktionen
export const useToastActions = () => {
  const { success, error, warning, info } = useToast();

  const showSuccess = useCallback((message, details = null) => {
    success(message, { 
      details,
      duration: 4000,
      autoHideDuration: 4000
    });
  }, [success]);

  const showError = useCallback((message, details = null) => {
    error(message, { 
      details,
      duration: 8000, // Länger für Fehler
      autoHideDuration: 8000
    });
  }, [error]);

  const showWarning = useCallback((message, details = null) => {
    warning(message, { 
      details,
      duration: 6000,
      autoHideDuration: 6000
    });
  }, [warning]);

  const showInfo = useCallback((message, details = null) => {
    info(message, { 
      details,
      duration: 5000,
      autoHideDuration: 5000
    });
  }, [info]);

  const showApiError = useCallback((error, context = '') => {
    let message = 'Ein Fehler ist aufgetreten';
    let details = null;

    if (error?.response?.status === 401) {
      message = 'Sie sind nicht angemeldet';
      details = 'Bitte melden Sie sich erneut an';
    } else if (error?.response?.status === 403) {
      message = 'Zugriff verweigert';
      details = 'Sie haben keine Berechtigung für diese Aktion';
    } else if (error?.response?.status === 404) {
      message = 'Ressource nicht gefunden';
      details = 'Die angeforderte Daten wurden nicht gefunden';
    } else if (error?.response?.status >= 500) {
      message = 'Server-Fehler';
      details = 'Ein Problem auf dem Server ist aufgetreten. Bitte versuchen Sie es später erneut.';
    } else if (error?.message) {
      message = error.message;
      details = context ? `Kontext: ${context}` : null;
    }

    showError(message, details);
  }, [showError]);

  const showValidationError = useCallback((errors) => {
    if (typeof errors === 'string') {
      showError('Validierungsfehler', errors);
    } else if (Array.isArray(errors)) {
      showError('Validierungsfehler', errors.join(', '));
    } else if (typeof errors === 'object') {
      const errorMessages = Object.values(errors).flat();
      showError('Validierungsfehler', errorMessages.join(', '));
    }
  }, [showError]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showApiError,
    showValidationError
  };
};

// Toast mit Progress
export const ProgressToast = ({ message, progress, type = 'info' }) => {
  const theme = useTheme();
  
  return (
    <Alert
      severity={type}
      sx={{
        width: '100%',
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      <Box>
        <Box sx={{ mb: 1 }}>{message}</Box>
        <Box
          sx={{
            width: '100%',
            height: 4,
            backgroundColor: theme.palette.grey[200],
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: theme.palette[type].main,
              transition: 'width 0.3s ease'
            }}
          />
        </Box>
      </Box>
    </Alert>
  );
};

export default ToastProvider; 