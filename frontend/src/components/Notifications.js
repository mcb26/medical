import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  IconButton,
  Button,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Euro as EuroIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import notificationService, { NOTIFICATION_TYPES, NOTIFICATION_STATUS } from '../services/notificationService';
import ModernButton from './common/ModernButton';
import ModernCard, { CardSection } from './common/ModernCard';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNotification, setNewNotification] = useState({
    type: NOTIFICATION_TYPES.SYSTEM,
    title: '',
    message: '',
    priority: 'medium'
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const unsubscribe = notificationService.addListener((newNotifications, newUnreadCount) => {
      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
    });

    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadCount());

    return unsubscribe;
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleMarkAsRead = (notificationId) => {
    notificationService.markAsRead(notificationId);
    showSnackbar('Benachrichtigung als gelesen markiert', 'success');
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    showSnackbar('Alle Benachrichtigungen als gelesen markiert', 'success');
  };

  const handleDeleteNotification = (notificationId) => {
    notificationService.deleteNotification(notificationId);
    showSnackbar('Benachrichtigung gelöscht', 'success');
  };

  const handleAddNotification = () => {
    if (newNotification.title && newNotification.message) {
      notificationService.addNotification(newNotification);
      setNewNotification({
        type: NOTIFICATION_TYPES.SYSTEM,
        title: '',
        message: '',
        priority: 'medium'
      });
      setShowAddDialog(false);
      showSnackbar('Benachrichtigung hinzugefügt', 'success');
    }
  };

  const handleResetToDemo = () => {
    notificationService.resetToDemo();
    showSnackbar('Benachrichtigungen auf Demo-Daten zurückgesetzt', 'info');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getNotificationIcon = (type) => {
    const iconProps = { fontSize: 'small' };
    
    switch (type) {
      case NOTIFICATION_TYPES.APPOINTMENT:
        return <EventIcon {...iconProps} color="primary" />;
      case NOTIFICATION_TYPES.PRESCRIPTION:
        return <AssignmentIcon {...iconProps} color="warning" />;
      case NOTIFICATION_TYPES.PATIENT:
        return <PersonIcon {...iconProps} color="success" />;
      case NOTIFICATION_TYPES.FINANCE:
        return <EuroIcon {...iconProps} color="info" />;
      case NOTIFICATION_TYPES.SYSTEM:
        return <SettingsIcon {...iconProps} color="secondary" />;
      case NOTIFICATION_TYPES.URGENT:
        return <WarningIcon {...iconProps} color="error" />;
      default:
        return <NotificationsIcon {...iconProps} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true, 
        locale: de 
      });
    } catch {
      return 'Unbekannt';
    }
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;

    // Tab-Filter
    if (activeTab === 0) {
      filtered = filtered.filter(n => n.status === NOTIFICATION_STATUS.UNREAD);
    } else if (activeTab === 1) {
      filtered = filtered.filter(n => n.status === NOTIFICATION_STATUS.READ);
    }

    // Typ-Filter
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Prioritäts-Filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === filterPriority);
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();

  const tabLabels = [
    `Ungelesen (${notifications.filter(n => n.status === NOTIFICATION_STATUS.UNREAD).length})`,
    `Gelesen (${notifications.filter(n => n.status === NOTIFICATION_STATUS.READ).length})`,
    `Alle (${notifications.length})`
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
      py: { xs: 2, sm: 3 }
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Benachrichtigungen
          </Typography>
          <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
            Verwalten Sie Ihre Benachrichtigungen und bleiben Sie über wichtige Ereignisse informiert
          </Typography>
        </Box>

        {/* Statistics Cards */}
        <CardSection title="Übersicht">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <ModernCard variant="info" sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                {notifications.length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Gesamt
              </Typography>
            </ModernCard>
            
            <ModernCard variant="error" sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                {unreadCount}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Ungelesen
              </Typography>
            </ModernCard>
            
            <ModernCard variant="success" sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                {notifications.filter(n => n.priority === 'high').length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Hoch priorisiert
              </Typography>
            </ModernCard>
            
            <ModernCard variant="warning" sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                {notifications.filter(n => n.type === NOTIFICATION_TYPES.APPOINTMENT).length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Termine
              </Typography>
            </ModernCard>
          </Box>
        </CardSection>

        {/* Actions */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <ModernButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            Neue Benachrichtigung
          </ModernButton>
          
          {unreadCount > 0 && (
            <ModernButton
              variant="outlined"
              startIcon={<CheckCircleIcon />}
              onClick={handleMarkAllAsRead}
            >
              Alle als gelesen markieren
            </ModernButton>
          )}
          
          <ModernButton
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleResetToDemo}
          >
            Demo-Daten zurücksetzen
          </ModernButton>
        </Box>

        {/* Filters */}
        <ModernCard variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FilterIcon color="action" />
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Typ</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Typ"
                >
                  <MenuItem value="all">Alle Typen</MenuItem>
                  <MenuItem value={NOTIFICATION_TYPES.APPOINTMENT}>Termine</MenuItem>
                  <MenuItem value={NOTIFICATION_TYPES.PRESCRIPTION}>Verordnungen</MenuItem>
                  <MenuItem value={NOTIFICATION_TYPES.PATIENT}>Patienten</MenuItem>
                  <MenuItem value={NOTIFICATION_TYPES.FINANCE}>Finanzen</MenuItem>
                  <MenuItem value={NOTIFICATION_TYPES.SYSTEM}>System</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Priorität</InputLabel>
                <Select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  label="Priorität"
                >
                  <MenuItem value="all">Alle Prioritäten</MenuItem>
                  <MenuItem value="high">Hoch</MenuItem>
                  <MenuItem value="medium">Mittel</MenuItem>
                  <MenuItem value="low">Niedrig</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </ModernCard>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
          >
            {tabLabels.map((label, index) => (
              <Tab key={index} label={label} />
            ))}
          </Tabs>
        </Box>

        {/* Notifications List */}
        <ModernCard variant="elevated">
          <CardContent sx={{ p: 0 }}>
            {filteredNotifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <NotificationsIcon sx={{ fontSize: 64, color: theme.palette.text.secondary, mb: 2 }} />
                <Typography variant="h6" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                  Keine Benachrichtigungen
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  {activeTab === 0 ? 'Keine ungelesenen Benachrichtigungen' : 
                   activeTab === 1 ? 'Keine gelesenen Benachrichtigungen' : 
                   'Keine Benachrichtigungen vorhanden'}
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredNotifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      sx={{
                        backgroundColor: notification.status === NOTIFICATION_STATUS.UNREAD 
                          ? theme.palette.primary[50] 
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: notification.status === NOTIFICATION_STATUS.UNREAD 
                            ? theme.palette.primary[100] 
                            : theme.palette.action.hover,
                        },
                        py: 2,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 48 }}>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: notification.status === NOTIFICATION_STATUS.UNREAD ? 600 : 400,
                                flex: 1
                              }}
                            >
                              {notification.title}
                            </Typography>
                            <Chip
                              label={notification.priority}
                              size="small"
                              color={getPriorityColor(notification.priority)}
                              variant="outlined"
                            />
                            <Chip
                              label={notification.type}
                              size="small"
                              variant="outlined"
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                              {notification.message}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTimeIcon sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
                              <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
                                {formatTimestamp(notification.timestamp)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {notification.status === NOTIFICATION_STATUS.UNREAD && (
                            <IconButton
                              size="small"
                              onClick={() => handleMarkAsRead(notification.id)}
                              sx={{ color: theme.palette.success.main }}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteNotification(notification.id)}
                            sx={{ color: theme.palette.error.main }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    {index < filteredNotifications.length - 1 && (
                      <Divider variant="inset" component="li" />
                    )}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </ModernCard>
      </Container>

      {/* Add Notification Dialog */}
      <Dialog 
        open={showAddDialog} 
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Neue Benachrichtigung erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Typ</InputLabel>
              <Select
                value={newNotification.type}
                onChange={(e) => setNewNotification({...newNotification, type: e.target.value})}
                label="Typ"
              >
                <MenuItem value={NOTIFICATION_TYPES.APPOINTMENT}>Termin</MenuItem>
                <MenuItem value={NOTIFICATION_TYPES.PRESCRIPTION}>Verordnung</MenuItem>
                <MenuItem value={NOTIFICATION_TYPES.PATIENT}>Patient</MenuItem>
                <MenuItem value={NOTIFICATION_TYPES.FINANCE}>Finanzen</MenuItem>
                <MenuItem value={NOTIFICATION_TYPES.SYSTEM}>System</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Titel"
              value={newNotification.title}
              onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
              fullWidth
              required
            />
            
            <TextField
              label="Nachricht"
              value={newNotification.message}
              onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
              fullWidth
              multiline
              rows={3}
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>Priorität</InputLabel>
              <Select
                value={newNotification.priority}
                onChange={(e) => setNewNotification({...newNotification, priority: e.target.value})}
                label="Priorität"
              >
                <MenuItem value="low">Niedrig</MenuItem>
                <MenuItem value="medium">Mittel</MenuItem>
                <MenuItem value="high">Hoch</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={handleAddNotification}
            variant="contained"
            disabled={!newNotification.title || !newNotification.message}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Notifications; 