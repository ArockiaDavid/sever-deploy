import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  TextField, 
  Button, 
  Typography, 
  Link,
  Paper,
  Alert
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import config from '../config';
import '../styles/ResetPasswordPage.css';

const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Get token from URL query params
  const token = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password has been reset successfully');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box className="reset-password-container">
        <Paper className="reset-password-paper" elevation={3}>
          <Typography component="h1" variant="h5" className="reset-password-title">
            Reset Password
          </Typography>
          
          {error && (
            <Alert severity="error" className="reset-password-alert">
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" className="reset-password-alert">
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} className="reset-password-form">
            <TextField
              className="reset-password-textfield"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={!token}
            />
            <TextField
              className="reset-password-textfield"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={!token}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              className="reset-password-button"
              disabled={!token}
            >
              Reset Password
            </Button>
            <Box className="reset-password-link-container">
              <Link href="/login" variant="body2" className="reset-password-link">
                Back to Sign in
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPasswordPage;
