import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid,
  Rating,
  Chip,
  IconButton
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Check as CheckIcon
} from '@mui/icons-material';

function AppDetailsPage({ app, isInstalled, onInstall }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <IconButton 
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        <ArrowBackIcon />
      </IconButton>

      <Paper 
        elevation={0}
        sx={{ 
          p: 4,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box
              component="img"
              src={app.icon}
              alt={app.name}
              sx={{
                width: '100%',
                height: 'auto',
                maxWidth: 200,
                display: 'block',
                mx: 'auto',
                mb: 2,
              }}
            />
            <Button
              variant={isInstalled ? "outlined" : "contained"}
              fullWidth
              startIcon={isInstalled ? <CheckIcon /> : <DownloadIcon />}
              onClick={onInstall}
              sx={{ mt: 2 }}
            >
              {isInstalled ? 'Installed' : 'Install'}
            </Button>
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mr: 2 }}>
                {app.name}
              </Typography>
              <Chip 
                label={app.developer}
                variant="outlined"
                size="small"
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Rating value={app.rating} precision={0.1} readOnly />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {app.rating}
              </Typography>
            </Box>

            <Typography variant="body1" paragraph>
              {app.description}
            </Typography>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Developer
              </Typography>
              <Typography color="text.secondary">
                {app.developer}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default AppDetailsPage;
