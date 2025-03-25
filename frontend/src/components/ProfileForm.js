import React, { useState } from 'react';
import { 
  Paper, 
  Box, 
  TextField, 
  Button, 
  Alert,
  CircularProgress,
  Avatar,
  IconButton
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';
import config from '../config';

const ProfileForm = ({ 
  name,
  email,
  avatar,
  avatarUrl,
  loading,
  error,
  success,
  onNameChange,
  onEmailChange,
  onAvatarChange,
  onSubmit,
  onCancel
}) => {
  const [avatarError, setAvatarError] = useState(false);
  
  const getAvatarUrl = () => {
    // If there was an error loading the avatar, use default
    if (avatarError) {
      return '/default-avatar.svg';
    }
    
    // If avatarUrl is provided (from DB), use it
    if (avatarUrl) return avatarUrl;
    
    // Otherwise handle avatar as before (for backward compatibility and local preview)
    if (avatar) {
      if (avatar.startsWith('data:')) return avatar;
      if (avatar.startsWith('http')) return avatar;
      return avatar;
    }
    
    return null;
  };

  // Handle avatar load error
  const handleAvatarError = () => {
    console.log('Avatar failed to load in ProfileForm, using default avatar');
    setAvatarError(true);
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3,
        bgcolor: 'white',
        border: '1px solid rgba(253,106,66,0.2)',
        borderRadius: '16px',
        maxWidth: '380px',
        mx: 'auto',
        mt: 4,
        boxShadow: '0 4px 20px rgba(253,106,66,0.1)',
        transition: 'transform 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 6px 24px rgba(253,106,66,0.15)'
        }
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: '8px' }}>
          {success}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Box sx={{ position: 'relative', mb: 1 }}>
          <Avatar
            src={getAvatarUrl()}
            alt={name}
            onError={handleAvatarError}
            sx={{
              width: 100,
              height: 100,
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
            onChange={onAvatarChange}
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

        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={onNameChange}
          size="small"
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

        <TextField
          fullWidth
          label="Email"
          value={email}
          onChange={onEmailChange}
          size="small"
          type="email"
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

        <Box sx={{ display: 'flex', gap: 2, width: '100%', mt: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={onCancel}
            sx={{
              borderRadius: '8px',
              borderColor: 'rgba(253,106,66,0.8)',
              color: 'rgba(253,106,66,0.8)',
              textTransform: 'none',
              '&:hover': {
                borderColor: 'rgba(253,106,66,1)',
                backgroundColor: 'rgba(253,106,66,0.05)'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              borderRadius: '8px',
              bgcolor: 'rgba(253,106,66,0.8)',
              textTransform: 'none',
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
        </Box>
      </Box>
    </Paper>
  );
};

export default ProfileForm;
