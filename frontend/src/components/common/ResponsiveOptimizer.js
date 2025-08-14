import React, { useEffect, useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';

// Responsive Optimizer für bessere Performance und UX
export const ResponsiveOptimizer = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Performance-Optimierungen basierend auf Gerätetyp
    if (isMobile) {
      // Mobile-spezifische Optimierungen
      document.body.style.fontSize = '14px';
      document.body.style.lineHeight = '1.4';
    } else if (isTablet) {
      // Tablet-spezifische Optimierungen
      document.body.style.fontSize = '15px';
      document.body.style.lineHeight = '1.5';
    } else {
      // Desktop-spezifische Optimierungen
      document.body.style.fontSize = '16px';
      document.body.style.lineHeight = '1.6';
    }

    setIsLoaded(true);

    return () => {
      // Cleanup
      document.body.style.fontSize = '';
      document.body.style.lineHeight = '';
    };
  }, [isMobile, isTablet, isDesktop]);

  if (!isLoaded) {
    return null;
  }

  return (
    <Box
      sx={{
        // Responsive Container-Optimierungen
        maxWidth: '100%',
        overflowX: 'hidden',
        // Touch-Optimierungen für mobile Geräte
        ...(isMobile && {
          touchAction: 'manipulation',
          WebkitOverflowScrolling: 'touch',
        }),
        // Performance-Optimierungen
        willChange: 'auto',
        transform: 'translateZ(0)', // Hardware-Beschleunigung
      }}
    >
      {children}
    </Box>
  );
};

// Hook für responsive Werte
export const useResponsiveValue = (mobile, tablet, desktop) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  if (isMobile) return mobile;
  if (isTablet) return tablet;
  if (isDesktop) return desktop;
  return desktop; // Fallback
};

// Hook für Touch-Optimierungen
export const useTouchOptimizations = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return {
    touchAction: isMobile ? 'manipulation' : 'auto',
    WebkitOverflowScrolling: isMobile ? 'touch' : 'auto',
    minHeight: isMobile ? '44px' : 'auto', // Mindest-Touch-Target
    minWidth: isMobile ? '44px' : 'auto',
  };
};

export default ResponsiveOptimizer;
