import { useState, useEffect } from 'react';

// Debounce Hook für Performance-Optimierung
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle Hook für Performance-Optimierung
export const useThrottle = (value, delay = 500) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const [lastRun, setLastRun] = useState(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun >= delay) {
        setThrottledValue(value);
        setLastRun(Date.now());
      }
    }, delay - (Date.now() - lastRun));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, lastRun]);

  return throttledValue;
};

// Memo Hook für teure Berechnungen
export const useMemoizedValue = (value, dependencies = []) => {
  const [memoizedValue, setMemoizedValue] = useState(value);

  useEffect(() => {
    setMemoizedValue(value);
  }, dependencies);

  return memoizedValue;
};

// Intersection Observer Hook für Lazy Loading
export const useIntersectionObserver = (options = {}) => {
  const [ref, setRef] = useState(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(ref);

    return () => {
      observer.unobserve(ref);
    };
  }, [ref, options]);

  return [setRef, isIntersecting];
};

// Resize Observer Hook für responsive Komponenten
export const useResizeObserver = (callback) => {
  const [ref, setRef] = useState(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        callback(entry.contentRect);
      });
    });

    observer.observe(ref);

    return () => {
      observer.unobserve(ref);
    };
  }, [ref, callback]);

  return setRef;
};

// Performance Hook für Render-Optimierung
export const usePerformanceMonitor = (componentName) => {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 16) { // Mehr als 16ms (60fps)
        console.warn(`${componentName} render took ${duration.toFixed(2)}ms`);
      }
    };
  });
};

export default {
  useDebounce,
  useThrottle,
  useMemoizedValue,
  useIntersectionObserver,
  useResizeObserver,
  usePerformanceMonitor
}; 