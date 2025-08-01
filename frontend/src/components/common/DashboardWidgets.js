import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Event,
  LocalHospital,
  AttachMoney,
  MoreVert,
  Refresh,
  CalendarToday,
  Schedule,
  CheckCircle,
  Warning,
  Error
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

// Statistik Widget
export const StatWidget = ({
  title,
  value,
  change,
  changeType = 'neutral', // 'positive', 'negative', 'neutral'
  icon: Icon,
  color = 'primary',
  subtitle = '',
  onClick = null,
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return theme.palette.success.main;
      case 'negative': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive': return <TrendingUp fontSize="small" />;
      case 'negative': return <TrendingDown fontSize="small" />;
      default: return null;
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        } : {},
        position: 'relative',
        overflow: 'visible'
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette[color].main }}>
              {loading ? '...' : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                backgroundColor: `${theme.palette[color].main}15`,
                borderRadius: 2,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon sx={{ color: theme.palette[color].main, fontSize: 28 }} />
            </Box>
          )}
        </Box>

        {change !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getChangeIcon()}
            <Typography
              variant="body2"
              sx={{
                color: getChangeColor(),
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {change > 0 ? '+' : ''}{change}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              vs. letzter Monat
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Chart Widget
export const ChartWidget = ({
  title,
  data = [],
  type = 'line', // 'line', 'bar', 'pie'
  height = 300,
  color = 'primary',
  showLegend = true,
  showGrid = true,
  onClick = null,
  loading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main
  ];

  const renderChart = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
          <LinearProgress sx={{ width: '80%' }} />
        </Box>
      );
    }

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
              <XAxis 
                dataKey="name" 
                stroke={theme.palette.text.secondary}
                fontSize={12}
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                fontSize={12}
              />
              <RechartsTooltip 
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius
                }}
              />
              {showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey="value"
                stroke={theme.palette[color].main}
                strokeWidth={2}
                dot={{ fill: theme.palette[color].main, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: theme.palette[color].main, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />}
              <XAxis 
                dataKey="name" 
                stroke={theme.palette.text.secondary}
                fontSize={12}
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                fontSize={12}
              />
              <RechartsTooltip 
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius
                }}
              />
              {showLegend && <Legend />}
              <Bar dataKey="value" fill={theme.palette[color].main} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill={theme.palette[color].main}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: theme.shape.borderRadius
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

// Progress Widget
export const ProgressWidget = ({
  title,
  value,
  max,
  color = 'primary',
  subtitle = '',
  icon: Icon,
  showPercentage = true,
  onClick = null
}) => {
  const theme = useTheme();
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: theme.palette[color].main }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                backgroundColor: `${theme.palette[color].main}15`,
                borderRadius: 2,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon sx={{ color: theme.palette[color].main, fontSize: 28 }} />
            </Box>
          )}
        </Box>

        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={percentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: theme.palette[color].main
              }
            }}
          />
        </Box>

        {showPercentage && (
          <Typography variant="body2" color="text.secondary">
            {percentage.toFixed(1)}% von {max}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// Activity Feed Widget
export const ActivityWidget = ({
  title,
  activities = [],
  maxItems = 5,
  onClick = null
}) => {
  const theme = useTheme();

  const getActivityIcon = (type) => {
    switch (type) {
      case 'appointment': return <Event color="primary" />;
      case 'patient': return <People color="success" />;
      case 'treatment': return <LocalHospital color="info" />;
      case 'billing': return <AttachMoney color="warning" />;
      default: return <CheckCircle color="action" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'appointment': return theme.palette.primary.main;
      case 'patient': return theme.palette.success.main;
      case 'treatment': return theme.palette.info.main;
      case 'billing': return theme.palette.warning.main;
      default: return theme.palette.text.secondary;
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activities.slice(0, maxItems).map((activity, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 1,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }}
            >
              <Box sx={{ mt: 0.5 }}>
                {getActivityIcon(activity.type)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {activity.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activity.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {activity.time}
                </Typography>
              </Box>
              {activity.status && (
                <Chip
                  label={activity.status}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: getActivityColor(activity.type),
                    color: getActivityColor(activity.type)
                  }}
                />
              )}
            </Box>
          ))}
        </Box>

        {activities.length > maxItems && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
              {activities.length - maxItems} weitere Aktivitäten anzeigen
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Dashboard Grid
export const DashboardGrid = ({ children, spacing = 3 }) => {
  return (
    <Grid container spacing={spacing}>
      {children}
    </Grid>
  );
};

export default {
  StatWidget,
  ChartWidget,
  ProgressWidget,
  ActivityWidget,
  DashboardGrid
}; 