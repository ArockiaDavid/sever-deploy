import React from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  LinearProgress,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const InstallProgress = ({ 
  open, 
  onClose, 
  progress = 0, 
  message = '', 
  details = '',
  title = 'Installation Progress',
  error = null
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton 
          edge="end" 
          onClick={onClose}
          sx={{ 
            color: 'rgba(0, 0, 0, 0.54)',
            '&:hover': {
              color: 'rgba(0, 0, 0, 0.87)',
              background: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ width: '100%', mb: 3 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(253, 106, 66, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: error ? '#d32f2f' : 'rgba(253, 106, 66, 0.8)',
                transition: 'transform 0.3s ease'
              }
            }}
          />
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            mt: 1
          }}>
            <Typography 
              variant="body2" 
              color={error ? 'error' : 'textSecondary'}
              sx={{ fontWeight: 500 }}
            >
              {error ? 'Error' : `${Math.round(progress)}%`}
            </Typography>
            <Typography 
              variant="body2" 
              color="textSecondary"
              sx={{ fontWeight: 500 }}
            >
              {message}
            </Typography>
          </Box>
        </Box>

        {details && (
          <Box 
            sx={{ 
              mt: 2,
              p: 2,
              borderRadius: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              maxHeight: 200,
              overflowY: 'auto'
            }}
          >
            <Typography 
              variant="body2" 
              component="pre"
              sx={{ 
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                m: 0,
                color: error ? 'error.main' : 'text.secondary'
              }}
            >
              {details}
            </Typography>
          </Box>
        )}

        {error && (
          <Typography 
            color="error" 
            sx={{ 
              mt: 2,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {error}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InstallProgress;
