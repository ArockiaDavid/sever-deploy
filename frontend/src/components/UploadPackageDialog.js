import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  TextField,
  MenuItem,
  Box,
  LinearProgress,
  Typography,
  IconButton,
  Alert,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { websocketService } from '../api/websocketService';
import authService from '../api/authService';

// Define keyframes for animations
const progressAnimations = {
  '@keyframes pulse': {
    '0%': { opacity: 0.6 },
    '50%': { opacity: 1 },
    '100%': { opacity: 0.6 }
  },
  '@keyframes shimmer': {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' }
  },
  '@keyframes glow': {
    '0%': { boxShadow: '0 0 5px rgba(253, 106, 66, 0.5)' },
    '50%': { boxShadow: '0 0 15px rgba(253, 106, 66, 0.8)' },
    '100%': { boxShadow: '0 0 5px rgba(253, 106, 66, 0.5)' }
  }
};

const categories = [
  { value: 'browser', label: 'Browser' },
  { value: 'ide', label: 'IDE & Editor' },
  { value: 'language', label: 'Programming Language' },
  { value: 'database', label: 'Database' },
  { value: 'tool', label: 'Development Tool' }
];

const UploadPackageDialog = ({ open, onClose, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [version, setVersion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [error, setError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [uploadStartTime, setUploadStartTime] = useState(null);
  const [uploadPhase, setUploadPhase] = useState('preparing'); // preparing, transferring, processing
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Connect to WebSocket when dialog opens
  useEffect(() => {
    if (open) {
      connectWebSocket();
    } else {
      // Disconnect when dialog closes
      websocketService.disconnect();
      setWsConnected(false);
    }
  }, [open]);

  // Update elapsed time for better progress indication
  useEffect(() => {
    let timer;
    if (uploading && uploadStartTime) {
      timer = setInterval(() => {
        // Force component update to refresh elapsed time
        setUploadProgress(prev => {
          // Only update if not at 100% yet
          return prev < 100 ? prev : prev;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [uploading, uploadStartTime]);

  const connectWebSocket = async () => {
    if (wsConnected || connecting) return;
    
    setConnecting(true);
    setError('');
    
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await websocketService.connect(token);
      setWsConnected(true);
      setError('');
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setError('Failed to connect to server: ' + (err.message || 'Unknown error'));
      setWsConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Validate file type
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['dmg', 'pkg', 'app', 'zip'].includes(ext)) {
        setError('Invalid file type. Only dmg, pkg, app, and zip files are allowed.');
        return;
      }
      setFile(selectedFile);
      // Auto-fill name from filename if empty
      if (!name) {
        setName(selectedFile.name.replace(/\.(dmg|pkg|app|zip)$/, ''));
      }
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!file || !name || !category || !version) {
      setError('Please fill in all fields');
      return;
    }

    if (!wsConnected) {
      try {
        await connectWebSocket();
      } catch (err) {
        setError('Cannot upload: WebSocket connection failed');
        return;
      }
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);
    setUploadStage('preparing');
    setUploadPhase('preparing');
    setUploadStartTime(Date.now());
    
    try {
      // Prepare metadata
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      const metadata = {
        name,
        category,
        version,
        size: file.size,
        contentType: file.type,
        extension: fileExt
      };

      // Upload using WebSocket
      await websocketService.uploadPackage(file, metadata, (progress, message) => {
        setUploadProgress(progress);
        
        // Update phase based on progress
        if (progress === 0) {
          setUploadPhase('preparing');
        } else if (progress < 95) {
          setUploadPhase('transferring');
        } else {
          setUploadPhase('processing');
        }
        
        // Update stage based on message
        if (message) {
          if (typeof message === 'string') {
            setUploadStage(message);
          } else if (message.message) {
            setUploadStage(message.message);
          }
        }
      });

      onUploadComplete();
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      if (error.message === 'Upload cancelled by user') {
        setError('Upload was cancelled');
      } else {
        setError(error.message || 'Error uploading package');
      }
      setUploading(false);
    }
  };

  const handleCancelClick = () => {
    if (uploading) {
      setShowCancelConfirm(true);
    } else {
      handleClose();
    }
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    if (uploading) {
      websocketService.cancelCurrentUpload();
      // The upload promise will be rejected and caught in the catch block of handleSubmit
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelConfirm(false);
  };

  const handleClose = () => {
    setFile(null);
    setName('');
    setCategory('');
    setVersion('');
    setUploading(false);
    setUploadProgress(0);
    setUploadStage('');
    setUploadPhase('preparing');
    setUploadStartTime(null);
    setError('');
    setShowCancelConfirm(false);
    onClose();
  };

  const getProgressMessage = () => {
    switch (uploadPhase) {
      case 'preparing':
        return 'Preparing upload...';
      case 'transferring':
        return `Transferring to server...`;
      case 'processing':
        return 'Processing on server...';
      default:
        return 'Initializing...';
    }
  };

  const getElapsedTime = () => {
    if (!uploadStartTime) return '';
    
    const elapsed = Math.floor((Date.now() - uploadStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    return `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;
  };

  // Calculate a more realistic progress for better UX
  const getDisplayProgress = () => {
    if (uploadPhase === 'preparing') return 0;
    
    if (uploadPhase === 'transferring') {
      // Scale the actual progress (0-95) to display as 0-90
      return Math.min(90, Math.round((uploadProgress / 95) * 90));
    }
    
    if (uploadPhase === 'processing') {
      // Scale the actual progress (95-100) to display as 90-100
      const processingProgress = uploadProgress - 95;
      return 90 + Math.round((processingProgress / 5) * 10);
    }
    
    return uploadProgress;
  };

  // Get animation styles based on upload phase
  const getProgressBarStyles = () => {
    const baseStyles = {
      height: 10,
      borderRadius: 5,
      backgroundColor: 'rgba(253, 106, 66, 0.1)',
      '& .MuiLinearProgress-bar': {
        backgroundColor: 'rgba(253, 106, 66, 0.9)',
        transition: 'transform 0.2s linear'
      }
    };

    // Add phase-specific animations
    if (uploadPhase === 'preparing') {
      return {
        ...baseStyles,
        '& .MuiLinearProgress-bar': {
          ...baseStyles['& .MuiLinearProgress-bar'],
          animation: 'pulse 1.5s ease-in-out infinite',
          backgroundColor: 'rgba(253, 106, 66, 0.7)'
        },
        ...progressAnimations
      };
    }

    if (uploadPhase === 'transferring') {
      return {
        ...baseStyles,
        '& .MuiLinearProgress-bar': {
          ...baseStyles['& .MuiLinearProgress-bar'],
          backgroundImage: 'linear-gradient(90deg, rgba(253,106,66,0.8) 0%, rgba(253,106,66,1) 50%, rgba(253,106,66,0.8) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s linear infinite',
        },
        animation: 'glow 2s ease-in-out infinite',
        ...progressAnimations
      };
    }

    if (uploadPhase === 'processing') {
      return {
        ...baseStyles,
        '& .MuiLinearProgress-bar': {
          ...baseStyles['& .MuiLinearProgress-bar'],
          backgroundImage: 'linear-gradient(90deg, rgba(253,106,66,0.9) 0%, rgba(253,106,66,1) 50%, rgba(253,106,66,0.9) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s linear infinite',
        },
        animation: 'glow 1.5s ease-in-out infinite',
        ...progressAnimations
      };
    }

    return baseStyles;
  };

  const displayProgress = getDisplayProgress();
  const progressBarStyles = getProgressBarStyles();

  return (
    <>
      <Dialog 
        open={open} 
        onClose={uploading ? null : handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upload Package
          <IconButton
            onClick={uploading ? handleCancelClick : handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {!wsConnected && !uploading && (
              <Alert 
                severity="warning" 
                sx={{ mb: 2 }}
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={connectWebSocket}
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting...' : 'Connect'}
                  </Button>
                }
              >
                WebSocket is not connected
              </Alert>
            )}

            <input
              type="file"
              accept=".dmg,.pkg,.app,.zip"
              style={{ display: 'none' }}
              id="package-file-input"
              onChange={handleFileSelect}
            />
            <label htmlFor="package-file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                sx={{ mb: 3 }}
                disabled={uploading}
              >
                Select Package File
              </Button>
            </label>
            {file && (
              <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </Typography>
            )}

            <TextField
              fullWidth
              label="Package Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              disabled={uploading}
            />

            <TextField
              fullWidth
              select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              margin="normal"
              disabled={uploading}
            >
              {categories.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              margin="normal"
              placeholder="1.0.0"
              disabled={uploading}
            />

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 1 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {getProgressMessage()}
                    </Typography>
                    <Chip 
                      label={getElapsedTime()} 
                      size="small" 
                      variant="outlined" 
                      sx={{ 
                        height: 20, 
                        '& .MuiChip-label': { 
                          px: 1, 
                          fontSize: '0.7rem' 
                        } 
                      }}
                    />
                  </Box>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    fontWeight="bold"
                    sx={{
                      animation: uploadPhase !== 'preparing' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                      ...progressAnimations
                    }}
                  >
                    {displayProgress}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={displayProgress} 
                  sx={progressBarStyles}
                />
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  mt: 1,
                  px: 1
                }}>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      fontStyle: 'italic',
                      animation: uploadPhase !== 'preparing' ? 'pulse 2s ease-in-out infinite' : 'none',
                      animationDelay: '0.5s',
                      ...progressAnimations
                    }}
                  >
                    {uploadPhase === 'transferring' ? 'Transferring file to server' : 
                     uploadPhase === 'processing' ? 'Processing file on server' : 
                     'Preparing upload'}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                  >
                    {file && `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                  </Typography>
                </Box>
              </Box>
            )}

            {error && (
              <Typography 
                color="error" 
                variant="body2"
                sx={{ mt: 2 }}
              >
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelClick} 
            color={uploading ? "error" : "inherit"}
            variant={uploading ? "outlined" : "text"}
          >
            {uploading ? "Cancel Upload" : "Cancel"}
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={!file || !name || !category || !version || uploading}
            sx={{
              backgroundColor: 'rgba(253, 106, 66, 255)',
              '&:hover': {
                backgroundColor: 'rgba(253, 106, 66, 0.9)',
              }
            }}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={showCancelConfirm}
        onClose={handleCancelDismiss}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <DialogTitle id="cancel-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Cancel Upload?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-dialog-description">
            Are you sure you want to cancel this upload? The process will be stopped and cannot be resumed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDismiss} color="primary">
            Continue Upload
          </Button>
          <Button onClick={handleCancelConfirm} color="error" variant="contained">
            Yes, Cancel Upload
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UploadPackageDialog;
