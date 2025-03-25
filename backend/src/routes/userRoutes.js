const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserSystemConfig = require('../models/UserSystemConfig');
const auth = require('../middleware/auth');
const { formatDate } = require('../utils/dateFormatter');

// Serve avatar image
router.get('/avatar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Avatar request for user:', userId);
    
    // Find user and select only the avatar field
    const user = await User.findById(userId).select('avatar');
    
    if (!user) {
      console.error('User not found for avatar request:', userId);
      return res.status(404).send('User not found');
    }
    
    if (!user.avatar) {
      console.error('Avatar not found for user:', userId);
      return res.status(404).send('Avatar not found');
    }
    
    console.log('Avatar found for user:', userId);
    console.log('Avatar type:', typeof user.avatar);
    console.log('Avatar is Buffer:', Buffer.isBuffer(user.avatar));
    console.log('Avatar has contentType:', user.avatar.contentType ? 'Yes' : 'No');
    
    // Set the content type and send the avatar data
    res.set('Content-Type', user.avatar.contentType || 'image/jpeg');
    
    // Send the avatar buffer data
    if (Buffer.isBuffer(user.avatar)) {
      console.log('Sending avatar as Buffer');
      res.send(user.avatar);
    } else if (user.avatar.data && Buffer.isBuffer(user.avatar.data)) {
      console.log('Sending avatar.data as Buffer');
      res.send(user.avatar.data);
    } else {
      console.error('Avatar is not a buffer:', typeof user.avatar);
      return res.status(500).send('Invalid avatar data format');
    }
  } catch (error) {
    console.error('Error serving avatar:', error);
    res.status(500).send('Server error');
  }
});

