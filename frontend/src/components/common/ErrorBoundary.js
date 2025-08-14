import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generiere eine eindeutige Error-ID für das Logging
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Logge den Fehler (in Produktion würde man hier einen Service wie Sentry verwenden)
    console.error('Error Boundary caught an error:', {
      errorId,
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Optional: Sende Fehler an Analytics/Logging Service
    this.logErrorToService(errorId, error, errorInfo);
  }

  logErrorToService = (errorId, error, errorInfo) => {
    // Hier könnte man den Fehler an einen externen Service senden
    // z.B. Sentry, LogRocket, oder einen eigenen Logging-Service
    
    const errorData = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Beispiel für lokales Logging
    try {
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorData);
      // Behalte nur die letzten 50 Fehler
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs));
    } catch (e) {
      console.warn('Could not save error to localStorage:', e);
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const { errorId, error, errorInfo } = this.state;
    
    const bugReport = `
Fehler-ID: ${errorId}
Zeitpunkt: ${new Date().toLocaleString('de-DE')}
URL: ${window.location.href}

Fehlermeldung:
${error?.message || 'Unbekannter Fehler'}

Stack Trace:
${error?.stack || 'Kein Stack Trace verfügbar'}

Component Stack:
${errorInfo?.componentStack || 'Kein Component Stack verfügbar'}

Browser: ${navigator.userAgent}
    `.trim();

    // Öffne E-Mail-Client mit vorausgefülltem Bug-Report
    const mailtoLink = `mailto:support@medical-app.de?subject=Bug Report - ${errorId}&body=${encodeURIComponent(bugReport)}`;
    window.open(mailtoLink);
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback 
        error={this.state.error}
        errorId={this.state.errorId}
        onRetry={this.handleRetry}
        onGoHome={this.handleGoHome}
        onReportBug={this.handleReportBug}
      />;
    }

    return this.props.children;
  }
}

// Fallback UI für Fehler
const ErrorFallback = ({ error, errorId, onRetry, onGoHome, onReportBug }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 4 },
        backgroundColor: theme.palette.background.default
      }}
    >
      <Card sx={{ 
        maxWidth: isMobile ? '100%' : 600, 
        width: '100%',
        boxShadow: theme.shadows[8]
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Error Icon */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: 3 
          }}>
            <ErrorIcon 
              sx={{ 
                fontSize: 64, 
                color: theme.palette.error.main 
              }} 
            />
          </Box>

          {/* Error Title */}
          <Typography 
            variant="h4" 
            component="h1" 
            align="center" 
            sx={{ 
              mb: 2,
              color: theme.palette.error.main,
              fontWeight: 600
            }}
          >
            Oops! Etwas ist schiefgelaufen
          </Typography>

          {/* Error Message */}
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            icon={<BugReportIcon />}
          >
            <AlertTitle>Ein unerwarteter Fehler ist aufgetreten</AlertTitle>
            {error?.message || 'Die Anwendung konnte nicht ordnungsgemäß geladen werden.'}
          </Alert>

          {/* Error ID */}
          {errorId && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center" 
              sx={{ mb: 3 }}
            >
              Fehler-ID: <strong>{errorId}</strong>
            </Typography>
          )}

          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            justifyContent: 'center'
          }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
              size={isMobile ? 'large' : 'medium'}
              fullWidth={isMobile}
            >
              Erneut versuchen
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={onGoHome}
              size={isMobile ? 'large' : 'medium'}
              fullWidth={isMobile}
            >
              Zur Startseite
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<BugReportIcon />}
              onClick={onReportBug}
              size={isMobile ? 'large' : 'medium'}
              fullWidth={isMobile}
            >
              Fehler melden
            </Button>
          </Box>

          {/* Help Text */}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center" 
            sx={{ mt: 3 }}
          >
            Falls das Problem weiterhin besteht, kontaktieren Sie bitte den Support.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

// Hook für Error Handling in Funktionskomponenten
export const useErrorHandler = () => {
  const handleError = (error, context = '') => {
    console.error(`Error in ${context}:`, error);
    
    // Optional: Sende Fehler an Analytics
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Speichere in localStorage für Debugging
    try {
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorData);
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs));
    } catch (e) {
      console.warn('Could not save error to localStorage:', e);
    }
  };

  return { handleError };
};

// Komponente für API-Fehler
export const ApiErrorDisplay = ({ error, onRetry, title = "Fehler beim Laden der Daten" }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!error) return null;

  return (
    <Alert 
      severity="error" 
      sx={{ mb: 2 }}
      action={
        onRetry && (
          <Button 
            color="inherit" 
            size="small" 
            onClick={onRetry}
            startIcon={<RefreshIcon />}
          >
            Erneut versuchen
          </Button>
        )
      }
    >
      <AlertTitle>{title}</AlertTitle>
      {error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}
    </Alert>
  );
};

// Komponente für leere Zustände
export const EmptyState = ({ 
  title, 
  message, 
  icon: Icon, 
  action, 
  variant = 'info' 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, sm: 6 },
        textAlign: 'center',
        minHeight: 300
      }}
    >
      {Icon && (
        <Icon 
          sx={{ 
            fontSize: 64, 
            color: theme.palette[variant].main,
            mb: 2,
            opacity: 0.7
          }} 
        />
      )}
      
      <Typography 
        variant="h5" 
        component="h2" 
        sx={{ 
          mb: 1,
          fontWeight: 600
        }}
      >
        {title}
      </Typography>
      
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ 
          mb: 3,
          maxWidth: 400
        }}
      >
        {message}
      </Typography>
      
      {action && (
        <Box sx={{ width: isMobile ? '100%' : 'auto' }}>
          {action}
        </Box>
      )}
    </Box>
  );
};

export default ErrorBoundary; 