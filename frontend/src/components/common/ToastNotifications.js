import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import { 
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Toast-Typen
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Toast-Service (Singleton)
class ToastService {
  constructor() {
    this.listeners = [];
    this.toasts = [];
    this.nextId = 1;
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.toasts));
  }

  show(message, type = TOAST_TYPES.INFO, options = {}) {
    const toast = {
      id: this.nextId++,
      message,
      type,
      duration: options.duration || (type === TOAST_TYPES.ERROR ? 6000 : 4000),
      action: options.action,
      timestamp: Date.now(),
      ...options
    };

    this.toasts.push(toast);
    this.notifyListeners();

    // Auto-remove nach duration
    setTimeout(() => {
      this.remove(toast.id);
    }, toast.duration);

    return toast.id;
  }

  success(message, options = {}) {
    return this.show(message, TOAST_TYPES.SUCCESS, options);
  }

  error(message, options = {}) {
    return this.show(message, TOAST_TYPES.ERROR, options);
  }

  warning(message, options = {}) {
    return this.show(message, TOAST_TYPES.WARNING, options);
  }

  info(message, options = {}) {
    return this.show(message, TOAST_TYPES.INFO, options);
  }

  remove(id) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notifyListeners();
  }

  clear() {
    this.toasts = [];
    this.notifyListeners();
  }
}

// Singleton-Instanz
const toastService = new ToastService();

// Toast-Komponente
const Toast = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
  }, [toast.id]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300); // Warte auf Animation
  };

  const getIcon = () => {
    switch (toast.type) {
      case TOAST_TYPES.SUCCESS:
        return <SuccessIcon />;
      case TOAST_TYPES.ERROR:
        return <ErrorIcon />;
      case TOAST_TYPES.WARNING:
        return <WarningIcon />;
      case TOAST_TYPES.INFO:
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverity = () => {
    switch (toast.type) {
      case TOAST_TYPES.SUCCESS:
        return 'success';
      case TOAST_TYPES.ERROR:
        return 'error';
      case TOAST_TYPES.WARNING:
        return 'warning';
      case TOAST_TYPES.INFO:
        return 'info';
      default:
        return 'info';
    }
  };

  return (
    <Snackbar
      open={isVisible}
      autoHideDuration={toast.duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ 
        '& .MuiSnackbarContent-root': {
          minWidth: 300,
          maxWidth: 400,
        }
      }}
    >
      <Alert
        onClose={handleClose}
        severity={getSeverity()}
        icon={getIcon()}
        variant="filled"
        sx={{
          width: '100%',
          '& .MuiAlert-message': {
            width: '100%',
          }
        }}
        action={toast.action}
      >
        <Box sx={{ width: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {toast.message}
          </Typography>
          {toast.description && (
            <Typography variant="caption" sx={{ opacity: 0.8, mt: 0.5, display: 'block' }}>
              {toast.description}
            </Typography>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};

// Toast-Container
export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = toastService.addListener(setToasts);
    return unsubscribe;
  }, []);

  const handleClose = (id) => {
    toastService.remove(id);
  };

  return (
    <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => handleClose(toast.id)} />
      ))}
    </Box>
  );
};

// Hook für einfache Verwendung
export const useToast = () => {
  return {
    show: toastService.show.bind(toastService),
    success: toastService.success.bind(toastService),
    error: toastService.error.bind(toastService),
    warning: toastService.warning.bind(toastService),
    info: toastService.info.bind(toastService),
    remove: toastService.remove.bind(toastService),
    clear: toastService.clear.bind(toastService),
  };
};

export default toastService; 