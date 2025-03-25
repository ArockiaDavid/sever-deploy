import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Link,
  InputAdornment,
  Alert,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import authService from '../api/authService';
import '../styles/LoginPage.css';

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.email.endsWith('@piramal.com')) {
        setError('Only @piramal.com email addresses are allowed');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      await authService.signup(formData);
      navigate('/login', { state: { message: 'Account created successfully. Please login.' } });
    } catch (error) {
      console.error('Signup error:', error);
      if (!navigator.onLine) {
        setError('Unable to connect to server. Please check your network connection.');
      } else if (error.message.includes('409')) {
        setError('Email already exists');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-page">
      <Box className="login-left">
        <Box className="login-illustration">
          <img src="/signup-illustration.svg" alt="Sign Up" />
          <Typography variant="h4" className="illustration-text">
            Join Software Center
          </Typography>
          <Typography variant="subtitle1" className="illustration-subtext">
            Create your account to get started
          </Typography>
        </Box>
      </Box>
      
      <Box className="login-right">
        <Box className="login-form-container">
          <Typography variant="h4" className="login-title">
            Create Account
          </Typography>
          <Typography variant="subtitle1" className="login-subtitle">
            Fill in your details to register
          </Typography>

          {error && (
            <Alert severity="error" className="login-error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <TextField
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              value={formData.name}
              onChange={handleChange}
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
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className="login-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon className="input-icon" />
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
              value={formData.password}
              onChange={handleChange}
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

            <TextField
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
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
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              className="login-button"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <Box className="signup-prompt">
              <Typography variant="body2">
                Already have an account?{' '}
                <Link 
                  component={RouterLink}
                  to="/login"
                  className="signup-link"
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default SignupPage;
