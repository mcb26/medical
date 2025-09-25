import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Checkbox,
  AlertTitle,
  CircularProgress,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  CalendarToday,
  People,
  Assignment,
  Spa,
  Euro,
  Receipt,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import api from '../api/axios';
import { useAdminPermissions } from '../hooks/usePermissions';



// Modul-Icons Mapping
const MODULE_ICONS = {
  appointments: CalendarToday,
  patients: People,
  prescriptions: Assignment,
  treatments: Spa,
  reports: AssessmentIcon,
  finance: Euro,
  billing: Receipt,
  settings: SettingsIcon,
  users: AdminIcon,
};

// Deutsche Modul-Namen
const MODULE_NAMES = {
  appointments: 'Termine',
  patients: 'Patienten',
  prescriptions: 'Verordnungen',
  treatments: 'Behandlungen',
  reports: 'Berichte',
  finance: 'Finanzen',
  billing: 'Abrechnung',
  settings: 'Einstellungen',
  users: 'Benutzer',
};

// Berechtigungslevel mit Farben (logische Hierarchie)
const PERMISSION_LEVELS = {
  none: { label: 'Kein Zugriff', color: 'error', icon: CancelIcon },
  read: { label: 'Nur Lesen', color: 'info', icon: InfoIcon },
  write: { label: 'Lesen & Schreiben', color: 'warning', icon: EditIcon },
  full: { label: 'Voller Zugriff', color: 'success', icon: CheckIcon },
};

