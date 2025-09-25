import React from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Box, Paper, useTheme, useMediaQuery } from '@mui/material';
import { UNIFIED_LABELS } from '../../constants/unifiedLabels';

const UnifiedDataGrid = ({
  rows,
  columns,
  loading = false,
  rowCount,
  paginationMode = 'client',
  pageSizeOptions = [10, 15, 25, 50, 100],
  initialPageSize = 25,
  checkboxSelection = true,
  onRowClick,
  disableRowSelectionOnClick = false,
  density = 'compact',
  sx = {},
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const defaultSx = {
    '& .MuiDataGrid-row': {
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
      },
    },
    '& .MuiDataGrid-cell': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: theme.palette.grey[50],
      borderBottom: `2px solid ${theme.palette.divider}`,
    },
    '& .MuiDataGrid-toolbarContainer': {
      backgroundColor: theme.palette.background.paper,
      borderBottom: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(1, 2),
    },
    '& .MuiDataGrid-footerContainer': {
      backgroundColor: theme.palette.background.paper,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
    // Mobile Optimierungen
    ...(isMobile && {
      '& .MuiDataGrid-cell': {
        fontSize: '0.875rem',
        padding: theme.spacing(1),
      },
      '& .MuiDataGrid-columnHeader': {
        fontSize: '0.875rem',
        padding: theme.spacing(1),
      },
    }),
  };

  const defaultLocaleText = UNIFIED_LABELS.dataGrid;

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
      <Paper 
        elevation={1} 
        sx={{ 
          height: '100%', 
          width: '100%',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode={paginationMode}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: isMobile ? Math.min(initialPageSize, 15) : initialPageSize,
              },
            },
          }}
          pageSizeOptions={pageSizeOptions}
          checkboxSelection={checkboxSelection}
          onRowClick={onRowClick}
          disableRowSelectionOnClick={disableRowSelectionOnClick}
          density={density}
          localeText={defaultLocaleText}
          sx={{
            ...defaultSx,
            ...sx,
          }}
          {...props}
        />
      </Paper>
    </Box>
  );
};

export default UnifiedDataGrid;
