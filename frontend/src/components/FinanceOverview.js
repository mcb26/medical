import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Bar
} from 'recharts';
import {
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Euro as EuroIcon,
  Compare as CompareIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import api from '../api/axios';

import ModernButton from './common/ModernButton';
import { formatCurrency, formatDate } from '../constants/unifiedLabels';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`finance-tabpanel-${index}`}
      aria-labelledby={`finance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function FinanceOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareYear, setCompareYear] = useState(new Date().getFullYear() - 1);
  const [compareMonth, setCompareMonth] = useState(new Date().getMonth() + 1);
  const [historicalData, setHistoricalData] = useState([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [data, setData] = useState({
    totalRevenue: 0,
    openInvoices: 0,
    paidInvoices: 0,
    gkvRevenue: 0,
    privateRevenue: 0,
    copayRevenue: 0,
    revenueByMonth: [],
    revenueByInsurance: [],
    revenueByTreatment: [],
    latestTransactions: [],
    billingCycles: [],
    outstandingAmount: 0,
    averageInvoiceAmount: 0,
    paymentTrends: [],
    topTreatments: [],
    insuranceDistribution: [],
    monthlyComparison: [],
    yearlyComparison: [],
    historicalTrends: []
  });

  // Verfügbare Jahre für Auswahl
  const availableYears = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'Januar' },
    { value: 2, label: 'Februar' },
    { value: 3, label: 'März' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Dezember' }
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        year: selectedYear,
        month: selectedMonth
      });

      const [financeResponse, billingResponse, statsResponse, historyResponse] = await Promise.all([
        api.get(`/finance/overview/?${params}`),
        api.get('/billing-cycles/'),
        api.get('/stats/'),
        api.get('/finance/historical/')
      ]);
      
      setData({
        ...financeResponse.data,
        billingCycles: billingResponse.data,
        stats: statsResponse.data
      });
      setHistoricalData(historyResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('Finance data error:', err);
      setError('Fehler beim Laden der Finanzdaten');
      setLoading(false);
    }
  }, [period, selectedYear, selectedMonth]);

  const fetchComparisonData = useCallback(async () => {
    if (!compareMode) return;
    
    try {
      const params = new URLSearchParams({
        period,
        year: compareYear,
        month: compareMonth
      });
      
      const response = await api.get(`/finance/overview/?${params}`);
      return response.data;
    } catch (err) {
      console.error('Comparison data error:', err);
      return null;
    }
  }, [compareMode, period, compareYear, compareMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const handleCompareToggle = () => {
    setCompareMode(!compareMode);
  };

  const handleExportData = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `finanzdaten_${selectedYear}_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = () => {
    const headers = ['Datum', 'Umsatz', 'GKV', 'Privat', 'Zuzahlung', 'Offene Rechnungen'];
    const rows = data.revenueByMonth.map(item => [
      item.month,
      item.revenue,
      item.gkv_revenue,
      item.private_revenue,
      item.copay_revenue,
      item.open_invoices
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <CircularProgress />
    </Box>
  );
  
  if (error) return (
    <Box p={3}>
      <Alert severity="error">{error}</Alert>
    </Box>
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'created': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Bezahlt';
      case 'created': return 'Erstellt';
      case 'overdue': return 'Überfällig';
      default: return status;
    }
  };

  const renderPeriodSelector = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            Finanzübersicht
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {period === 'month' ? `${months[selectedMonth - 1]?.label} ${selectedYear}` : `Jahr ${selectedYear}`}
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Zeitraum</InputLabel>
              <Select value={period} onChange={handlePeriodChange} label="Zeitraum">
                <MenuItem value="month">Monat</MenuItem>
                <MenuItem value="quarter">Quartal</MenuItem>
                <MenuItem value="year">Jahr</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Jahr</InputLabel>
              <Select value={selectedYear} onChange={handleYearChange} label="Jahr">
                {availableYears.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {period === 'month' && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Monat</InputLabel>
                <Select value={selectedMonth} onChange={handleMonthChange} label="Monat">
                  {months.map(month => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <ModernButton
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => setShowHistoryDialog(true)}
            >
              Historie
            </ModernButton>
            
            <ModernButton
              variant={compareMode ? "contained" : "outlined"}
              startIcon={<CompareIcon />}
              onClick={handleCompareToggle}
            >
              Vergleich
            </ModernButton>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderComparisonSelector = () => {
    if (!compareMode) return null;
    
    return (
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Vergleichszeitraum
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth>
              <InputLabel>Vergleichsjahr</InputLabel>
              <Select value={compareYear} onChange={(e) => setCompareYear(e.target.value)} label="Vergleichsjahr">
                {availableYears.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {period === 'month' && (
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Vergleichsmonat</InputLabel>
                <Select value={compareMonth} onChange={(e) => setCompareMonth(e.target.value)} label="Vergleichsmonat">
                  {months.map(month => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <ModernButton
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchComparisonData}
              >
                Vergleich laden
              </ModernButton>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderOverviewTab = () => (
    <>
      {/* Übersichtskarten */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EuroIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Gesamtumsatz</Typography>
              </Box>
              <Typography variant="h4">
                {formatCurrency(data.totalRevenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ReceiptIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Offene Rechnungen</Typography>
              </Box>
              <Typography variant="h4">
                {formatCurrency(data.openInvoices)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PaymentIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Bezahlte Rechnungen</Typography>
              </Box>
              <Typography variant="h4">
                {formatCurrency(data.paidInvoices)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalanceIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Durchschnitt</Typography>
              </Box>
              <Typography variant="h4">
                {formatCurrency(data.averageInvoiceAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detaillierte Aufschlüsselung */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Umsatz nach Versicherungstyp
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'GKV', value: data.gkvRevenue },
                      { name: 'Privat', value: data.privateRevenue },
                      { name: 'Zuzahlung', value: data.copayRevenue }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monatliche Entwicklung
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Umsatz" />
                  <Line type="monotone" dataKey="gkv_revenue" stroke="#82ca9d" name="GKV" />
                  <Line type="monotone" dataKey="private_revenue" stroke="#ffc658" name="Privat" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );

  const renderHistoryDialog = () => (
    <Dialog
      open={showHistoryDialog}
      onClose={() => setShowHistoryDialog(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HistoryIcon />
          <Typography variant="h6">Historische Finanzdaten</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Jahresvergleich
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={historicalData.yearlyComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#8884d8" name="Gesamtumsatz" />
                <Line type="monotone" dataKey="averageRevenue" stroke="#ff7300" name="Durchschnitt" />
              </ComposedChart>
            </ResponsiveContainer>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Monatliche Trends
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={historicalData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="gkvRevenue" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                <Area type="monotone" dataKey="privateRevenue" stackId="3" stroke="#ffc658" fill="#ffc658" />
              </AreaChart>
            </ResponsiveContainer>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <ModernButton onClick={() => setShowHistoryDialog(false)}>
          Schließen
        </ModernButton>
        <ModernButton
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExportData}
        >
          Export
        </ModernButton>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      {renderPeriodSelector()}
      {renderComparisonSelector()}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="finance tabs">
          <Tab label="Übersicht" icon={<AssessmentIcon />} />
          <Tab label="Analysen" icon={<AnalyticsIcon />} />
          <Tab label="Trends" icon={<TimelineIcon />} />
          <Tab label="Transaktionen" icon={<ReceiptIcon />} />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} index={0}>
        {renderOverviewTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>
          Detaillierte Analysen
        </Typography>
        {/* Hier können weitere Analysen hinzugefügt werden */}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Typography variant="h6" gutterBottom>
          Trends und Prognosen
        </Typography>
        {/* Hier können Trends und Prognosen hinzugefügt werden */}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Typography variant="h6" gutterBottom>
          Letzte Transaktionen
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Datum</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Behandlung</TableCell>
                <TableCell>Betrag</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.latestTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.created_at)}</TableCell>
                  <TableCell>{transaction.patient_name}</TableCell>
                  <TableCell>{transaction.treatment_name}</TableCell>
                  <TableCell>{formatCurrency(transaction.insurance_amount)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(transaction.status)}
                      color={getStatusColor(transaction.status)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {renderHistoryDialog()}
    </Box>
  );
}

export default FinanceOverview; 