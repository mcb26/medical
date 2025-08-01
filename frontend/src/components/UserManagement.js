import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  Divider,
  Tooltip,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Spa as SpaIcon,
  Assessment as AssessmentIcon,
  Euro as EuroIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import api from '../api/axios';
import { useToast } from '../hooks/useToast';
import ModernButton from './common/ModernButton';
import ModernCard from './common/ModernCard';
import LoadingOverlay from './common/LoadingOverlay';
import Breadcrumbs from './common/Breadcrumbs';

// Modul-Icons Mapping
const MODULE_ICONS = {
  appointments: CalendarIcon,
  patients: PeopleIcon,
  prescriptions: AssignmentIcon,
  treatments: SpaIcon,
  reports: AssessmentIcon,
  finance: EuroIcon,
  billing: ReceiptIcon,
  settings: SettingsIcon,
  users: AdminIcon,
};

// Berechtigungslevel mit Farben
const PERMISSION_LEVELS = {
  none: { label: 'Kein Zugriff', color: 'error', icon: CancelIcon },
  read: { label: 'Nur Lesen', color: 'info', icon: InfoIcon },
  create: { label: 'Erstellen', color: 'warning', icon: AddIcon },
  update: { label: 'Bearbeiten', color: 'primary', icon: EditIcon },
  delete: { label: 'Löschen', color: 'secondary', icon: DeleteIcon },
  full: { label: 'Voller Zugriff', color: 'success', icon: CheckIcon },
};

