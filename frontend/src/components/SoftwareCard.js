import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Chip,
  Collapse
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Code as CodeIcon,
  Terminal as TerminalIcon,
  Apps as AppsIcon,
  Storage as StorageIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { softwareService } from '../services/softwareService';
import '../styles/SoftwareCard.css';

const CATEGORY_INFO = {
  browser: { label: 'Browser', icon: LanguageIcon, color: '#4285F4' },
  ide: { label: 'IDE & Editor', icon: CodeIcon, color: '#0ACF83' },
  language: { label: 'Programming Language', icon: TerminalIcon, color: '#FFC107' },
  database: { label: 'Database', icon: StorageIcon, color: '#9C27B0' },
  tool: { label: 'Development Tool', icon: AppsIcon, color: '#FF4081' }
};

const SoftwareCard = ({
  id,
  name,
  description,
  category = 'tool',
  version,
  isInstalled,
  icon,
  s3Key,
  onStatusChange
}) => {
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const categoryInfo = CATEGORY_INFO[category] || CATEGORY_INFO.tool;
  const CategoryIcon = categoryInfo.icon;

  const handleProgress = useCallback((data) => {
    // Ensure we have a valid progress value
    const validProgress = typeof data.progress === 'number' ? data.progress : 
                          typeof data.percent === 'number' ? data.percent : 0;
    
    // Update state with progress data
    setProgress(validProgress);
    setStatus(data.message || '');
    
    // Log progress for debugging
    console.log(`Progress update: ${validProgress}% - ${data.message || 'No message'}`);
  }, []);

  const handleError = (error) => {
    setError(error.message);
    setProgress(0);
    setStatus('');
    setInstalling(false);
    setUninstalling(false);
  };

  const handleInstall = async () => {
    try {
      setInstalling(true);
      setError(null);
      await softwareService.installSoftware(name, handleProgress);
      onStatusChange?.();
    } catch (error) {
      handleError(error);
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    try {
      setShowConfirm(false);
      setUninstalling(true);
      setError(null);
      await softwareService.uninstallSoftware(s3Key || name, handleProgress);
      
      // Force a delay to ensure backend database updates are complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call onStatusChange to refresh the UI
      onStatusChange?.();
      
      // Set isInstalled to false immediately for better UX
      if (typeof onStatusChange !== 'function') {
        console.log('No onStatusChange callback provided, updating local state');
        // If no callback is provided, update local state
        setInstalling(false);
        setUninstalling(false);
        setProgress(0);
        setStatus('');
      }
    } catch (error) {
      handleError(error);
    } finally {
      setUninstalling(false);
    }
  };

  const getStatusColor = () => {
    if (error) return 'error.main';
    if (installing || uninstalling) return 'primary.main';
    if (isInstalled) return 'success.main';
    return 'text.secondary';
  };

  return (
    <>
      <Card 
        className={`software-card ${expanded ? 'expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="software-card-content">
          <Box className="software-header">
            <Box className="software-icon" style={{ backgroundColor: `${categoryInfo.color}15` }}>
              {icon ? (
                <img src={icon} alt={name} className="app-icon" />
              ) : (
                <CategoryIcon style={{ color: categoryInfo.color }} />
              )}
            </Box>

            <Box className="software-info">
              <Typography variant="h6" className="software-name">
                {name}
              </Typography>
              
              <Box className="software-meta">
                <Chip
                  icon={<CategoryIcon />}
                  label={categoryInfo.label}
                  size="small"
                  style={{
                    backgroundColor: `${categoryInfo.color}15`,
                    color: categoryInfo.color
                  }}
                />
                <Typography variant="caption" className="software-version">
                  v{version}
                </Typography>
              </Box>
            </Box>

            <Box className="software-status">
              {(installing || uninstalling) ? (
                <CircularProgress
                  size={24}
                  thickness={4}
                  className="status-indicator"
                />
              ) : isInstalled ? (
                <Tooltip title="Installed">
                  <CheckIcon className="status-icon installed" />
                </Tooltip>
              ) : (
                <Tooltip title="Not Installed">
                  <InfoIcon className="status-icon not-installed" />
                </Tooltip>
              )}
            </Box>
          </Box>

          <Collapse in={expanded} timeout="auto">
            <Box className="software-details">
              <Typography variant="body2" color="text.secondary" className="software-description">
                {description}
              </Typography>

              {(installing || uninstalling || error) && (
                <Box className="status-container">
                  {error ? (
                    <Box className="error-message">
                      <ErrorIcon color="error" />
                      <Typography variant="caption" color="error">
                        {error}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setError(null);
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box className="progress-container">
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        className="progress-bar"
                      />
                      <Typography variant="caption" className="status-text">
                        {status}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              <Box className="action-buttons">
                {isInstalled ? (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={uninstalling ? <CircularProgress size={20} /> : <DeleteIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirm(true);
                    }}
                    disabled={installing || uninstalling}
                  >
                    {uninstalling ? 'Uninstalling...' : 'Uninstall'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={installing ? <CircularProgress size={20} /> : <DownloadIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInstall();
                    }}
                    disabled={installing || uninstalling}
                    style={{
                      backgroundColor: categoryInfo.color,
                      '&:hover': {
                        backgroundColor: categoryInfo.color + 'dd'
                      }
                    }}
                  >
                    {installing ? 'Installing...' : 'Install'}
                  </Button>
                )}
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>
          Uninstall {name}?
        </DialogTitle>
        <DialogContent>
          <Typography>
            This will remove {name} and all associated files. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUninstall}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Uninstall
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SoftwareCard;
