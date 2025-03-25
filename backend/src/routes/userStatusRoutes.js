const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { formatDate } = require('../utils/dateFormatter');
const router = express.Router();

// Log all requests
router.use((req, res, next) => {
  console.log('Status route request:', {
    method: req.method,
    url: req.url,
    params: req.params,
    body: req.body,
    user: req.user ? { id: req.user.id, _id: req.user._id } : null
  });
  next();
});

// Get user status
router.get('/:userId', auth, async (req, res) => {
  console.log('Get status request:', {
    params: req.params,
    user: { id: req.user.id, _id: req.user._id }
  });
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      isOnline: user.isOnline,
      lastActive: user.lastActive,
      formattedLastActive: formatDate(user.lastActive)
    });
  } catch (error) {
    console.error('Error getting user status:', error);
    res.status(500).json({ message: 'Error getting user status' });
  }
});

// Update user status
router.post('/:userId', auth, async (req, res) => {
  console.log('Update status request:', {
    params: req.params,
    body: req.body,
    user: { id: req.user.id, _id: req.user._id }
  });
  try {
    const { isOnline } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isOnline = isOnline;
    user.lastActive = new Date();
    await user.save();

    res.json({
      isOnline: user.isOnline,
      lastActive: user.lastActive,
      formattedLastActive: formatDate(user.lastActive)
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

module.exports = router;
