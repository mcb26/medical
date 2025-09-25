import React from 'react';
import {
  Box,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ModernButton from './ModernButton';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { UNIFIED_LABELS } from '../../constants/unifiedLabels';

const UnifiedActionBar = ({
  title,
  subtitle,
  actions = [],
  selectedCount = 0,
  onRefresh,
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const defaultActions = [
    {
      label: UNIFIED_LABELS.actions.new,
      variant: 'contained',
      icon: <AddIcon />,
      onClick: () => {},
      primary: true,
    },
    {
      label: UNIFIED_LABELS.actions.refresh,
      variant: 'outlined',
      icon: <RefreshIcon />,
      onClick: onRefresh,
    },
    {
      label: UNIFIED_LABELS.actions.export,
      variant: 'outlined',
      icon: <DownloadIcon />,
      onClick: () => {},
    },
    {
      label: UNIFIED_LABELS.actions.print,
      variant: 'outlined',
      icon: <PrintIcon />,
      onClick: () => window.print(),
    },
  ];

  const selectedActions = [
    {
      label: `${UNIFIED_LABELS.actions.delete} (${selectedCount})`,
      variant: 'error',
      icon: <DeleteIcon />,
      onClick: () => {},
      disabled: selectedCount === 0,
    },
    {
      label: UNIFIED_LABELS.actions.edit,
      variant: 'outlined',
      icon: <EditIcon />,
      onClick: () => {},
      disabled: selectedCount !== 1,
    },
    {
      label: UNIFIED_LABELS.actions.view,
      variant: 'outlined',
      icon: <ViewIcon />,
      onClick: () => {},
      disabled: selectedCount !== 1,
    },
  ];

  const allActions = [...actions, ...defaultActions];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: 2,
        mb: 3,
        p: 3,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        border: `1px solid ${theme.palette.divider}`,
        ...sx,
      }}
      {...props}
    >
      {/* Title Section */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: subtitle ? 0.5 : 0,
            fontSize: isMobile ? '1.5rem' : '2rem',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: isMobile ? '0.875rem' : '1rem',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Actions Section */}
      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={1}
        sx={{
          flexShrink: 0,
          width: isMobile ? '100%' : 'auto',
        }}
      >
        {/* Primary Actions */}
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={1}
          sx={{ flexWrap: 'wrap' }}
        >
          {allActions.map((action, index) => (
            <ModernButton
              key={index}
              variant={action.variant}
              size={isMobile ? 'large' : 'medium'}
              startIcon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled}
              fullWidth={isMobile}
              sx={{
                minWidth: isMobile ? '100%' : 'auto',
                ...action.sx,
              }}
            >
              {action.label}
            </ModernButton>
          ))}
        </Stack>

        {/* Selected Actions */}
        {selectedCount > 0 && (
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={1}
            sx={{
              borderTop: isMobile ? `1px solid ${theme.palette.divider}` : 'none',
              borderLeft: !isMobile ? `1px solid ${theme.palette.divider}` : 'none',
              pt: isMobile ? 2 : 0,
              pl: !isMobile ? 2 : 0,
              mt: isMobile ? 2 : 0,
              ml: !isMobile ? 2 : 0,
            }}
          >
            {selectedActions.map((action, index) => (
              <ModernButton
                key={`selected-${index}`}
                variant={action.variant}
                size={isMobile ? 'large' : 'medium'}
                startIcon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                fullWidth={isMobile}
                sx={{
                  minWidth: isMobile ? '100%' : 'auto',
                  ...action.sx,
                }}
              >
                {action.label}
              </ModernButton>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default UnifiedActionBar;
