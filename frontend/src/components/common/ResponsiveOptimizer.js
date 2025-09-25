import React from 'react';
import { Box } from '@mui/material';

// Responsive Optimizer Component
export const ResponsiveOptimizer = ({ children, breakpoint = 'md' }) => {
  const [isOptimized, setIsOptimized] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let shouldOptimize = false;

      switch (breakpoint) {
        case 'xs':
          shouldOptimize = width < 600;
          break;
        case 'sm':
          shouldOptimize = width < 960;
          break;
        case 'md':
          shouldOptimize = width < 1280;
          break;
        case 'lg':
          shouldOptimize = width < 1920;
          break;
        default:
          shouldOptimize = width < 1280;
      }

      setIsOptimized(shouldOptimize);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return (
    <Box sx={{ 
      transform: isOptimized ? 'scale(0.95)' : 'scale(1)',
      transition: 'transform 0.3s ease-in-out'
    }}>
      {children}
    </Box>
  );
};

export default ResponsiveOptimizer;
