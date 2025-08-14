import React from 'react';
import { 
  Typography, 
  Box, 
  useTheme, 
  useMediaQuery,
  styled 
} from '@mui/material';

// Styled Components für bessere Lesbarkeit
const ReadableTypography = styled(Typography)(({ theme, variant, isMobile }) => ({
  // Basis-Typografie-Optimierungen
  fontFamily: theme.typography.fontFamily,
  lineHeight: isMobile ? 1.4 : 1.6,
  letterSpacing: '0.01em',
  
  // Responsive Schriftgrößen
  ...(variant === 'h1' && {
    fontSize: isMobile ? '1.75rem' : '2.25rem',
    fontWeight: 700,
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
  }),
  
  ...(variant === 'h2' && {
    fontSize: isMobile ? '1.5rem' : '1.875rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1.5),
    color: theme.palette.text.primary,
  }),
  
  ...(variant === 'h3' && {
    fontSize: isMobile ? '1.25rem' : '1.5rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: theme.palette.text.primary,
  }),
  
  ...(variant === 'h4' && {
    fontSize: isMobile ? '1.125rem' : '1.25rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: theme.palette.text.primary,
  }),
  
  ...(variant === 'body1' && {
    fontSize: isMobile ? '0.875rem' : '1rem',
    lineHeight: isMobile ? 1.5 : 1.6,
    marginBottom: theme.spacing(1),
    color: theme.palette.text.primary,
  }),
  
  ...(variant === 'body2' && {
    fontSize: isMobile ? '0.8rem' : '0.875rem',
    lineHeight: isMobile ? 1.4 : 1.5,
    marginBottom: theme.spacing(0.5),
    color: theme.palette.text.secondary,
  }),
  
  // Kontrast-Optimierungen
  '& strong, & b': {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  
  '& em, & i': {
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
  },
  
  // Link-Styles
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    '&:hover': {
      color: theme.palette.primary.dark,
      textDecoration: 'none',
    },
  },
}));

// Lesbare Text-Komponente
export const ReadableText = ({ 
  children, 
  variant = 'body1', 
  component = 'p',
  sx = {},
  ...props 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <ReadableTypography
      variant={variant}
      component={component}
      isMobile={isMobile}
      sx={{
        // Zusätzliche Lesbarkeits-Optimierungen
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        ...sx,
      }}
      {...props}
    >
      {children}
    </ReadableTypography>
  );
};

// Lesbarer Container für bessere Text-Darstellung
export const ReadableContainer = ({ 
  children, 
  maxWidth = '65ch', // Optimale Zeilenlänge für Lesbarkeit
  sx = {},
  ...props 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        maxWidth: isMobile ? '100%' : maxWidth,
        margin: '0 auto',
        padding: theme.spacing(2),
        
        // Typografie-Optimierungen
        '& h1, & h2, & h3, & h4, & h5, & h6': {
          marginTop: theme.spacing(3),
          marginBottom: theme.spacing(1.5),
          '&:first-of-type': {
            marginTop: 0,
          },
        },
        
        '& p': {
          marginBottom: theme.spacing(1.5),
          textAlign: 'justify',
          hyphens: 'auto',
        },
        
        '& ul, & ol': {
          marginBottom: theme.spacing(2),
          paddingLeft: theme.spacing(3),
        },
        
        '& li': {
          marginBottom: theme.spacing(0.5),
        },
        
        '& blockquote': {
          borderLeft: `4px solid ${theme.palette.primary.main}`,
          paddingLeft: theme.spacing(2),
          margin: theme.spacing(2, 0),
          fontStyle: 'italic',
          color: theme.palette.text.secondary,
        },
        
        '& code': {
          backgroundColor: theme.palette.grey[100],
          padding: theme.spacing(0.25, 0.5),
          borderRadius: theme.shape.borderRadius,
          fontFamily: theme.typography.fontFamilyMono,
          fontSize: '0.875em',
        },
        
        '& pre': {
          backgroundColor: theme.palette.grey[100],
          padding: theme.spacing(2),
          borderRadius: theme.shape.borderRadius,
          overflow: 'auto',
          margin: theme.spacing(2, 0),
        },
        
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Verbesserte Überschriften-Komponente
export const ReadableHeading = ({ 
  level = 1, 
  children, 
  sx = {},
  ...props 
}) => {
  const variant = `h${Math.min(level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const component = `h${Math.min(level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <ReadableText
      variant={variant}
      component={component}
      sx={{
        // Zusätzliche Überschriften-Optimierungen
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-8px',
          left: 0,
          width: '40px',
          height: '3px',
          backgroundColor: 'primary.main',
          borderRadius: '2px',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </ReadableText>
  );
};

// Lesbare Liste-Komponente
export const ReadableList = ({ 
  items = [], 
  type = 'ul',
  sx = {},
  ...props 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      component={type}
      sx={{
        margin: theme.spacing(2, 0),
        paddingLeft: theme.spacing(3),
        
        '& li': {
          marginBottom: theme.spacing(1),
          lineHeight: isMobile ? 1.5 : 1.6,
          fontSize: isMobile ? '0.875rem' : '1rem',
          color: theme.palette.text.primary,
        },
        
        ...sx,
      }}
      {...props}
    >
      {items.map((item, index) => (
        <Box component="li" key={index}>
          {typeof item === 'string' ? (
            <ReadableText variant="body1" component="span">
              {item}
            </ReadableText>
          ) : (
            item
          )}
        </Box>
      ))}
    </Box>
  );
};

// Hook für Lesbarkeits-Einstellungen
export const useReadabilitySettings = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return {
    // Optimale Zeilenlänge
    optimalLineLength: isMobile ? '100%' : '65ch',
    
    // Schriftgrößen
    fontSize: {
      small: isMobile ? '0.75rem' : '0.875rem',
      normal: isMobile ? '0.875rem' : '1rem',
      large: isMobile ? '1rem' : '1.125rem',
      heading: isMobile ? '1.25rem' : '1.5rem',
    },
    
    // Zeilenabstände
    lineHeight: {
      tight: isMobile ? 1.3 : 1.4,
      normal: isMobile ? 1.4 : 1.6,
      relaxed: isMobile ? 1.5 : 1.7,
    },
    
    // Abstände
    spacing: {
      paragraph: isMobile ? 1 : 1.5,
      section: isMobile ? 2 : 3,
      heading: isMobile ? 1.5 : 2,
    },
  };
};

export default ReadableText;
