import React from 'react';
import {
  Box,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import UnifiedActionBar from './UnifiedActionBar';
import UnifiedDataGrid from './UnifiedDataGrid';

const UnifiedPageLayout = ({
  title,
  subtitle,
  actions = [],
  selectedCount = 0,
  onRefresh,
  children,
  showActionBar = true,
  showDataGrid = false,
  dataGridProps = {},
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        ...sx,
      }}
      {...props}
    >
      <Container
        maxWidth="xl"
        sx={{
          py: isMobile ? 2 : 3,
          px: isMobile ? 1 : 3,
        }}
      >
        {/* Action Bar */}
        {showActionBar && (
          <UnifiedActionBar
            title={title}
            subtitle={subtitle}
            actions={actions}
            selectedCount={selectedCount}
            onRefresh={onRefresh}
          />
        )}

        {/* Content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {showDataGrid ? (
            <UnifiedDataGrid {...dataGridProps} />
          ) : (
            children
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default UnifiedPageLayout;
