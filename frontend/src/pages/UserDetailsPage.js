import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Box,
  CircularProgress,
  Avatar,
  Grid,
  Chip,
  Alert,
  Snackbar,
  Card,
  IconButton,
  Divider,
  useTheme,
  LinearProgress
} from '@mui/material';
import config from '../config';
import {
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Engineering as EngineerIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
  Circle as CircleIcon,
  Edit as EditIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Computer as ComputerIcon,
  DeveloperBoard as ProcessorIcon
} from '@mui/icons-material';

const getRoleIcon = (role) => {
  switch (role) {
    case 'admin':
      return <AdminIcon />;
    case 'engineer':
      return <EngineerIcon />;
    default:
      return <PersonIcon />;
  }
};

const getRoleColor = (role) => {
  switch (role) {
    case 'admin':
      return '#0088FE';
    case 'engineer':
      return '#00C49F';
    default:
      return '#FFBB28';
  }
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <Box sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    p: 2,
    borderRadius: 2,
    bgcolor: 'rgba(253, 106, 66, 0.02)',
    border: '1px solid rgba(253, 106, 66, 0.1)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateX(4px)',
      bgcolor: 'rgba(253, 106, 66, 0.05)',
    }
  }}>
    <Box sx={{ 
      width: 40,
      height: 40,
      borderRadius: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'rgba(253, 106, 66, 0.1)',
      mr: 2
    }}>
      <Icon sx={{ color: '#fd6a42' }} />
    </Box>
    <Box sx={{ flex: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {value || 'Not Available'}
      </Typography>
    </Box>
  </Box>
);

const ResourceUsageItem = ({ icon: Icon, label, used, total, unit }) => (
  <Box sx={{ 
    p: 2,
    borderRadius: 2,
    bgcolor: 'rgba(253, 106, 66, 0.02)',
    border: '1px solid rgba(253, 106, 66, 0.1)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateX(4px)',
      bgcolor: 'rgba(253, 106, 66, 0.05)',
    }
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box sx={{ 
        width: 40,
        height: 40,
        borderRadius: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(253, 106, 66, 0.1)',
        mr: 2
      }}>
        <Icon sx={{ color: '#fd6a42' }} />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
    <LinearProgress 
      variant="determinate" 
      value={(used / total) * 100}
      sx={{ 
        mb: 1,
        height: 8,
        borderRadius: 4,
        bgcolor: 'rgba(253, 106, 66, 0.1)',
        '& .MuiLinearProgress-bar': {
          bgcolor: '#fd6a42'
        }
      }}
    />
    <Typography variant="body2" color="text.secondary">
      {used} {unit} used of {total} {unit}
    </Typography>
  </Box>
);

const UserDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'admin') {
        navigate('/login');
        return;
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching user details for ID:', id);
        const response = await fetch(`${config.apiUrl}/api/users/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user details');
        }

        const data = await response.json();
        console.log('User details response:', data);
        
        // Log warning if data is missing but don't create mock data
        if (!data.systemConfig) {
          console.warn('No system configuration data received for user:', id);
        }
        
        if (!data.installedSoftware || data.installedSoftware.length === 0) {
          console.warn('No installed software data received for user:', id);
        }
        
        setUserDetails(data);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setError('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserDetails();
    }
  }, [id]);

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 800, mx: 'auto', mt: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!userDetails) {
    return (
      <Alert severity="info" sx={{ maxWidth: 800, mx: 'auto', mt: 3 }}>
        No user details found
      </Alert>
    );
  }

  const formatDate = (date) => {
    if (!date) return 'Not Available';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        {/* Header Section */}
        <Box sx={{ p: 3, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                src={userDetails.avatar}
                alt={userDetails.name}
                sx={{ 
                  width: 100, 
                  height: 100,
                  border: `4px solid ${getRoleColor(userDetails.role)}`,
                  bgcolor: `${getRoleColor(userDetails.role)}20`
                }}
              >
                {userDetails.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {userDetails.name}
                  </Typography>
                  {userDetails.isOnline && (
                    <CircleIcon sx={{ color: '#44b700', fontSize: 12 }} />
                  )}
                </Box>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {userDetails.email}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    icon={getRoleIcon(userDetails.role)}
                    label={userDetails.role.charAt(0).toUpperCase() + userDetails.role.slice(1)}
                    sx={{
                      bgcolor: `${getRoleColor(userDetails.role)}20`,
                      color: getRoleColor(userDetails.role),
                      '& .MuiChip-icon': {
                        color: getRoleColor(userDetails.role)
                      }
                    }}
                  />
                  <Chip
                    icon={<CircleIcon sx={{ fontSize: '0.8rem' }} />}
                    label={userDetails.isOnline ? 'Online' : 'Offline'}
                    sx={{
                      bgcolor: userDetails.isOnline ? 'rgba(68, 183, 0, 0.1)' : 'rgba(189, 189, 189, 0.1)',
                      color: userDetails.isOnline ? '#44b700' : '#bdbdbd',
                      '& .MuiChip-icon': {
                        color: userDetails.isOnline ? '#44b700' : '#bdbdbd'
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>
            <IconButton>
              <EditIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        {/* Contact Information */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Contact Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <InfoItem 
                icon={EmailIcon}
                label="Email Address"
                value={userDetails.email}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoItem 
                icon={PersonIcon}
                label="Role"
                value={userDetails.role.charAt(0).toUpperCase() + userDetails.role.slice(1)}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {/* System Configuration */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            System Configuration
          </Typography>
          
          {userDetails.systemConfig ? (
            <>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <InfoItem 
                    icon={ComputerIcon}
                    label="Operating System"
                    value={`${userDetails.systemConfig.osName} ${userDetails.systemConfig.osVersion}`}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoItem 
                    icon={ProcessorIcon}
                    label="Processor"
                    value={`${userDetails.systemConfig.cpuModel} (${userDetails.systemConfig.cpuCores} Cores)`}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ResourceUsageItem 
                    icon={MemoryIcon}
                    label="Memory Usage"
                    used={userDetails.systemConfig.totalMemory - userDetails.systemConfig.freeMemory}
                    total={userDetails.systemConfig.totalMemory}
                    unit="GB"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ResourceUsageItem 
                    icon={StorageIcon}
                    label="Disk Space"
                    used={userDetails.systemConfig.totalDiskSpace - userDetails.systemConfig.freeDiskSpace}
                    total={userDetails.systemConfig.totalDiskSpace}
                    unit="GB"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoItem 
                    icon={ComputerIcon}
                    label="Hostname"
                    value={userDetails.systemConfig.hostname}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoItem 
                    icon={ProcessorIcon}
                    label="Architecture"
                    value={userDetails.systemConfig.architecture}
                  />
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Last Updated: {formatDate(userDetails.systemConfig.lastUpdated)}
              </Typography>
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No system configuration data to display
            </Alert>
          )}
        </Box>

        <Divider />
        {/* Installed Software Section */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Installed Software
          </Typography>
          
          {userDetails.installedSoftware && userDetails.installedSoftware.length > 0 ? (
            <Grid container spacing={3}>
              {userDetails.installedSoftware.map((software, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Box sx={{ 
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(253, 106, 66, 0.02)',
                    border: '1px solid rgba(253, 106, 66, 0.1)'
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {software.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Version: {software.version}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Installed: {formatDate(software.installDate)}
                    </Typography>
                    <Chip
                      label={software.status}
                      size="small"
                      color={software.status === 'installed' ? 'success' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No installed software data to display
            </Alert>
          )}
        </Box>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserDetailsPage;
