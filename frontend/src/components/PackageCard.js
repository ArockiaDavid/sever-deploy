import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { 
  Code as CodeIcon,
  Terminal as TerminalIcon,
  Apps as AppsIcon,
  Storage as StorageIcon,
  Language as LanguageIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { s3Service } from '../api/s3Service';
import '../styles/AppCard.css';

const getCategoryInfo = (category = 'tool') => {
  const categories = {
    'browser': { label: 'Browser', icon: <LanguageIcon /> },
    'ide': { label: 'IDE & Editor', icon: <CodeIcon /> },
    'language': { label: 'Programming Language', icon: <TerminalIcon /> },
    'database': { label: 'Database', icon: <StorageIcon /> },
    'tool': { label: 'Development Tool', icon: <AppsIcon /> }
  };
  return categories[category] || categories.tool;
};

const PackageCard = ({ 
  id,
  name, 
  description, 
  category,
  isInstalled, 
  version,
  icon,
  s3Key,
  onInstallComplete
}) => {
  const [imageError, setImageError] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const categoryInfo = getCategoryInfo(category);

  const handleError = (error) => {
    setError(error.message);
    setProgress(0);
    setStatusMessage('');
    setInstalling(false);
    setUninstalling(false);
  };

  const handleProgress = useCallback((percent, status) => {
    if (typeof percent === 'number') {
      setProgress(percent);
    }
    if (status?.message) {
      setStatusMessage(status.message);
    }
  }, []);

  const handleInstall = async () => {
    try {
      setInstalling(true);
      setError(null);
      setProgress(0);
      setStatusMessage('Starting installation...');

      await s3Service.installPackage(s3Key, handleProgress);
      
      // Update UI state
      onInstallComplete();
      setInstalling(false);
      setProgress(0);
      setStatusMessage('');
    } catch (error) {
      handleError(error);
    }
  };

  const handleUninstall = async () => {
    try {
      setConfirmDialog(false);
      setUninstalling(true);
      setError(null);
      setProgress(0);
      setStatusMessage('Starting uninstallation...');

      await s3Service.uninstallPackage(s3Key, handleProgress);
      
      // Update UI state
      onInstallComplete();
      setUninstalling(false);
      setProgress(0);
      setStatusMessage('');
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <>
      <Card className="app-card" elevation={2}>
        <CardContent className="app-card-content">
          <Box className="app-header">
            <div className="app-icon-container">
              {icon && !imageError ? (
                <img 
                  src={icon} 
                  alt={`${name} icon`} 
                  onError={() => setImageError(true)}
                  className="app-icon"
                />
              ) : (
                <div className="app-icon-fallback">
                  {categoryInfo.icon}
                </div>
              )}
            </div>

            <Box className="app-title-container">
              <Typography variant="h6" component="div" className="app-name">
                {name}
              </Typography>
              <Chip 
                icon={categoryInfo.icon}
                label={categoryInfo.label}
                size="small"
                className="category-chip"
              />
            </Box>
          </Box>

          {(installing || uninstalling) && (
            <Box className="progress-container">
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                className="progress-bar"
              />
              <Typography variant="caption" className="status-message">
                {statusMessage}
              </Typography>
            </Box>
          )}

          {error && (
            <Box className="error-container">
              <WarningIcon color="error" fontSize="small" />
              <Typography variant="caption" color="error">
                {error}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => setError(null)}
                className="clear-error-btn"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <Box className="app-footer">
            <Typography variant="caption" className="version-text">
              v{version}
            </Typography>

            {isInstalled ? (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={uninstalling ? <CircularProgress size={16} /> : <DeleteIcon />}
                onClick={() => setConfirmDialog(true)}
                disabled={installing || uninstalling}
                className="action-button uninstall"
              >
                {uninstalling ? 'Uninstalling...' : 'Uninstall'}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                startIcon={installing ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleInstall}
                disabled={installing || uninstalling}
                className="action-button install"
              >
                {installing ? 'Installing...' : 'Install'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Uninstallation Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => !uninstalling && setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Uninstall {name}?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to uninstall {name}? This action cannot be undone.
          </Typography>
          {uninstalling && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: error ? '#d32f2f' : '#4caf50'
                  }
                }}
              />
              <Typography 
                variant="body2" 
                color="textSecondary" 
                align="center"
                sx={{ mt: 1 }}
              >
                {statusMessage}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog(false)}
            color="inherit"
            disabled={uninstalling}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUninstall}
            color="error"
            variant="contained"
            startIcon={uninstalling ? <CircularProgress size={16} /> : <DeleteIcon />}
            disabled={uninstalling}
          >
            {uninstalling ? 'Uninstalling...' : 'Uninstall'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog
        open={Boolean(error)}
        onClose={() => setError(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Error During {uninstalling ? 'Uninstallation' : 'Installation'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {error}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setError(null)}
            color="primary"
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PackageCard;
