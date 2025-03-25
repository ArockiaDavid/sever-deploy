const express = require('express');
const router = express.Router();
const adAuthService = require('../services/adAuthService');

// SSO Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  try {
    const user = await adAuthService.authenticate(username, password);
    
    // Set user in session
    req.session.user = user;
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('SSO Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
});

// SSO Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user
router.get('/user', (req, res) => {
  if (req.session.user) {
    res.json({
      success: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

module.exports = router;
