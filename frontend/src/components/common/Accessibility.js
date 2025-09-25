import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Accessibility as AccessibilityIcon } from '@mui/icons-material';

// Skip Link für bessere Accessibility
export const SkipLink = ({ targetId = 'main-content', children = 'Zum Hauptinhalt springen' }) => {
  return (
    <Button
      component="a"
      href={`#${targetId}`}
      sx={{
        position: 'absolute',
        top: '-40px',
        left: '6px',
        zIndex: 1000,
        bgcolor: 'primary.main',
        color: 'white',
        '&:focus': {
          top: '6px',
        },
        '&:hover': {
          bgcolor: 'primary.dark',
        },
      }}
    >
      {children}
    </Button>
  );
};

// Accessibility Helper Component
export const AccessibilityHelper = ({ children, ...props }) => {
  return (
    <Box
      role="main"
      id="main-content"
      tabIndex={-1}
      {...props}
    >
      {children}
    </Box>
  );
};

// Screen Reader Only Text
export const ScreenReaderOnly = ({ children }) => {
  return (
    <Typography
      component="span"
      sx={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </Typography>
  );
};

// Focus Trap Component
export const FocusTrap = ({ children, isActive = false }) => {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return (
    <Box ref={containerRef}>
      {children}
    </Box>
  );
};

// Accessibility Menu
export const AccessibilityMenu = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleHighContrast = () => {
    document.body.classList.toggle('high-contrast');
  };

  const increaseFontSize = () => {
    const currentSize = parseInt(getComputedStyle(document.body).fontSize);
    document.body.style.fontSize = `${currentSize + 2}px`;
  };

  const decreaseFontSize = () => {
    const currentSize = parseInt(getComputedStyle(document.body).fontSize);
    document.body.style.fontSize = `${Math.max(12, currentSize - 2)}px`;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Button
        startIcon={<AccessibilityIcon />}
        onClick={() => setIsOpen(!isOpen)}
        variant="outlined"
        size="small"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Barrierefreiheit
      </Button>

      {isOpen && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            right: 0,
            mt: 1,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            minWidth: 200,
            zIndex: 1000,
            boxShadow: 3,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Anpassungen
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              size="small"
              variant="text"
              onClick={toggleHighContrast}
            >
              Hoher Kontrast
            </Button>
            
            <Button
              size="small"
              variant="text"
              onClick={increaseFontSize}
            >
              Schriftgröße vergrößern
            </Button>
            
            <Button
              size="small"
              variant="text"
              onClick={decreaseFontSize}
            >
              Schriftgröße verkleinern
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const AccessibilityComponents = {
  SkipLink,
  AccessibilityHelper,
  ScreenReaderOnly,
  FocusTrap,
  AccessibilityMenu,
};

export default AccessibilityComponents;
