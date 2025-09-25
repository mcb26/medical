import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Skeleton,
  Fade,
  Zoom
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  HourglassEmpty as LoadingIcon
} from '@mui/icons-material';

// Einheitliche Button-Komponente
export const UnifiedButton = ({
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  startIcon,
  endIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  onClick,
  tooltip,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const button = (
    <Button
      variant={variant}
      size={size}
      color={color}
      startIcon={loading ? <CircularProgress size={16} /> : startIcon}
      endIcon={endIcon}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onClick={onClick}
      sx={{
        minHeight: isMobile ? '44px' : '36px',
        minWidth: isMobile ? '44px' : 'auto',
        borderRadius: 2,
        textTransform: 'none',
        fontWeight: 500,
        boxShadow: variant === 'contained' ? theme.shadows[2] : 'none',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: variant === 'contained' ? theme.shadows[4] : 'none',
        },
        '&:focus': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        },
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Button>
  );

  return tooltip ? (
    <Tooltip title={tooltip} placement="top">
      {button}
    </Tooltip>
  ) : button;
};

// Einheitliche Card-Komponente
export const UnifiedCard = ({
  variant = 'elevated',
  children,
  title,
  subtitle,
  actions,
  loading = false,
  error = null,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return { boxShadow: theme.shadows[4] };
      case 'outlined':
        return { border: `1px solid ${theme.palette.divider}` };
      case 'filled':
        return { backgroundColor: theme.palette.action.hover };
      case 'interactive':
        return {
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[8],
          }
        };
      default:
        return {};
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        ...getVariantStyles(),
        ...props.sx
      }}
      {...props}
    >
      {(title || subtitle || actions) && (
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box>
            {title && (
              <Typography variant="h6" component="h2" sx={{ mb: subtitle ? 0.5 : 0 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {actions}
            </Box>
          )}
        </Box>
      )}
      
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Fehler</AlertTitle>
            {error}
          </Alert>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
};

// Einheitliche Status-Chip-Komponente
export const StatusChip = ({ status, size = 'small', ...props }) => {
  const getStatusConfig = (status) => {
    const configs = {
      success: { color: 'success', icon: <SuccessIcon />, label: 'Erfolgreich' },
      error: { color: 'error', icon: <ErrorIcon />, label: 'Fehler' },
      warning: { color: 'warning', icon: <WarningIcon />, label: 'Warnung' },
      info: { color: 'info', icon: <InfoIcon />, label: 'Info' },
      pending: { color: 'default', icon: <LoadingIcon />, label: 'Ausstehend' },
      completed: { color: 'success', icon: <SuccessIcon />, label: 'Abgeschlossen' },
      cancelled: { color: 'error', icon: <ErrorIcon />, label: 'Storniert' },
      planned: { color: 'info', icon: <InfoIcon />, label: 'Geplant' },
      confirmed: { color: 'warning', icon: <WarningIcon />, label: 'Bestätigt' },
      ready_to_bill: { color: 'success', icon: <SuccessIcon />, label: 'Abrechnungsbereit' },
      billed: { color: 'success', icon: <SuccessIcon />, label: 'Abgerechnet' },
    };
    return configs[status] || { color: 'default', icon: <InfoIcon />, label: status };
  };

  const config = getStatusConfig(status);

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size={size}
      variant="outlined"
      sx={{
        fontWeight: 500,
        '& .MuiChip-icon': {
          fontSize: '1rem',
        }
      }}
      {...props}
    />
  );
};

