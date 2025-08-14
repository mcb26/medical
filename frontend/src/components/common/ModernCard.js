import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardActions, 
  CardMedia,
  Box,
  Typography,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme, variant }) => ({
  borderRadius: 16,
  border: '1px solid',
  borderColor: theme.palette.divider,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
  
  // Base styles
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
  },

  // Variant styles
  ...(variant === 'elevated' && {
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: 'none',
    
    '&:hover': {
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
    },
  }),

  ...(variant === 'outlined' && {
    boxShadow: 'none',
    borderColor: theme.palette.divider,
    
    '&:hover': {
      borderColor: theme.palette.primary.main,
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
    },
  }),

  ...(variant === 'filled' && {
    backgroundColor: theme.palette.grey[50],
    boxShadow: 'none',
    border: 'none',
    
    '&:hover': {
      backgroundColor: theme.palette.grey[100],
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
    },
  }),

  // Interactive variant
  ...(variant === 'interactive' && {
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    
    '&:hover': {
      transform: 'translateY(-2px) scale(1.02)',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
    },
    
    '&:active': {
      transform: 'translateY(0) scale(1)',
    },
  }),

  // Success variant
  ...(variant === 'success' && {
    borderLeft: `4px solid ${theme.palette.success.main}`,
    backgroundColor: theme.palette.success[50],
    
    '&:hover': {
      backgroundColor: theme.palette.success[100],
    },
  }),

  // Warning variant
  ...(variant === 'warning' && {
    borderLeft: `4px solid ${theme.palette.warning.main}`,
    backgroundColor: theme.palette.warning[50],
    
    '&:hover': {
      backgroundColor: theme.palette.warning[100],
    },
  }),

  // Error variant
  ...(variant === 'error' && {
    borderLeft: `4px solid ${theme.palette.error.main}`,
    backgroundColor: theme.palette.error[50],
    
    '&:hover': {
      backgroundColor: theme.palette.error[100],
    },
  }),

  // Info variant
  ...(variant === 'info' && {
    borderLeft: `4px solid ${theme.palette.info.main}`,
    backgroundColor: theme.palette.info[50],
    
    '&:hover': {
      backgroundColor: theme.palette.info[100],
    },
  }),
}));

const StyledCardHeader = styled(CardHeader)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  
  '& .MuiCardHeader-title': {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  
  '& .MuiCardHeader-subheader': {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
  },
  
  '& .MuiCardHeader-action': {
    margin: 0,
  },
}));

const StyledCardContent = styled(CardContent)(({ theme, padding = 'normal' }) => ({
  padding: padding === 'dense' ? theme.spacing(1.5, 3) : theme.spacing(2, 3),
  
  '&:last-child': {
    paddingBottom: padding === 'dense' ? theme.spacing(1.5) : theme.spacing(2),
  },
}));

const StyledCardActions = styled(CardActions)(({ theme }) => ({
  padding: theme.spacing(1.5, 3, 2),
  gap: theme.spacing(1),
}));

const ModernCard = ({
  children,
  variant = 'elevated',
  title,
  subtitle,
  action,
  media,
  mediaHeight = 200,
  chips = [],
  padding = 'normal',
  onClick,
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClick = (event) => {
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <StyledCard
      variant={variant}
      onClick={handleClick}
      sx={{
        ...sx,
        // Mobile optimizations
        ...(isMobile && {
          borderRadius: 12,
          '&:hover': {
            transform: 'none',
            boxShadow: sx?.boxShadow || '0 4px 20px rgba(0, 0, 0, 0.08)',
          },
        }),
      }}
      {...props}
    >
      {/* Media */}
      {media && (
        <CardMedia
          component="img"
          height={isMobile ? mediaHeight * 0.8 : mediaHeight}
          image={media}
          alt={title || 'Card media'}
          sx={{
            objectFit: 'cover',
          }}
        />
      )}

      {/* Header */}
      {(title || subtitle || action) && (
        <StyledCardHeader
          title={title}
          subheader={subtitle}
          action={action}
          sx={{
            padding: isMobile ? theme.spacing(1.5, 2) : theme.spacing(2, 3),
          }}
        />
      )}

      {/* Chips */}
      {chips.length > 0 && (
        <Box sx={{ px: 3, pb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {chips.map((chip, index) => (
            <Chip
              key={index}
              label={chip.label}
              color={chip.color || 'default'}
              size="small"
              variant={chip.variant || 'outlined'}
              sx={{
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          ))}
        </Box>
      )}

      {/* Content */}
      <StyledCardContent 
        padding={padding}
        sx={{
          padding: isMobile ? theme.spacing(1.5, 2) : theme.spacing(2, 3),
        }}
      >
        {children}
      </StyledCardContent>
    </StyledCard>
  );
};

// Card Section Component
const CardSection = ({ title, children, sx = {} }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ mb: 3, ...sx }}>
      {title && (
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            fontWeight: 600,
            color: theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
};

// Card Grid Component
const CardGrid = ({ children, columns = { xs: 1, sm: 2, md: 3, lg: 4 }, spacing = 3, sx = {} }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${columns.xs || 1}, 1fr)`,
          sm: `repeat(${columns.sm || 2}, 1fr)`,
          md: `repeat(${columns.md || 3}, 1fr)`,
          lg: `repeat(${columns.lg || 4}, 1fr)`,
        },
        gap: spacing,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export { ModernCard as default, CardSection, CardGrid }; 