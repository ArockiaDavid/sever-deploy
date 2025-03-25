import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  LinearProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Update as UpdateIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { s3Service } from '../api/s3Service';
import { updateService } from '../api/updateService';

const UpdateNotification = () => {
  const [updates, setUpdates] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Check for updates when component mounts
  useEffect(() => {
    checkForUpdates();
    // Check for updates every 30 minutes
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Listen for custom event to open dialog
  useEffect(() => {
    const handleOpenDialog = () => {
      setDialogOpen(true);
    };
    
    window.addEventListener('openUpdateDialog', handleOpenDialog);
    return () => {
      window.removeEventListener('openUpdateDialog', handleOpenDialog);
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      console.log('Checking for software updates...');
      
      // Get installed software
      const installedSoftware = await s3Service.scanInstalledSoftware();
      console.log('Installed software:', installedSoftware);
      
      if (!installedSoftware || installedSoftware.length === 0) {
        console.log('No installed software found');
        return;
      }
      
      // Get available packages from S3
      const availablePackages = await s3Service.listPackages();
      console.log('Available packages:', availablePackages);
      
      if (!availablePackages || availablePackages.length === 0) {
        console.log('No available packages found');
        return;
      }
      
      // Find updates by comparing versions
      const updatesAvailable = [];
      
      // Check each installed software for updates
      for (const app of installedSoftware) {
        try {
          // Find matching package in available packages
          const matchingPackage = availablePackages.find(pkg => {
            const appName = app.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            const pkgName = pkg.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            return appName && pkgName && (appName === pkgName || appName.includes(pkgName) || pkgName.includes(appName));
          });
          
          if (matchingPackage) {
            // Use updateService to check for updates
            const updateInfo = await updateService.checkForUpdates({
              ...app,
              id: matchingPackage.id
            });
            
            if (updateInfo.hasUpdate) {
              updatesAvailable.push({
                ...matchingPackage,
                currentVersion: updateInfo.currentVersion,
                latestVersion: updateInfo.latestVersion
              });
            }
          }
        } catch (error) {
          console.error(`Error checking updates for ${app.name}:`, error);
        }
      }
      
      // If updateService fails, fall back to simple version comparison
      if (updatesAvailable.length === 0) {
        const simpleUpdates = availablePackages.filter(pkg => {
          const installedApp = installedSoftware.find(app => {
            const appName = app.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            const pkgName = pkg.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            return appName && pkgName && (appName === pkgName || appName.includes(pkgName) || pkgName.includes(appName));
          });
          
          if (!installedApp) return false;
          
          // Compare versions (simple string comparison)
          return pkg.version > installedApp.version;
        });
        
        updatesAvailable.push(...simpleUpdates);
      }
      
      console.log('Updates available:', updatesAvailable);
      setUpdates(updatesAvailable);
      
      // Dispatch event with update count
      window.dispatchEvent(
        new CustomEvent('updateCountChanged', { detail: updatesAvailable.length })
      );
      
      // Show snackbar if updates are available
      if (updatesAvailable.length > 0) {
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const handleInstallUpdate = async () => {
    if (!selectedUpdate) return;
    
    try {
      setInstalling(true);
      setProgress(0);
      setStatusMessage('Starting installation...');
      
      // First try to use updateService
      try {
        // Update progress to 10% to show activity
        setProgress(10);
        setStatusMessage('Preparing update...');
        
        // Use updateService to update the software
        await updateService.updateSoftware({
          id: selectedUpdate.id,
          version: selectedUpdate.version
        });
        
        // Update progress to 100% to show completion
        setProgress(100);
        setStatusMessage('Update completed successfully');
      } catch (updateError) {
        console.error('Error using updateService:', updateError);
        setStatusMessage('Falling back to direct installation...');
        
        // Fall back to s3Service if updateService fails
        await s3Service.installPackage(
          selectedUpdate.s3Key,
          (progress, status) => {
            setProgress(progress);
            if (status?.message) {
              setStatusMessage(status.message);
            }
          }
        );
      }
      
      // Update the list of updates
      const updatedList = updates.filter(update => update.id !== selectedUpdate.id);
      setUpdates(updatedList);
      setSelectedUpdate(null);
      setInstalling(false);
      
      // Dispatch event with updated count
      window.dispatchEvent(
        new CustomEvent('updateCountChanged', { detail: updatedList.length })
      );
      
      // Close dialog if no more updates
      if (updatedList.length === 0) {
        setDialogOpen(false);
      }
    } catch (error) {
      console.error('Error installing update:', error);
      setStatusMessage(`Installation failed: ${error.message}`);
      setInstalling(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const handleDialogOpen = () => {
    setDialogOpen(true);
    setSnackbarOpen(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedUpdate(null);
  };

  return (
    <>
      {/* Snackbar notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={10000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="info"
          icon={<NotificationsIcon />}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleDialogOpen}
            >
              VIEW
            </Button>
          }
        >
          {updates.length} software update{updates.length !== 1 ? 's' : ''} available
        </Alert>
      </Snackbar>

      {/* Updates dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Software Updates Available
        </DialogTitle>
        <DialogContent>
          {updates.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              All software is up to date
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The following updates are available for installation:
              </Typography>
              <List>
                {updates.map((update) => (
                  <ListItem
                    key={update.id}
                    button
                    selected={selectedUpdate?.id === update.id}
                    onClick={() => setSelectedUpdate(update)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(253, 106, 66, 0.1)',
                        borderColor: 'rgba(253, 106, 66, 0.5)',
                      }
                    }}
                  >
                    <ListItemIcon>
                      <UpdateIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={update.name}
                      secondary={`Version ${update.version} available`}
                    />
                  </ListItem>
                ))}
              </List>
              
              {selectedUpdate && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle1">
                    {selectedUpdate.name} - v{selectedUpdate.version}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {selectedUpdate.description}
                  </Typography>
                  
                  {installing && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {statusMessage}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="inherit">
            Close
          </Button>
          {selectedUpdate && !installing && (
            <Button
              onClick={handleInstallUpdate}
              variant="contained"
              color="primary"
              startIcon={<UpdateIcon />}
            >
              Install Update
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UpdateNotification;
