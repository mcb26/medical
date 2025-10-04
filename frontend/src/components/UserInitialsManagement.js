import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import api from '../api/axios';

const UserInitialsManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editInitials, setEditInitials] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user-initials/');
      setUsers(response.data);
    } catch (err) {
      setError('Fehler beim Laden der Benutzer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditInitials(user.initials || '');
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      await api.patch(`/user-initials/${editingUser.id}/`, {
        initials: editInitials
      });
      
      setSuccess(`Kürzel für ${editingUser.username} erfolgreich aktualisiert`);
      setOpenDialog(false);
      setEditingUser(null);
      setEditInitials('');
      loadUsers();
    } catch (err) {
      setError('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleCancel = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setEditInitials('');
  };

  const getInitialsDisplay = (user) => {
    if (user.initials) {
      return (
        <Chip 
          label={user.initials} 
          color="primary" 
          size="small"
          icon={<PersonIcon />}
        />
      );
    }
    return (
      <Chip 
        label="Nicht gesetzt" 
        color="default" 
        size="small"
        variant="outlined"
      />
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Lade Benutzer...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon /> Benutzer-Kürzel verwalten
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Hier können Sie Kürzel für alle Benutzer festlegen. Diese werden in der Änderungshistorie angezeigt.
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

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Benutzername</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aktuelles Kürzel</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.is_active ? 'Aktiv' : 'Inaktiv'} 
                        color={user.is_active ? 'success' : 'default'} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {getInitialsDisplay(user)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Kürzel bearbeiten">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEdit(user)}
                          disabled={!user.is_active}
                        >
                          <EditIcon />
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

      {/* Bearbeitungs-Dialog */}
      <Dialog open={openDialog} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          Kürzel bearbeiten für {editingUser?.username}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Kürzel"
              value={editInitials}
              onChange={(e) => setEditInitials(e.target.value)}
              placeholder="z.B. MJ für Max Mustermann"
              helperText="Kürzel für die Änderungshistorie (max. 10 Zeichen)"
              inputProps={{ maxLength: 10 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<CancelIcon />}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!editInitials.trim()}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserInitialsManagement;


