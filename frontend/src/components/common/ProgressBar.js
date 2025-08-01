import React, { useState, useEffect } from 'react';
import { 
  LinearProgress, 
  CircularProgress, 
  Box, 
  Typography, 
  Fade,
  Paper
} from '@mui/material';

// Linear Progress Bar mit Text
export const LinearProgressBar = ({ 
  value = 0, 
  max = 100, 
  label = '', 
  showPercentage = true,
  color = 'primary',
  height = 8,
  showLabel = true,
  variant = 'determinate'
}) => {
  const percentage = Math.round((value / max) * 100);
  
  return (
    <Box sx={{ width: '100%' }}>
      {showLabel && label && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {showPercentage && (
            <Typography variant="body2" color="text.secondary">
              {percentage}%
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress
        variant={variant}
        value={variant === 'determinate' ? percentage : undefined}
        color={color}
        sx={{
          height,
          borderRadius: height / 2,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          '& .MuiLinearProgress-bar': {
            borderRadius: height / 2,
          }
        }}
      />
    </Box>
  );
};

// Circular Progress mit Text
export const CircularProgressBar = ({ 
  value = 0, 
  max = 100, 
  label = '', 
  size = 60,
  thickness = 4,
  color = 'primary',
  showPercentage = true
}) => {
  const percentage = Math.round((value / max) * 100);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={percentage}
          size={size}
          thickness={thickness}
          color={color}
        />
        {showPercentage && (
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" component="div" color="text.secondary">
              {percentage}%
            </Typography>
          </Box>
        )}
      </Box>
      {label && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {label}
        </Typography>
      )}
    </Box>
  );
};

// Loading Overlay
export const LoadingOverlay = ({ 
  open = false, 
  message = 'Lade...', 
  transparent = false,
  children 
}) => {
  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: transparent ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <CircularProgress size={40} />
          {message && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {message}
            </Typography>
          )}
        </Box>
      </Fade>
    </Box>
  );
};

// Full Screen Loading
export const FullScreenLoading = ({ 
  open = false, 
  message = 'Lade...',
  showProgress = false,
  progress = 0
}) => {
  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          minWidth: 300,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.primary">
          {message}
        </Typography>
        {showProgress && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgressBar 
              value={progress} 
              max={100} 
              showLabel={false}
              height={6}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

// Progress Steps
export const ProgressSteps = ({ 
  steps = [], 
  currentStep = 0,
  orientation = 'horizontal'
}) => {
  const isVertical = orientation === 'vertical';
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: isVertical ? 'column' : 'row',
      gap: isVertical ? 2 : 1,
      width: '100%'
    }}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;
        
        return (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: isVertical ? 'row' : 'column',
              alignItems: 'center',
              flex: 1,
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCompleted ? 'success.main' : 
                               isCurrent ? 'primary.main' : 'grey.300',
                color: isCompleted || isCurrent ? 'white' : 'grey.600',
                fontWeight: 'bold',
                fontSize: '0.875rem',
              }}
            >
              {isCompleted ? '✓' : index + 1}
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: isCompleted ? 'success.main' : 
                       isCurrent ? 'primary.main' : 'text.secondary',
                fontWeight: isCurrent ? 600 : 400,
                textAlign: isVertical ? 'left' : 'center',
              }}
            >
              {step}
            </Typography>
            {index < steps.length - 1 && (
              <Box
                sx={{
                  flex: 1,
                  height: isVertical ? 1 : 2,
                  backgroundColor: isCompleted ? 'success.main' : 'grey.300',
                  mx: isVertical ? 0 : 1,
                  my: isVertical ? 1 : 0,
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default {
  Linear: LinearProgressBar,
  Circular: CircularProgressBar,
  Overlay: LoadingOverlay,
  FullScreen: FullScreenLoading,
  Steps: ProgressSteps,
}; 