import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';

// Loading Overlay Component
export const LoadingOverlay = ({ 
  isLoading, 
  message = 'Lade...', 
  children,
  overlay = true 
}) => {
  if (!isLoading) return children;

  if (overlay) {
    return (
      <Box sx={{ position: 'relative' }}>
        {children}
        <Fade in={isLoading}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {message}
            </Typography>
          </Box>
        </Fade>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
      <CircularProgress size={40} />
      <Typography variant="body2" sx={{ mt: 1 }}>
        {message}
      </Typography>
    </Box>
  );
};

// Responsive Optimizer Component
export const ResponsiveOptimizer = ({ children, breakpoint = 'md' }) => {
  const [isOptimized, setIsOptimized] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let shouldOptimize = false;

      switch (breakpoint) {
        case 'xs':
          shouldOptimize = width < 600;
          break;
        case 'sm':
          shouldOptimize = width < 960;
          break;
        case 'md':
          shouldOptimize = width < 1280;
          break;
        case 'lg':
          shouldOptimize = width < 1920;
          break;
        default:
          shouldOptimize = width < 1280;
      }

      setIsOptimized(shouldOptimize);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return (
    <Box sx={{ 
      transform: isOptimized ? 'scale(0.95)' : 'scale(1)',
      transition: 'transform 0.3s ease-in-out'
    }}>
      {children}
    </Box>
  );
};

// Performance Monitor Component
export const PerformanceMonitor = ({ children, onPerformanceIssue }) => {
  const startTime = React.useRef(Date.now());

  React.useEffect(() => {
    const endTime = Date.now();
    const duration = endTime - startTime.current;

    if (duration > 1000 && onPerformanceIssue) {
      onPerformanceIssue({
        duration,
        component: 'PerformanceMonitor',
        timestamp: new Date().toISOString()
      });
    }
  }, [onPerformanceIssue]);

  return children;
};

// Lazy Loader Component
export const LazyLoader = ({ 
  children, 
  threshold = 0.1,
  placeholder = null 
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const ref = React.useRef();

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsLoaded(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <Box ref={ref}>
      {isLoaded ? children : placeholder}
    </Box>
  );
};

// Error Boundary Wrapper
export const ErrorBoundaryWrapper = ({ children, fallback }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error) => {
      console.error('Error caught by UXEnhancer:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return fallback || (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">
          Ein Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
        </Typography>
      </Box>
    );
  }

  return children;
};

// Auto Save Indicator
export const AutoSaveIndicator = ({ isSaving, lastSaved }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isSaving && (
        <>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            Speichere...
          </Typography>
        </>
      )}
      {!isSaving && lastSaved && (
        <Typography variant="caption" color="success.main">
          Gespeichert um {new Date(lastSaved).toLocaleTimeString()}
        </Typography>
      )}
    </Box>
  );
};

const UXEnhancerComponents = {
  LoadingOverlay,
  ResponsiveOptimizer,
  PerformanceMonitor,
  LazyLoader,
  ErrorBoundaryWrapper,
  AutoSaveIndicator,
};

export default UXEnhancerComponents;
