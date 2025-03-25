const express = require('express');
const router = express.Router();
const UserSystemConfig = require('../models/UserSystemConfig');
const auth = require('../middleware/auth');

// Update or create system configuration for a user
router.post('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      osName,
      osVersion,
      totalMemory,
      freeMemory,
      totalDiskSpace,
      freeDiskSpace,
      cpuModel,
      cpuCores,
      architecture,
      hostname,
      platform
    } = req.body;

    let systemConfig = await UserSystemConfig.findOne({ userId });

    if (systemConfig) {
      // Update existing config
      systemConfig.osName = osName;
      systemConfig.osVersion = osVersion;
      systemConfig.totalMemory = totalMemory;
      systemConfig.freeMemory = freeMemory;
      systemConfig.totalDiskSpace = totalDiskSpace;
      systemConfig.freeDiskSpace = freeDiskSpace;
      systemConfig.cpuModel = cpuModel;
      systemConfig.cpuCores = cpuCores;
      systemConfig.architecture = architecture;
      systemConfig.hostname = hostname;
      systemConfig.platform = platform;
      systemConfig.lastUpdated = new Date();
    } else {
      // Create new config
      systemConfig = new UserSystemConfig({
        userId,
        osName,
        osVersion,
        totalMemory,
        freeMemory,
        totalDiskSpace,
        freeDiskSpace,
        cpuModel,
        cpuCores,
        architecture,
        hostname,
        platform
      });
    }

    await systemConfig.save();
    res.json(systemConfig);
  } catch (error) {
    console.error('System config update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system configuration for a user
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const systemConfig = await UserSystemConfig.findOne({ userId });

    if (!systemConfig) {
      return res.status(404).json({ message: 'System configuration not found' });
    }

    res.json(systemConfig);
  } catch (error) {
    console.error('System config fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
