import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import { Menu as MenuIcon, AccountCircle as AccountIcon, Settings as SettingsIcon, ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon, Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import './header.css';

function HeaderBar({ toggleDrawer, title, showAddIcon }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <AppBar 
      position="fixed"
      style={{ backgroundColor: '#333' }}
    >
      <Toolbar>
        <IconButton 
          edge="start" 
          color="inherit" 
          aria-label="menu" 
          onClick={toggleDrawer}
          sx={{ marginRight: 5 }} 
        >
          <MenuIcon />
        </IconButton>

        <IconButton 
          edge="start" 
          color="inherit" 
          aria-label="back" 
          onClick={() => navigate(-1)}
        >
          <ArrowBackIcon />
        </IconButton>

        <IconButton 
          edge="start" 
          color="inherit" 
          aria-label="forward" 
          onClick={() => navigate(+1)}
        >
          <ArrowForwardIcon />
        </IconButton>

        {/* Refresh Button */}
        <IconButton
          color="inherit"
          onClick={handleRefresh}
        >
          <RefreshIcon />
        </IconButton>

        {/* Add icon conditionally rendered */}
        {showAddIcon && (
          <IconButton
            color="inherit"
            onClick={() => {
              if (title === "Patienten") {
                navigate("/patients/new");
              } else if (title === "Verordnungen") {
                navigate("/prescriptions/new");
              } else if (title === "Heilmittel") {
                navigate("/treatments/new");
              } else if (title === "Kalender") {
                navigate("/appointments/new");
              }
            }}
          >
            <AddIcon />
          </IconButton>
        )}

        <Typography 
          variant="h6" 
          noWrap 
          component="div"
          sx={{ flexGrow: 1, textAlign: 'center' }}
        >
          {title || 'MediCal'}
        </Typography>

        

        

        {/* Profile Icon with Hover Menu */}
        <IconButton
          color="inherit"
          onMouseEnter={handleMenuOpen} 
          aria-controls="profile-menu"
          aria-haspopup="true"
        >
          <AccountIcon />
        </IconButton>

        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          MenuListProps={{
            onMouseLeave: handleMenuClose,
          }}
        >
          <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>
            Profil
          </MenuItem>
          <MenuItem component={Link} to="/settings" onClick={handleMenuClose}>
            Einstellungen
          </MenuItem>
          <MenuItem component={Link} to="/login" onClick={handleMenuClose}>
            Login
          </MenuItem>
          <MenuItem component={Link} to="/login" onClick={handleMenuClose}>
            Logout
          </MenuItem>
        </Menu>

        <IconButton 
          color="inherit"
          component={Link}
          to="/settings" 
          sx={{ marginRight: 2 }}
        >
          <SettingsIcon />
        </IconButton>

      </Toolbar>
    </AppBar>
  );
}

export default HeaderBar;
