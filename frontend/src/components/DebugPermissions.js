import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import { usePermissions, useAdminPermissions } from '../hooks/usePermissions';
import { updatePermissions } from '../services/auth';

function DebugPermissions() {
  const { permissions, user, loading, reloadPermissions } = usePermissions();
  const { canAccessAdminPanel, isAdmin } = useAdminPermissions();
  const [showDetails, setShowDetails] = useState(false);

  const handleRefresh = () => {
    reloadPermissions();
  };

  const handleUpdatePermissions = () => {
    updatePermissions();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Lade Berechtigungen...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          🔧 Debug: Berechtigungen
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Benutzer:</strong> {user?.username || 'Unbekannt'} 
          {isAdmin && <Chip label="Admin" color="success" size="small" sx={{ ml: 1 }} />}
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Admin-Panel Zugriff:</Typography>
          <Chip 
            label={canAccessAdminPanel ? "✅ Verfügbar" : "❌ Nicht verfügbar"} 
            color={canAccessAdminPanel ? "success" : "error"}
            sx={{ mr: 1 }}
          />
          <Chip 
            label={isAdmin ? "Admin" : "Kein Admin"} 
            color={isAdmin ? "success" : "default"}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            Berechtigungen neu laden
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleUpdatePermissions}
            sx={{ mr: 1 }}
          >
            Update Event senden
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Details verstecken" : "Details anzeigen"}
          </Button>
        </Box>

        {showDetails && (
          <Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              Alle Berechtigungen:
            </Typography>
            <List dense>
              {Object.entries(permissions).map(([module, perm]) => (
                <ListItem key={module}>
                  <ListItemText 
                    primary={module}
                    secondary={`Level: ${perm.permission || 'none'}`}
                  />
                  <Chip 
                    label={perm.permission || 'none'} 
                    color={
                      perm.permission === 'full' ? 'success' :
                      perm.permission === 'read' ? 'info' :
                      perm.permission === 'none' ? 'error' : 'default'
                    }
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default DebugPermissions; 