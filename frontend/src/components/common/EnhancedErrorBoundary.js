import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
  useTheme,
  useMediaQuery,
  Chip,
  Divider,
  Collapse
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      showDetails: false
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

    // Logge den Fehler
    console.error('ErrorBoundary caught an error:', {
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
    // z.B. Sentry, LogRocket, etc.
    try {
      // Speichere in localStorage für Debugging
      const errorLog = {
        errorId,
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorLog);
      
      // Behalte nur die letzten 50 Fehler
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs));
    } catch (e) {
      console.warn('Could not save error to localStorage:', e);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  }

  handleGoHome = () => {
    window.location.href = '/';
  }

  handleReportBug = () => {
    const { errorId } = this.state;
    const bugReport = `
Error ID: ${errorId}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
[Your description here]

Error Details:
${this.state.error?.toString() || 'No error details available'}
    `.trim();

    const mailtoLink = `mailto:support@example.com?subject=Bug Report - Error ${errorId}&body=${encodeURIComponent(bugReport)}`;
    window.open(mailtoLink);
  }

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        showDetails={this.state.showDetails}
        onRetry={this.handleRetry}
        onGoHome={this.handleGoHome}
        onReportBug={this.handleReportBug}
        onToggleDetails={this.toggleDetails}
      />;
    }

    return this.props.children;
  }
}

// Fallback UI für Fehler
const ErrorFallback = ({ 
  error, 
  errorInfo, 
  errorId, 
  showDetails,
  onRetry, 
  onGoHome, 
  onReportBug,
  onToggleDetails
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
    onGoHome();
  };

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
        maxWidth: isMobile ? '100%' : 700, 
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
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Chip 
                label={`Fehler-ID: ${errorId}`}
                variant="outlined"
                color="error"
                icon={<InfoIcon />}
                sx={{ mb: 1 }}
              />
              <Typography 
                variant="body2" 
                color="text.secondary"
              >
                Bitte geben Sie diese ID an, wenn Sie den Support kontaktieren.
              </Typography>
            </Box>
          )}

          {/* Error Details Toggle */}
          {errorInfo && (
            <Box sx={{ mb: 3 }}>
              <Button
                startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={onToggleDetails}
                variant="text"
                size="small"
                color="primary"
              >
                {showDetails ? 'Details ausblenden' : 'Technische Details anzeigen'}
              </Button>
              
              <Collapse in={showDetails}>
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  backgroundColor: theme.palette.grey[50],
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.grey[300]}`
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Component Stack:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    component="pre"
                    sx={{ 
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace'
                    }}
                  >
                    {errorInfo.componentStack}
                  </Typography>
                  
                  {error?.stack && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Error Stack:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        component="pre"
                        sx={{ 
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace'
                        }}
                      >
                        {error.stack}
                      </Typography>
                    </>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2,
              justifyContent: 'center'
            }}
          >
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
              size={isMobile ? 'large' : 'medium'}
              fullWidth={isMobile}
              sx={{ minWidth: isMobile ? '100%' : 150 }}
            >
              Erneut versuchen
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              size={isMobile ? 'large' : 'medium'}
              fullWidth={isMobile}
              sx={{ minWidth: isMobile ? '100%' : 150 }}
            >
              Zur Startseite
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<BugReportIcon />}
              onClick={onReportBug}
              size={isMobile ? 'large' : 'medium'}
              fullWidth={isMobile}
              sx={{ minWidth: isMobile ? '100%' : 150 }}
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
  
  const getColor = () => {
    switch (variant) {
      case 'error': return theme.palette.error.main;
      case 'warning': return theme.palette.warning.main;
      case 'success': return theme.palette.success.main;
      default: return theme.palette.info.main;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        textAlign: 'center'
      }}
    >
      {Icon && (
        <Icon 
          sx={{ 
            fontSize: 64, 
            color: getColor(),
            mb: 2 
          }} 
        />
      )}
      
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
        {title}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {message}
      </Typography>
      
      {action && action}
    </Box>
  );
};

export default ErrorBoundary;
