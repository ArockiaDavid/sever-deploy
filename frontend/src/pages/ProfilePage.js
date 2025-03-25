import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Avatar, 
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import config from '../config';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setName(parsedUser.name || '');
      setEmail(parsedUser.email || '');
      // If avatar exists and is a data URL, extract the base64 part
      if (parsedUser.avatar && parsedUser.avatar.startsWith('data:image')) {
        setAvatar(parsedUser.avatar.split(',')[1]);
      } else {
        setAvatar(null);
      }
    }
  }, []);

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove the data:image/* prefix from base64 string
        const base64String = reader.result.split(',')[1];
        setAvatar(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          avatar
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update local storage with new user data
      const updatedUser = { 
        ...user, 
        name, 
        email, 
        avatar: avatar ? `data:image/jpeg;base64,${avatar}` : user.avatar 
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setSuccess('Profile updated successfully');
      
      // Navigate back to home after successful update
      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        boxShadow: 1
      }}>
        <IconButton 
          color="inherit" 
          onClick={() => navigate('/home')}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">
          Edit Profile
        </Typography>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={avatar ? `data:image/jpeg;base64,${avatar}` : user?.avatar}
                alt={name}
                sx={{
                  width: 100,
                  height: 100,
                  mb: 2
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
                    bottom: 16,
                    right: -8,
                    backgroundColor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': {
                      backgroundColor: 'background.paper',
                    }
                  }}
                >
                  <PhotoCameraIcon />
                </IconButton>
              </label>
            </Box>

            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              type="email"
            />

            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/home')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
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
      </Container>
    </Box>
  );
};

export default ProfilePage;
