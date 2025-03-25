import React, { useState } from 'react';
import { Button, CircularProgress, Tooltip, Snackbar, Alert } from '@mui/material';
import { Refresh as RefreshIcon, Update as UpdateIcon } from '@mui/icons-material';
import { updateService } from '../api/updateService';

const UpdateChecker = ({ 
  software,
  onUpdateComplete,
  className,
  size = 'small',
  variant = 'contained',
  color = 'success'
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleCheck = async () => {
    try {
      setIsChecking(true);
      const result = await updateService.checkForUpdates(software);
      setHasUpdate(result.hasUpdate);
      setLatestVersion(result.latestVersion);
      
      if (result.hasUpdate) {
        // If update is available, change button to update option
        color = 'warning';
      } else {
        setSnackbarMessage(`${software.name} is up to date (v${result.currentVersion})`);
        setShowSnackbar(true);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setSnackbarMessage(`Error checking for updates: ${error.message}`);
      setShowSnackbar(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsChecking(true);
      await updateService.updateSoftware({
        ...software,
        version: latestVersion
      });
      setHasUpdate(false);
      onUpdateComplete?.();
    } catch (error) {
      console.error('Error updating software:', error);
      setSnackbarMessage(`Error updating software: ${error.message}`);
      setShowSnackbar(true);
    } finally {
      setIsChecking(false);
    }
  };
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowSnackbar(false);
  };

  return (
    <>
    <Tooltip title={hasUpdate ? `Update available: v${latestVersion}` : ''}>
      <Button
        size={size}
        variant={variant}
        color={hasUpdate ? 'warning' : color}
        startIcon={
          isChecking ? (
            <CircularProgress size={16} color="inherit" />
          ) : hasUpdate ? (
            <UpdateIcon />
          ) : (
            <RefreshIcon />
          )
        }
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          hasUpdate ? handleUpdate() : handleCheck();
        }}
        disabled={isChecking}
        fullWidth
      >
        {isChecking 
          ? (hasUpdate ? 'Updating...' : 'Checking...') 
          : (hasUpdate ? 'Update Available' : 'Check for Updates')
        }
      </Button>
    </Tooltip>
    <Snackbar 
      open={showSnackbar} 
      autoHideDuration={3000} 
      onClose={handleCloseSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        onClose={handleCloseSnackbar} 
        severity={snackbarMessage.includes('Error') ? 'error' : 'success'} 
        sx={{ width: '100%' }}
      >
        {snackbarMessage}
      </Alert>
    </Snackbar>
    </>
  );
};

export default UpdateChecker;
