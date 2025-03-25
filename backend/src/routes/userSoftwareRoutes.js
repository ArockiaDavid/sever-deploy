const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const InstalledSoftware = require('../models/InstalledSoftware');
const { scanInstalledSoftware } = require('../services/softwareScanService');
const softwareService = require('../services/softwareService');

// GET installed software
router.get('/installed', auth, async (req, res) => {
  try {
    const installedSoftware = await InstalledSoftware.find({ userId: req.user._id });
    res.json(installedSoftware);
  } catch (error) {
    console.error('Error fetching installed software:', error);
    res.status(500).json({ message: error.message });
  }
});

// Scan for installed software
router.post('/scan', auth, async (req, res) => {
  try {
    const success = await scanInstalledSoftware(req.user._id);
    if (success) {
      res.json({ message: 'Scan completed successfully' });
    } else {
      res.status(500).json({ message: 'Scan completed with errors' });
    }
  } catch (error) {
    console.error('Error during scan:', error);
    res.status(500).json({ message: error.message });
  }
});

// Check for updates for a specific software
router.get('/:appId/updates', auth, async (req, res) => {
  try {
    const { appId } = req.params;
    
    // Get the installed software
    const installedSoftware = await InstalledSoftware.findOne({ 
      userId: req.user._id,
      appId: appId
    });

    if (!installedSoftware) {
      return res.status(404).json({ message: 'Software not installed' });
    }

    // Get the latest version from the software service
    const latestVersion = await softwareService.getLatestVersion(installedSoftware.name);
    
    // Compare versions
    const currentVersion = installedSoftware.version;
    const hasUpdate = latestVersion && latestVersion !== currentVersion;

    res.json({
      hasUpdate,
      currentVersion,
      latestVersion: latestVersion || currentVersion
    });
  } catch (error) {
    console.error('Error checking for updates:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update software version
router.put('/:appId', auth, async (req, res) => {
  try {
    const { appId } = req.params;
    const { version } = req.body;
    
    if (!version) {
      return res.status(400).json({ message: 'Version is required' });
    }

    // Update the installed software version
    const updatedSoftware = await InstalledSoftware.findOneAndUpdate(
      { userId: req.user._id, appId: appId },
      { version: version },
      { new: true }
    );

    if (!updatedSoftware) {
      return res.status(404).json({ message: 'Software not found' });
    }

    res.json(updatedSoftware);
  } catch (error) {
    console.error('Error updating software:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
