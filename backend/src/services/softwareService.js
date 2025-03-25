const { exec, spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const util = require('util');
const execAsync = util.promisify(exec);

// Constants
const PATHS = {
  USER_APPS: path.join(os.homedir(), 'Applications'),
  SYSTEM_APPS: '/Applications',
  TEMP_DIR: path.join(os.tmpdir(), 'SoftwareCenter'),
  PREFERENCES: path.join(os.homedir(), 'Library/Preferences'),
  APP_SUPPORT: path.join(os.homedir(), 'Library/Application Support'),
  CACHES: path.join(os.homedir(), 'Library/Caches'),
  // Additional application directories
  OPT_APPS: '/opt',
  USR_APPS: '/usr/local/bin',
  USR_SHARE_APPS: '/usr/local/share/applications'
};

const ERROR_TYPES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PROCESS_RUNNING: 'PROCESS_RUNNING',
  OPERATION_CANCELLED: 'OPERATION_CANCELLED',
  INVALID_PACKAGE: 'INVALID_PACKAGE',
  UNKNOWN: 'UNKNOWN'
};

class SoftwareService {
  constructor() {
    this.initializeTempDir();
  }

  async initializeTempDir() {
    try {
      await fs.mkdir(PATHS.TEMP_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async executeCommand(command, options = {}) {
    const {
      timeout = 300000,
      isCancelled = () => false,
      maxRetries = 3,
      retryDelay = 2000
    } = options;

    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const process = spawn('sh', ['-c', command], {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        const result = await new Promise((resolve, reject) => {
          let output = '';
          let error = '';
          let killed = false;

          const killProcess = () => {
            if (!killed) {
              killed = true;
              try {
                process.kill('-SIGTERM');
              } catch (e) {
                console.error('Error killing process:', e);
              }
            }
          };

          // Handle timeout
          const timeoutId = setTimeout(() => {
            killProcess();
            reject(new Error('Command timed out'));
          }, timeout);

          // Handle cancellation
          const checkCancellation = setInterval(() => {
            if (isCancelled()) {
              clearInterval(checkCancellation);
              killProcess();
              reject(new Error(ERROR_TYPES.OPERATION_CANCELLED));
            }
          }, 100);

          process.stdout.on('data', (data) => {
            output += data;
          });

          process.stderr.on('data', (data) => {
            error += data;
          });

          process.on('error', (err) => {
            clearTimeout(timeoutId);
            clearInterval(checkCancellation);
            killProcess();
            reject(err);
          });

          process.on('exit', (code) => {
            clearTimeout(timeoutId);
            clearInterval(checkCancellation);
            if (code === 0) {
              resolve(output);
            } else {
              reject(new Error(`Command failed with code ${code}: ${error}`));
            }
          });
        });

        return result;
      } catch (error) {
        attempt++;
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        console.log(`Retrying command (${attempt}/${maxRetries})...`);
      }
    }
  }

  async findRunningProcesses(appName) {
    try {
      const normalizedName = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const psOutput = await this.executeCommand('ps aux');
      
      return psOutput
        .split('\n')
        .filter(line => {
          const normalizedLine = line.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalizedLine.includes(normalizedName);
        })
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            pid: parts[1],
            command: parts.slice(10).join(' ')
          };
        });
    } catch (error) {
      console.error('Error finding processes:', error);
      return [];
    }
  }

