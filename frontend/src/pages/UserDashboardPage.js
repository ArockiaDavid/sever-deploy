import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import Header from '../components/Header';
import AppCard from '../components/AppCard';
import { installationService } from '../api/installationService';
import useAutoLogout from '../hooks/useAutoLogout';
import LogoutWarning from '../components/LogoutWarning';
import Sidebar from '../components/Sidebar';

const UserDashboardPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [installedSoftware, setInstalledSoftware] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchInstalledSoftware = async () => {
      try {
        const data = await installationService.getInstalledSoftware();
        setInstalledSoftware(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching installed software:', error);
        setError('Failed to load installed software');
      } finally {
        setLoading(false);
      }
    };

    fetchInstalledSoftware();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const { showWarning, remainingTime, onStayLoggedIn } = useAutoLogout(handleLogout);

  const handleCheck = async (software) => {
    try {
      const updateInfo = await installationService.checkForUpdates(software.id);
      if (updateInfo?.hasUpdate) {
        // Handle update available
        console.log('Update available:', updateInfo.latestVersion);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Header 
        user={user}
        onLogout={handleLogout}
        onSidebarToggle={handleSidebarToggle}
      />
      {user?.role === 'admin' && (
        <Sidebar
          open={sidebarOpen}
          onClose={handleSidebarClose}
          onNavigate={handleNavigate}
        />
      )}
      <LogoutWarning 
        open={showWarning}
        onStayLoggedIn={onStayLoggedIn}
        onLogout={handleLogout}
        remainingTime={remainingTime}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          pt: 8,
          px: 2,
          pb: 4,
          ml: user?.role === 'admin' ? { sm: `${isMobile ? 0 : 50}px` } : 0
        }}
      >
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" gutterBottom component="div">
                    Installed Software
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/home')}
                  >
                    Browse Software
                  </Button>
                </Box>
                {error ? (
                  <Typography color="error">{error}</Typography>
                ) : (
                  <Grid container spacing={3}>
                    {installedSoftware.map((software) => (
                      <Grid item xs={12} sm={6} md={4} key={software.id}>
                        <AppCard
                          {...software}
                          isInstalled={true}
                          onCheck={() => handleCheck(software)}
                        />
                      </Grid>
                    ))}
                    {installedSoftware.length === 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body1" color="textSecondary" align="center">
                          No software installed yet. Browse available software to get started.
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default UserDashboardPage;
