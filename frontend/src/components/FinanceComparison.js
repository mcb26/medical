import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Compare as CompareIcon,
  Euro as EuroIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import api from '../api/axios';
import ModernButton from './common/ModernButton';
import { formatCurrency } from '../constants/unifiedLabels';

function FinanceComparison({ period1, period2, comparisonData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" />;
      case 'down':
        return <TrendingDownIcon color="error" />;
      default:
        return <TrendingFlatIcon color="action" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const renderComparisonCard = (title, period1Value, period2Value, change, trend, icon) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              {period1.label}
            </Typography>
            <Typography variant="h6">
              {formatCurrency(period1Value)}
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              {period2.label}
            </Typography>
            <Typography variant="h6">
              {formatCurrency(period2Value)}
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {getTrendIcon(trend)}
            <Typography variant="body2" color={`${getTrendColor(trend)}.main`}>
              {formatPercentage(change)}
            </Typography>
          </Stack>
          
          <Chip
            label={trend === 'up' ? 'Steigerung' : trend === 'down' ? 'Rückgang' : 'Stabil'}
            color={getTrendColor(trend)}
            size="small"
          />
        </Box>
      </CardContent>
    </Card>
  );

  const renderComparisonChart = () => {
    if (!comparisonData) return null;

    const chartData = [
      {
        name: 'Gesamtumsatz',
        period1: comparisonData.totalRevenue?.period1 || 0,
        period2: comparisonData.totalRevenue?.period2 || 0,
      },
      {
        name: 'GKV-Umsatz',
        period1: comparisonData.gkvRevenue?.period1 || 0,
        period2: comparisonData.gkvRevenue?.period2 || 0,
      },
      {
        name: 'Privat-Umsatz',
        period1: comparisonData.privateRevenue?.period1 || 0,
        period2: comparisonData.privateRevenue?.period2 || 0,
      },
      {
        name: 'Zuzahlungen',
        period1: comparisonData.copayRevenue?.period1 || 0,
        period2: comparisonData.copayRevenue?.period2 || 0,
      },
    ];

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Umsatzvergleich
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="period1" fill="#8884d8" name={period1.label} />
              <Bar dataKey="period2" fill="#82ca9d" name={period2.label} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderSummaryStats = () => {
    if (!comparisonData) return null;

    const stats = [
      {
        title: 'Gesamtumsatz',
        period1Value: comparisonData.totalRevenue?.period1 || 0,
        period2Value: comparisonData.totalRevenue?.period2 || 0,
        change: comparisonData.totalRevenue?.change || 0,
        trend: comparisonData.totalRevenue?.trend || 'stable',
        icon: <EuroIcon />
      },
      {
        title: 'GKV-Umsatz',
        period1Value: comparisonData.gkvRevenue?.period1 || 0,
        period2Value: comparisonData.gkvRevenue?.period2 || 0,
        change: comparisonData.gkvRevenue?.change || 0,
        trend: comparisonData.gkvRevenue?.trend || 'stable',
        icon: <AccountBalanceIcon />
      },
      {
        title: 'Privat-Umsatz',
        period1Value: comparisonData.privateRevenue?.period1 || 0,
        period2Value: comparisonData.privateRevenue?.period2 || 0,
        change: comparisonData.privateRevenue?.change || 0,
        trend: comparisonData.privateRevenue?.trend || 'stable',
        icon: <PaymentIcon />
      },
      {
        title: 'Zuzahlungen',
        period1Value: comparisonData.copayRevenue?.period1 || 0,
        period2Value: comparisonData.copayRevenue?.period2 || 0,
        change: comparisonData.copayRevenue?.change || 0,
        trend: comparisonData.copayRevenue?.trend || 'stable',
        icon: <ReceiptIcon />
      }
    ];

    return (
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            {renderComparisonCard(
              stat.title,
              stat.period1Value,
              stat.period2Value,
              stat.change,
              stat.trend,
              stat.icon
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <CompareIcon color="primary" />
          <Typography variant="h5">
            Finanzvergleich
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Vergleich zwischen {period1.label} und {period2.label}
        </Typography>
      </Paper>

      {/* Zusammenfassung */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Zusammenfassung
        </Typography>
        {renderSummaryStats()}
      </Box>

      {/* Chart */}
      <Box sx={{ mb: 4 }}>
        {renderComparisonChart()}
      </Box>

      {/* Detaillierte Analyse */}
      {comparisonData && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detaillierte Analyse
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Rechnungsanzahl
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h6">
                    {comparisonData.invoiceCount?.period1 || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    vs.
                  </Typography>
                  <Typography variant="h6">
                    {comparisonData.invoiceCount?.period2 || 0}
                  </Typography>
                  <Chip
                    label={formatPercentage(comparisonData.invoiceCount?.change || 0)}
                    color={getTrendColor(comparisonData.invoiceCount?.trend || 'stable')}
                    size="small"
                  />
                </Stack>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Durchschnittliche Rechnung
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h6">
                    {formatCurrency(comparisonData.averageInvoice?.period1 || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    vs.
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(comparisonData.averageInvoice?.period2 || 0)}
                  </Typography>
                  <Chip
                    label={formatPercentage(comparisonData.averageInvoice?.change || 0)}
                    color={getTrendColor(comparisonData.averageInvoice?.trend || 'stable')}
                    size="small"
                  />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default FinanceComparison;