  async terminateProcesses(processes) {
    for (const process of processes) {
      try {
        // Try SIGTERM first
        await this.executeCommand(`kill -15 ${process.pid}`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if still running
        try {
          await this.executeCommand(`ps -p ${process.pid}`);
          // Process still running, use SIGKILL
          await this.executeCommand(`kill -9 ${process.pid}`);
        } catch {
          // Process already terminated
          console.log(`Process ${process.pid} terminated`);
        }
      } catch (error) {
        console.error(`Failed to terminate process ${process.pid}:`, error);
        throw new Error(ERROR_TYPES.PROCESS_RUNNING);
      }
    }
  }

  async scanInstalledSoftware() {
    const installedApps = new Map();
    
    // Common application name mappings
    const commonAppMappings = {
      'googlechrome': 'Google Chrome',
      'chrome': 'Google Chrome',
      'firefox': 'Firefox',
      'safari': 'Safari',
      'microsoftedge': 'Microsoft Edge',
      'edge': 'Microsoft Edge',
      'vscode': 'Visual Studio Code',
      'visualstudiocode': 'Visual Studio Code',
      'slack': 'Slack',
      'zoom': 'zoom.us',
      'zoomus': 'zoom.us',
      'spotify': 'Spotify',
      'discord': 'Discord',
      'teams': 'Microsoft Teams',
      'microsoftteams': 'Microsoft Teams'
    };

    const scanDirectory = async (directory) => {
      try {
        // Check if directory exists before scanning
        try {
          await fs.access(directory);
        } catch (error) {
          console.log(`Directory ${directory} does not exist or is not accessible, skipping.`);
          return;
        }
        
        const entries = await fs.readdir(directory, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.endsWith('.app')) {
            const appPath = path.join(directory, entry.name);
            const appName = path.basename(entry.name, '.app');
            
            try {
              // Get app version from Info.plist
              const plistPath = path.join(appPath, 'Contents', 'Info.plist');
              const version = await this.executeCommand(
                `/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "${plistPath}" 2>/dev/null`
              ).catch(() => '1.0.0');

              // Store both the original name and normalized name for better matching
              const normalizedName = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
              installedApps.set(normalizedName, {
                name: appName,
                version: version.trim(),
                path: appPath,
                isSystemApp: directory === PATHS.SYSTEM_APPS
              });
              
              // Also add entries for common application name variations
              for (const [alias, appNameMatch] of Object.entries(commonAppMappings)) {
                if (appName === appNameMatch) {
                  installedApps.set(alias, {
                    name: appName,
                    version: version.trim(),
                    path: appPath,
                    isSystemApp: directory === PATHS.SYSTEM_APPS
                  });
                }
              }
            } catch (error) {
              console.error(`Error processing ${appName}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${directory}:`, error);
      }
    };

    // Scan all application directories
    await Promise.all([
      scanDirectory(PATHS.SYSTEM_APPS),
      scanDirectory(PATHS.USER_APPS),
      scanDirectory(PATHS.OPT_APPS),
      scanDirectory(PATHS.USR_APPS),
      scanDirectory(PATHS.USR_SHARE_APPS)
    ]);
    
    // Add special case for Google Chrome if not found
    if (!installedApps.has('googlechrome') && !installedApps.has('chrome')) {
      // Check common locations for Google Chrome
      const commonChromePaths = [
        '/Applications/Google Chrome.app',
        path.join(os.homedir(), 'Applications/Google Chrome.app'),
        '/Applications/Chrome.app',
        path.join(os.homedir(), 'Applications/Chrome.app')
      ];
      
      for (const chromePath of commonChromePaths) {
        try {
          await fs.access(chromePath);
          // If Chrome is found, add it to the map
          const appName = 'Google Chrome';
          installedApps.set('googlechrome', {
            name: appName,
            version: '1.0.0', // Default version if we can't determine it
            path: chromePath,
            isSystemApp: chromePath.startsWith('/Applications')
          });
          installedApps.set('chrome', {
            name: appName,
            version: '1.0.0',
            path: chromePath,
            isSystemApp: chromePath.startsWith('/Applications')
          });
          console.log(`Found Google Chrome at ${chromePath}`);
          break;
        } catch (error) {
          // Chrome not found at this path, continue checking
        }
      }
    }

    return Array.from(installedApps.values());
  }

  async installSoftware(packagePath, onProgress) {
    try {
      const updateProgress = (percent, message, details = '') => {
        // Ensure percent is a number
        const validPercent = typeof percent === 'number' ? percent : 0;
        
        // Call the progress callback with structured data
        onProgress?.({
          percent: validPercent,
          message,
          status: 'progress',
          details
        });
        
        // Add a small delay to ensure the event is processed
        return new Promise(resolve => setTimeout(resolve, 100));
      };

      // Initial progress already sent from the route handler

      // Validate package exists
      try {
        await fs.access(packagePath);
      } catch (error) {
        // In development mode, simulate installation even if file doesn't exist
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: Simulating installation for', packagePath);
          
          // Simulate installation steps
          await updateProgress(20, 'Preparing installation...', 'Extracting package contents');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await updateProgress(40, 'Installing files...', 'Copying application files');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await updateProgress(60, 'Configuring application...', 'Setting up preferences');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await updateProgress(80, 'Finalizing installation...', 'Registering application');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await updateProgress(100, 'Installation completed successfully');
          return true;
        } else {
          throw new Error(ERROR_TYPES.FILE_NOT_FOUND);
        }
      }

      // Validate package extension
      const ext = path.extname(packagePath).toLowerCase();
      if (!['.dmg', '.pkg', '.zip'].includes(ext)) {
        throw new Error(ERROR_TYPES.INVALID_PACKAGE);
      }

      // Create necessary directories
      await fs.mkdir(PATHS.USER_APPS, { recursive: true });
      const tempDir = path.join(PATHS.TEMP_DIR, `install_${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      try {
        switch (ext) {
          case '.dmg':
            await this.installDmg(packagePath, tempDir, updateProgress);
            break;
          case '.pkg':
            await this.installPkg(packagePath, tempDir, updateProgress);
            break;
          case '.zip':
            await this.installZip(packagePath, tempDir, updateProgress);
            break;
        }

        updateProgress(90, 'Refreshing system...', 'Updating file system cache');
        
        // Refresh the file system cache
        try {
          // Touch the Applications directory to update its modification time
          await this.executeCommand('touch /Applications');
          
          // Restart Finder to refresh the file system view
          await this.executeCommand('killall Finder || true');
          
          console.log('File system cache refreshed');
        } catch (refreshError) {
          console.error('Error refreshing file system cache:', refreshError);
          // Non-fatal error, continue
        }
        
        updateProgress(100, 'Installation completed successfully');
        return true;
      } finally {
        // Cleanup
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          console.error('Error cleaning up temp directory:', error);
        }
      }
    } catch (error) {
      console.error('Installation error:', error);
      throw error;
    }
  }

  async getLatestVersion(appName) {
    try {
      // In a real implementation, this would check a package repository or API
      // For now, we'll simulate by returning a higher version number
      
      // Get the installed software
      const installedApps = await this.scanInstalledSoftware();
      const app = installedApps.find(a => {
        const normalizedName = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedSearch = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedName === normalizedSearch || normalizedName.includes(normalizedSearch);
      });
      
      if (!app) {
        return null;
      }
      
      // Parse the current version
      const currentVersion = app.version || '1.0.0';
      const versionParts = currentVersion.split('.').map(Number);
      
      // Simulate a newer version by incrementing the patch version
      versionParts[versionParts.length - 1] += 1;
      
      return versionParts.join('.');
    } catch (error) {
      console.error('Error getting latest version:', error);
      return null;
    }
  }

  async uninstallSoftware(appName, onProgress, isAdmin = false) {
    try {
      const updateProgress = (percent, message, details = '') => {
        // Ensure percent is a number
        const validPercent = typeof percent === 'number' ? percent : 0;
        
        // Call the progress callback with structured data
        onProgress?.({
          percent: validPercent,
          message,
          status: 'progress',
          details
        });
        
        // Add a small delay to ensure the event is processed
        return new Promise(resolve => setTimeout(resolve, 100));
      };

      // Initial progress already sent from the route handler
      updateProgress(10, 'Finding application...', `Looking for ${appName}`);

      // Find application using multiple search strategies
      const apps = await this.scanInstalledSoftware();
      
      // Common application name mappings for uninstallation
      const commonAppMappings = {
        'googlechrome': 'Google Chrome',
        'chrome': 'Google Chrome',
        'firefox': 'Firefox',
        'safari': 'Safari',
        'microsoftedge': 'Microsoft Edge',
        'edge': 'Microsoft Edge',
        'vscode': 'Visual Studio Code',
        'visualstudiocode': 'Visual Studio Code',
        'slack': 'Slack',
        'zoom': 'zoom.us',
        'zoomus': 'zoom.us',
        'spotify': 'Spotify',
        'discord': 'Discord',
        'teams': 'Microsoft Teams',
        'microsoftteams': 'Microsoft Teams'
      };
      
      // Try different search strategies to find the app
      let app = null;
      const normalizedSearchName = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Strategy 0: Check if it's a common application with a known mapping
      if (commonAppMappings[normalizedSearchName]) {
        const mappedName = commonAppMappings[normalizedSearchName];
        app = apps.find(a => a.name === mappedName);
      }
      
      // Strategy 1: Exact match after normalization
      if (!app) {
        app = apps.find(a => {
          const normalizedName = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalizedName === normalizedSearchName;
        });
      }
      
      // Strategy 2: Partial match after normalization
      if (!app) {
        app = apps.find(a => {
          const normalizedName = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalizedName.includes(normalizedSearchName) || normalizedSearchName.includes(normalizedName);
        });
      }
      
      // Strategy 3: Match without spaces
      if (!app) {
        const noSpaceName = appName.replace(/\s+/g, '');
        app = apps.find(a => {
          const appNoSpace = a.name.replace(/\s+/g, '');
          return appNoSpace.toLowerCase() === noSpaceName.toLowerCase() || 
                 appNoSpace.toLowerCase().includes(noSpaceName.toLowerCase()) ||
                 noSpaceName.toLowerCase().includes(appNoSpace.toLowerCase());
        });
      }
      
      // Strategy 4: Special case for GitHub Desktop
      if (!app && appName.toLowerCase().includes('github')) {
        app = apps.find(a => a.name.toLowerCase().includes('github'));
      }
      
      // Strategy 5: Special case for Google Chrome
      if (!app && (normalizedSearchName.includes('chrome') || normalizedSearchName.includes('google'))) {
        app = apps.find(a => a.name.toLowerCase().includes('chrome') || a.name.toLowerCase().includes('google'));
        
        // If still not found, check common locations for Google Chrome
        if (!app) {
          console.log('Google Chrome not found in scanned applications, checking directly in Applications folder...');
          
          // Use a direct command to find Chrome in the Applications folder
          try {
            const findChromeCommand = 'find /Applications -name "Google Chrome.app" -maxdepth 1 || find ~/Applications -name "Google Chrome.app" -maxdepth 1 || echo ""';
            console.log(`Executing command: ${findChromeCommand}`);
            
            const findChromeOutput = await this.executeCommand(findChromeCommand);
            console.log(`Command output: ${findChromeOutput}`);
            
            if (findChromeOutput.trim()) {
              const chromePath = findChromeOutput.split('\n')[0].trim();
              console.log(`Found Google Chrome at ${chromePath} using direct command`);
              
              // If Chrome is found, create an app object
              app = {
                name: 'Google Chrome',
                version: '1.0.0', // Default version if we can't determine it
                path: chromePath,
                isSystemApp: chromePath.startsWith('/Applications')
              };
            } else {
              console.log('Google Chrome not found using direct command');
              
              // Fall back to checking common paths manually
              const commonChromePaths = [
                '/Applications/Google Chrome.app',
                path.join(os.homedir(), 'Applications/Google Chrome.app'),
                '/Applications/Chrome.app',
                path.join(os.homedir(), 'Applications/Chrome.app')
              ];
              
              console.log(`Checking common Chrome paths: ${JSON.stringify(commonChromePaths)}`);
              
              for (const chromePath of commonChromePaths) {
                try {
                  await fs.access(chromePath);
                  // If Chrome is found, create an app object
                  app = {
                    name: 'Google Chrome',
                    version: '1.0.0', // Default version if we can't determine it
                    path: chromePath,
                    isSystemApp: chromePath.startsWith('/Applications')
                  };
                  console.log(`Found Google Chrome at ${chromePath} using manual path check`);
                  break;
                } catch (error) {
                  console.log(`Chrome not found at path: ${chromePath}`);
                }
              }
            }
          } catch (error) {
            console.error('Error finding Chrome using direct command:', error);
            
            // Fall back to checking common paths manually
            const commonChromePaths = [
              '/Applications/Google Chrome.app',
              path.join(os.homedir(), 'Applications/Google Chrome.app'),
              '/Applications/Chrome.app',
              path.join(os.homedir(), 'Applications/Chrome.app')
            ];
            
            for (const chromePath of commonChromePaths) {
              try {
                await fs.access(chromePath);
                // If Chrome is found, create an app object
                app = {
                  name: 'Google Chrome',
                  version: '1.0.0', // Default version if we can't determine it
                  path: chromePath,
                  isSystemApp: chromePath.startsWith('/Applications')
                };
                console.log(`Found Google Chrome at ${chromePath} using manual path check`);
                break;
              } catch (error) {
                // Chrome not found at this path, continue checking
              }
            }
          }
        }
      }
      
      // Log the found app for debugging
      if (app) {
        console.log(`Found application: ${app.name} (path: ${app.path}) for search: ${appName}`);
      } else {
        console.log(`No application found for search: ${appName}`);
        console.log('Available applications:', apps.map(a => a.name).join(', '));
        
        // Provide a more user-friendly error message
        const errorMessage = `Application "${appName}" could not be found. It may have been already uninstalled or moved.`;
        throw new Error(errorMessage);
      }

      updateProgress(20, 'Checking for running processes...', `Looking for processes related to ${app.name}`);

      // Simple command to check if app is running
      const psOutput = await this.executeCommand(
        `ps aux | grep -i "${app.name}" | grep -v grep || true`
      );
      
      if (psOutput.trim()) {
        updateProgress(30, 'Stopping application processes...', 'Terminating running processes');
        
        // Simple kill command for all matching processes
        await this.executeCommand(
          `pkill -f "${app.name}" || true`
        );
        
        // Wait a moment for processes to terminate
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if processes are still running
        const stillRunning = await this.executeCommand(
          `ps aux | grep -i "${app.name}" | grep -v grep || true`
        );
        
        if (stillRunning.trim()) {
          // Force kill if still running
          await this.executeCommand(
            `pkill -9 -f "${app.name}" || true`
          );
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      updateProgress(50, 'Removing application...', `Deleting ${app.path}`);

      // Simple command to remove the application
      await this.executeCommand(`rm -rf "${app.path}"`);

      // Clean up associated files with a simpler approach
      updateProgress(70, 'Cleaning up application data...', 'Removing preferences and support files');
      
      const appIdentifier = app.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Simple cleanup commands
      await this.executeCommand(`rm -rf ~/Library/Preferences/*${appIdentifier}* 2>/dev/null || true`);
      await this.executeCommand(`rm -rf ~/Library/Application\\ Support/*${appIdentifier}* 2>/dev/null || true`);
      await this.executeCommand(`rm -rf ~/Library/Caches/*${appIdentifier}* 2>/dev/null || true`);

      // Verify removal with a simple check
      updateProgress(90, 'Verifying uninstallation...', 'Confirming application removal');

      const stillExists = await fs.access(app.path).then(() => true).catch(() => false);
      if (stillExists) {
        throw new Error('Failed to remove application completely');
      }

      updateProgress(90, 'Refreshing system...', 'Updating file system cache');
      
      // Refresh the file system cache
      try {
        // Touch the Applications directory to update its modification time
        await this.executeCommand('touch /Applications');
        
        // Restart Finder to refresh the file system view
        await this.executeCommand('killall Finder || true');
        
        console.log('File system cache refreshed');
      } catch (refreshError) {
        console.error('Error refreshing file system cache:', refreshError);
        // Non-fatal error, continue
      }

      updateProgress(100, 'Uninstallation completed successfully', `Successfully uninstalled ${app.name}`);

      return true;
    } catch (error) {
      console.error('Uninstallation error:', error);
      // If the error is already a formatted message, use it directly
      if (error.message && !error.message.includes(ERROR_TYPES.FILE_NOT_FOUND)) {
        throw new Error(error.message);
      } else {
        throw new Error(`Uninstallation failed: ${error.message}`);
      }
    }
  }

  // Helper methods for installation
  async installDmg(dmgPath, tempDir, updateProgress) {
    updateProgress(20, 'Mounting disk image...');
    
    const mountOutput = await this.executeCommand(`hdiutil attach "${dmgPath}" -nobrowse`);
    const mountPoint = mountOutput.match(/\/Volumes\/[^\n]+/)?.[0];
    
    if (!mountPoint) {
      throw new Error('Failed to mount disk image');
    }

    try {
      updateProgress(40, 'Locating application...');
      
      // Find .app in mounted DMG
      const findOutput = await this.executeCommand(`find "${mountPoint}" -name "*.app" -maxdepth 3`);
      const appPath = findOutput.split('\n')[0];
      
      if (!appPath) {
        throw new Error('No application found in disk image');
      }

      updateProgress(60, 'Installing application...');
      
      const targetPath = path.join(PATHS.USER_APPS, path.basename(appPath));
      await this.executeCommand(`cp -R "${appPath}" "${PATHS.USER_APPS}/"`);
      
      updateProgress(80, 'Setting permissions...');
      await this.executeCommand(`chmod -R u+rwX "${targetPath}"`);
      await this.executeCommand(`xattr -dr com.apple.quarantine "${targetPath}" || true`);
    } finally {
      updateProgress(90, 'Cleaning up...');
      await this.executeCommand(`hdiutil detach "${mountPoint}" -force || true`);
    }
  }

  async installPkg(pkgPath, tempDir, updateProgress) {
    updateProgress(20, 'Extracting package...');
    
    const pkgName = path.basename(pkgPath, '.pkg');
    const extractDir = path.join(tempDir, pkgName);
    await fs.mkdir(extractDir, { recursive: true });
    
    await this.executeCommand(`pkgutil --expand "${pkgPath}" "${extractDir}/pkg"`);
    await this.executeCommand(`cd "${extractDir}/pkg" && cat Payload | gzip -d | cpio -id`);
    
    updateProgress(60, 'Installing contents...');
    
    // Find and copy any .app bundles
    const findOutput = await this.executeCommand(`find "${extractDir}" -name "*.app" -type d`);
    const appPaths = findOutput.split('\n').filter(Boolean);
    
    for (const appPath of appPaths) {
      const targetPath = path.join(PATHS.USER_APPS, path.basename(appPath));
      await this.executeCommand(`cp -R "${appPath}" "${PATHS.USER_APPS}/"`);
      await this.executeCommand(`chmod -R u+rwX "${targetPath}"`);
      await this.executeCommand(`xattr -dr com.apple.quarantine "${targetPath}" || true`);
    }
  }

  async installZip(zipPath, tempDir, updateProgress) {
    console.log(`Installing ZIP: ${zipPath} to temp dir: ${tempDir}`);
    
    updateProgress(20, 'Extracting archive...');
    
    // First, check if the ZIP file exists and is readable
    try {
      await fs.access(zipPath, fs.constants.R_OK);
      console.log(`ZIP file exists and is readable: ${zipPath}`);
      
      // Get file size and other info
      const stats = await fs.stat(zipPath);
      console.log(`ZIP file size: ${stats.size} bytes`);
      console.log(`ZIP file permissions: ${stats.mode.toString(8)}`);
    } catch (error) {
      console.error(`Error accessing ZIP file:`, error);
      throw new Error(`Cannot access ZIP file: ${error.message}`);
    }
    
    // Try multiple extraction methods
    let extractionSuccess = false;
    
    // Method 1: Using unzip command
    if (!extractionSuccess) {
      try {
        console.log(`Extracting ZIP with command: unzip -o "${zipPath}" -d "${tempDir}"`);
        await this.executeCommand(`unzip -o "${zipPath}" -d "${tempDir}"`);
        console.log(`ZIP extraction completed successfully with unzip command`);
        extractionSuccess = true;
      } catch (error) {
        console.error(`Error extracting ZIP with unzip command:`, error);
      }
    }
    
    // Method 2: Using ditto command (macOS specific)
    if (!extractionSuccess) {
      try {
        console.log(`Trying extraction with ditto command`);
        await this.executeCommand(`ditto -x -k "${zipPath}" "${tempDir}"`);
        console.log(`ZIP extraction completed successfully with ditto command`);
        extractionSuccess = true;
      } catch (error) {
        console.error(`Error extracting ZIP with ditto command:`, error);
      }
    }
    
    // Method 3: Using tar command (if zip file might actually be a tar archive)
    if (!extractionSuccess) {
      try {
        console.log(`Trying extraction with tar command`);
        await this.executeCommand(`tar -xf "${zipPath}" -C "${tempDir}"`);
        console.log(`ZIP extraction completed successfully with tar command`);
        extractionSuccess = true;
      } catch (error) {
        console.error(`Error extracting ZIP with tar command:`, error);
      }
    }
    
    // If all extraction methods failed, throw an error
    if (!extractionSuccess) {
      throw new Error(`Failed to extract ZIP file: ${path.basename(zipPath)}. The archive may be corrupted or in an unsupported format.`);
    }
    
    updateProgress(30, 'Extraction completed...', 'Analyzing extracted files');
    
    // List contents of temp directory for debugging
    console.log(`Listing contents of temp directory: ${tempDir}`);
    const lsOutput = await this.executeCommand(`ls -la "${tempDir}"`);
    console.log(`Directory contents:\n${lsOutput}`);
    
    updateProgress(40, 'Locating application...');
    console.log(`Searching for .app files in: ${tempDir}`);
    
    // Try different find commands to locate the app
    let appPath = '';
    try {
      // First try: standard find for .app directories
      const findOutput = await this.executeCommand(`find "${tempDir}" -name "*.app" -type d`);
      console.log(`Find output:\n${findOutput}`);
      appPath = findOutput.split('\n').filter(Boolean)[0];
    } catch (error) {
      console.error(`Error in first find attempt:`, error);
    }
    
    // If first attempt failed, try a more aggressive search
    if (!appPath) {
      try {
        console.log(`First find attempt failed, trying recursive search`);
        const findOutput = await this.executeCommand(`find "${tempDir}" -type d -name "*.app" -o -path "*/*.app*" | grep -i ".app"`);
        console.log(`Second find output:\n${findOutput}`);
        appPath = findOutput.split('\n').filter(Boolean)[0];
      } catch (error) {
        console.error(`Error in second find attempt:`, error);
      }
    }
    
    // If still no app found, check if there's a .app directory at the root level
    if (!appPath) {
      try {
        console.log(`Checking for .app directories at root level`);
        const lsOutput = await this.executeCommand(`ls -d "${tempDir}"/*.app 2>/dev/null || true`);
        console.log(`Root level .app directories:\n${lsOutput}`);
        if (lsOutput.trim()) {
          appPath = lsOutput.split('\n').filter(Boolean)[0];
        }
      } catch (error) {
        console.error(`Error checking root level:`, error);
      }
    }
    
    // Special case for GitHub Desktop
    if (!appPath && zipPath.toLowerCase().includes('github')) {
      try {
        console.log(`Special handling for GitHub Desktop`);
        const findOutput = await this.executeCommand(`find "${tempDir}" -type d -name "GitHub*.app" -o -name "github*.app" | grep -i ".app"`);
        console.log(`GitHub Desktop find output:\n${findOutput}`);
        appPath = findOutput.split('\n').filter(Boolean)[0];
      } catch (error) {
        console.error(`Error in GitHub Desktop find:`, error);
      }
    }
    
    // If no application found, throw an error
    if (!appPath) {
      throw new Error(`No application found in the archive: ${path.basename(zipPath)}. The package may not contain a valid macOS application.`);
    }
    
    console.log(`Found application at: ${appPath}`);
    updateProgress(60, 'Installing application...', `Copying ${path.basename(appPath)}`);
    
    // Create user Applications directory if it doesn't exist
    await fs.mkdir(PATHS.USER_APPS, { recursive: true });
    
    const targetPath = path.join(PATHS.USER_APPS, path.basename(appPath));
    console.log(`Copying to: ${targetPath}`);
    
    try {
      await this.executeCommand(`cp -R "${appPath}" "${PATHS.USER_APPS}/"`);
      console.log(`Copy completed successfully`);
    } catch (error) {
      console.error(`Error copying application:`, error);
      // Try with sudo if regular copy fails
      console.log(`Trying with sudo`);
      try {
        await this.executeCommand(`sudo -n cp -R "${appPath}" "${PATHS.USER_APPS}/"`);
      } catch (sudoError) {
        console.error(`Sudo copy also failed:`, sudoError);
        throw new Error(`Failed to copy application to ${PATHS.USER_APPS}. You may not have sufficient permissions.`);
      }
    }
    
    updateProgress(80, 'Setting permissions...', `Configuring ${path.basename(targetPath)}`);
    console.log(`Setting permissions on: ${targetPath}`);
    
    try {
      await this.executeCommand(`chmod -R u+rwX "${targetPath}"`);
      await this.executeCommand(`xattr -dr com.apple.quarantine "${targetPath}" || true`);
      console.log(`Permissions set successfully`);
    } catch (error) {
      console.error(`Error setting permissions:`, error);
      // Non-fatal error, continue
    }
    
    console.log(`ZIP installation completed successfully`);
    return targetPath;
  }
}

module.exports = SoftwareService;
