import React from 'react';
import {
  Box,
  Typography,
  Container,
  useTheme,
  useMediaQuery,
  Link,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

function FooterBar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        backgroundColor: theme.palette.grey[100],
        borderTop: `1px solid ${theme.palette.divider}`,
        mt: 'auto'
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'center', md: 'flex-start' },
          gap: 2
        }}>
          {/* Left Section - Company Info */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <BusinessIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                MediCal
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
              Professionelle Praxisverwaltung
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Version 2.0.0 • © {currentYear} MediCal. Alle Rechte vorbehalten.
            </Typography>
          </Box>

          {/* Center Section - Quick Links */}
          {!isMobile && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>
                Schnellzugriff
              </Typography>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Link href="/patients" sx={{ color: theme.palette.text.secondary, textDecoration: 'none', '&:hover': { color: theme.palette.primary.main } }}>
                  Patienten
                </Link>
                <Link href="/appointments" sx={{ color: theme.palette.text.secondary, textDecoration: 'none', '&:hover': { color: theme.palette.primary.main } }}>
                  Termine
                </Link>
                <Link href="/prescriptions" sx={{ color: theme.palette.text.secondary, textDecoration: 'none', '&:hover': { color: theme.palette.primary.main } }}>
                  Verordnungen
                </Link>
                <Link href="/finance" sx={{ color: theme.palette.text.secondary, textDecoration: 'none', '&:hover': { color: theme.palette.primary.main } }}>
                  Finanzen
                </Link>
              </Box>
            </Box>
          )}

          {/* Right Section - Contact & Social */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'center', md: 'flex-end' },
            gap: 1
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              Kontakt & Support
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="E-Mail Support">
                <IconButton
                  size="small"
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': { color: theme.palette.primary.main }
                  }}
                >
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Telefon Support">
                <IconButton
                  size="small"
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': { color: theme.palette.primary.main }
                  }}
                >
                  <PhoneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="GitHub Repository">
                <IconButton
                  size="small"
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': { color: theme.palette.primary.main }
                  }}
                >
                  <GitHubIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              support@medical-app.de
            </Typography>
          </Box>
        </Box>

        {/* Mobile Quick Links */}
        {isMobile && (
          <Box sx={{
            mt: 3,
            pt: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            textAlign: 'center'
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>
              Schnellzugriff
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Link href="/patients" sx={{ color: theme.palette.text.secondary, textDecoration: 'none', '&:hover': { color: theme.palette.primary.main } }}>
                Patienten
              </Link>
              <Link href="/appointments" sx={{ color: theme.palette.text.secondary, textDecoration: 'none', '&:hover': { color: theme.palette.primary.main } }}>
                Termine
              </Link>
              <Link href="/prescriptions" sx={{ color: theme.palette.text.secondary, textDecoration: 'none', '&:hover': { color: theme.palette.primary.main } }}>
                Verordnungen
              </Link>
              <Link href="/finance" sx={{ color: theme.palette.text.secondary, textDecoration: 'none', '&:hover': { color: theme.palette.primary.main } }}>
                Finanzen
              </Link>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default FooterBar;
