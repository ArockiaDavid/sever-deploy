import React from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import config from '../config';

const SSOLogin = ({ onError }) => {
  const handleSSOLogin = async () => {
    try {
      window.location.href = `${config.apiUrl}/api/auth/sso`;
    } catch (error) {
      onError?.(error.message || 'Failed to initiate SSO login');
    }
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Divider sx={{ 
        my: 2,
        '&::before, &::after': {
          borderColor: 'rgba(253,106,66,0.2)',
        }
      }}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            px: 2
          }}
        >
          Organization Login
        </Typography>
      </Divider>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 2,
        mt: 2
      }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={handleSSOLogin}
          startIcon={<BusinessIcon />}
          sx={{
            borderRadius: '8px',
            borderColor: 'rgba(253,106,66,0.8)',
            color: 'rgba(253,106,66,0.8)',
            textTransform: 'none',
            '&:hover': {
              borderColor: 'rgba(253,106,66,1)',
              backgroundColor: 'rgba(253,106,66,0.05)'
            }
          }}
        >
          Sign in with Organization SSO
        </Button>
      </Box>
    </Box>
  );
};

export default SSOLogin;
