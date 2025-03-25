import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Link,
  InputAdornment,
  Alert
} from '@mui/material';
import {
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import authService from '../api/authService';
import '../styles/LoginPage.css';
import '../styles/ForgotPasswordPage.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email.endsWith('@piramal.com')) {
        setError('Only @piramal.com email addresses are allowed');
        return;
      }
      
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (error) {
      console.error('Reset password error:', error);
      if (!navigator.onLine) {
        setError('Unable to connect to server. Please check your network connection.');
      } else if (error.message.includes('404')) {
        setError('Email not found');
      } else {
        setError('Failed to send reset link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-page">
      <Box className="login-left">
        <Box className="login-illustration">
          <img src="/forgot-password-illustration.svg" alt="Forgot Password" />
          <Typography variant="h4" className="illustration-text">
            Reset Your Password
          </Typography>
          <Typography variant="subtitle1" className="illustration-subtext">
            We'll help you get back into your account
          </Typography>
        </Box>
      </Box>
      
      <Box className="login-right">
        <Box className="login-form-container">
          <Typography variant="h4" className="login-title">
            Forgot Password
          </Typography>
          <Typography variant="subtitle1" className="login-subtitle">
            Enter your email to receive reset instructions
          </Typography>

          {success ? (
            <Box>
              <Alert severity="success" className="forgot-password-success">
                Reset link has been sent to your email
              </Alert>
              <Button
                component={RouterLink}
                to="/login"
                fullWidth
                variant="contained"
                className="login-button"
              >
                Return to Login
              </Button>
            </Box>
          ) : (
            <>
              {error && (
                <Alert severity="error" className="login-error">
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="login-form">
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon className="input-icon" />
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
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <Button
                  component={RouterLink}
                  to="/login"
                  startIcon={<ArrowBackIcon />}
                  className="forgot-password-back-button"
                >
                  Back to Login
                </Button>
              </form>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPasswordPage;
