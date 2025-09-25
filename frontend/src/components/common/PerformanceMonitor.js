import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const PerformanceMonitor = ({ showDetails = false }) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    network: 0,
    renderTime: 0
  });
  const [expanded, setExpanded] = useState(showDetails);
  const [isVisible, setIsVisible] = useState(false);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationId = useRef(null);

  // FPS-Monitoring
  const measureFPS = () => {
    frameCount.current++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime.current >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / (currentTime - lastTime.current));
      setMetrics(prev => ({ ...prev, fps }));
      frameCount.current = 0;
      lastTime.current = currentTime;
    }
    
    animationId.current = requestAnimationFrame(measureFPS);
  };

  // Memory-Monitoring
  const getMemoryInfo = () => {
    if ('memory' in performance) {
      const memory = performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const percentage = Math.round((usedMB / totalMB) * 100);
      
      setMetrics(prev => ({ 
        ...prev, 
        memory: percentage,
        memoryDetails: { used: usedMB, total: totalMB }
      }));
    }
  };

  // Network-Monitoring
  const getNetworkInfo = () => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const speed = connection.effectiveType || 'unknown';
      const downlink = connection.downlink || 0;
      
      setMetrics(prev => ({ 
        ...prev, 
        network: downlink,
        networkDetails: { speed, downlink }
      }));
    }
  };

  // Render-Time-Monitoring
  const measureRenderTime = () => {
    const startTime = performance.now();
    
    // Simuliere Render-Zeit
    setTimeout(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      setMetrics(prev => ({ ...prev, renderTime }));
    }, 0);
  };

  // Performance-Warnungen
  const getPerformanceWarnings = () => {
    const warnings = [];
    
    if (metrics.fps < 30) {
      warnings.push('Niedrige FPS - Performance-Probleme erkannt');
    }
    
    if (metrics.memory > 80) {
      warnings.push('Hoher Speicherverbrauch - Memory-Leak möglich');
    }
    
    if (metrics.renderTime > 16) {
      warnings.push('Lange Render-Zeit - UI-Verzögerungen möglich');
    }
    
    return warnings;
  };

  // Performance-Score berechnen
  const getPerformanceScore = () => {
    let score = 100;
    
    if (metrics.fps < 60) score -= 20;
    if (metrics.fps < 30) score -= 30;
    if (metrics.memory > 70) score -= 15;
    if (metrics.memory > 90) score -= 25;
    if (metrics.renderTime > 16) score -= 10;
    if (metrics.renderTime > 33) score -= 20;
    
    return Math.max(0, score);
  };

  useEffect(() => {
    // Starte FPS-Monitoring
    measureFPS();
    
    // Memory und Network alle 5 Sekunden aktualisieren
    const interval = setInterval(() => {
      getMemoryInfo();
      getNetworkInfo();
      measureRenderTime();
    }, 5000);
    
    // Initiale Messung
    getMemoryInfo();
    getNetworkInfo();
    measureRenderTime();
    
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
      clearInterval(interval);
    };
  }, []);

  const performanceScore = getPerformanceScore();
  const warnings = getPerformanceWarnings();
  const isHealthy = performanceScore >= 70;

  if (!isVisible && !showDetails) {
    return null;
  }

  return (
    <Card sx={{ 
      position: 'fixed', 
      bottom: 16, 
      right: 16, 
      zIndex: 1000,
      minWidth: 300,
      maxWidth: 400
    }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center' }}>
            <SpeedIcon sx={{ mr: 1, fontSize: 20 }} />
            Performance
          </Typography>
          <Box>
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => {
                getMemoryInfo();
                getNetworkInfo();
                measureRenderTime();
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Performance Score */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2">Performance Score</Typography>
            <Chip 
              label={`${performanceScore}/100`}
              color={isHealthy ? 'success' : 'warning'}
              size="small"
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={performanceScore}
            color={isHealthy ? 'success' : 'warning'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Basis-Metriken */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">FPS</Typography>
            <Typography variant="h6" color={metrics.fps >= 60 ? 'success.main' : 'warning.main'}>
              {metrics.fps}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Memory</Typography>
            <Typography variant="h6" color={metrics.memory < 70 ? 'success.main' : 'warning.main'}>
              {metrics.memory}%
            </Typography>
          </Box>
        </Box>

        {/* Warnungen */}
        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {warnings[0]}
              {warnings.length > 1 && ` (+${warnings.length - 1} weitere)`}
            </Typography>
          </Alert>
        )}

        {/* Detaillierte Metriken */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Detaillierte Metriken</Typography>
            
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metrik</TableCell>
                  <TableCell align="right">Wert</TableCell>
                  <TableCell align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>FPS</TableCell>
                  <TableCell align="right">{metrics.fps}</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={metrics.fps >= 60 ? 'Gut' : metrics.fps >= 30 ? 'OK' : 'Schlecht'}
                      color={metrics.fps >= 60 ? 'success' : metrics.fps >= 30 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Memory</TableCell>
                  <TableCell align="right">
                    {metrics.memoryDetails ? 
                      `${metrics.memoryDetails.used}MB / ${metrics.memoryDetails.total}MB` : 
                      `${metrics.memory}%`
                    }
                  </TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={metrics.memory < 70 ? 'Gut' : metrics.memory < 90 ? 'OK' : 'Kritisch'}
                      color={metrics.memory < 70 ? 'success' : metrics.memory < 90 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Render Time</TableCell>
                  <TableCell align="right">{metrics.renderTime.toFixed(2)}ms</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={metrics.renderTime < 16 ? 'Gut' : metrics.renderTime < 33 ? 'OK' : 'Schlecht'}
                      color={metrics.renderTime < 16 ? 'success' : metrics.renderTime < 33 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                {metrics.networkDetails && (
                  <TableRow>
                    <TableCell>Network</TableCell>
                    <TableCell align="right">
                      {metrics.networkDetails.speed} ({metrics.networkDetails.downlink}Mbps)
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label="OK"
                        color="success"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;
