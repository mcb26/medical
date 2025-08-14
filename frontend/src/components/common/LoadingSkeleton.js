import React from 'react';
import {
  Box,
  Skeleton,
  Card,
  CardContent,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';

// Skeleton für DataGrid Zeilen
export const DataGridSkeleton = ({ rows = 5, columns = 4 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ p: 2 }}>
      {/* Header Skeleton */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="40%" height={20} />
      </Box>

      {/* Toolbar Skeleton */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Skeleton variant="rectangular" width={120} height={36} />
        <Skeleton variant="rectangular" width={100} height={36} />
        <Skeleton variant="rectangular" width={80} height={36} />
      </Box>

      {/* Table Header Skeleton */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : `repeat(${columns}, 1fr)`,
        gap: 1,
        mb: 1,
        p: 1,
        backgroundColor: theme.palette.grey[50],
        borderRadius: 1
      }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} variant="text" height={24} />
        ))}
      </Box>

      {/* Table Rows Skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : `repeat(${columns}, 1fr)`,
            gap: 1,
            p: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" height={20} />
          ))}
        </Box>
      ))}
    </Box>
  );
};

// Skeleton für Karten
export const CardSkeleton = ({ count = 3, variant = 'default' }) => {
  const theme = useTheme();

  const renderCardContent = () => {
    switch (variant) {
      case 'patient':
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Skeleton variant="circular" width={48} height={48} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" height={24} />
                <Skeleton variant="text" width="50%" height={16} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Skeleton variant="text" width="100%" height={16} />
              <Skeleton variant="text" width="80%" height={16} />
              <Skeleton variant="text" width="60%" height={16} />
            </Box>
          </>
        );
      
      case 'appointment':
        return (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Skeleton variant="text" width="100%" height={16} />
              <Skeleton variant="text" width="90%" height={16} />
              <Skeleton variant="text" width="70%" height={16} />
            </Box>
          </>
        );
      
      default:
        return (
          <>
            <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="100%" height={16} />
            <Skeleton variant="text" width="80%" height={16} />
            <Skeleton variant="text" width="90%" height={16} />
          </>
        );
    }
  };

  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              {renderCardContent()}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Skeleton für Listen
export const ListSkeleton = ({ items = 5, showAvatar = true }) => {
  return (
    <Box>
      {Array.from({ length: items }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {showAvatar && <Skeleton variant="circular" width={40} height={40} />}
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" height={20} />
            <Skeleton variant="text" width="50%" height={16} />
          </Box>
          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
        </Box>
      ))}
    </Box>
  );
};

// Skeleton für Dashboard Widgets
export const DashboardSkeleton = () => {
  const theme = useTheme();

  return (
    <Box sx={{ p: 2 }}>
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" height={16} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="40%" height={14} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={200} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="50%" height={24} sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton variant="text" width="60%" height={16} />
                    <Skeleton variant="text" width="20%" height={16} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Card>
        <CardContent>
          <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
          <ListSkeleton items={5} showAvatar={true} />
        </CardContent>
      </Card>
    </Box>
  );
};

// Skeleton für Formulare
export const FormSkeleton = ({ fields = 6 }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: fields }).map((_, index) => (
          <Box key={index}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Skeleton variant="rectangular" width={100} height={36} />
        <Skeleton variant="rectangular" width={100} height={36} />
      </Box>
    </Box>
  );
};

const LoadingSkeletonComponents = {
  DataGridSkeleton,
  CardSkeleton,
  ListSkeleton,
  DashboardSkeleton,
  FormSkeleton
};

export default LoadingSkeletonComponents; 