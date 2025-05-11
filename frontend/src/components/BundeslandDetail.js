import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../api/axios';

function BundeslandDetail() {
  const [bundesland, setBundesland] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bundeslandResponse, holidaysResponse] = await Promise.all([
          api.get(`/bundesland/${id}/`),
          api.get(`/local-holidays/?bundesland=${id}`)
        ]);
        
        setBundesland(bundeslandResponse.data);
        setHolidays(holidaysResponse.data);
        setLoading(false);
      } catch (error) {
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <Typography>Lädt...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!bundesland) return <Typography>Bundesland nicht gefunden</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Bundesland Details
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Name:</strong> {bundesland.name}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography><strong>Kürzel:</strong> {bundesland.abbreviation}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Feiertage
            </Typography>
            {holidays.length > 0 ? (
              <List>
                {holidays.map((holiday, index) => (
                  <React.Fragment key={holiday.id}>
                    <ListItem>
                      <ListItemText
                        primary={holiday.name}
                        secondary={format(new Date(holiday.date), 'dd. MMMM yyyy', { locale: de })}
                      />
                    </ListItem>
                    {index < holidays.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">
                Keine Feiertage eingetragen
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate(`/bundesland/${id}/edit`)}
                sx={{ mr: 1 }}
              >
                Bearbeiten
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/dataoverview')}
                sx={{ mr: 1 }}
              >
                Zurück
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate('/local-holidays/new')}
              >
                Feiertag hinzufügen
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default BundeslandDetail; 