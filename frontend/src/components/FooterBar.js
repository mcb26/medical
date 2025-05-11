import React from 'react';
import { Box, Typography } from '@mui/material';

function FooterBar() {
  return (
    <Box component="footer" sx={{ p: 2, bgcolor: 'background.paper', textAlign: 'center', width: '100%', position: 'fixed', bottom: 0 }}>
      <Typography variant="body2" color="textSecondary">

      </Typography>
    </Box>
  );
}

export default FooterBar;