// Get user profile with system configuration and installed software
router.get('/profile', auth, async (req, res) => {
  try {
    // Use userId from req.user
    const userId = req.user.userId || req.user._id;
    console.log('Getting profile for user:', userId);
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.error('User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Get system configuration
    const systemConfig = await UserSystemConfig.findOne({ userId });

    // Get installed software
    const InstalledSoftware = require('../models/InstalledSoftware');
    const installedSoftwareData = await InstalledSoftware.findOne({ userId });
    
    // Format installed software data
    let installedSoftware = [];
    if (installedSoftwareData && installedSoftwareData.apps) {
      installedSoftware = installedSoftwareData.apps.map(app => ({
        name: app.name,
        version: app.version,
        path: app.path,
        bundleId: app.bundleId,
        isSystemApp: app.isSystemApp,
        installDate: app.installDate,
        lastUpdateCheck: app.lastUpdateCheck,
        status: 'installed'
      }));
    }

    // Convert user to object for modification
    const userObject = user.toObject();
    
    // If user has an avatar, create a URL to the avatar endpoint
    if (userObject.avatar) {
      // Remove the actual avatar binary data from the response
      delete userObject.avatar;
      
      // Add avatar URL that points to our avatar endpoint
      // Use the correct API path
      userObject.avatarUrl = `${req.protocol}://${req.get('host')}/api/users/avatar/${userObject._id}`;
      console.log('Setting avatarUrl in profile response:', userObject.avatarUrl);
    }
    
    // Add system configuration and installed software details
    const userDetails = {
      ...userObject,
      systemConfig: systemConfig || null,
      installedSoftware: installedSoftware
    };

    res.json(userDetails);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    console.log('Profile update request received');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body:', req.body);
    
    // Debug information for file uploads
    if (req.files) {
      console.log('Request files:', Object.keys(req.files));
      if (req.files.avatar) {
        console.log('Avatar file details:', {
          name: req.files.avatar.name,
          size: req.files.avatar.size,
          mimetype: req.files.avatar.mimetype,
          md5: req.files.avatar.md5,
          tempFilePath: req.files.avatar.tempFilePath || 'No temp file path'
        });
      }
    } else {
      console.log('Request files: No files');
      console.log('Raw request body:', req.body);
    }
    
    // Use userId from req.user
    const userId = req.user.userId || req.user._id;
    console.log('Updating profile for user:', userId);
    
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user name regardless of whether there's a file upload
    if (req.body.name) {
      console.log('Updating name to:', req.body.name);
      user.name = req.body.name;
    }
    
    if (req.body.email) {
      console.log('Updating email to:', req.body.email);
      user.email = req.body.email;
    }

    // Update department and position
    if (req.body.department) {
      console.log('Updating department to:', req.body.department);
      user.department = req.body.department;
    }
    
    if (req.body.position) {
      console.log('Updating position to:', req.body.position);
      user.position = req.body.position;
    }

    // Check if this is a file upload request by checking for req.files
    if (req.files && req.files.avatar) {
      console.log('Processing file upload request');
      
      // Handle avatar file
      const avatarFile = req.files.avatar;
      
      // Check file size (limit to 1MB)
      if (avatarFile.size > 1024 * 1024) {
        return res.status(400).json({ message: 'Avatar image must be less than 1MB' });
      }
      
      // Check file type
      if (!avatarFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: 'Only image files are allowed for avatars' });
      }
      
      try {
        // Store the file data in the user document
        user.avatar = avatarFile.data;
        user.avatar.contentType = avatarFile.mimetype;
        console.log('Avatar stored in database, size:', avatarFile.size, 'bytes');
        console.log('Avatar contentType:', avatarFile.mimetype);
      } catch (fileError) {
        console.error('Error saving avatar to database:', fileError);
        return res.status(500).json({ message: `Error saving avatar: ${fileError.message}` });
      }
    } else if (req.body.avatar && req.body.avatar.startsWith('data:image/')) {
      // Handle base64 encoded image
      console.log('Processing base64 image upload');
      
      try {
        // Extract the file extension and base64 data
        const matches = req.body.avatar.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid base64 image format');
        }
        
        const mimeType = `image/${matches[1]}`;
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Check file size (limit to 1MB)
        if (buffer.length > 1024 * 1024) {
          return res.status(400).json({ message: 'Avatar image must be less than 1MB' });
        }
        
        // Store the buffer in the user document
        user.avatar = buffer;
        user.avatar.contentType = mimeType;
        console.log('Base64 avatar stored in database, size:', buffer.length, 'bytes');
        console.log('Avatar contentType:', mimeType);
      } catch (fileError) {
        console.error('Error saving base64 avatar to database:', fileError);
        return res.status(500).json({ message: `Error saving avatar: ${fileError.message}` });
      }
    }

    await user.save();
    console.log('User saved successfully');
    
    // Return the complete user object including avatar URL
    const updatedUser = await User.findById(userId).select('-password');
    
    // Convert to object for modification
    const updatedUserObj = updatedUser.toObject();
    
    // If user has an avatar, create a URL to the avatar endpoint
    if (updatedUserObj.avatar) {
      // Remove the actual avatar binary data from the response
      delete updatedUserObj.avatar;
      
      // Add avatar URL that points to our avatar endpoint
      // Use the correct API path
      updatedUserObj.avatarUrl = `${req.protocol}://${req.get('host')}/api/users/avatar/${updatedUserObj._id}`;
      console.log('Setting avatarUrl in response:', updatedUserObj.avatarUrl);
    }
    
    res.json(updatedUserObj);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status
router.post('/status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isOnline } = req.body;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update status
    user.isOnline = isOnline;
    if (!isOnline) {
      user.lastSeen = new Date();
    }
    await user.save();

    res.json({
      userId: user._id,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user status
router.get('/status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('isOnline lastSeen');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      userId: user._id,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    console.error('Status fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find().select('-password');
    
    // Add formatted dates to each user
    const usersWithFormattedDates = users.map(user => {
      const userObj = user.toObject();
      return {
        ...userObj,
        formattedLastActive: formatDate(user.lastActive),
        formattedLastLogin: formatDate(user.lastLogin),
        formattedCreatedAt: formatDate(user.createdAt),
        formattedUpdatedAt: formatDate(user.updatedAt)
      };
    });
    
    res.json(usersWithFormattedDates);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user details by ID (admin only)
router.get('/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get system configuration
    const systemConfig = await UserSystemConfig.findOne({ userId });

    // Get installed software
    const InstalledSoftware = require('../models/InstalledSoftware');
    const installedSoftwareData = await InstalledSoftware.findOne({ userId });
    
    // Format installed software data
    let installedSoftware = [];
    if (installedSoftwareData && installedSoftwareData.apps) {
      installedSoftware = installedSoftwareData.apps.map(app => ({
        name: app.name,
        version: app.version,
        path: app.path,
        bundleId: app.bundleId,
        isSystemApp: app.isSystemApp,
        installDate: app.installDate,
        lastUpdateCheck: app.lastUpdateCheck,
        status: 'installed'
      }));
    }

    // Add system configuration, installed software details, and formatted dates
    const userObj = user.toObject();
    const userDetails = {
      ...userObj,
      formattedLastActive: formatDate(user.lastActive),
      formattedLastLogin: formatDate(user.lastLogin),
      formattedCreatedAt: formatDate(user.createdAt),
      formattedUpdatedAt: formatDate(user.updatedAt),
      systemConfig: systemConfig || null,
      installedSoftware: installedSoftware
    };

    res.json(userDetails);
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.remove();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