function UserManagement() {
  const theme = useTheme();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [userDialog, setUserDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [editingPermissions, setEditingPermissions] = useState({});

  // Lade Benutzer und Rollen
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        api.get('/users/'),
        api.get('/user-roles/')
      ]);
      setUsers(usersResponse.data);
      setRoles(rolesResponse.data);
    } catch (error) {
      showToast('Fehler beim Laden der Daten', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Berechtigungen für einen Benutzer bearbeiten
  const handleEditPermissions = (user) => {
    setSelectedUser(user);
    setEditingPermissions(user.effective_permissions || {});
    setPermissionDialog(true);
  };

  // Berechtigungen speichern
  const handleSavePermissions = async () => {
    try {
      const permissions = {};
      Object.keys(editingPermissions).forEach(module => {
        permissions[module] = {
          permission: editingPermissions[module].permission || 'none'
        };
      });

      await api.post(`/users/${selectedUser.id}/bulk_update_permissions/`, {
        permissions
      });

      showToast('Berechtigungen erfolgreich aktualisiert', 'success');
      setPermissionDialog(false);
      loadData(); // Daten neu laden
    } catch (error) {
      showToast('Fehler beim Speichern der Berechtigungen', 'error');
    }
  };

  // Berechtigungslevel ändern
  const handlePermissionChange = (module, newPermission) => {
    setEditingPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        permission: newPermission
      }
    }));
  };

  // Benutzer bearbeiten
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserDialog(true);
  };

  // Benutzer speichern
  const handleSaveUser = async (userData) => {
    try {
      if (selectedUser) {
        await api.patch(`/users/${selectedUser.id}/`, userData);
        showToast('Benutzer erfolgreich aktualisiert', 'success');
      } else {
        await api.post('/users/', userData);
        showToast('Benutzer erfolgreich erstellt', 'success');
      }
      setUserDialog(false);
      loadData();
    } catch (error) {
      showToast('Fehler beim Speichern des Benutzers', 'error');
    }
  };

  // Berechtigungsstatus anzeigen
  const getPermissionStatus = (permissions, module) => {
    if (!permissions || !permissions[module]) {
      return { level: 'none', color: 'error', label: 'Kein Zugriff' };
    }
    
    const perm = permissions[module];
    const level = perm.permission || 'none';
    return {
      level,
      ...PERMISSION_LEVELS[level]
    };
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs 
        items={[
          { label: 'Dashboard', path: '/' },
          { label: 'Benutzerverwaltung', path: '/user-management' }
        ]}
      />

      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Benutzerverwaltung
      </Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Benutzer" icon={<PersonIcon />} />
        <Tab label="Rollen" icon={<GroupIcon />} />
        <Tab label="Berechtigungen" icon={<SecurityIcon />} />
      </Tabs>

      {/* Benutzer-Tab */}
      {activeTab === 0 && (
        <ModernCard>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Benutzer ({users.length})</Typography>
            <ModernButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedUser(null);
                setUserDialog(true);
              }}
            >
              Neuer Benutzer
            </ModernButton>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Benutzer</TableCell>
                  <TableCell>Rolle</TableCell>
                  <TableCell>Abteilung</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Berechtigungen</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
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
                      {user.role ? (
                        <Chip 
                          label={user.role.name} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Keine Rolle
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.department || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Aktiv' : 'Inaktiv'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Object.keys(user.effective_permissions || {}).slice(0, 3).map(module => {
                          const status = getPermissionStatus(user.effective_permissions, module);
                          const IconComponent = MODULE_ICONS[module];
                          return (
                            <Tooltip key={module} title={`${module}: ${status.label}`}>
                              <IconComponent 
                                sx={{ 
                                  fontSize: 16, 
                                  color: theme.palette[status.color].main 
                                }} 
                              />
                            </Tooltip>
                          );
                        })}
                        {Object.keys(user.effective_permissions || {}).length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{Object.keys(user.effective_permissions || {}).length - 3}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Berechtigungen bearbeiten">
                          <IconButton
                            size="small"
                            onClick={() => handleEditPermissions(user)}
                            color="primary"
                          >
                            <SecurityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Benutzer bearbeiten">
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
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
        </ModernCard>
      )}

      {/* Rollen-Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {roles.map((role) => (
            <Grid item xs={12} md={6} lg={4} key={role.id}>
              <ModernCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                      <GroupIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{role.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {role.description || 'Keine Beschreibung'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={role.is_active ? 'Aktiv' : 'Inaktiv'}
                      color={role.is_active ? 'success' : 'error'}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(role.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </ModernCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Berechtigungen-Tab */}
      {activeTab === 2 && (
        <ModernCard>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Modul-Berechtigungen
          </Typography>
          
          <Grid container spacing={2}>
            {Object.entries(MODULE_ICONS).map(([module, IconComponent]) => (
              <Grid item xs={12} sm={6} md={4} key={module}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <IconComponent color="primary" />
                      <Typography variant="subtitle1">
                        {module.charAt(0).toUpperCase() + module.slice(1)}
                      </Typography>
                    </Box>
                    
                    <List dense>
                      {Object.entries(PERMISSION_LEVELS).map(([level, config]) => (
                        <ListItem key={level} sx={{ py: 0.5 }}>
                          <ListItemIcon>
                            <config.icon 
                              sx={{ 
                                fontSize: 16, 
                                color: theme.palette[config.color].main 
                              }} 
                            />
                          </ListItemIcon>
                          <ListItemText 
                            primary={config.label}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </ModernCard>
      )}

      {/* Berechtigungs-Dialog */}
      <Dialog 
        open={permissionDialog} 
        onClose={() => setPermissionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon color="primary" />
            <Typography variant="h6">
              Berechtigungen für {selectedUser?.first_name} {selectedUser?.last_name}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2}>
            {Object.entries(MODULE_ICONS).map(([module, IconComponent]) => {
              const currentPermission = editingPermissions[module]?.permission || 'none';
              const config = PERMISSION_LEVELS[currentPermission];
              
              return (
                <Grid item xs={12} sm={6} key={module}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <IconComponent color="primary" />
                        <Typography variant="subtitle1">
                          {module.charAt(0).toUpperCase() + module.slice(1)}
                        </Typography>
                      </Box>
                      
                      <FormControl fullWidth size="small">
                        <InputLabel>Berechtigung</InputLabel>
                        <Select
                          value={currentPermission}
                          onChange={(e) => handlePermissionChange(module, e.target.value)}
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
          <Button onClick={() => setPermissionDialog(false)}>
            Abbrechen
          </Button>
          <ModernButton onClick={handleSavePermissions} variant="contained">
            Speichern
          </ModernButton>
        </DialogActions>
      </Dialog>

      {/* Benutzer-Dialog */}
      <Dialog 
        open={userDialog} 
        onClose={() => setUserDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Benutzer-Details bearbeiten
          </Typography>
          {/* Hier würde das Benutzer-Formular stehen */}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setUserDialog(false)}>
            Abbrechen
          </Button>
          <ModernButton variant="contained">
            Speichern
          </ModernButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserManagement; 