import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Link,
  InputAdornment,
  Alert,
  IconButton,
  Paper
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import authService from '../api/authService';
import userStatusService from '../api/userStatusService';
import '../styles/AdminLoginPage.css';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired')) {
      setError('Your session has expired. Please login again.');
    } else if (params.get('error') === 'token') {
      setError('Authentication error. Please login again.');
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email.endsWith('@piramal.com')) {
        setError('Only @piramal.com email addresses are allowed');
        return;
      }
      
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      
      const response = await authService.login(email, password, 'admin');
      console.log('Login response:', response); // Debug log
      
      // Role verification is now handled by the backend

      // Clean up any existing status tracking first
      await userStatusService.cleanupStatusTracking();
      
      // Wait a moment before setting up new status tracking
      setTimeout(() => {
        console.log('Setting up status tracking for admin:', response.user._id);
        userStatusService.setupStatusTracking(response.user._id);
      }, 1000);
      
      navigate('/admin');
    } catch (error) {
      console.error('Admin Login Error:', {
        error,
        message: error.message,
        stack: error.stack,
        response: error.response
      });

      if (!navigator.onLine) {
        setError('Unable to connect to server. Please check your network connection.');
        return;
      }

      try {
        const message = error.message || '';
        const [status, errorMsg] = message.split(':');
        
        switch (status) {
          case '401':
            setError('Invalid email or password');
            break;
          case '403':
            setError('You do not have admin privileges');
            break;
          case '404':
            setError('No admin account found with this email');
            break;
          case '400':
            setError(errorMsg || 'Only @piramal.com email addresses are allowed');
            break;
          default:
            setError('Failed to login. Please try again later.');
        }
      } catch (e) {
        console.error('Error parsing error message:', e);
        setError('Failed to login. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Left side illustration - hidden on mobile */}
      <Box sx={{ 
        flex: 1,
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ff8a00, #ff6a00)',
        p: 4
      }}>
        <Box sx={{ 
          p: 4,
          borderRadius: 2,
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <ShieldIcon 
            sx={{ 
              fontSize: 120,
              color: '#ffffff',
              mb: 3
            }}
          />
          <Typography variant="h4" sx={{ 
            fontWeight: 600,
            color: '#ffffff',
            mb: 2
          }}>
            Admin Portal
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            color: '#ffffff',
            opacity: 0.9
          }}>
            Secure access for administrators
          </Typography>
        </Box>
      </Box>
      
      {/* Right side login form */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 4 }
      }}>
        <Paper sx={{ 
          p: { xs: 3, sm: 4 },
          borderRadius: 2,
          boxShadow: 2,
          maxWidth: '450px',
          width: '100%'
        }}>
          {/* Header */}
          <Box sx={{ 
            textAlign: 'center',
            mb: 3
          }}>
            <ShieldIcon sx={{ 
              fontSize: 48,
              color: 'rgba(253, 106, 66, 0.9)',
              mb: 2
            }} />
            <Typography variant="h4" sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              mb: 1
            }}>
              Admin Portal
            </Typography>
            <Typography variant="subtitle1" sx={{ 
              color: 'text.secondary',
              mb: 2
            }}>
              Secure access for administrators
            </Typography>
          </Box>

          {/* Error message */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                color: '#d32f2f',
                backgroundColor: '#ffebee',
                border: '1px solid #ef5350',
                '& .MuiAlert-message': {
                  color: '#d32f2f',
                  fontWeight: 500
                },
                '& .MuiAlert-icon': {
                  color: '#d32f2f'
                }
              }}
            >
              {error}
            </Alert>
          )}

          {/* Login form */}
          <Box 
            component="form" 
            onSubmit={handleSubmit}
            sx={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
          >
            <TextField
              required
              fullWidth
              id="email"
              label="Admin Email"
              name="email"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input"
              InputLabelProps={{
                sx: {
                  color: 'black'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon className="input-icon" />
                  </InputAdornment>
                ),
                sx: {
                  color: 'black',
                  '& .MuiInputBase-input': {
                    color: 'black'
                  }
                }
              }}
            />

            <TextField
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input"
              InputLabelProps={{
                sx: {
                  color: 'black'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon className="input-icon" />
                  </InputAdornment>
                ),
                sx: {
                  color: 'black',
                  '& .MuiInputBase-input': {
                    color: 'black'
                  }
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ 
              display: 'flex',
              justifyContent: 'flex-end',
              mb: 1
            }}>
              <Link 
                component={RouterLink}
                to="/forgot-password"
                sx={{
                color: 'rgba(253, 106, 66, 0.9)',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                backgroundColor: 'rgba(253, 106, 66, 0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(253, 106, 66, 0.8)'
                },
                py: 1.5,
                mb: 2,
                mt: 1
              }}
            >
              {loading ? 'Signing in...' : 'Sign In as Admin'}
            </Button>

            <Button
              component={RouterLink}
              to="/login"
              startIcon={<ArrowBackIcon />}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              Back to User Login
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              This is a secure area. Please ensure you have the necessary permissions.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminLoginPage;
