import React, { useState, useEffect } from 'react';
import { Avatar, useTheme } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { getUserInitials, getUserFullName } from '../../services/auth';

const UserAvatar = ({ 
  size = 'medium', 
  showTooltip = true, 
  sx = {}, 
  onClick,
  variant = 'default'
}) => {
  const [userInitials, setUserInitials] = useState('U');
  const [userFullName, setUserFullName] = useState('Unbekannter Benutzer');
  const theme = useTheme();

  useEffect(() => {
    const loadUserInfo = () => {
      const initials = getUserInitials();
      const fullName = getUserFullName();
      setUserInitials(initials);
      setUserFullName(fullName);
    };

    loadUserInfo();
    
    // Event Listener für Storage-Änderungen
    const handleStorageChange = (e) => {
      if (e.key === 'userProfile') {
        loadUserInfo();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Größen-Definitionen
  const sizeMap = {
    small: { width: 32, height: 32, fontSize: '0.75rem' },
    medium: { width: 40, height: 40, fontSize: '0.875rem' },
    large: { width: 56, height: 56, fontSize: '1.25rem' },
    xlarge: { width: 80, height: 80, fontSize: '1.5rem' }
  };

  // Variant-Styles
  const variantStyles = {
    default: {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
    header: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
    },
    sidebar: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
    },
    card: {
      backgroundColor: theme.palette.grey[200],
      color: theme.palette.grey[700],
    },
    success: {
      backgroundColor: theme.palette.success.main,
      color: theme.palette.success.contrastText,
    },
    warning: {
      backgroundColor: theme.palette.warning.main,
      color: theme.palette.warning.contrastText,
    },
    error: {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
    },
    info: {
      backgroundColor: theme.palette.info.main,
      color: theme.palette.info.contrastText,
    }
  };

  const currentSize = sizeMap[size] || sizeMap.medium;
  const currentVariant = variantStyles[variant] || variantStyles.default;

  return (
    <Avatar
      onClick={onClick}
      sx={{
        ...currentSize,
        ...currentVariant,
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'scale(1.05)',
          boxShadow: theme.shadows[4],
        } : {},
        ...sx,
      }}
      title={showTooltip ? userFullName : undefined}
    >
      {userInitials || <PersonIcon />}
    </Avatar>
  );
};

export default UserAvatar; 