// Einheitliche Action-Buttons
export const ActionButtons = ({
  onView,
  onEdit,
  onDelete,
  onRefresh,
  viewTooltip = 'Anzeigen',
  editTooltip = 'Bearbeiten',
  deleteTooltip = 'Löschen',
  refreshTooltip = 'Aktualisieren',
  showView = true,
  showEdit = true,
  showDelete = true,
  showRefresh = false,
  size = 'small',
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const buttonSize = isMobile ? 'large' : size;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {showView && onView && (
        <Tooltip title={viewTooltip}>
          <IconButton
            size={buttonSize}
            onClick={onView}
            sx={{
              color: theme.palette.info.main,
              '&:hover': { backgroundColor: theme.palette.info.light + '20' }
            }}
            {...props}
          >
            <ViewIcon />
          </IconButton>
        </Tooltip>
      )}
      
      {showEdit && onEdit && (
        <Tooltip title={editTooltip}>
          <IconButton
            size={buttonSize}
            onClick={onEdit}
            sx={{
              color: theme.palette.warning.main,
              '&:hover': { backgroundColor: theme.palette.warning.light + '20' }
            }}
            {...props}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
      
      {showDelete && onDelete && (
        <Tooltip title={deleteTooltip}>
          <IconButton
            size={buttonSize}
            onClick={onDelete}
            sx={{
              color: theme.palette.error.main,
              '&:hover': { backgroundColor: theme.palette.error.light + '20' }
            }}
            {...props}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      )}
      
      {showRefresh && onRefresh && (
        <Tooltip title={refreshTooltip}>
          <IconButton
            size={buttonSize}
            onClick={onRefresh}
            sx={{
              color: theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.primary.light + '20' }
            }}
            {...props}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

// Einheitliche Loading-Skeleton
export const LoadingSkeleton = ({ variant = 'rectangular', width, height, ...props }) => {
  return (
    <Skeleton
      variant={variant}
      width={width}
      height={height}
      sx={{
        borderRadius: 2,
        ...props.sx
      }}
      {...props}
    />
  );
};

// Einheitliche Empty State
export const EmptyState = ({
  title = 'Keine Daten',
  description = 'Es wurden noch keine Daten gefunden.',
  icon: Icon = InfoIcon,
  action,
  actionText,
  onAction,
  ...props
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 3,
        textAlign: 'center',
        ...props.sx
      }}
      {...props}
    >
      <Icon
        sx={{
          fontSize: 64,
          color: theme.palette.text.disabled,
          mb: 2
        }}
      />
      
      <Typography
        variant="h6"
        component="h3"
        sx={{
          mb: 1,
          color: theme.palette.text.secondary,
          fontWeight: 500
        }}
      >
        {title}
      </Typography>
      
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, maxWidth: 400 }}
      >
        {description}
      </Typography>
      
      {action && onAction && (
        <UnifiedButton
          variant="outlined"
          startIcon={action}
          onClick={onAction}
        >
          {actionText}
        </UnifiedButton>
      )}
    </Box>
  );
};

// Einheitliche Error Display
export const ErrorDisplay = ({
  error,
  errorId,
  onRetry,
  onGoHome,
  title = 'Ein Fehler ist aufgetreten',
  ...props
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 3,
        textAlign: 'center',
        ...props.sx
      }}
      {...props}
    >
      <ErrorIcon
        sx={{
          fontSize: 48,
          color: theme.palette.error.main,
          mb: 2
        }}
      />
      
      <Typography
        variant="h6"
        component="h3"
        sx={{
          mb: 1,
          color: theme.palette.error.main,
          fontWeight: 500
        }}
      >
        {title}
      </Typography>
      
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2, maxWidth: 400 }}
      >
        {error || 'Ein unerwarteter Fehler ist aufgetreten.'}
      </Typography>
      
      {errorId && (
        <Chip
          label={`Fehler-ID: ${errorId}`}
          variant="outlined"
          color="error"
          size="small"
          sx={{ mb: 2 }}
        />
      )}
      
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {onRetry && (
          <UnifiedButton
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
          >
            Erneut versuchen
          </UnifiedButton>
        )}
        
        {onGoHome && (
          <UnifiedButton
            variant="outlined"
            onClick={onGoHome}
          >
            Zur Startseite
          </UnifiedButton>
        )}
      </Box>
    </Box>
  );
};

// Alle Komponenten sind bereits als named exports verfügbar
