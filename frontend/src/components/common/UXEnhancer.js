import React, { useEffect, useState } from 'react';
import { 
  Box, 
  useTheme, 
  useMediaQuery,
  Snackbar,
  Alert,
  Fade,
  Zoom,
  Slide
} from '@mui/material';
import { 
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// UX Enhancer für bessere Benutzererfahrung
export const UXEnhancer = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [notifications, setNotifications] = useState([]);

  // Performance-Optimierungen
  useEffect(() => {
    // Smooth Scrolling aktivieren
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Touch-Optimierungen für mobile Geräte
    if (isMobile) {
      document.body.style.touchAction = 'manipulation';
      document.body.style.WebkitOverflowScrolling = 'touch';
    }

    // Cleanup
    return () => {
      document.documentElement.style.scrollBehavior = '';
      document.body.style.touchAction = '';
      document.body.style.WebkitOverflowScrolling = '';
    };
  }, [isMobile]);

  // Benachrichtigung hinzufügen
  const addNotification = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const notification = { id, message, type, duration };
    setNotifications(prev => [...prev, notification]);

    // Automatisch entfernen
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  // Benachrichtigung entfernen
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <Box
      sx={{
        // Basis UX-Optimierungen
        minHeight: '100vh',
        position: 'relative',
        
        // Smooth Transitions
        '& *': {
          transition: 'all 0.2s ease-in-out',
        },
        
        // Focus-Optimierungen
        '& *:focus': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        },
        
        // Hover-Effekte
        '& button:hover, & .MuiButton-root:hover': {
          transform: 'translateY(-1px)',
          boxShadow: theme.shadows[4],
        },
        
        // Loading-States
        '& .loading': {
          opacity: 0.7,
          pointerEvents: 'none',
        },
        
        // Mobile Optimierungen
        ...(isMobile && {
          '& .MuiButton-root': {
            minHeight: '44px',
            minWidth: '44px',
          },
          '& .MuiIconButton-root': {
            minHeight: '44px',
            minWidth: '44px',
          },
        }),
      }}
    >
      {children}
      
      {/* Benachrichtigungen */}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          TransitionComponent={Slide}
        >
          <Alert
            severity={notification.type}
            icon={
              notification.type === 'success' ? <CheckIcon /> :
              notification.type === 'info' ? <InfoIcon /> :
              notification.type === 'warning' ? <WarningIcon /> :
              <ErrorIcon />
            }
            onClose={() => removeNotification(notification.id)}
            sx={{
              minWidth: isMobile ? '280px' : '320px',
              boxShadow: theme.shadows[8],
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

// Verbesserte Loading-Komponente
export const EnhancedLoading = ({ 
  size = 'medium',
  variant = 'circular',
  sx = {},
  ...props 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const sizeMap = {
    small: isMobile ? 20 : 24,
    medium: isMobile ? 32 : 40,
    large: isMobile ? 48 : 60,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing(3),
        minHeight: '200px',
        ...sx,
      }}
      {...props}
    >
      <Box
        sx={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: `3px solid ${theme.palette.grey[200]}`,
          borderTop: `3px solid ${theme.palette.primary.main}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        }}
      />
    </Box>
  );
};

// Verbesserte Empty State Komponente
export const EnhancedEmptyState = ({ 
  title = 'Keine Daten',
  description = 'Es sind noch keine Daten vorhanden.',
  icon,
  action,
  sx = {},
  ...props 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing(4),
        minHeight: '300px',
        textAlign: 'center',
        color: theme.palette.text.secondary,
        ...sx,
      }}
      {...props}
    >
      {icon && (
        <Box
          sx={{
            fontSize: isMobile ? '3rem' : '4rem',
            color: theme.palette.grey[400],
            marginBottom: theme.spacing(2),
          }}
        >
          {icon}
        </Box>
      )}
      
      <Box
        component="h3"
        sx={{
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          fontWeight: 600,
          marginBottom: theme.spacing(1),
          color: theme.palette.text.primary,
        }}
      >
        {title}
      </Box>
      
      <Box
        component="p"
        sx={{
          fontSize: isMobile ? '0.875rem' : '1rem',
          marginBottom: action ? theme.spacing(3) : 0,
          maxWidth: '400px',
          lineHeight: 1.5,
        }}
      >
        {description}
      </Box>
      
      {action && (
        <Box>
          {action}
        </Box>
      )}
    </Box>
  );
};

// Verbesserte Error Boundary
export const EnhancedErrorBoundary = ({ 
  children,
  fallback,
  onError,
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      setError(error);
      
      if (onError) {
        onError(error);
      }
      
      // Log error für Debugging
      console.error('EnhancedErrorBoundary caught an error:', error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason);
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, [onError]);

  if (hasError) {
    return fallback || (
      <EnhancedEmptyState
        title="Ein Fehler ist aufgetreten"
        description="Die Anwendung konnte nicht ordnungsgemäß geladen werden. Bitte laden Sie die Seite neu."
        icon={<ErrorIcon />}
        action={
          <Box
            component="button"
            onClick={() => window.location.reload()}
            sx={{
              padding: '8px 16px',
              backgroundColor: 'primary.main',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            }}
          >
            Seite neu laden
          </Box>
        }
      />
    );
  }

  return children;
};

// Hook für UX-Optimierungen
export const useUXOptimizations = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return {
    // Touch-Optimierungen
    touchOptimizations: {
      touchAction: isMobile ? 'manipulation' : 'auto',
      WebkitOverflowScrolling: isMobile ? 'touch' : 'auto',
      minHeight: isMobile ? '44px' : 'auto',
      minWidth: isMobile ? '44px' : 'auto',
    },
    
    // Animation-Optimierungen
    animationOptimizations: {
      transition: 'all 0.2s ease-in-out',
      willChange: 'auto',
      transform: 'translateZ(0)',
    },
    
    // Focus-Optimierungen
    focusOptimizations: {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },
    
    // Mobile-spezifische Optimierungen
    mobileOptimizations: isMobile ? {
      fontSize: '14px',
      lineHeight: 1.4,
      touchAction: 'manipulation',
    } : {},
  };
};

export default UXEnhancer;
