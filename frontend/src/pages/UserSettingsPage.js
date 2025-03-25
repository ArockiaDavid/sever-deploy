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
import userProfileService from '../api/userProfileService';
import config from '../config';
import '../styles/UserSettingsPage.css';

const UserSettingsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser() || {});
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [position, setPosition] = useState(user?.position || '');
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);
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
  const getAvatarUrl = () => {
    // If previewAvatar is set (local file selected), use it
    if (previewAvatar) return previewAvatar;
    
    // If avatarUrl is provided (from DB), use it
    if (avatarUrl) return avatarUrl;
    
    // Otherwise use default avatar
    return '/default-avatar.svg';
  };

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const profileData = await userProfileService.getUserProfile();
        console.log('Fetched profile data in UserSettingsPage:', profileData);
        
        if (profileData) {
          setName(profileData.name || '');
          setDepartment(profileData.department || '');
          setPosition(profileData.position || '');
          
          if (profileData.avatarUrl) {
            setAvatarUrl(profileData.avatarUrl);
            console.log('Setting avatarUrl in UserSettingsPage:', profileData.avatarUrl);
          }
          
          setUser(profileData);
        }
        
        setIsInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load user profile. Please try again later.');
        setLoading(false);
        setIsInitialized(true);
      }
    };
    
    fetchUserProfile();
  }, []);

  const handleAvatarChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      
      // Check file size (limit to 1MB)
      if (file.size > 1024 * 1024) {
        setError('Image size should be less than 1MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewAvatar(event.target.result);
        console.log('Preview avatar set');
      };
      reader.readAsDataURL(file);
      setAvatar(file);
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    console.log('Name changed:', value);
    setName(value);
  };

  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    console.log('Department changed:', value);
    setDepartment(value);
  };

  const handlePositionChange = (e) => {
    const value = e.target.value;
    console.log('Position changed:', value);
    setPosition(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('department', department);
      formData.append('position', position);
      
      if (avatar) {
        formData.append('avatar', avatar);
        console.log('Appending avatar to form data');
      }
      
      console.log('Submitting form data');
      
      const updatedProfile = await userProfileService.updateUserProfile(formData, true);
      console.log('Profile updated successfully:', updatedProfile);
      
      // Update local user data
      const refreshedUser = await userProfileService.getUserProfile();
      if (refreshedUser) {
        setUser(refreshedUser);
        
        if (refreshedUser.avatarUrl) {
          setAvatarUrl(refreshedUser.avatarUrl);
          console.log('Setting avatarUrl after update:', refreshedUser.avatarUrl);
        }
        
        // Update user in localStorage
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            name,
            department,
            position,
            avatarUrl: refreshedUser.avatarUrl
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Dispatch userUpdated event to update the header
          window.dispatchEvent(new CustomEvent('userUpdated', { 
            detail: updatedUser 
          }));
          
          console.log('Dispatched userUpdated event with:', updatedUser);
        }
        
        setSuccess('Profile updated successfully!');
        
        // Clear the file input
        setAvatar(null);
        
        // Don't reload the page, just show success message
        // setTimeout(() => {
        //   window.location.reload();
        // }, 1500);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
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

  // Function to navigate to home page
  const navigateToHome = () => {
    console.log('Navigating to home page');
    navigate('/home');
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
        <Tooltip title="Go to Home">
          <IconButton
            onClick={navigateToHome}
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
          Profile Settings
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
        
        <form onSubmit={handleSubmit} className="form-layout" encType="multipart/form-data">
          <Box className="form-row">
            {/* Avatar */}
            <Box className="avatar-section">
              <Box className="avatar-container">
                <Avatar
                  src={getAvatarUrl()}
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
                Click the camera icon to upload a new profile picture (max 1MB)
              </Typography>
              {avatarUrl && (
                <Typography variant="caption" color="text.secondary">
                  Current avatar URL: {avatarUrl}
                </Typography>
              )}
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
              onClick={navigateToHome}
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

export default UserSettingsPage;
