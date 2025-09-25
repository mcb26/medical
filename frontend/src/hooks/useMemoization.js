import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

// Intelligente Memoization mit Cache-Invalidierung
export const useSmartMemo = (factory, dependencies, cacheKey = null, ttl = 300000) => {
  const cacheRef = useRef(new Map());
  const timestampRef = useRef(new Map());

  return useMemo(() => {
    const key = cacheKey || JSON.stringify(dependencies);
    const now = Date.now();
    const cached = cacheRef.current.get(key);
    const timestamp = timestampRef.current.get(key);

    // Prüfe Cache-Gültigkeit
    if (cached && timestamp && (now - timestamp) < ttl) {
      return cached;
    }

    // Berechne neuen Wert
    const result = factory();
    
    // Cache aktualisieren
    cacheRef.current.set(key, result);
    timestampRef.current.set(key, now);

    return result;
  }, dependencies);
};

// Debounced Callback
export const useDebouncedCallback = (callback, delay = 300) => {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Throttled Callback
export const useThrottledCallback = (callback, delay = 300) => {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    const now = Date.now();

    if (now - lastCallRef.current >= delay) {
      callback(...args);
      lastCallRef.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastCallRef.current = Date.now();
      }, delay - (now - lastCallRef.current));
    }
  }, [callback, delay]);
};

// Optimierte Liste mit Virtualisierung
export const useVirtualizedList = (items, itemHeight = 50, containerHeight = 400) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    containerRef
  };
};

// Optimierte Filterung mit Memoization
export const useFilteredData = (data, filters, searchTerm = '') => {
  return useSmartMemo(() => {
    let filtered = data;

    // Text-Suche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(term)
        )
      );
    }

    // Filter anwenden
    if (filters && Object.keys(filters).length > 0) {
      filtered = filtered.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value || value === '') return true;
          return item[key] === value;
        });
      });
    }

    return filtered;
  }, [data, filters, searchTerm], 'filtered_data');
};

// Optimierte Sortierung mit Memoization
export const useSortedData = (data, sortBy = null, sortOrder = 'asc') => {
  return useSmartMemo(() => {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortBy, sortOrder], 'sorted_data');
};

// Optimierte Paginierung
export const usePagination = (data, pageSize = 20) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data.slice(startIndex, endIndex);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    currentData,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

// Optimierte Daten-Transformation
export const useDataTransformation = (data, transformations = []) => {
  return useSmartMemo(() => {
    let transformed = data;

    for (const transform of transformations) {
      switch (transform.type) {
        case 'filter':
          transformed = transformed.filter(transform.predicate);
          break;
        case 'map':
          transformed = transformed.map(transform.mapper);
          break;
        case 'reduce':
          transformed = transformed.reduce(transform.reducer, transform.initialValue);
          break;
        case 'sort':
          transformed = [...transformed].sort(transform.comparator);
          break;
        case 'group':
          transformed = transformed.reduce((groups, item) => {
            const key = transform.keyExtractor(item);
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
            return groups;
          }, {});
          break;
        default:
          console.warn(`Unknown transformation type: ${transform.type}`);
      }
    }

    return transformed;
  }, [data, transformations], 'transformed_data');
};

// Performance-Monitoring Hook
export const usePerformanceMonitor = (componentName, dependencies = []) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    const renderTime = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;

    // Warnung bei langsamen Renders
    if (renderTime > 16) {
      console.warn(
        `${componentName} render #${renderCountRef.current} took ${renderTime.toFixed(2)}ms`
      );
    }

    // Warnung bei zu vielen Renders
    if (renderCountRef.current > 100) {
      console.warn(
        `${componentName} has rendered ${renderCountRef.current} times - consider optimization`
      );
    }
  }, dependencies);

  return {
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTimeRef.current
  };
};

// Cache-Management Hook
export const useCache = (key, initialValue = null, ttl = 300000) => {
  const cacheRef = useRef(new Map());
  const timestampRef = useRef(new Map());

  const get = useCallback(() => {
    const now = Date.now();
    const cached = cacheRef.current.get(key);
    const timestamp = timestampRef.current.get(key);

    if (cached && timestamp && (now - timestamp) < ttl) {
      return cached;
    }

    return null;
  }, [key, ttl]);

  const set = useCallback((value) => {
    cacheRef.current.set(key, value);
    timestampRef.current.set(key, Date.now());
  }, [key]);

  const clear = useCallback(() => {
    cacheRef.current.delete(key);
    timestampRef.current.delete(key);
  }, [key]);

  const clearAll = useCallback(() => {
    cacheRef.current.clear();
    timestampRef.current.clear();
  }, []);

  return { get, set, clear, clearAll };
};

// Optimierte Event-Handler
export const useOptimizedEventHandler = (handler, options = {}) => {
  const {
    debounce = 0,
    throttle = 0,
    passive = true,
    capture = false
  } = options;

  const debouncedHandler = useDebouncedCallback(handler, debounce);
  const throttledHandler = useThrottledCallback(handler, throttle);

  const optimizedHandler = useCallback((...args) => {
    if (debounce > 0) {
      debouncedHandler(...args);
    } else if (throttle > 0) {
      throttledHandler(...args);
    } else {
      handler(...args);
    }
  }, [handler, debouncedHandler, throttledHandler, debounce, throttle]);

  return {
    handler: optimizedHandler,
    options: { passive, capture }
  };
};
