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
  AdminPanelSettings as AdminIcon,
  Store as StoreIcon
} from '@mui/icons-material';
import authService from '../api/authService';
import userStatusService from '../api/userStatusService';
import { websocketService } from '../api/websocketService';
import SSOLogin from '../components/SSOLogin';
import '../styles/LoginPage.css';

const LoginPage = () => {
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
      
      const response = await authService.login(email, password, 'user');
      
      // Clean up any existing connections
      websocketService.disconnect();
      await userStatusService.cleanupStatusTracking();
      
      // For demo purposes, bypass WebSocket connection during login
      // WebSocket will only be connected when needed for package uploads
      console.log('Bypassing WebSocket connection during login for demo purposes');
      
      // Still set up user status tracking
      userStatusService.setupStatusTracking(response.user._id);
      
      navigate('/home', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      if (!navigator.onLine) {
        setError('Unable to connect to server. Please check your network connection.');
      } else if (error.message.includes('401')) {
        setError('Invalid email or password');
      } else if (error.message.includes('403')) {
        setError('Invalid account type for this login. Please use the correct login page.');
      } else {
        setError('Failed to login. Please try again.');
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
          <StoreIcon 
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
            Welcome to Software Center
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            color: '#ffffff',
            opacity: 0.9
          }}>
            Manage and deploy your software with ease
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
          <Typography variant="h4" sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            mb: 1
          }}>
            Sign In
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            color: 'text.secondary',
            mb: 3
          }}>
            Welcome back! Please enter your details
          </Typography>

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
              label="Email Address"
              name="email"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon className="input-icon" />
                  </InputAdornment>
                ),
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
              className="login-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon className="input-icon" />
                  </InputAdornment>
                ),
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <SSOLogin onError={setError} />

            <Button
              component={RouterLink}
              to="/admin-login"
              fullWidth
              variant="outlined"
              startIcon={<AdminIcon />}
              sx={{
                borderColor: 'rgba(253, 106, 66, 0.5)',
                color: 'rgba(253, 106, 66, 0.9)',
                '&:hover': {
                  borderColor: 'rgba(253, 106, 66, 0.9)',
                  backgroundColor: 'rgba(253, 106, 66, 0.05)'
                },
                mb: 2
              }}
            >
              Admin Login
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Don't have an account?{' '}
                <Link 
                  component={RouterLink}
                  to="/signup"
                  sx={{
                    color: 'rgba(253, 106, 66, 0.9)',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Sign up
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default LoginPage;
