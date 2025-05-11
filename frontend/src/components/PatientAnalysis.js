import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';

function PatientAnalysis() {
  const [demographics, setDemographics] = useState({});
  const [treatmentStats, setTreatmentStats] = useState({});
  const [appointmentStats, setAppointmentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Unauthorized: No access token found.');
      setLoading(false);
      return;
    }

    const api = axios.create({
      baseURL: 'http://localhost:8000/api/',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    try {
      const [demographicsRes, treatmentStatsRes, appointmentStatsRes] = await Promise.all([
        api.get('patients/demographics/'),
        api.get('treatments/stats/'),
        api.get('appointments/stats/'),
      ]);

      setDemographics(demographicsRes.data);
      setTreatmentStats(treatmentStatsRes.data);
      setAppointmentStats(appointmentStatsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to load data. ${err.response?.statusText || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', marginTop: 5 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading patient analysis...</Typography>
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
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Patient Analysis
      </Typography>

      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h6">Demographics Overview</Typography>
        <Typography variant="body1">
          Average Age: {demographics.average_age || 'N/A'} <br />
          Gender Ratio: {demographics.gender_ratio || 'N/A'} <br />
          Most Common Conditions: {demographics.common_conditions?.join(', ') || 'N/A'}
        </Typography>
      </Paper>

      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h6">Treatment Effectiveness</Typography>
        <Typography variant="body1">
          Success Rate: {treatmentStats.success_rate || 'N/A'}% <br />
          Common Treatments: {treatmentStats.common_treatments?.join(', ') || 'N/A'} <br />
          Average Treatment Duration: {treatmentStats.avg_duration || 'N/A'} months
        </Typography>
      </Paper>

      <Paper sx={{ padding: 2 }}>
        <Typography variant="h6">Appointment Statistics</Typography>
        <Typography variant="body1">
          Average Appointments per Patient: {appointmentStats.avg_appointments || 'N/A'} <br />
          No-Show Rate: {appointmentStats.no_show_rate || 'N/A'}% <br />
          Appointment Satisfaction: {appointmentStats.satisfaction_rate || 'N/A'}% positive feedback
        </Typography>
      </Paper>
    </Box>
  );
}

export default PatientAnalysis;
