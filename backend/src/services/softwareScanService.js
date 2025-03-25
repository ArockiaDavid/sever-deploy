const { exec, spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const InstalledSoftware = require('../models/InstalledSoftware');
const User = require('../models/User');

// Constants
const USER_APPS_DIR = path.join(os.homedir(), 'Applications');
const TEMP_INSTALL_DIR = path.join(os.homedir(), 'Downloads', 'SoftwareCenter');
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Error types
const ErrorTypes = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PROCESS_RUNNING: 'PROCESS_RUNNING',
  INSTALLATION_CANCELLED: 'INSTALLATION_CANCELLED',
  UNKNOWN: 'UNKNOWN'
};

// Helper function to get app bundle identifier
const getBundleIdentifier = async (appPath) => {
  try {
    const plistPath = path.join(appPath, 'Contents', 'Info.plist');
    const bundleId = await promiseExec(
      `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${plistPath}" 2>/dev/null`
    ).catch(() => null);
    return bundleId ? bundleId.trim() : null;
  } catch (error) {
    return null;
  }
};

// Helper function to get app name from bundle identifier
const getAppNameFromBundle = async (bundleId) => {
  try {
    const result = await promiseExec(
      `osascript -e 'tell application "System Events" to get name of application processes where bundle identifier is "${bundleId}"' 2>/dev/null`
    ).catch(() => null);
    return result ? result.trim() : null;
  } catch (error) {
    return null;
  }
};

