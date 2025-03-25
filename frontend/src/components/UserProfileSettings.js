import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  PhotoCamera as PhotoCameraIcon,
  ExpandMore as ExpandMoreIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import userProfileService from '../api/userProfileService';
import authService from '../api/authService';

const UserProfileSettings = ({ onNavigateToHome }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    avatar: null
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const userData = await userProfileService.getUserProfile();
        console.log('Fetched user profile:', userData);
        setUser(userData);
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          department: userData.department || '',
          position: userData.position || '',
          avatar: null
        });
        setPreviewUrl(userData.avatar || '');
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load user profile. Please try again later.');
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        avatar: file
      }));

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      console.log('Submitting form data:', formData);

      // Ensure department and position are not undefined or null
      const department = formData.department || '';
      const position = formData.position || '';
      
      // Use JSON data for the profile update
      const jsonData = {
        name: formData.name,
        email: formData.email,
        department: department,
        position: position
      };
      
      console.log('Sending JSON data:', jsonData);
      
      try {
        // Try with JSON data
        const updatedProfile = await userProfileService.updateUserProfile(jsonData, false);
        console.log('Profile updated successfully:', updatedProfile);
        
        // Update local user data
        const updatedUser = await userProfileService.getUserProfile();
        setUser(updatedUser);
        
        // Update auth user data
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          currentUser.name = formData.name;
          currentUser.email = formData.email;
          currentUser.department = department;
          currentUser.position = position;
          if (updatedUser.avatar) {
            currentUser.avatar = updatedUser.avatar;
          }
          authService.setCurrentUser(currentUser);
        }
        
        setSuccess('Profile updated successfully!');
      } catch (jsonError) {
        console.error('Error updating profile with JSON:', jsonError);
        
        // If JSON update fails, try with FormData as fallback
        console.log('Trying with FormData as fallback');
        
        // Create form data for file upload
        const data = new FormData();
        data.append('name', formData.name);
        data.append('email', formData.email);
        data.append('department', department);
        data.append('position', position);
        
        if (formData.avatar) {
          data.append('avatar', formData.avatar);
        }

        // Log FormData contents for debugging
        for (let pair of data.entries()) {
          console.log(`FormData contains: ${pair[0]}: ${pair[1]}`);
        }
        
        const updatedProfile = await userProfileService.updateUserProfile(data, true);
        console.log('Profile updated successfully with FormData:', updatedProfile);
        
        // Update local user data
        const updatedUser = await userProfileService.getUserProfile();
        setUser(updatedUser);
        
        // Update auth user data
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          currentUser.name = formData.name;
          currentUser.email = formData.email;
          currentUser.department = department;
          currentUser.position = position;
          if (updatedUser.avatar) {
            currentUser.avatar = updatedUser.avatar;
          }
          authService.setCurrentUser(currentUser);
        }
        
        setSuccess('Profile updated successfully!');
      }
      
      setSaving(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setChangingPassword(true);
      setPasswordError('');
      setPasswordSuccess('');
      
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setChangingPassword(false);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error.response?.data?.message || 'Failed to change password. Please try again.');
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          User Profile Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Avatar
                  src={previewUrl}
                  alt={formData.name}
                  sx={{
                    width: 150,
                    height: 150,
                    border: '4px solid',
                    borderColor: 'rgba(253, 106, 66, 0.2)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <IconButton
                  color="primary"
                  aria-label="upload picture"
                  component="label"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'white',
                    '&:hover': { bgcolor: 'grey.100' },
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                  <PhotoCameraIcon />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary" align="center">
                Click the camera icon to upload a new profile picture
              </Typography>
            </Grid>

            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    variant="outlined"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    variant="outlined"
                    required
                    type="email"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Department"
                    name="department"
                    value={formData.department || ''}
                    onChange={handleInputChange}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Position"
                    name="position"
                    value={formData.position || ''}
                    onChange={handleInputChange}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={onNavigateToHome}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Password Change Section */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="change-password-content"
            id="change-password-header"
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LockIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Change Password
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {passwordError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {passwordError}
              </Alert>
            )}

            {passwordSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {passwordSuccess}
              </Alert>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordInputChange}
                    variant="outlined"
                    required
                    type="password"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    variant="outlined"
                    required
                    type="password"
                    helperText="Password must be at least 6 characters long"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    variant="outlined"
                    required
                    type="password"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={changingPassword}
                  startIcon={changingPassword ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </Box>
            </form>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Container>
  );
};

export default UserProfileSettings;
