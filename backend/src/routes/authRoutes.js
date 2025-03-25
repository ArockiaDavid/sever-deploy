const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { formatDate } = require('../utils/dateFormatter');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // First find user by email only to check if they exist
    const userExists = await User.findOne({ email });
    if (!userExists) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, userExists.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Now check if the user has the requested role
    if (userExists.role !== role) {
      if (role === 'admin') {
        return res.status(403).json({ message: 'You do not have admin privileges' });
      } else {
        return res.status(403).json({ message: 'Invalid account type for this login' });
      }
    }

    // User exists, password is correct, and role matches
    const user = userExists;

    // Generate JWT token with all required fields
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'software-center-jwt-secret-key-2024',
      { expiresIn: '1h' }
    );

    // Update last login and set user as online
    user.lastLogin = new Date();
    user.isOnline = true;
    user.lastActive = new Date();
    await user.save();

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        formattedLastLogin: formatDate(user.lastLogin),
        lastActive: user.lastActive,
        formattedLastActive: formatDate(user.lastActive),
        avatar: user.avatar,
        isOnline: user.isOnline
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Check if user exists with this email (regardless of role)
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Create new user
    let user = new User({
      name,
      email,
      password,
      role
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Generate JWT token with all required fields
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'software-center-jwt-secret-key-2024',
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout route
router.post('/logout', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Update last seen
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        lastSeen: new Date(),
        isOnline: false
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Token refresh route
router.post('/refresh', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new token with all required fields
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'software-center-jwt-secret-key-2024',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, newPassword, role = 'user' } = req.body;

    // Find user by email first
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user has the requested role
    if (user.role !== role) {
      if (role === 'admin') {
        return res.status(403).json({ message: 'This account does not have admin privileges' });
      } else {
        return res.status(403).json({ message: 'Invalid account type for this operation' });
      }
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password route
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user by ID
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
