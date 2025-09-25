import React from 'react';
import { Box, Typography, Button, Alert, AlertTitle, Collapse } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon, Home as HomeIcon, BugReport as BugReportIcon } from '@mui/icons-material';

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
    this.setState({
      error,
      errorInfo,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId: this.state.errorId
    });

    this.logErrorToService(this.state.errorId, error, errorInfo);
  }

  logErrorToService = (errorId, error, errorInfo) => {
    try {
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
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            textAlign: 'center',
            bgcolor: 'background.default'
          }}
        >
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom color="error.main">
            Oops! Etwas ist schiefgelaufen
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
            Ein unerwarteter Fehler ist aufgetreten. Unser Team wurde benachrichtigt und arbeitet an einer Lösung.
          </Typography>

          <Alert severity="info" sx={{ mb: 3, maxWidth: 600 }}>
            <AlertTitle>Error ID: {this.state.errorId}</AlertTitle>
            Bitte notieren Sie diese ID für Support-Anfragen.
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={this.handleRetry}
            >
              Seite neu laden
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={this.handleGoHome}
            >
              Zur Startseite
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<BugReportIcon />}
              onClick={this.handleReportBug}
            >
              Fehler melden
            </Button>
          </Box>

          <Button
            variant="text"
            size="small"
            onClick={this.toggleDetails}
            sx={{ mb: 2 }}
          >
            {this.state.showDetails ? 'Details ausblenden' : 'Details anzeigen'}
          </Button>

          <Collapse in={this.state.showDetails}>
            <Box sx={{ maxWidth: 800, textAlign: 'left', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Technische Details:</Typography>
              <pre style={{ fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </Box>
          </Collapse>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
