import React, { useState, useEffect } from 'react';
import {
  Box, Container, Paper, Typography, TextField, Button,
  Avatar, IconButton, Alert, CircularProgress,
  InputAdornment, FormControl, InputLabel, OutlinedInput,
  FormHelperText, Accordion, AccordionSummary, AccordionDetails, Tooltip
} from '@mui/material';
import { 
  PhotoCamera as PhotoCameraIcon, 
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Home as HomeIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import authService from '../api/authService';
import config from '../config';
import '../styles/UserSettingsPage.css';

const AdminSettingsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser() || {});
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [position, setPosition] = useState(user?.position || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Password states
  const [passwordStates, setPasswordStates] = useState({
    current: '',
    new: '',
    confirm: '',
    showCurrent: false,
    showNew: false,
    showConfirm: false,
    error: '',
    success: '',
    loading: false
  });

  // Helper function to get avatar URL
  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return '/default-avatar.svg';
    if (avatarPath.startsWith('data:') || avatarPath.startsWith('http')) return avatarPath;
    return avatarPath.startsWith('/') 
      ? `${config.apiUrl}${avatarPath}` 
      : `${config.apiUrl}/uploads/${avatarPath}`;
  };

  // Fetch user profile on mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'admin') {
        navigate('/login');
        return;
      }
      setUser(parsedUser);
      setName(parsedUser.name || '');
      setDepartment(parsedUser.department || '');
      setPosition(parsedUser.position || '');
      setAvatar(parsedUser.avatar || null);
      setIsInitialized(true);
    }
  }, [navigate]);

  const handleAvatarChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => setPreviewAvatar(event.target.result);
      reader.readAsDataURL(file);
      setAvatar(file);
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
  };

  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    setDepartment(value);
  };

  const handlePositionChange = (e) => {
    const value = e.target.value;
    setPosition(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('department', department);
      formData.append('position', position);
      formData.append('role', 'admin'); // Ensure role is preserved

      // If avatar is a base64 string, convert it to a file
      if (previewAvatar && previewAvatar.startsWith('data:image')) {
        const response = await fetch(previewAvatar);
        const blob = await response.blob();
        formData.append('avatar', blob, 'avatar.jpg');
      }

      const response = await fetch(`${config.apiUrl}/admin/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update user data
      const updatedUser = { 
        ...user, 
        name, 
        department,
        position,
        avatar: data.avatar,
        role: 'admin'
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setAvatar(data.avatar);

      // Dispatch custom event to notify Header
      window.dispatchEvent(new CustomEvent('userUpdated', { 
        detail: updatedUser 
      }));
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePasswordState = (field, value) => {
    setPasswordStates(prev => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordStates.loading) return;
    
    updatePasswordState('loading', true);
    updatePasswordState('error', '');
    updatePasswordState('success', '');

    const { current, new: newPass, confirm } = passwordStates;

    // Validate passwords
    if (!current) {
      updatePasswordState('error', 'Current password is required');
      updatePasswordState('loading', false);
      return;
    }
    if (!newPass) {
      updatePasswordState('error', 'New password is required');
      updatePasswordState('loading', false);
      return;
    }
    if (newPass.length < 6) {
      updatePasswordState('error', 'New password must be at least 6 characters long');
      updatePasswordState('loading', false);
      return;
    }
    if (newPass !== confirm) {
      updatePasswordState('error', 'New passwords do not match');
      updatePasswordState('loading', false);
      return;
    }

    try {
      await authService.changePassword(current, newPass);
      updatePasswordState('current', '');
      updatePasswordState('new', '');
      updatePasswordState('confirm', '');
      updatePasswordState('success', 'Password changed successfully');
    } catch (error) {
      updatePasswordState('error', error.message || 'Failed to change password');
    } finally {
      updatePasswordState('loading', false);
    }
  };

  // Function to navigate to admin dashboard
  const navigateToAdmin = () => {
    window.location.href = '/admin';
  };

  if (loading && !isInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container className="settings-container" maxWidth="md">
      {/* Home Icon */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Go to Admin Dashboard">
          <IconButton
            onClick={navigateToAdmin}
            sx={{
              color: 'rgba(253, 106, 66, 0.9)',
              '&:hover': {
                bgcolor: 'rgba(253, 106, 66, 0.08)'
              }
            }}
          >
            <HomeIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Profile Settings */}
      <Paper className="settings-paper">
        <Typography variant="h4" component="h1" className="settings-title">
          Admin Profile Settings
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
        
        <form onSubmit={handleSubmit} className="form-layout" encType="multipart/form-data">
          <Box className="form-row">
            {/* Avatar */}
            <Box className="avatar-section">
              <Box className="avatar-container">
                <Avatar
                  src={previewAvatar || getAvatarUrl(user?.avatar)}
                  alt={name}
                  className="avatar-image"
                  sx={{ width: 150, height: 150 }}
                />
                <input
                  accept="image/*"
                  type="file"
                  id="avatar-upload"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="avatar-upload">
                  <IconButton
                    color="primary"
                    component="span"
                    className="avatar-upload-button"
                    sx={{ 
                      position: 'absolute',
                      bottom: '15px',
                      right: '15px',
                      padding: '18px'
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 32 }} className="avatar-icon" />
                  </IconButton>
                </label>
              </Box>
              <Typography variant="body2" className="avatar-helper-text">
                Click the camera icon to upload a new profile picture
              </Typography>
            </Box>
            
            {/* Form Fields */}
            <Box className="form-fields">
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={name}
                onChange={handleNameChange}
                variant="outlined"
                className="text-field"
                disabled={loading}
              />
              
              <TextField
                fullWidth
                label="Email"
                value={user?.email || ''}
                disabled
                variant="outlined"
                helperText="Email cannot be changed"
                className="text-field"
              />
              
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={department}
                onChange={handleDepartmentChange}
                variant="outlined"
                className="text-field"
                disabled={loading}
              />
              
              <TextField
                fullWidth
                label="Position"
                name="position"
                value={position}
                onChange={handlePositionChange}
                variant="outlined"
                className="text-field"
                disabled={loading}
              />
            </Box>
          </Box>
          
          {/* Buttons */}
          <Box className="button-container">
            <Button 
              variant="outlined"
              onClick={navigateToAdmin}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              variant="contained"
              disabled={loading}
              className="submit-button"
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
            </Button>
          </Box>
        </form>

        {/* Change Password Accordion */}
        <Accordion className="password-accordion">
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="password-content"
            id="password-header"
          >
            <Typography variant="h6" component="h2">
              Change Password
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {passwordStates.error && <Alert severity="error" sx={{ mb: 3 }}>{passwordStates.error}</Alert>}
            {passwordStates.success && <Alert severity="success" sx={{ mb: 3 }}>{passwordStates.success}</Alert>}
            
            <form onSubmit={handleChangePassword} className="password-form">
              <FormControl variant="outlined" fullWidth>
                <InputLabel htmlFor="current-password">Current Password</InputLabel>
                <OutlinedInput
                  id="current-password"
                  type={passwordStates.showCurrent ? 'text' : 'password'}
                  value={passwordStates.current}
                  onChange={(e) => updatePasswordState('current', e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => updatePasswordState('showCurrent', !passwordStates.showCurrent)}
                        edge="end"
                        disabled={passwordStates.loading}
                      >
                        {passwordStates.showCurrent ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="Current Password"
                  className="password-field"
                  disabled={passwordStates.loading}
                />
              </FormControl>
              
              <FormControl variant="outlined" fullWidth>
                <InputLabel htmlFor="new-password">New Password</InputLabel>
                <OutlinedInput
                  id="new-password"
                  type={passwordStates.showNew ? 'text' : 'password'}
                  value={passwordStates.new}
                  onChange={(e) => updatePasswordState('new', e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => updatePasswordState('showNew', !passwordStates.showNew)}
                        edge="end"
                        disabled={passwordStates.loading}
                      >
                        {passwordStates.showNew ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="New Password"
                  className="password-field"
                  disabled={passwordStates.loading}
                />
                <FormHelperText>
                  Password must be at least 6 characters long
                </FormHelperText>
              </FormControl>
              
              <FormControl variant="outlined" fullWidth>
                <InputLabel htmlFor="confirm-password">Confirm New Password</InputLabel>
                <OutlinedInput
                  id="confirm-password"
                  type={passwordStates.showConfirm ? 'text' : 'password'}
                  value={passwordStates.confirm}
                  onChange={(e) => updatePasswordState('confirm', e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => updatePasswordState('showConfirm', !passwordStates.showConfirm)}
                        edge="end"
                        disabled={passwordStates.loading}
                      >
                        {passwordStates.showConfirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="Confirm New Password"
                  className="password-field"
                  disabled={passwordStates.loading}
                />
              </FormControl>
              
              <Box className="button-container">
                <Button 
                  type="submit"
                  variant="contained"
                  disabled={passwordStates.loading}
                  className="submit-button"
                >
                  {passwordStates.loading ? <CircularProgress size={24} color="inherit" /> : 'Change Password'}
                </Button>
              </Box>
            </form>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Container>
  );
};

export default AdminSettingsPage;
