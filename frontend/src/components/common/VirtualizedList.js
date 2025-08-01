import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { FixedSizeList as List } from 'react-window';
import { useInView } from 'react-intersection-observer';

// Virtualisierte Liste für bessere Performance
export const VirtualizedList = ({
  items = [],
  itemHeight = 60,
  loading = false,
  error = null,
  onLoadMore = null,
  hasMore = false,
  renderItem,
  emptyMessage = "Keine Daten verfügbar",
  loadingMessage = "Lade Daten...",
  errorMessage = "Fehler beim Laden der Daten",
  containerHeight = 400,
  overscanCount = 5
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // Lazy Loading Trigger
  useEffect(() => {
    if (inView && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, loading, onLoadMore]);

  // Memoized item renderer
  const ItemRenderer = useCallback(({ index, style }) => {
    const item = items[index];
    if (!item) return null;
    
    return (
      <Box style={style}>
        {renderItem(item, index)}
      </Box>
    );
  }, [items, renderItem]);

  // Memoized list data
  const listData = useMemo(() => items, [items]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: containerHeight,
          color: theme.palette.error.main
        }}
      >
        <Typography variant="body2">{errorMessage}</Typography>
      </Box>
    );
  }

  if (loading && items.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: containerHeight,
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          {loadingMessage}
        </Typography>
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: containerHeight,
          color: theme.palette.text.secondary
        }}
      >
        <Typography variant="body2">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: containerHeight, width: '100%' }}>
      <List
        height={containerHeight}
        itemCount={items.length}
        itemSize={itemHeight}
        overscanCount={overscanCount}
        width="100%"
      >
        {ItemRenderer}
      </List>
      
      {/* Loading indicator for pagination */}
      {hasMore && (
        <Box
          ref={ref}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 2,
            minHeight: 60
          }}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Weitere Daten laden...
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

// Infinite Scroll Hook
export const useInfiniteScroll = (fetchFunction, dependencies = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  const loadData = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction(pageNum, pageSize);
      
      if (append) {
        setData(prev => [...prev, ...result.data]);
      } else {
        setData(result.data);
      }
      
      setHasMore(result.data.length === pageSize);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, pageSize]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadData(page + 1, true);
    }
  }, [loading, hasMore, page, loadData]);

  const refresh = useCallback(() => {
    loadData(1, false);
  }, [loadData]);

  useEffect(() => {
    loadData(1, false);
  }, dependencies);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    setData
  };
};

export default VirtualizedList; 