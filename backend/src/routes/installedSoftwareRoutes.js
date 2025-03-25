const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const InstalledSoftware = require('../models/InstalledSoftware');
const { scanInstalledSoftware } = require('../services/softwareScanService');

// Add test data for a user (temporary endpoint for testing)
router.post('/add-test-data/:userId', async (req, res) => {
  try {
    const testSoftware = [
      {
        userId: req.params.userId,
        appId: 'vscode',
        name: 'Visual Studio Code',
        version: '1.85.1',
        status: 'installed',
        installDate: new Date(),
        lastUpdateCheck: new Date()
      },
      {
        userId: req.params.userId,
        appId: 'chrome',
        name: 'Google Chrome',
        version: '120.0.6099.109',
        status: 'installed',
        installDate: new Date(),
        lastUpdateCheck: new Date()
      },
      {
        userId: req.params.userId,
        appId: 'slack',
        name: 'Slack',
        version: '4.35.131',
        status: 'installed',
        installDate: new Date(),
        lastUpdateCheck: new Date()
      }
    ];

    // Clear existing data for this user
    await InstalledSoftware.deleteMany({ userId: req.params.userId });

    // Insert test data
    await InstalledSoftware.insertMany(testSoftware);

    res.json({ success: true, message: 'Test data added successfully' });
  } catch (error) {
    console.error('Error adding test data:', error);
    res.status(500).json({ message: 'Error adding test data' });
  }
});

// Trigger software scan for a user
router.post('/scan/:userId?', async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user._id;
    
    // Only allow scanning other users if admin
    if (targetUserId !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await scanInstalledSoftware(targetUserId);
    res.json({ success: true, message: 'Software scan completed' });
  } catch (error) {
    console.error('Error scanning software:', error);
    res.status(500).json({ message: 'Error scanning software' });
  }
});

// Get installed software for a specific user (for admins)
router.get('/user/:userId', async (req, res) => {
  try {
    // Only admins can access other users' software
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('Fetching installed software for user:', req.params.userId);
    try {
      // Fetch software data
      const software = await InstalledSoftware.find({ userId: new mongoose.Types.ObjectId(req.params.userId) })
        .select('name version status installDate lastUpdateCheck')
        .lean();

      console.log('Found software:', software);

    if (software.length === 0) {
      console.log('No software found for user:', req.params.userId);
      return res.json([]);
    }

      // Transform dates to ISO strings for consistent formatting
      const formattedSoftware = software.map(item => ({
        ...item,
        installDate: item.installDate ? item.installDate.toISOString() : null,
        lastUpdateCheck: item.lastUpdateCheck ? item.lastUpdateCheck.toISOString() : null
      }));

      console.log('Sending formatted software:', formattedSoftware);
      res.json(formattedSoftware);
    } catch (error) {
      console.error('Error in software fetch/create:', error);
      res.status(500).json({ message: 'Error processing software data' });
    }
  } catch (error) {
    console.error('Error fetching installed software:', error);
    res.status(500).json({ message: 'Error fetching installed software' });
  }
});

// Get all installed software for current user
router.get('/', async (req, res) => {
  try {
    const software = await InstalledSoftware.find({ userId: req.user._id });
    res.json(software);
  } catch (error) {
    console.error('Error fetching installed software:', error);
    res.status(500).json({ message: 'Error fetching installed software' });
  }
});

// Add installed software
router.post('/', async (req, res) => {
  try {
    const { appId, name, version } = req.body;

    // Check if software is already installed for this user
    const existing = await InstalledSoftware.findOne({
      userId: req.user._id,
      appId
    });

    if (existing) {
      // Update version if already installed
      existing.version = version;
      existing.lastUpdateCheck = new Date();
      await existing.save();
      return res.json(existing);
    }

    // Create new installation record
    const software = new InstalledSoftware({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      appId,
      name,
      version
    });

    await software.save();
    res.status(201).json(software);
  } catch (error) {
    console.error('Error adding installed software:', error);
    res.status(500).json({ message: 'Error adding installed software' });
  }
});

// Update software version
router.put('/:appId', async (req, res) => {
  try {
    const { version } = req.body;
    const software = await InstalledSoftware.findOne({
      userId: req.user._id,
      appId: req.params.appId
    });

    if (!software) {
      return res.status(404).json({ message: 'Software not found' });
    }

    software.version = version;
    software.lastUpdateCheck = new Date();
    software.status = 'installed';
    software.userName = req.user.name;  // Update user details
    software.userEmail = req.user.email;
    await software.save();

    res.json(software);
  } catch (error) {
    console.error('Error updating software version:', error);
    res.status(500).json({ message: 'Error updating software version' });
  }
});

// Delete installed software
router.delete('/:appId', async (req, res) => {
  try {
    // First try to find by appId
    let result = await InstalledSoftware.findOneAndDelete({
      userId: req.user._id,
      appId: req.params.appId
    });

    // If not found by appId, try to find by name in apps array
    if (!result) {
      result = await InstalledSoftware.findOneAndUpdate(
        { userId: req.user._id },
        { $pull: { apps: { name: { $regex: new RegExp(req.params.appId, 'i') } } } },
        { new: true }
      );
    }

    if (!result) {
      return res.status(404).json({ message: 'Software not found' });
    }

    console.log(`Software ${req.params.appId} removed from database for user ${req.user._id}`);
    res.json({ message: 'Software removed successfully' });
  } catch (error) {
    console.error('Error removing software:', error);
    res.status(500).json({ message: 'Error removing software' });
  }
});

// Get specific installed software
router.get('/:appId', async (req, res) => {
  try {
    const software = await InstalledSoftware.findOne({
      userId: req.user._id,
      appId: req.params.appId
    });

    if (!software) {
      return res.status(404).json({ message: 'Software not found' });
    }

    res.json(software);
  } catch (error) {
    console.error('Error fetching software:', error);
    res.status(500).json({ message: 'Error fetching software' });
  }
});

// Update software status
router.patch('/:appId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const software = await InstalledSoftware.findOne({
      userId: req.user._id,
      appId: req.params.appId
    });

    if (!software) {
      return res.status(404).json({ message: 'Software not found' });
    }

    software.status = status;
    software.userName = req.user.name;  // Update user details
    software.userEmail = req.user.email;
    await software.save();

    res.json(software);
  } catch (error) {
    console.error('Error updating software status:', error);
    res.status(500).json({ message: 'Error updating software status' });
  }
});

module.exports = router;
