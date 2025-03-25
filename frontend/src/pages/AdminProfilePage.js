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

const AdminProfilePage = () => {
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
      if (parsedUser.role !== 'admin') {
        navigate('/login');
        return;
      }
      setUser(parsedUser);
      setName(parsedUser.name || '');
      setEmail(parsedUser.email || '');
      setAvatar(parsedUser.avatar || null);
    }
  }, [navigate]);

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
        setError(''); // Clear any previous errors
      };
      reader.onerror = () => {
        setError('Error reading file');
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset error when component unmounts
  useEffect(() => {
    return () => setError('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('role', 'admin'); // Ensure role is preserved

      // If avatar is a base64 string, convert it to a file
      if (avatar && avatar.startsWith('data:image')) {
        const response = await fetch(avatar);
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
        email, 
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
      
      // Navigate to admin dashboard after a short delay
      setTimeout(() => {
        window.location.replace('/admin');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (avatar) {
      // If avatar is a base64 string from file selection
      if (avatar.startsWith('data:')) {
        return avatar;
      }
      // If avatar is a full URL
      if (avatar.startsWith('http')) {
        return avatar;
      }
      // If avatar is a server path
      return `${config.apiUrl}${avatar}`;
    }
    return null;
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
          onClick={() => navigate('/admin')}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">
          Edit Admin Profile
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
                src={getAvatarUrl()}
                alt={name}
                sx={{
                  width: 100,
                  height: 100,
                  mb: 2,
                  border: '2px solid',
                  borderColor: 'primary.main'
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
                onClick={() => navigate('/admin')}
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

export default AdminProfilePage;
