import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  LinearProgress,
  Typography
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import '../styles/LogoutWarning.css';

const LogoutWarning = ({ open, onStayLoggedIn, onLogout, remainingTime }) => {
  // Calculate progress value (0-100)
  const progress = (remainingTime / 60) * 100; // 60 seconds warning time

  return (
    <Dialog
      open={open}
      onClose={onStayLoggedIn}
      aria-labelledby="logout-warning-title"
      aria-describedby="logout-warning-description"
    >
      <DialogTitle 
        id="logout-warning-title"
        className="logout-warning-title"
      >
        <WarningIcon color="warning" />
        Session Timeout Warning
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="logout-warning-description">
          Your session is about to expire due to inactivity. You will be automatically logged out in:
        </DialogContentText>
        <Box className="logout-warning-timer">
          <Typography 
            variant="h4" 
            className="logout-warning-countdown"
          >
            {Math.floor(remainingTime)} seconds
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={progress}
            color="warning"
            className="logout-warning-progress"
          />
        </Box>
      </DialogContent>
      <DialogActions className="logout-warning-actions">
        <Button 
          onClick={onLogout}
          color="error"
          variant="outlined"
        >
          Logout Now
        </Button>
        <Button
          onClick={onStayLoggedIn}
          variant="contained"
          autoFocus
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogoutWarning;
