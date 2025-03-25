import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import config from '../config';

const EngineerHeader = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleOpenDialog = () => {
    handleClose();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedImage(null);
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/auth/update-avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: selectedImage })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        handleCloseDialog();
        window.location.reload(); // Refresh to show new avatar
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1a73e8' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {config.appName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            {user.name}
          </Typography>
          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar 
              src={user.avatar} 
              alt={user.name}
              sx={{ 
                width: 40, 
                height: 40,
                bgcolor: user.avatar ? 'transparent' : '#1557b0'
              }}
            >
              {!user.avatar && user.name?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {user.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Admin
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleOpenDialog}>Update Profile Picture</MenuItem>
            <MenuItem onClick={handleLogout}>Sign Out</MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Update Profile Picture</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            {selectedImage ? (
              <Avatar
                src={selectedImage}
                sx={{ width: 150, height: 150, mx: 'auto', mb: 2 }}
              />
            ) : (
              <Avatar
                src={user.avatar}
                sx={{ width: 150, height: 150, mx: 'auto', mb: 2 }}
              >
                {user.name?.charAt(0).toUpperCase()}
              </Avatar>
            )}
            <Input
              type="file"
              onChange={handleImageChange}
              accept="image/*"
              sx={{ display: 'none' }}
              id="avatar-input"
            />
            <label htmlFor="avatar-input">
              <Button variant="outlined" component="span">
                Choose Image
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!selectedImage}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

export default EngineerHeader;
