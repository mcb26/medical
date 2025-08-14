import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, Box, Typography, Link } from '@mui/material';
import { Warning as WarningIcon, Error as ErrorIcon } from '@mui/icons-material';

// Link Validator für bessere UX und Fehlerbehandlung
export const LinkValidator = ({ links = [], onBrokenLinksFound }) => {
  const [brokenLinks, setBrokenLinks] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  // Überprüfe Links auf Gültigkeit
  const validateLinks = async () => {
    setIsChecking(true);
    const broken = [];

    for (const link of links) {
      try {
        // Externe Links überprüfen
        if (link.startsWith('http')) {
          const response = await fetch(link, { 
            method: 'HEAD',
            mode: 'no-cors' // Vermeidet CORS-Probleme
          });
          
          if (!response.ok && response.status !== 0) { // 0 = no-cors mode
            broken.push({
              url: link,
              status: response.status,
              type: 'external'
            });
          }
        }
        // Interne Links überprüfen (relative URLs)
        else if (link.startsWith('/')) {
          // Für interne Links prüfen wir, ob die Route existiert
          const routeExists = checkInternalRoute(link);
          if (!routeExists) {
            broken.push({
              url: link,
              status: 404,
              type: 'internal'
            });
          }
        }
      } catch (error) {
        broken.push({
          url: link,
          status: 'error',
          type: 'unknown',
          error: error.message
        });
      }
    }

    setBrokenLinks(broken);
    setIsChecking(false);

    if (broken.length > 0 && onBrokenLinksFound) {
      onBrokenLinksFound(broken);
    }
  };

  // Überprüfe interne Routen
  const checkInternalRoute = (route) => {
    // Liste der bekannten Routen
    const validRoutes = [
      '/',
      '/calendar',
      '/appointments',
      '/patients',
      '/prescriptions',
      '/treatments',
      '/insurance-management',
      '/finance',
      '/billing-cycles',
      '/dataoverview',
      '/practice',
      '/settings',
      '/profile',
      '/admin-panel',
      '/waitlist',
      '/notifications',
      '/login',
      '/register'
    ];

    // Prüfe exakte Übereinstimmung oder Route-Parameter
    return validRoutes.some(validRoute => {
      if (validRoute === route) return true;
      if (route.startsWith(validRoute + '/')) return true;
      return false;
    });
  };

  useEffect(() => {
    if (links.length > 0) {
      validateLinks();
    }
  }, [links]);

  if (brokenLinks.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity="warning" 
        icon={<WarningIcon />}
        sx={{ mb: 2 }}
      >
        <AlertTitle>Broken Links gefunden</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Die folgenden Links funktionieren möglicherweise nicht korrekt:
        </Typography>
        {brokenLinks.map((link, index) => (
          <Box key={index} sx={{ mb: 1, pl: 2 }}>
            <Typography variant="body2" color="error">
              <ErrorIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              {link.url}
              {link.status && ` (Status: ${link.status})`}
            </Typography>
          </Box>
        ))}
      </Alert>
    </Box>
  );
};

// Hook für Link-Validierung
export const useLinkValidation = () => {
  const [brokenLinks, setBrokenLinks] = useState([]);

  const validateLink = async (url) => {
    try {
      if (url.startsWith('http')) {
        const response = await fetch(url, { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        return response.ok || response.status === 0;
      }
      return true; // Interne Links als gültig betrachten
    } catch (error) {
      return false;
    }
  };

  const addBrokenLink = (link) => {
    setBrokenLinks(prev => [...prev, link]);
  };

  const clearBrokenLinks = () => {
    setBrokenLinks([]);
  };

  return {
    brokenLinks,
    validateLink,
    addBrokenLink,
    clearBrokenLinks
  };
};

// Sichere Link-Komponente
export const SafeLink = ({ href, children, ...props }) => {
  const [isValid, setIsValid] = useState(true);
  const { validateLink } = useLinkValidation();

  useEffect(() => {
    if (href) {
      validateLink(href).then(setIsValid);
    }
  }, [href, validateLink]);

  if (!isValid) {
    return (
      <Typography 
        component="span" 
        color="error" 
        sx={{ textDecoration: 'line-through' }}
        {...props}
      >
        {children}
      </Typography>
    );
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
};

export default LinkValidator;
