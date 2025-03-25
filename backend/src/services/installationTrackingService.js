const { exec } = require('child_process');
const InstalledSoftware = require('../models/InstalledSoftware');

const promiseExec = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
};

const trackInstallation = async (userId, appId, brewName) => {
  try {
    // Get software version
    const versionOutput = await promiseExec(`brew list --cask --versions ${brewName}`);
    const version = versionOutput.split(' ')[1] || '1.0.0';

    // Check if software is already tracked
    let software = await InstalledSoftware.findOne({
      user: userId,
      appId
    });

    if (software) {
      // Update existing record
      software.version = version;
      software.lastUpdateCheck = new Date();
      software.status = 'installed';
    } else {
      // Get user details
      const user = await require('../models/User').findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create new installation record
      software = new InstalledSoftware({
        user: userId,
        userName: user.name,
        userEmail: user.email,
        appId,
        name: brewName,
        version,
        status: 'installed'
      });
    }

    await software.save();
    return software;
  } catch (error) {
    console.error('Error tracking installation:', error);
    // Don't throw error to prevent affecting main installation flow
    return null;
  }
};

const trackUpdate = async (userId, appId, brewName) => {
  try {
    // Get new version
    const versionOutput = await promiseExec(`brew list --cask --versions ${brewName}`);
    const newVersion = versionOutput.split(' ')[1] || '1.0.0';

    // Update installation record
    const software = await InstalledSoftware.findOne({
      user: userId,
      appId
    });

    if (software) {
      software.version = newVersion;
      software.lastUpdateCheck = new Date();
      software.status = 'installed';
      await software.save();
      return software;
    }

    return null;
  } catch (error) {
    console.error('Error tracking update:', error);
    // Don't throw error to prevent affecting main update flow
    return null;
  }
};

module.exports = {
  trackInstallation,
  trackUpdate
};