// Admin-Panel Komponente
function AdminPanel() {
  const theme = useTheme();
  const { canAccessAdminPanel } = useAdminPermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  const [userDialog, setUserDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkPermissions, setBulkPermissions] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingPermissions, setEditingPermissions] = useState({});

  // Lade Benutzer und Rollen
  useEffect(() => {
    if (canAccessAdminPanel) {
      loadData();
    }
  }, [canAccessAdminPanel]);

  // Prüfe Admin-Berechtigung
  if (!canAccessAdminPanel) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Zugriff verweigert</AlertTitle>
          Sie haben keine Administrator-Berechtigungen für diesen Bereich.
        </Alert>
      </Box>
    );
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const usersResponse = await api.get('/users/');
      setUsers(usersResponse.data);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gefilterte und sortierte Benutzer
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && user.is_active) ||
                           (filterStatus === 'inactive' && !user.is_active);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sortiere nach Namen (Standard)
      const aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
      const bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
      return aValue.localeCompare(bValue);
    });

  // Bulk-Berechtigungen bearbeiten
  const handleBulkEdit = () => {
    if (selectedUsers.length === 0) {
      console.warn('Bitte wählen Sie mindestens einen Benutzer aus');
      return;
    }
    setBulkEditDialog(true);
  };

  // Bulk-Berechtigungen speichern
  const handleSaveBulkPermissions = async () => {
    try {
      const promises = selectedUsers.map(userId => {
        const user = users.find(u => u.id === userId);
        if (!user) return Promise.resolve();
        
        return api.post(`/users/${userId}/bulk_update_permissions/`, {
          permissions: bulkPermissions
        });
      });
      
      await Promise.all(promises);
      console.log(`${selectedUsers.length} Benutzer erfolgreich aktualisiert`);
      setBulkEditDialog(false);
      setSelectedUsers([]);
      setBulkPermissions({});
      loadData();
    } catch (error) {
      console.error('Fehler beim Speichern der Berechtigungen:', error);
    }
  };

  // Admin-Status ändern
  const handleToggleAdmin = async (user) => {
    try {
      await api.patch(`/users/${user.id}/`, {
        is_admin: !user.is_admin
      });
      console.log(`Admin-Status für ${user.first_name} ${user.last_name} geändert`);
      loadData();
    } catch (error) {
      console.error('Fehler beim Ändern des Admin-Status:', error);
    }
  };

  // Therapeut-Status umschalten
  const handleToggleTherapist = async (user) => {
    try {
      await api.patch(`/users/${user.id}/`, {
        is_therapist: !user.is_therapist
      });
      console.log(`Therapeut-Status für ${user.first_name} ${user.last_name} geändert`);
      loadData();
    } catch (error) {
      console.error('Fehler beim Ändern des Therapeut-Status:', error);
    }
  };

  // Benutzer aktivieren/deaktivieren
  const handleToggleStatus = async (user) => {
    try {
      await api.patch(`/users/${user.id}/`, {
        is_active: !user.is_active
      });
      console.log(`Status für ${user.first_name} ${user.last_name} geändert`);
      loadData();
    } catch (error) {
      console.error('Fehler beim Ändern des Status:', error);
    }
  };

  // Alle Benutzer auswählen/abwählen
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Einzelnen Benutzer auswählen/abwählen
  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  // Berechtigung ändern
  const handlePermissionChange = (module, newPermission) => {
    setEditingPermissions(prev => ({
      ...prev,
      [module]: newPermission
    }));
  };

  // Benutzer speichern
  const handleSaveUser = async () => {
    try {
      // Berechtigungen aktualisieren
      const permissions = {};
      Object.keys(editingPermissions).forEach(module => {
        permissions[module] = {
          permission: editingPermissions[module]
        };
      });

      await api.post(`/users/${selectedUser.id}/bulk_update_permissions/`, {
        permissions
      });

      setUserDialog(false);
      loadData(); // Daten neu laden
    } catch (error) {
      console.error('Fehler beim Speichern der Berechtigungen:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <AdminIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Admin-Panel
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Globale Benutzerverwaltung und Berechtigungskontrolle
          </Typography>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Benutzerverwaltung" icon={<PersonIcon />} />
        <Tab label="Bulk-Bearbeitung" icon={<GroupIcon />} />
        <Tab label="Statistiken" icon={<AssessmentIcon />} />
        <Tab label="System-Status" icon={<SettingsIcon />} />
      </Tabs>

      {/* Benutzerverwaltung-Tab */}
      {activeTab === 0 && (
        <Card>
          {/* Toolbar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Benutzer suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              

              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">Alle</MenuItem>
                  <MenuItem value="active">Aktiv</MenuItem>
                  <MenuItem value="inactive">Inaktiv</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadData}
              >
                Aktualisieren
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedUser(null);
                  setUserDialog(true);
                }}
              >
                Neuer Benutzer
              </Button>
            </Box>
          </Box>

          {/* Benutzer-Tabelle */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>Benutzer</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Therapeut</TableCell>
                  <TableCell>Berechtigungen</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} selected={selectedUsers.includes(user.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: user.is_admin ? theme.palette.warning.main : theme.palette.primary.main }}>
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {user.first_name} {user.last_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Aktiv' : 'Inaktiv'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={user.is_admin ? 'Admin-Status entfernen' : 'Als Admin festlegen'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleAdmin(user)}
                          color={user.is_admin ? 'warning' : 'default'}
                        >
                          {user.is_admin ? <StarIcon /> : <StarBorderIcon />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={user.is_therapist ? 'Therapeut-Status entfernen' : 'Als Therapeut festlegen'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleTherapist(user)}
                          color={user.is_therapist ? 'success' : 'default'}
                        >
                          {user.is_therapist ? <Spa /> : <PersonIcon />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {user.effective_permissions && typeof user.effective_permissions === 'object' && 
                         Object.keys(user.effective_permissions).slice(0, 3).map(module => {
                          const perm = user.effective_permissions[module];
                          if (!perm || typeof perm !== 'object') return null;
                          
                          const level = perm?.permission || 'none';
                          const config = PERMISSION_LEVELS[level];
                          if (!config) return null;
                          
                          return (
                            <Tooltip key={module} title={`${module}: ${config.label}`}>
                              <config.icon 
                                sx={{ 
                                  fontSize: 16, 
                                  color: theme.palette[config.color].main 
                                }} 
                              />
                            </Tooltip>
                          );
                        })}
                        {user.effective_permissions && typeof user.effective_permissions === 'object' && 
                         Object.keys(user.effective_permissions).length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{Object.keys(user.effective_permissions).length - 3}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Status ändern">
                          <IconButton
                            size="small"
                            onClick={() => handleToggleStatus(user)}
                            color={user.is_active ? 'error' : 'success'}
                          >
                            {user.is_active ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Berechtigungen bearbeiten">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setUserDialog(true);
                            }}
                            color="primary"
                          >
                            <SecurityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Benutzer bearbeiten">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setUserDialog(true);
                            }}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Bulk-Bearbeitung-Tab */}
      {activeTab === 1 && (
        <Card>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Massenbearbeitung von Benutzern
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Hinweis</AlertTitle>
            Wählen Sie Benutzer aus dem "Benutzerverwaltung"-Tab aus, um sie hier zu bearbeiten.
          </Alert>

          {selectedUsers.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {selectedUsers.length} Benutzer ausgewählt
              </Typography>
              
              <Grid container spacing={3}>
                {Object.entries(MODULE_ICONS).map(([module, iconName]) => (
                  <Grid item xs={12} sm={6} md={4} key={module}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                          {module.charAt(0).toUpperCase() + module.slice(1)}
                        </Typography>
                        
                        <FormControl fullWidth size="small">
                          <InputLabel>Berechtigung</InputLabel>
                          <Select
                            value={bulkPermissions[module]?.permission || 'none'}
                            onChange={(e) => setBulkPermissions(prev => ({
                              ...prev,
                              [module]: { permission: e.target.value }
                            }))}
                            label="Berechtigung"
                          >
                            {Object.entries(PERMISSION_LEVELS).map(([level, config]) => (
                              <MenuItem key={level} value={level}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <config.icon 
                                    sx={{ 
                                      fontSize: 16, 
                                      color: theme.palette[config.color].main 
                                    }} 
                                  />
                                  {config.label}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveBulkPermissions}
                >
                  Berechtigungen anwenden
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSelectedUsers([]);
                    setBulkPermissions({});
                  }}
                >
                  Auswahl löschen
                </Button>
              </Box>
            </Box>
          )}
        </Card>
      )}

      {/* Statistiken-Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Benutzer-Statistiken
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Gesamt Benutzer" 
                    secondary={users.length}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Aktive Benutzer" 
                    secondary={users.filter(u => u.is_active).length}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <AdminIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Administratoren" 
                    secondary={users.filter(u => u.is_admin).length}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <GroupIcon color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Benutzer mit Rollen" 
                    secondary={users.filter(u => u.role).length}
                  />
                </ListItem>
              </List>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Berechtigungs-Statistiken
              </Typography>
              
              <List>
                {Object.entries(MODULE_ICONS).map(([module, iconName]) => {
                  const usersWithAccess = users.filter(user => {
                    const perms = user.effective_permissions?.[module];
                    return perms && perms.permission !== 'none';
                  }).length;
                  
                  return (
                    <ListItem key={module}>
                      <ListItemIcon>
                        <AssessmentIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${module.charAt(0).toUpperCase() + module.slice(1)} Zugriff`}
                        secondary={`${usersWithAccess} von ${users.length} Benutzern`}
                      />
                      <ListItemSecondaryAction>
                        <Typography variant="body2" color="text.secondary">
                          {Math.round((usersWithAccess / users.length) * 100)}%
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* System-Status-Tab */}
      {activeTab === 3 && (
        <Card>
          <Typography variant="h6" sx={{ mb: 2 }}>
            System-Status
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Sicherheitsstatus
                  </Typography>
                  
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Admin-Berechtigungen" 
                        secondary="Aktiv"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <CheckIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Audit-Logging" 
                        secondary="Aktiv"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <CheckIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Berechtigungshierarchie" 
                        secondary="Implementiert"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    System-Informationen
                  </Typography>
                  
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Berechtigungssystem Version" 
                        secondary="2.0.0"
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemText 
                        primary="Verfügbare Module" 
                        secondary={Object.keys(MODULE_ICONS).length}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemText 
                        primary="Berechtigungslevel" 
                        secondary={Object.keys(PERMISSION_LEVELS).length}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Bulk-Bearbeitung Dialog */}
      <Dialog 
        open={bulkEditDialog} 
        onClose={() => setBulkEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon color="primary" />
            <Typography variant="h6">
              Massenbearbeitung für {selectedUsers.length} Benutzer
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Die ausgewählten Berechtigungen werden auf alle markierten Benutzer angewendet.
          </Typography>
          
          <Grid container spacing={2}>
            {Object.entries(MODULE_ICONS).map(([module, iconName]) => {
              const currentPermission = bulkPermissions[module]?.permission || 'none';
              const config = PERMISSION_LEVELS[currentPermission];
              
              return (
                <Grid item xs={12} sm={6} key={module}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <config.icon color="primary" />
                        <Typography variant="subtitle1">
                          {module.charAt(0).toUpperCase() + module.slice(1)}
                        </Typography>
                      </Box>
                      
                      <FormControl fullWidth size="small">
                        <InputLabel>Berechtigung</InputLabel>
                        <Select
                          value={currentPermission}
                          onChange={(e) => setBulkPermissions(prev => ({
                            ...prev,
                            [module]: { permission: e.target.value }
                          }))}
                          label="Berechtigung"
                        >
                          {Object.entries(PERMISSION_LEVELS).map(([level, config]) => (
                            <MenuItem key={level} value={level}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <config.icon 
                                  sx={{ 
                                    fontSize: 16, 
                                    color: theme.palette[config.color].main 
                                  }} 
                                />
                                {config.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setBulkEditDialog(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSaveBulkPermissions} variant="contained">
            Anwenden
          </Button>
        </DialogActions>
      </Dialog>

      {/* User-Bearbeitung Dialog */}
      <Dialog 
        open={userDialog} 
        onClose={() => setUserDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonIcon color="primary" />
            <Typography variant="h6">
              {selectedUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Benutzer-Informationen */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Benutzer-Informationen
              </Typography>
              
              <TextField
                fullWidth
                label="Benutzername"
                value={selectedUser?.username || ''}
                disabled={!!selectedUser}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Vorname"
                value={selectedUser?.first_name || ''}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Nachname"
                value={selectedUser?.last_name || ''}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="E-Mail"
                value={selectedUser?.email || ''}
                sx={{ mb: 2 }}
              />
            </Grid>
            
            {/* Benutzer-Status */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Benutzer-Status
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedUser?.is_admin || false}
                  />
                }
                label="Administrator (alle Berechtigungen)"
                sx={{ mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedUser?.is_active || false}
                  />
                }
                label="Aktiv"
                sx={{ mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedUser?.is_employee || false}
                  />
                }
                label="Mitarbeiter"
                sx={{ mb: 2 }}
              />
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Administrator:</strong> Hat automatisch alle Berechtigungen für alle Module.
                </Typography>
              </Alert>
            </Grid>
            
            {/* Modul-Berechtigungen */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Modul-Berechtigungen
              </Typography>
              
              <Grid container spacing={2}>
                {Object.entries(MODULE_ICONS).map(([module, iconName]) => {
                  const currentPermission = editingPermissions[module] || 'none';
                  const config = PERMISSION_LEVELS[currentPermission];
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={module}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <config.icon color="primary" />
                            <Typography variant="subtitle2">
                              {MODULE_NAMES[module] || module}
                            </Typography>
                          </Box>
                          
                          <FormControl fullWidth size="small">
                            <InputLabel>Berechtigung</InputLabel>
                            <Select
                              value={currentPermission}
                              label="Berechtigung"
                              onChange={(e) => handlePermissionChange(module, e.target.value)}
                            >
                              {Object.entries(PERMISSION_LEVELS).map(([level, config]) => (
                                <MenuItem key={level} value={level}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <config.icon 
                                      sx={{ 
                                        fontSize: 16, 
                                        color: theme.palette[config.color].main 
                                      }} 
                                    />
                                    {config.label}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setUserDialog(false)}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={handleSaveUser}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Speed Dial für schnelle Aktionen */}
      <SpeedDial
        ariaLabel="Admin-Aktionen"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<RefreshIcon />}
          tooltipTitle="Daten aktualisieren"
          onClick={loadData}
        />
        <SpeedDialAction
          icon={<AddIcon />}
          tooltipTitle="Neuer Benutzer"
          onClick={() => {
            setSelectedUser(null);
            setUserDialog(true);
          }}
        />
        <SpeedDialAction
          icon={<SecurityIcon />}
          tooltipTitle="Bulk-Bearbeitung"
          onClick={handleBulkEdit}
        />
      </SpeedDial>
    </Box>
  );
}

export default AdminPanel; 