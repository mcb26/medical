import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Euro as EuroIcon,
  CalendarToday as CalendarIcon,
  MedicalServices as MedicalIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const PriceManagement = () => {
  const [treatmentTypes, setTreatmentTypes] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [treatmentPrices, setTreatmentPrices] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Dialog states
  const [openPriceListDialog, setOpenPriceListDialog] = useState(false);
  const [openTreatmentPriceDialog, setOpenTreatmentPriceDialog] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState(null);
  const [editingTreatmentPrice, setEditingTreatmentPrice] = useState(null);
  
  // Form states
  const [priceListForm, setPriceListForm] = useState({
    name: '',
    treatment_type: '',
    valid_from: '',
    valid_until: '',
    description: ''
  });
  
  const [treatmentPriceForm, setTreatmentPriceForm] = useState({
    treatment: '',
    price_list: '',
    gkv_price: '',
    copayment_amount: '',
    private_price: '',
    self_pay_price: '',
    notes: ''
  });
  
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [treatmentTypesRes, priceListsRes, treatmentPricesRes, treatmentsRes] = await Promise.all([
        api.get('treatment-types/'),
        api.get('price-lists/'),
        api.get('treatment-prices/'),
        api.get('treatments/')
      ]);

      setTreatmentTypes(treatmentTypesRes.data);
      setPriceLists(priceListsRes.data);
      setTreatmentPrices(treatmentPricesRes.data);
      setTreatments(treatmentsRes.data);
    } catch (err) {
      setError('Fehler beim Laden der Daten: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePriceList = async () => {
    try {
      const response = await api.post('price-lists/', priceListForm);

      if (response && response.status >= 200 && response.status < 300) {
        setSuccess('Preisliste erfolgreich erstellt');
        setOpenPriceListDialog(false);
        resetPriceListForm();
        loadData();
      } else {
        setError('Fehler beim Erstellen: ' + (response?.statusText || 'Unbekannter Fehler'));
      }
    } catch (err) {
      setError('Fehler beim Erstellen der Preisliste: ' + err.message);
    }
  };

  const handleCreateTreatmentPrice = async () => {
    try {
      const response = await api.post('treatment-prices/', treatmentPriceForm);

      if (response && response.status >= 200 && response.status < 300) {
        setSuccess('Behandlungspreis erfolgreich erstellt');
        setOpenTreatmentPriceDialog(false);
        resetTreatmentPriceForm();
        loadData();
      } else {
        setError('Fehler beim Erstellen: ' + (response?.statusText || 'Unbekannter Fehler'));
      }
    } catch (err) {
      setError('Fehler beim Erstellen des Behandlungspreises: ' + err.message);
    }
  };

  const resetPriceListForm = () => {
    setPriceListForm({
      name: '',
      treatment_type: '',
      valid_from: '',
      valid_until: '',
      description: ''
    });
    setEditingPriceList(null);
  };

  const resetTreatmentPriceForm = () => {
    setTreatmentPriceForm({
      treatment: '',
      price_list: '',
      gkv_price: '',
      copayment_amount: '',
      private_price: '',
      self_pay_price: '',
      notes: ''
    });
    setEditingTreatmentPrice(null);
  };

  const getTreatmentTypeName = (typeId) => {
    const type = treatmentTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unbekannt';
  };

  const getTreatmentName = (treatmentId) => {
    const treatment = treatments.find(t => t.id === treatmentId);
    return treatment ? treatment.treatment_name : 'Unbekannt';
  };

  const getPriceListName = (priceListId) => {
    const priceList = priceLists.find(p => p.id === priceListId);
    return priceList ? priceList.name : 'Unbekannt';
  };

  const formatPrice = (price) => {
    return price ? `€${parseFloat(price).toFixed(2)}` : '-';
  };

  const isCurrentlyValid = (validFrom, validUntil) => {
    const today = new Date();
    const from = new Date(validFrom);
    const until = validUntil ? new Date(validUntil) : null;
    
    return from <= today && (!until || until >= today);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Lade Daten...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MoneyIcon /> Preisverwaltung
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Preislisten</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenPriceListDialog(true)}
            >
              Neue Preisliste
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Behandlungstyp</TableCell>
                  <TableCell>Gültig ab</TableCell>
                  <TableCell>Gültig bis</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {priceLists.map((priceList) => (
                  <TableRow key={priceList.id}>
                    <TableCell>{priceList.name}</TableCell>
                    <TableCell>{getTreatmentTypeName(priceList.treatment_type)}</TableCell>
                    <TableCell>
                      {format(new Date(priceList.valid_from), 'dd.MM.yyyy', { locale: de })}
                    </TableCell>
                    <TableCell>
                      {priceList.valid_until 
                        ? format(new Date(priceList.valid_until), 'dd.MM.yyyy', { locale: de })
                        : 'Unbegrenzt'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isCurrentlyValid(priceList.valid_from, priceList.valid_until) ? 'Aktiv' : 'Inaktiv'}
                        color={isCurrentlyValid(priceList.valid_from, priceList.valid_until) ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Bearbeiten">
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Behandlungspreise</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenTreatmentPriceDialog(true)}
            >
              Neuer Behandlungspreis
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Behandlung</TableCell>
                  <TableCell>Preisliste</TableCell>
                  <TableCell>GKV-Preis</TableCell>
                  <TableCell>Zuzahlung</TableCell>
                  <TableCell>Privatpreis</TableCell>
                  <TableCell>Selbstzahler</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {treatmentPrices.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell>{getTreatmentName(price.treatment)}</TableCell>
                    <TableCell>{getPriceListName(price.price_list)}</TableCell>
                    <TableCell>{formatPrice(price.gkv_price)}</TableCell>
                    <TableCell>{formatPrice(price.copayment_amount)}</TableCell>
                    <TableCell>{formatPrice(price.private_price)}</TableCell>
                    <TableCell>{formatPrice(price.self_pay_price)}</TableCell>
                    <TableCell>
                      <Tooltip title="Bearbeiten">
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Preisliste Dialog */}
      <Dialog open={openPriceListDialog} onClose={() => setOpenPriceListDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neue Preisliste</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={priceListForm.name}
                onChange={(e) => setPriceListForm({...priceListForm, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Behandlungstyp</InputLabel>
                <Select
                  value={priceListForm.treatment_type}
                  onChange={(e) => setPriceListForm({...priceListForm, treatment_type: e.target.value})}
                >
                  {treatmentTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Gültig ab"
                type="date"
                value={priceListForm.valid_from}
                onChange={(e) => setPriceListForm({...priceListForm, valid_from: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Gültig bis (optional)"
                type="date"
                value={priceListForm.valid_until}
                onChange={(e) => setPriceListForm({...priceListForm, valid_until: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                multiline
                rows={3}
                value={priceListForm.description}
                onChange={(e) => setPriceListForm({...priceListForm, description: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPriceListDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreatePriceList} variant="contained">Erstellen</Button>
        </DialogActions>
      </Dialog>

      {/* Behandlungspreis Dialog */}
      <Dialog open={openTreatmentPriceDialog} onClose={() => setOpenTreatmentPriceDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neuer Behandlungspreis</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Behandlung</InputLabel>
                <Select
                  value={treatmentPriceForm.treatment}
                  onChange={(e) => setTreatmentPriceForm({...treatmentPriceForm, treatment: e.target.value})}
                >
                  {treatments.map((treatment) => (
                    <MenuItem key={treatment.id} value={treatment.id}>
                      {treatment.treatment_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Preisliste</InputLabel>
                <Select
                  value={treatmentPriceForm.price_list}
                  onChange={(e) => setTreatmentPriceForm({...treatmentPriceForm, price_list: e.target.value})}
                >
                  {priceLists.map((priceList) => (
                    <MenuItem key={priceList.id} value={priceList.id}>
                      {priceList.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle2" color="primary">GKV/LEGS Preise</Typography>
              </Divider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="GKV-Preis (€)"
                type="number"
                value={treatmentPriceForm.gkv_price}
                onChange={(e) => setTreatmentPriceForm({...treatmentPriceForm, gkv_price: e.target.value})}
                InputProps={{
                  startAdornment: <EuroIcon sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Zuzahlung (€)"
                type="number"
                value={treatmentPriceForm.copayment_amount}
                onChange={(e) => setTreatmentPriceForm({...treatmentPriceForm, copayment_amount: e.target.value})}
                InputProps={{
                  startAdornment: <EuroIcon sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle2" color="secondary">Privatleistungen</Typography>
              </Divider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Privatpreis (€)"
                type="number"
                value={treatmentPriceForm.private_price}
                onChange={(e) => setTreatmentPriceForm({...treatmentPriceForm, private_price: e.target.value})}
                InputProps={{
                  startAdornment: <EuroIcon sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Selbstzahler-Preis (€)"
                type="number"
                value={treatmentPriceForm.self_pay_price}
                onChange={(e) => setTreatmentPriceForm({...treatmentPriceForm, self_pay_price: e.target.value})}
                InputProps={{
                  startAdornment: <EuroIcon sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notizen"
                multiline
                rows={3}
                value={treatmentPriceForm.notes}
                onChange={(e) => setTreatmentPriceForm({...treatmentPriceForm, notes: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTreatmentPriceDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreateTreatmentPrice} variant="contained">Erstellen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PriceManagement;
