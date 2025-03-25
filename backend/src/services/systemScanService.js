const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const InstalledSoftware = require('../models/InstalledSoftware');

const softwareCommands = {
  'sublime-text': {
    command: 'which subl',
    versionCommand: "subl --version | head -n1 | awk '{print $4}'"
  },
  'visual-studio-code': {
    command: 'which code',
    versionCommand: "code --version | head -n1"
  },
  'node': {
    command: 'which node',
    versionCommand: "node --version"
  },
  'firefox': {
    command: 'which firefox',
    versionCommand: "firefox --version | awk '{print $3}'"
  },
  'google-chrome': {
    command: 'which google-chrome',
    versionCommand: "google-chrome --version | awk '{print $3}'"
  },
  'docker': {
    command: 'which docker',
    versionCommand: "docker --version | awk '{print $3}' | tr -d ','"
  },
  'postman': {
    command: 'find /Applications -maxdepth 3 -name "Postman.app" -o -name "postman" 2>/dev/null || find ~/Applications -maxdepth 3 -name "Postman.app" -o -name "postman" 2>/dev/null || which postman',
    versionCommand: "osascript -e 'tell application \"System Events\" to get version of application \"Postman\"' 2>/dev/null || echo '1.0.0'"
  }
};

const scanSystem = async (userId, userEmail, userName) => {
  console.log('Starting system scan for user:', userEmail);
  
  for (const [appId, commands] of Object.entries(softwareCommands)) {
    try {
      // Check if software exists
      const { stdout: installPath } = await execAsync(commands.command).catch(() => ({ stdout: '' }));
      
      if (installPath.trim()) {
        // Software is installed, get version
        const { stdout: version } = await execAsync(commands.versionCommand).catch(() => ({ stdout: '1.0.0' }));
        
        // Update or create software entry
        await InstalledSoftware.findOneAndUpdate(
          { userId, appId },
          {
            userId,
            userEmail,
            userName,
            appId,
            name: appId,
            version: version.trim() || '1.0.0',
            status: 'installed',
            installDate: new Date(),
            lastUpdateCheck: new Date()
          },
          { upsert: true, new: true }
        );
        
        console.log(`Found installed software: ${appId}, version: ${version.trim()}`);
      }
    } catch (error) {
      console.error(`Error scanning for ${appId}:`, error);
      // If there was an error checking version, try to at least mark it as installed
      if (appId === 'postman' && error.message.includes('osascript')) {
        await InstalledSoftware.findOneAndUpdate(
          { userId, appId },
          {
            userId,
            userEmail,
            userName,
            appId,
            name: appId,
            version: '1.0.0',
            status: 'installed',
            installDate: new Date(),
            lastUpdateCheck: new Date()
          },
          { upsert: true, new: true }
        );
        console.log(`Found installed software: ${appId}, version: 1.0.0 (default)`);
      }
    }
  }
  
  console.log('System scan completed for user:', userEmail);
};

module.exports = {
  scanSystem
};
