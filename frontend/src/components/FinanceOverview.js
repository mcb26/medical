import React, { useState, useEffect } from 'react';
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
  TableRow
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../api/axios';

function FinanceOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    totalRevenue: 0,
    openInvoices: 0,
    paidInvoices: 0,
    revenueByMonth: [],
    revenueByInsurance: [],
    revenueByTreatment: [],
    latestTransactions: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/finance/overview/');
        setData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Fehler beim Laden der Finanzdaten');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Finanzübersicht
      </Typography>

      {/* Übersichtskarten */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Gesamtumsatz
              </Typography>
              <Typography variant="h5">
                {data.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Offene Rechnungen
              </Typography>
              <Typography variant="h5">
                {data.openInvoices.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Bezahlte Rechnungen
              </Typography>
              <Typography variant="h5">
                {data.paidInvoices.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Umsatz nach Monaten */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Umsatzentwicklung
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.revenueByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#8884d8" name="Umsatz" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Grid container spacing={3}>
        {/* Umsatz nach Versicherung */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Umsatz nach Versicherung
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.revenueByInsurance}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {data.revenueByInsurance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Umsatz nach Behandlung */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Umsatz nach Behandlungsart
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.revenueByTreatment}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {data.revenueByTreatment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Letzte Transaktionen */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Letzte Transaktionen
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Datum</TableCell>
                <TableCell>Beschreibung</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell align="right">Betrag</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.latestTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString('de-DE')}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{transaction.patient}</TableCell>
                  <TableCell align="right">
                    {transaction.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </TableCell>
                  <TableCell>{transaction.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

export default FinanceOverview; 