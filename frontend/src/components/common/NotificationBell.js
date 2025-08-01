import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton as MuiIconButton
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsNone as NotificationsNoneIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Euro as EuroIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import notificationService, { NOTIFICATION_TYPES, NOTIFICATION_STATUS } from '../../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // Listener für Benachrichtigungsänderungen
    const unsubscribe = notificationService.addListener((newNotifications, newUnreadCount) => {
      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
    });

    // Initial laden
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadCount());

    return unsubscribe;
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    // Als gelesen markieren
    notificationService.markAsRead(notification.id);
    
    // Zur entsprechenden Seite navigieren
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    
    handleClose();
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleDeleteNotification = (event, notificationId) => {
    event.stopPropagation();
    notificationService.deleteNotification(notificationId);
  };

  const getNotificationIcon = (type, priority) => {
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

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Benachrichtigungen">
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{ 
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.75rem',
                height: '18px',
                minWidth: '18px',
              }
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsActiveIcon />
            ) : (
              <NotificationsNoneIcon />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: isMobile ? '90vw' : 400,
            maxHeight: 500,
            mt: 1,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Benachrichtigungen
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                sx={{ textTransform: 'none' }}
              >
                Alle als gelesen markieren
              </Button>
            )}
          </Box>
          {unreadCount > 0 && (
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
              {unreadCount} ungelesene Benachrichtigung{unreadCount !== 1 ? 'en' : ''}
            </Typography>
          )}
        </Box>

        {/* Benachrichtigungen */}
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <NotificationsNoneIcon sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Keine Benachrichtigungen
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.slice(0, 10).map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      backgroundColor: notification.status === NOTIFICATION_STATUS.UNREAD 
                        ? theme.palette.primary[50] 
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: notification.status === NOTIFICATION_STATUS.UNREAD 
                          ? theme.palette.primary[100] 
                          : theme.palette.action.hover,
                      },
                      py: 1.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getNotificationIcon(notification.type, notification.priority)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body2" 
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
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 0.5 }}>
                            {notification.message}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTimeIcon sx={{ fontSize: 12, color: theme.palette.text.disabled }} />
                            <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
                              {formatTimestamp(notification.timestamp)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <MuiIconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                        sx={{ color: theme.palette.text.disabled }}
                      >
                        <DeleteIcon fontSize="small" />
                      </MuiIconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < notifications.length - 1 && (
                    <Divider variant="inset" component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => {
                navigate('/notifications');
                handleClose();
              }}
              sx={{ textTransform: 'none' }}
            >
              Alle Benachrichtigungen anzeigen
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell; 