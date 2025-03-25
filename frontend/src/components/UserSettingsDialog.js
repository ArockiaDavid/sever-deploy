import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Avatar,
  IconButton,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';
import userProfileService from '../api/userProfileService';
import config from '../config';

const UserSettingsDialog = ({ open, onClose, user, onUserUpdate }) => {
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Helper function to get avatar URL
  const getAvatarUrl = (avatarPath) => {
    if (avatarPath) {
      if (avatarPath.startsWith('data:')) return avatarPath;
      if (avatarPath.startsWith('http')) return avatarPath;
      if (avatarPath.startsWith('/')) return `${config.apiUrl}${avatarPath}`;
      return `${config.apiUrl}/uploads/${avatarPath}`;
    }
    return '/default-avatar.svg';
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewAvatar(event.target.result);
      };
      reader.readAsDataURL(file);
      
      // Store the file for upload
      setAvatar(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create FormData if we have an avatar file
      if (avatar instanceof File) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('avatar', avatar);
        
        // Use the userProfileService to update the profile
        const updatedUser = await userProfileService.updateUserProfile(formData, true);
        
        // Call the onUserUpdate callback with the updated user data
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }
        
        setSuccess('Profile updated successfully!');
      } else {
        // Just update the name
        const updatedUser = await userProfileService.updateUserProfile({ name });
        
        // Call the onUserUpdate callback with the updated user data
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }
        
        setSuccess('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        bgcolor: 'rgba(253, 106, 66, 0.05)',
        color: 'rgba(253, 106, 66, 0.9)',
        fontWeight: 600
      }}>
        User Settings
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Box 
          component="form" 
          onSubmit={handleSubmit}
          sx={{ 
            mt: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3
          }}
        >
          {/* Avatar Upload */}
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={previewAvatar || getAvatarUrl(user?.avatar)}
              alt={name}
              sx={{
                width: 120,
                height: 120,
                border: '3px solid',
                borderColor: 'rgba(253,106,66,0.8)',
                boxShadow: '0 2px 12px rgba(253,106,66,0.2)',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
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
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: -4,
                  backgroundColor: 'white',
                  boxShadow: '0 2px 8px rgba(253,106,66,0.2)',
                  padding: '8px',
                  '&:hover': {
                    backgroundColor: 'white',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <PhotoCameraIcon sx={{ color: 'rgba(253,106,66,0.9)', fontSize: 20 }} />
              </IconButton>
            </label>
          </Box>
          
          {/* Name Field */}
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={handleNameChange}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '&:hover fieldset': {
                  borderColor: 'rgba(253,106,66,0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(253,106,66,0.8)',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'rgba(253,106,66,0.8)',
              }
            }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'flex-start', mt: -2 }}>
            Email: {user?.email || 'Not available'}
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: '8px',
            borderColor: 'rgba(253,106,66,0.8)',
            color: 'rgba(253,106,66,0.8)',
            '&:hover': {
              borderColor: 'rgba(253,106,66,1)',
              backgroundColor: 'rgba(253,106,66,0.05)'
            }
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{
            borderRadius: '8px',
            bgcolor: 'rgba(253,106,66,0.8)',
            '&:hover': {
              bgcolor: 'rgba(253,106,66,1)'
            }
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Save Changes'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserSettingsDialog;
