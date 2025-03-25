import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Box, 
  IconButton, 
  Typography, 
  Avatar, 
  Menu, 
  MenuItem,
  InputBase,
  Tooltip,
  Badge,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  NotificationsNone as NotificationsIcon,
  DarkMode as DarkModeIcon,
  AccountCircle,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  KeyboardCommandKey as CommandIcon,
  Update as UpdateIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { s3Service } from '../api/s3Service';
import config from '../config';

// Header background gradient animation
const gradientAnimation = {
  '@keyframes gradientShift': {
    '0%': { 
      backgroundPosition: '0% 50%' 
    },
    '50%': { 
      backgroundPosition: '100% 50%' 
    },
    '100%': { 
      backgroundPosition: '0% 50%' 
    }
  }
};

const Header = ({ user, onLogout, sx }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  
  // Update avatarUrl when user changes
  useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarUrl(user.avatarUrl);
      setAvatarError(false); // Reset error state when URL changes
      console.log('Header: Updated avatarUrl from user:', user.avatarUrl);
    } else if (user?.avatar) {
      // Fallback to avatar for backward compatibility
      if (typeof user.avatar === 'string') {
        if (user.avatar.startsWith('data:') || user.avatar.startsWith('http')) {
          setAvatarUrl(user.avatar);
          setAvatarError(false);
        } else {
          setAvatarUrl('/default-avatar.svg');
        }
      } else {
        setAvatarUrl('/default-avatar.svg');
      }
    } else {
      setAvatarUrl('/default-avatar.svg');
    }
  }, [user]);
  
  // Force re-render when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (currentUser?.avatarUrl) {
        setAvatarUrl(currentUser.avatarUrl);
        setAvatarError(false); // Reset error state when URL changes
        console.log('Header: Updated avatarUrl from storage event:', currentUser.avatarUrl);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch available updates when component mounts
  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        setLoading(true);
        
        // Get installed software
        const installedSoftware = await s3Service.scanInstalledSoftware();
        
        // Get available packages from S3
        const availablePackages = await s3Service.listPackages();
        
        // Find updates by comparing versions
        const updatesAvailable = availablePackages.filter(pkg => {
          const installedApp = installedSoftware.find(app => {
            const appName = app.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            const pkgName = pkg.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            return appName && pkgName && (appName === pkgName || appName.includes(pkgName) || pkgName.includes(appName));
          });
          
          if (!installedApp) return false;
          
          // Compare versions (simple string comparison for now)
          return pkg.version > installedApp.version;
        });
        
        setUpdates(updatesAvailable);
      } catch (error) {
        console.error('Error fetching updates:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUpdates();
  }, []);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout();
  };
  
  const handleUpdateDialogOpen = () => {
    setUpdateDialogOpen(true);
  };
  
  const handleUpdateDialogClose = () => {
    setUpdateDialogOpen(false);
  };
  
  const handleSettingsClick = () => {
    console.log('Header: handleSettingsClick called');
    handleClose();
    
    // Check if user is admin and navigate to the appropriate settings page
    if (user?.role === 'admin') {
      navigate('/admin/settings');
    } else {
      navigate('/settings');
    }
  };
  
  const handleInstallAllUpdates = async () => {
    try {
      setLoading(true);
      
      // Install each update one by one
      for (const update of updates) {
        try {
          await s3Service.installPackage(update.s3Key);
          console.log(`Installed update: ${update.name}`);
        } catch (error) {
          console.error(`Error installing update ${update.name}:`, error);
        }
      }
      
      // Refresh the list of updates
      setUpdates([]);
      
      // Close the dialog
      setUpdateDialogOpen(false);
    } catch (error) {
      console.error('Error installing updates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Force avatar refresh
  const forceAvatarRefresh = () => {
    if (avatarError) {
      return '/default-avatar.svg';
    }
    
    if (avatarUrl && avatarUrl.includes('?')) {
      return `${avatarUrl}&t=${new Date().getTime()}`;
    } else if (avatarUrl) {
      return `${avatarUrl}?t=${new Date().getTime()}`;
    }
    return '/default-avatar.svg';
  };

  // Handle avatar load error
  const handleAvatarError = () => {
    console.log('Avatar failed to load, using default avatar');
    setAvatarError(true);
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{
        ...sx,
        background: 'linear-gradient(90deg, rgba(253, 106, 66, 0.9) 0%, rgba(253, 106, 66, 0.8) 100%)',
        color: 'white',
        boxShadow: '0 2px 8px rgba(253, 106, 66, 0.3)',
        borderBottom: '1px solid',
        borderColor: 'rgba(253, 106, 66, 0.2)',
        backdropFilter: 'blur(10px)',
        height: 64,
        ...gradientAnimation
      }}
    >
      <Container maxWidth={false}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          height: '64px',
          position: 'relative'
        }}>
          {/* Search Bar - Only show for non-admin users */}
          {user?.role !== 'admin' && (
            <Box sx={{ 
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '8px',
              px: 2,
              width: '400px',
              '&:hover': {
                borderColor: 'text.secondary',
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              },
              transition: 'all 0.3s ease'
            }}>
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <InputBase
                placeholder="Search or type command..."
                sx={{ 
                  flex: 1,
                  ml: 1,
                  '& input': {
                    py: 1,
                    fontSize: '0.875rem',
                    color: 'text.primary'
                  }
                }}
              />
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: '4px',
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.75rem',
                color: 'text.secondary'
              }}>
                <CommandIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">K</Typography>
              </Box>
            </Box>
          )}

          {/* Welcome Message */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            ml: 2
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              Welcome, {user?.name || 'User'}
            </Typography>
          </Box>

          {/* Right Section */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            ml: 'auto'
          }}>
            {/* Dark Mode Icon - Only show for non-admin users */}
            {user?.role !== 'admin' && (
              <IconButton
                size="small"
                sx={{ 
                  color: 'text.secondary',
                  bgcolor: 'rgba(255, 255, 255, 0.6)',
                  '&:hover': { 
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <DarkModeIcon sx={{ fontSize: 20 }} />
              </IconButton>
            )}
            
            {/* Notification Icon - Only show for non-admin users */}
            {user?.role !== 'admin' && (
              <Tooltip title="Software Updates">
                <IconButton
                  size="small"
                  onClick={handleUpdateDialogOpen}
                  sx={{ 
                    color: 'text.secondary',
                    bgcolor: 'rgba(255, 255, 255, 0.6)',
                    '&:hover': { 
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Badge 
                    badgeContent={updates.length || 3} 
                    color="error"
                    overlap="circular"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.6rem',
                        height: 16,
                        minWidth: 16,
                        padding: 0
                      }
                    }}
                  >
                    <NotificationsIcon sx={{ fontSize: 20 }} />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
            
            {/* Update Notification Dialog */}
            <Dialog
              open={updateDialogOpen}
              onClose={handleUpdateDialogClose}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>
                Software Updates Available
              </DialogTitle>
              <DialogContent>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <Typography>Loading updates...</Typography>
                  </Box>
                ) : updates.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
                    <CheckCircleIcon color="success" />
                    <Typography>All software is up to date</Typography>
                  </Box>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      The following updates are available for installation:
                    </Typography>
                    <List>
                      {updates.map((update) => (
                        <ListItem
                          key={update.id}
                          sx={{
                            borderRadius: 1,
                            mb: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ListItemIcon>
                              <UpdateIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={update.name}
                              secondary={`Version ${update.version} available`}
                            />
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            onClick={() => {
                              setLoading(true);
                              s3Service.installPackage(update.s3Key)
                                .then(() => {
                                  setUpdates(updates.filter(u => u.id !== update.id));
                                  if (updates.length <= 1) {
                                    setUpdateDialogOpen(false);
                                  }
                                })
                                .catch(error => {
                                  console.error(`Error installing update ${update.name}:`, error);
                                })
                                .finally(() => {
                                  setLoading(false);
                                });
                            }}
                            disabled={loading}
                          >
                            Update
                          </Button>
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleUpdateDialogClose} color="inherit">
                  Close
                </Button>
                {updates.length > 0 && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<UpdateIcon />}
                    onClick={handleInstallAllUpdates}
                    disabled={loading}
                  >
                    {loading ? 'Installing...' : 'Update All'}
                  </Button>
                )}
              </DialogActions>
            </Dialog>
            <Box 
              onClick={handleMenu}
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                py: 0.5,
                px: 1.5,
                borderRadius: 2,
                transition: 'all 0.2s ease',
                bgcolor: 'rgba(255, 255, 255, 0.6)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  '& .user-name': {
                    color: 'primary.main',
                  },
                  '& .user-role': {
                    color: 'primary.light',
                  }
                }
              }}
            >
              <Avatar 
                src={forceAvatarRefresh()}
                onError={handleAvatarError}
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: 'white',
                  color: 'rgba(253, 106, 66, 0.9)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: '2px solid',
                  borderColor: 'rgba(255, 255, 255, 0.8)'
                }}
              >
                {user?.name?.charAt(0) || <AccountCircle />}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography 
                  variant="body2" 
                  className="user-name"
                  sx={{ 
                    fontWeight: 600, 
                    lineHeight: 1.2,
                    color: 'text.primary',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {user?.name || 'User'}
                </Typography>
                <Typography 
                  variant="caption" 
                  className="user-role"
                  sx={{ 
                    lineHeight: 1,
                    color: 'text.secondary',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'Role'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            onClick={handleClose}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 1.5,
                minWidth: 250,
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
                '& .MuiMenu-list': {
                  p: 1
                }
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ 
              px: 2, 
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <Avatar 
                src={forceAvatarRefresh()}
                onError={handleAvatarError}
                sx={{ 
                  width: 40, 
                  height: 40,
                  bgcolor: 'rgba(253, 106, 66, 0.1)',
                  color: 'rgba(253, 106, 66, 0.9)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  border: '2px solid',
                  borderColor: 'rgba(253, 106, 66, 0.2)'
                }}
              >
                {user?.name?.charAt(0) || <AccountCircle />}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 600, color: 'rgba(253, 106, 66, 0.9)' }}>
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || 'user@example.com'}
                </Typography>
              </Box>
            </Box>
            
            {/* Department and Position Information */}
            <Box sx={{ px: 2, py: 1, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BusinessIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  Department:
                </Typography>
                <Chip 
                  label={user?.department || 'Not set'} 
                  size="small"
                  sx={{ 
                    bgcolor: user?.department ? 'rgba(253, 106, 66, 0.1)' : 'grey.100',
                    color: user?.department ? 'rgba(253, 106, 66, 0.9)' : 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WorkIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  Position:
                </Typography>
                <Chip 
                  label={user?.position || 'Not set'} 
                  size="small"
                  sx={{ 
                    bgcolor: user?.position ? 'rgba(253, 106, 66, 0.1)' : 'grey.100',
                    color: user?.position ? 'rgba(253, 106, 66, 0.9)' : 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                />
              </Box>
            </Box>
            
            <Divider sx={{ my: 1 }} />
            
            <MenuItem 
              onClick={handleSettingsClick}
              sx={{ 
                borderRadius: 1,
                py: 1,
                gap: 2,
                '&:hover': {
                  bgcolor: 'rgba(253, 106, 66, 0.08)'
                }
              }}
            >
              <SettingsIcon fontSize="small" sx={{ color: 'rgba(253, 106, 66, 0.9)' }} />
              <Typography variant="body2">Settings</Typography>
            </MenuItem>
            <MenuItem 
              onClick={handleLogout}
              sx={{ 
                borderRadius: 1,
                py: 1,
                gap: 2,
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.lighter'
                }
              }}
            >
              <LogoutIcon fontSize="small" />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Container>
    </AppBar>
  );
};

export default Header;