const promiseExec = async (command, options = {}) => {
  const { 
    isCancelled = () => false, 
    timeout = 300000,
    retries = 0 
  } = options;

  return new Promise((resolve, reject) => {
    try {
      let killed = false;
      let output = '';
      
      const childProcess = spawn('sh', ['-c', command], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const timeoutId = setTimeout(() => {
        if (!killed) {
          killed = true;
          try {
            process.kill(-childProcess.pid);
          } catch (error) {
            console.error('Error killing process on timeout:', error);
          }
          reject(new Error('Command timed out'));
        }
      }, timeout);

      const checkCancellation = () => {
        if (isCancelled() && !killed) {
          killed = true;
          clearTimeout(timeoutId);
          try {
            process.kill(-childProcess.pid);
          } catch (error) {
            console.error('Error killing process on cancellation:', error);
          }
          reject(new Error(ErrorTypes.INSTALLATION_CANCELLED));
          return true;
        }
        return false;
      };

      const cancelCheck = setInterval(checkCancellation, 100);

      childProcess.stdout.on('data', (data) => {
        if (!killed) {
          output += data;
          checkCancellation();
        }
      });

      childProcess.stderr.on('data', (data) => {
        if (!killed) {
          output += data;
          checkCancellation();
        }
      });

      childProcess.on('error', (error) => {
        clearInterval(cancelCheck);
        clearTimeout(timeoutId);
        
        if (!killed) {
          if (error.code === 'EACCES') {
            reject(new Error(ErrorTypes.PERMISSION_DENIED));
          } else if (error.code === 'ENOENT') {
            reject(new Error(ErrorTypes.FILE_NOT_FOUND));
          } else {
            reject(new Error(ErrorTypes.UNKNOWN));
          }
        }
      });

      childProcess.on('exit', async (code) => {
        clearInterval(cancelCheck);
        clearTimeout(timeoutId);
        
        if (!killed) {
          if (code === 0) {
            resolve(output.trim());
          } else if (code === null || code === 143) {
            reject(new Error(ErrorTypes.INSTALLATION_CANCELLED));
          } else if (retries < MAX_RETRIES) {
            console.log(`Command failed with code ${code}, retrying... (${retries + 1}/${MAX_RETRIES})`);
            setTimeout(async () => {
              try {
                const result = await promiseExec(command, { ...options, retries: retries + 1 });
                resolve(result);
              } catch (error) {
                reject(error);
              }
            }, RETRY_DELAY);
          } else {
            reject(new Error(`Command failed with code ${code}: ${output}`));
          }
        }
      });

      childProcess.stderr.on('close', () => {
        clearInterval(cancelCheck);
        clearTimeout(timeoutId);
      });
    } catch (error) {
      reject(new Error(`Failed to execute command: ${error.message}`));
    }
  });
};

// Get all running processes for an application
const getRunningProcesses = async (appPath) => {
  try {
    const processes = [];
    
    // Get bundle identifier
    const bundleId = await getBundleIdentifier(appPath);
    const appName = path.basename(appPath, '.app');
    
    // Get processes by bundle ID if available
    if (bundleId) {
      const bundleName = await getAppNameFromBundle(bundleId);
      if (bundleName) {
        const psOutput = await promiseExec(
          `ps aux | grep -i "${bundleName}" | grep -v grep || true`
        );
        if (psOutput.trim()) {
          const bundleProcesses = psOutput.split('\n')
            .filter(Boolean)
            .map(line => ({
              pid: line.split(/\s+/)[1],
              command: bundleName,
              bundleId
            }));
          processes.push(...bundleProcesses);
        }
      }
    }

    // Also check by app name as fallback
    const psOutput = await promiseExec(
      `ps aux | grep -i "${appName}" | grep -v grep || true`
    );
    if (psOutput.trim()) {
      const nameProcesses = psOutput.split('\n')
        .filter(Boolean)
        .map(line => ({
          pid: line.split(/\s+/)[1],
          command: appName
        }));
      processes.push(...nameProcesses);
    }

    // Remove duplicates based on PID
    const uniqueProcesses = {};
    processes.forEach(proc => {
      uniqueProcesses[proc.pid] = proc;
    });

    return Object.values(uniqueProcesses);
  } catch (error) {
    console.error('Error getting running processes:', error);
    return [];
  }
};

// Terminate processes with multiple methods and retries
const terminateProcesses = async (processes) => {
  const maxAttempts = 3;
  const killDelay = 2000;

  for (const process of processes) {
    let terminated = false;
    let attempts = 0;

    while (!terminated && attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Attempt ${attempts} to terminate process ${process.pid}`);

        // Try AppleScript quit first if we have bundle ID
        if (process.bundleId) {
          try {
            await promiseExec(`osascript -e 'tell application id "${process.bundleId}" to quit'`);
            await new Promise(resolve => setTimeout(resolve, killDelay));
          } catch (e) {
            console.log('AppleScript quit failed:', e);
          }
        }

        // Try AppleScript quit by name if available
        if (process.command) {
          try {
            await promiseExec(`osascript -e 'tell application "${process.command}" to quit'`);
            await new Promise(resolve => setTimeout(resolve, killDelay));
          } catch (e) {
            console.log('AppleScript quit by name failed:', e);
          }
        }

        // Check if process is still running
        try {
          await promiseExec(`ps -p ${process.pid}`);
          
          // Process still running, try SIGTERM
          await promiseExec(`kill -15 ${process.pid}`);
          await new Promise(resolve => setTimeout(resolve, killDelay));
          
          // Check again
          try {
            await promiseExec(`ps -p ${process.pid}`);
            
            if (attempts === maxAttempts) {
              // Last resort: SIGKILL
              await promiseExec(`kill -9 ${process.pid}`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Final check
              try {
                await promiseExec(`ps -p ${process.pid}`);
                throw new Error(`Failed to terminate process ${process.pid} after ${maxAttempts} attempts`);
              } catch {
                terminated = true;
              }
            }
          } catch {
            // Process terminated
            terminated = true;
          }
        } catch {
          // Process already terminated
          terminated = true;
        }

        if (terminated) {
          console.log(`Process ${process.pid} terminated successfully`);
          break;
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, killDelay));
      } catch (error) {
        console.error(`Error terminating process ${process.pid} (attempt ${attempts}):`, error);
        
        if (attempts === maxAttempts) {
          throw new Error(
            `${ErrorTypes.PROCESS_RUNNING}\nPlease close ${process.command || 'the application'} manually and try again.`
          );
        }
      }
    }
  }
};

// Clean up application files
const cleanupApplicationFiles = async (appName, appPath) => {
  const appIdentifier = path.basename(appPath, '.app').toLowerCase();
  const cleanupDirs = [
    {
      path: path.join(os.homedir(), 'Library/Preferences'),
      pattern: `*${appIdentifier}*`
    },
    {
      path: path.join(os.homedir(), 'Library/Application Support'),
      pattern: `*${appIdentifier}*`
    },
    {
      path: path.join(os.homedir(), 'Library/Caches'),
      pattern: `*${appIdentifier}*`
    },
    {
      path: path.join(TEMP_INSTALL_DIR, appName)
    }
  ];

  for (const dir of cleanupDirs) {
    try {
      if (dir.pattern) {
        await promiseExec(`find "${dir.path}" -name "${dir.pattern}" -exec rm -rf {} + 2>/dev/null || true`);
      } else {
        await fs.rm(dir.path, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`Warning during cleanup of ${dir.path}:`, error);
    }
  }
};

// Find application path
const findAppPath = async (appName) => {
  const userAppsDir = path.join(os.homedir(), 'Applications');
  const systemAppsDir = '/Applications';
  
  // Get all .app paths from both directories
  const [userApps, systemApps] = await Promise.all([
    promiseExec(`find "${userAppsDir}" -maxdepth 2 -name "*.app" -type d 2>/dev/null || true`),
    promiseExec(`find "${systemAppsDir}" -maxdepth 2 -name "*.app" -type d 2>/dev/null || true`)
  ]);

  const allPaths = [...userApps.split('\n'), ...systemApps.split('\n')]
    .filter(Boolean)
    .map(p => ({ path: p, name: path.basename(p, '.app') }));

  const normalizedSearchName = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // First try exact match
  const exactMatch = allPaths.find(p => p.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedSearchName);
  if (exactMatch) return exactMatch.path;

  // Then try partial matches
  const partialMatch = allPaths.find(p => {
    const normalizedName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedName.includes(normalizedSearchName) || 
           normalizedSearchName.includes(normalizedName);
  });
  if (partialMatch) return partialMatch.path;

  return null;
};

// Uninstall software
const uninstallSoftware = async (appName, onProgress = () => {}) => {
  try {
    onProgress(0, { message: 'Starting uninstallation...' });

    // Find application
    const appPath = await findAppPath(appName);
    if (!appPath) {
      throw new Error(ErrorTypes.FILE_NOT_FOUND);
    }

    // Verify it's a user app
    const isUserApp = appPath.startsWith(USER_APPS_DIR);
    if (!isUserApp) {
      throw new Error('Cannot uninstall system applications');
    }

    onProgress(10, { message: 'Checking for running processes...' });

    // Get running processes
    const processes = await getRunningProcesses(appPath);
    
    if (processes.length > 0) {
      onProgress(20, { message: 'Stopping application processes...' });
      await terminateProcesses(processes);
    }

    onProgress(40, { message: 'Removing application...' });

    // Remove the application
    await fs.rm(appPath, { recursive: true, force: true });

    // Clean up associated files
    onProgress(60, { message: 'Cleaning up application data...' });
    await cleanupApplicationFiles(appName, appPath);

    // Final verification
    onProgress(90, { message: 'Verifying uninstallation...' });
    const stillExists = await fs.access(appPath).then(() => true).catch(() => false);
    
    if (stillExists) {
      throw new Error('Failed to remove application completely');
    }

    // Update database
    await InstalledSoftware.deleteOne({ appPath });

    onProgress(100, { 
      type: 'completed',
      message: 'Uninstallation completed successfully' 
    });

    return true;
  } catch (error) {
    console.error('Uninstallation error:', error);
    throw new Error(
      error.message === ErrorTypes.FILE_NOT_FOUND
        ? 'Application not found'
        : `Uninstallation failed: ${error.message}`
    );
  }
};

// Scan for installed software
const scanInstalledSoftware = async (userId) => {
  try {
    const installedApps = new Map();

    // Scan both system and user Applications directories
    const [userApps, systemApps] = await Promise.all([
      promiseExec(`find "${USER_APPS_DIR}" -maxdepth 2 -name "*.app" -type d 2>/dev/null || true`),
      promiseExec(`find "/Applications" -maxdepth 2 -name "*.app" -type d 2>/dev/null || true`)
    ]);

    // Check for Python installation in standard locations
    let pythonInstalled = false;
    try {
      // Check if Python is in the uninstalled list for this user
      let pythonUninstalled = false;
      
      try {
        // Check if we have a record of Python being uninstalled
        const InstalledSoftware = require('../models/InstalledSoftware');
        
        if (userId) {
          const userRecord = await InstalledSoftware.findOne({ userId });
          
          // If we have a record for this user, check if Python was explicitly uninstalled
          if (userRecord && userRecord.uninstalledApps) {
            pythonUninstalled = userRecord.uninstalledApps.some(app => 
              app.name.toLowerCase().includes('python')
            );
          }
        }
      } catch (dbError) {
        console.error('Error checking uninstalled apps database:', dbError);
      }
      
      // Check for custom Python installation (not system Python)
      // We only want to detect Python installations that were installed by the user
      // and not the system Python that comes with macOS
      
      // Check for Python framework
      const pythonFrameworkExists = await fs.access('/Library/Frameworks/Python.framework')
        .then(() => true)
        .catch(() => false);
      
      // Check for Python binaries in /usr/local/bin (user-installed Python)
      const pythonBinaries = await promiseExec('ls -la /usr/local/bin/python* 2>/dev/null || echo "Not found"');
      const hasPythonBinaries = !pythonBinaries.includes('Not found');
      
      // Check if Python is installed in Applications folder
      const pythonApp = await promiseExec('ls -la /Applications/Python*.app 2>/dev/null || echo "Not found"');
      const hasPythonApp = !pythonApp.includes('Not found');
      
      // Check if python3 command works and get its path
      let pythonPath = '';
      let isSystemPython = false;
      
      try {
        const whichPython = await promiseExec('which python3 2>/dev/null || echo "Not found"');
        if (!whichPython.includes('Not found')) {
          pythonPath = whichPython.trim();
          
          // Check if this is the system Python (which we want to ignore)
          isSystemPython = pythonPath === '/usr/bin/python3';
        }
      } catch (whichError) {
        console.error('Error finding Python path:', whichError);
      }
      
      // Only consider Python installed if it's not the system Python
      // and it's not marked as uninstalled
      pythonInstalled = !pythonUninstalled && 
                        (pythonFrameworkExists || 
                         hasPythonBinaries || 
                         hasPythonApp || 
                         (pythonPath && !isSystemPython));
      
      if (pythonInstalled) {
        console.log('Python installation detected');
        
        // Get Python version
        let pythonVersion = '3.x';
        try {
          const pythonVersionCheck = await promiseExec('python3 --version 2>/dev/null || echo "Not found"');
          if (!pythonVersionCheck.includes('Not found')) {
            const versionMatch = pythonVersionCheck.match(/Python (\d+\.\d+\.\d+)/);
            if (versionMatch) {
              pythonVersion = versionMatch[1];
            }
          }
        } catch (versionError) {
          console.error('Error getting Python version:', versionError);
        }
        
        // Add Python to installed apps
        installedApps.set('python', {
          name: 'Python',
          version: pythonVersion,
          path: pythonPath || '/Library/Frameworks/Python.framework',
          bundleId: 'org.python.python',
          isSystemApp: true
        });
      }
    } catch (pythonCheckError) {
      console.error('Error checking for Python installation:', pythonCheckError);
    }

    const processAppPaths = async (appPaths, isSystemApp = false) => {
      const paths = appPaths.split('\n').filter(Boolean);
      
      for (const appPath of paths) {
        try {
          const appName = path.basename(appPath, '.app');
          const plistPath = path.join(appPath, 'Contents', 'Info.plist');
          
          // Get app version from Info.plist
          const version = await promiseExec(
            `/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "${plistPath}" 2>/dev/null`
          ).catch(() => '1.0.0');

          // Get bundle identifier
          const bundleId = await getBundleIdentifier(appPath);

          // Skip adding Python if we already detected it through the framework
          if (pythonInstalled && appName.toLowerCase().includes('python')) {
            continue;
          }

          installedApps.set(appName.toLowerCase(), {
            name: appName,
            version: version.trim(),
            path: appPath,
            bundleId,
            isSystemApp
          });
        } catch (error) {
          console.error(`Error processing ${appPath}:`, error);
        }
      }
    };

    await Promise.all([
      processAppPaths(userApps, false),
      processAppPaths(systemApps, true)
    ]);

    // Update database
    if (userId) {
      try {
        const user = await User.findById(userId);
        if (user) {
          const apps = Array.from(installedApps.values()).map(app => ({
            ...app,
            installDate: new Date(),
            lastUpdateCheck: new Date()
          }));

          // Find existing record
          let record = await InstalledSoftware.findOne({ userId });
          
          if (record) {
            // Update existing record
            record.apps = apps;
            record.lastScanDate = new Date();
            await record.save();
          } else {
            // Create new record
            record = new InstalledSoftware({
              userId,
              apps,
              lastScanDate: new Date()
            });
            await record.save();
          }
        }
      } catch (error) {
        console.error('Error updating installed software database:', error);
        // Continue with scan results even if database update fails
      }
    }

    // Return scan results regardless of database operation
    const results = Array.from(installedApps.values());
    console.log('Scan completed:', {
      totalApps: results.length,
      systemApps: results.filter(app => app.isSystemApp).length,
      userApps: results.filter(app => !app.isSystemApp).length
    });
    
    return results;
  } catch (error) {
    console.error('Error scanning installed software:', error);
    throw error;
  }
};

// Export the functions
module.exports = {
  promiseExec,
  ErrorTypes,
  getRunningProcesses,
  terminateProcesses,
  cleanupApplicationFiles,
  findAppPath,
  uninstallSoftware,
  scanInstalledSoftware
};
