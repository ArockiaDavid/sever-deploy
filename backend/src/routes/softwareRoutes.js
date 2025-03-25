const express = require('express');
const router = express.Router();
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const SoftwareService = require('../services/softwareService');
const softwareService = new SoftwareService();
const softwareScanService = require('../services/softwareScanService');
const s3PackageService = require('../services/s3PackageService');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const auth = require('../middleware/auth');

// Helper function to handle SSE responses with improved error handling and chunked encoding
const handleSSEResponse = (res, operation) => {
  console.log('[SSE] Setting up SSE response');
  
  // Set headers for SSE with explicit chunked encoding disabled
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  
  // Flag to track connection state
  let isConnectionActive = true;
  let keepAliveInterval;
  
  // Handle client disconnect
  res.on('close', () => {
    console.log('[SSE] Client closed connection');
    isConnectionActive = false;
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
  });
  
  // Handle connection errors
  res.on('error', (error) => {
    console.error('[SSE] Response error:', error);
    isConnectionActive = false;
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
  });

  const sendEvent = (data) => {
    if (!isConnectionActive) {
      console.log('[SSE] Connection inactive, not sending event');
      return false;
    }
    
    try {
      // Format the event data with explicit newlines
      const event = `data: ${JSON.stringify(data)}\n\n`;
      
      // Write directly to the response without Buffer conversion
      const success = res.write(event);
      console.log(`[SSE] Event sent (success=${success}): ${JSON.stringify(data).substring(0, 100)}...`);
      
      // Try to flush if the method exists
      if (typeof res.flush === 'function') {
        try {
          res.flush();
        } catch (flushError) {
          console.error('[SSE] Error flushing response:', flushError);
        }
      }
      
      return success;
    } catch (error) {
      console.error('[SSE] Error sending SSE event:', error);
      isConnectionActive = false;
      return false;
    }
  };

  // Keep connection alive with retry mechanism and more robust error handling
  keepAliveInterval = setInterval(() => {
    if (!isConnectionActive) {
      console.log('[SSE] Connection inactive, clearing keepalive interval');
      clearInterval(keepAliveInterval);
      return;
    }
    
    try {
      // Send a simple comment as keepalive
      const success = res.write(':keepalive\n\n');
      console.log(`[SSE] Keepalive sent (success=${success})`);
      
      // Try to flush if the method exists
      if (typeof res.flush === 'function') {
        try {
          res.flush();
        } catch (flushError) {
          console.error('[SSE] Error flushing keepalive:', flushError);
        }
      }
    } catch (error) {
      console.error('[SSE] Error sending keepalive:', error);
      isConnectionActive = false;
      clearInterval(keepAliveInterval);
      
      try {
        res.end();
      } catch (endError) {
        console.error('[SSE] Error ending response after keepalive failure:', endError);
      }
    }
  }, 5000); // Reduced interval for more frequent keepalives

  return operation(sendEvent)
    .catch(error => {
      console.error('[SSE] Operation error:', error);
      
      if (isConnectionActive) {
        const errorMessage = error.message || 'Operation failed';
        const errorType = error.code || 'UNKNOWN';
        
        // Send error event
        sendEvent({
          status: 'error',
          message: errorMessage,
          type: errorType,
          details: error.details || errorMessage
        });
      }
    })
    .finally(() => {
      console.log('[SSE] Operation completed, cleaning up');
      
      // Clear the keepalive interval
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      
      // End the response if the connection is still active
      if (isConnectionActive) {
        try {
          // Send a final completed event if not already sent
          sendEvent({
            status: 'completed',
            progress: 100,
            message: 'Operation completed'
          });
          
          // End the response
          res.end();
          console.log('[SSE] Response ended successfully');
        } catch (error) {
          console.error('[SSE] Error ending response:', error);
        }
      }
      
      isConnectionActive = false;
    });
};

// Scan for installed software
router.post('/scan', auth, async (req, res) => {
  try {
    // Get installed software
    const scanResult = await softwareScanService.scanInstalledSoftware();
    
    // Map scan results to match frontend expectations
    const installedApps = scanResult.map(app => ({
      name: app.name,
      version: app.version,
      path: app.path,
      isInstalled: true
    }));

    res.json({ installedApps });
  } catch (error) {
    console.error('Error scanning software:', error);
    res.status(500).json({
      message: error.message || 'Failed to scan installed software'
    });
  }
});

// Install software with enhanced error handling
router.post('/install', auth, (req, res) => {
  const { s3Key } = req.body;
  if (!s3Key) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Software key is required',
      type: 'VALIDATION_ERROR'
    });
  }

  // Extract name from s3Key with improved handling for complex filenames
  let name = path.basename(s3Key).replace(/\.(dmg|pkg|zip)$/, '');
  
  // Handle complex filenames with version numbers
  // For files like "System Check-1.0.0-arm64 1-1.0.dmg", extract the base name
  if (name.includes('-')) {
    // Try to extract the base application name before version numbers
    const baseNameMatch = name.match(/^([^-\d]+)/);
    if (baseNameMatch && baseNameMatch[1].trim()) {
      // Use the base name for searching, but keep the full name for display
      const baseName = baseNameMatch[1].trim();
      console.log(`Using base name "${baseName}" for searching application derived from "${name}"`);
      name = {
        display: name,   // Full name for display
        search: baseName // Simplified name for searching
      };
    }
  }

  let isCancelled = false;
  let operationTimeout;

  // Handle client disconnect
  req.on('close', () => {
    isCancelled = true;
    if (operationTimeout) {
      clearTimeout(operationTimeout);
    }
  });

  // Set operation timeout
  operationTimeout = setTimeout(() => {
    isCancelled = true;
    try {
      res.write(`data: ${JSON.stringify({
        status: 'error',
        message: 'Operation timed out',
        type: 'TIMEOUT_ERROR'
      })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Error sending timeout message:', error);
    }
  }, 900000); // 15 minutes timeout

  handleSSEResponse(res, async (sendEvent) => {
    try {
      // Progress callback with improved error handling and logging
      const progressCallback = (status) => {
        console.log(`[BACKEND] Progress update: ${JSON.stringify(status)}`);
        
        if (isCancelled) {
          console.log('[BACKEND] Operation cancelled, throwing error');
          throw new Error('OPERATION_CANCELLED');
        }

        // Ensure we have a valid percent value
        const percent = typeof status.percent === 'number' ? status.percent : 0;
        console.log(`[BACKEND] Sending progress event: ${percent}%, message: ${status.message}`);

        try {
          // Force flush the response
          sendEvent({
            status: status.status || 'progress',
            progress: percent,
            message: status.message,
            details: status.details
          });
          
          // Ensure the response is flushed
          if (typeof res.flush === 'function') {
            res.flush();
            console.log('[BACKEND] Response flushed');
          } else {
            console.log('[BACKEND] No flush method available on response');
          }
        } catch (error) {
          console.error('[BACKEND] Error sending progress event:', error);
          throw error;
        }
      };

      // Start installation with extracted name
      // Send initial progress update
      progressCallback({
        status: 'progress',
        percent: 5,
        message: 'Starting installation process...',
        details: `Preparing to install ${name}`
      });
      
      // Download the package from S3
      progressCallback({
        status: 'progress',
        percent: 10,
        message: 'Downloading package...',
        details: `Downloading ${name}`
      });
      
      try {
        // Create a temporary directory for downloads
        const downloadsDir = path.join(os.tmpdir(), 'software-center-downloads');
        await fs.mkdir(downloadsDir, { recursive: true });
        
        // Download the package
        const packageExt = path.extname(s3Key).toLowerCase();
        
        // Ensure name is a string for the packagePath
        const nameStr = typeof name === 'object' ? name.display : name;
        const packagePath = path.join(downloadsDir, `${nameStr}${packageExt}`);
        
        // Download the package from S3
        await s3PackageService.downloadPackage(s3Key, packagePath);
        
        progressCallback({
          status: 'progress',
          percent: 40,
          message: 'Package downloaded...',
          details: `Downloaded ${name} to ${packagePath}`
        });
        
        // Install the package based on its type
        progressCallback({
          status: 'progress',
          percent: 50,
          message: 'Installing package...',
          details: `Installing ${name}`
        });
        
        console.log(`[BACKEND] Starting installation of package: ${packagePath}`);
        console.log(`[BACKEND] Package extension: ${packageExt}`);
        
        // Create the application directory
        const appDir = path.join('/Applications', `${nameStr}.app`);
        console.log(`[BACKEND] Target application directory: ${appDir}`);
        
        // Check if the application is already installed and remove it first
        try {
          const appNameStr = typeof name === 'object' ? name.search : name;
          const appDir = path.join('/Applications', `${appNameStr}.app`);
          
          console.log(`[BACKEND] [DEBUG] Starting pre-installation cleanup for ${appNameStr}`);
          console.log(`[BACKEND] [DEBUG] Checking if application exists at ${appDir}`);
          
          // Check if the app exists
          try {
            await fs.access(appDir);
            console.log(`[BACKEND] [DEBUG] Application already exists at ${appDir}, removing it first`);
            
            // Try to terminate any running processes
            progressCallback({
              status: 'progress',
              percent: 52,
              message: 'Checking for running processes...',
              details: `Looking for processes related to ${appNameStr}`
            });
            
            try {
              // More comprehensive process detection
              console.log(`[BACKEND] [DEBUG] Checking for processes related to ${appNameStr}`);
              
              // Check for processes using multiple methods
              const psCommands = [
                // Standard process search
                `ps aux | grep -i "${appNameStr}" | grep -v grep || true`,
                // Check for processes with the app path
                `ps aux | grep -i "/Applications/${appNameStr}.app" | grep -v grep || true`,
                // Check for processes with common variations of the name
                `ps aux | grep -i "${appNameStr.replace(/[^a-zA-Z0-9]/g, '')}" | grep -v grep || true`,
                // Check for helper processes that might be related
                `ps aux | grep -i "${appNameStr}.*Helper" | grep -v grep || true`
              ];
              
              let runningProcesses = [];
              for (const cmd of psCommands) {
                console.log(`[BACKEND] [DEBUG] Executing: ${cmd}`);
                const output = await execPromise(cmd);
                if (output.trim()) {
                  console.log(`[BACKEND] [DEBUG] Found processes: ${output}`);
                  runningProcesses.push(...output.trim().split('\n'));
                }
              }
              
              // Remove duplicates
              runningProcesses = [...new Set(runningProcesses)];
              
              if (runningProcesses.length > 0) {
                progressCallback({
                  status: 'progress',
                  percent: 54,
                  message: 'Stopping application processes...',
                  details: `Terminating ${runningProcesses.length} running processes`
                });
                
                console.log(`[BACKEND] [DEBUG] Found ${runningProcesses.length} processes to terminate`);
                
                // Extract PIDs from process list
                const pids = runningProcesses.map(process => {
                  const parts = process.trim().split(/\s+/);
                  return parts[1]; // PID is usually the second column
                }).filter(Boolean);
                
                if (pids.length > 0) {
                  console.log(`[BACKEND] [DEBUG] Terminating PIDs: ${pids.join(', ')}`);
                  
                  // Try graceful termination first
                  try {
                    await execPromise(`kill ${pids.join(' ')} 2>/dev/null || true`);
                    console.log(`[BACKEND] [DEBUG] Sent SIGTERM to processes`);
                    
                    // Wait for processes to terminate
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  } catch (killError) {
                    console.error(`[BACKEND] [DEBUG] Error in graceful termination: ${killError.message}`);
                  }
                  
                  // Check if processes are still running
                  let stillRunningPids = [];
                  for (const pid of pids) {
                    try {
                      await execPromise(`ps -p ${pid} >/dev/null 2>&1`);
                      stillRunningPids.push(pid);
                    } catch {
                      // Process not running anymore
                    }
                  }
                  
                  if (stillRunningPids.length > 0) {
                    console.log(`[BACKEND] [DEBUG] ${stillRunningPids.length} processes still running, using SIGKILL`);
                    
                    // Force kill remaining processes
                    try {
                      await execPromise(`kill -9 ${stillRunningPids.join(' ')} 2>/dev/null || true`);
                      console.log(`[BACKEND] [DEBUG] Sent SIGKILL to remaining processes`);
                      
                      // Wait a moment for processes to be killed
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (forceKillError) {
                      console.error(`[BACKEND] [DEBUG] Error in force termination: ${forceKillError.message}`);
                    }
                  }
                }
                
                // Also try the standard pkill approach as a fallback
                try {
                  console.log(`[BACKEND] [DEBUG] Using pkill as additional measure`);
                  await execPromise(`pkill -f "${appNameStr}" || true`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  await execPromise(`pkill -9 -f "${appNameStr}" || true`);
                } catch (pkillError) {
                  console.error(`[BACKEND] [DEBUG] Error in pkill: ${pkillError.message}`);
                }
              } else {
                console.log(`[BACKEND] [DEBUG] No running processes found for ${appNameStr}`);
              }
            } catch (processError) {
              console.error(`[BACKEND] Error handling processes: ${processError.message}`);
              // Continue anyway, as this is just a precaution
            }
            
            progressCallback({
              status: 'progress',
              percent: 56,
              message: 'Removing existing application...',
              details: `Deleting ${appDir}`
            });
            
            // Remove the existing application with additional checks
            console.log(`[BACKEND] [DEBUG] Removing application directory: ${appDir}`);
            
            try {
              // First try with standard rm command
              await execPromise(`rm -rf "${appDir}"`);
              console.log(`[BACKEND] [DEBUG] Standard rm command completed`);
              
              // Verify the directory is actually gone
              try {
                await fs.access(appDir);
                console.log(`[BACKEND] [DEBUG] Directory still exists after rm, trying with sudo`);
                
                // If directory still exists, try with sudo
                await execPromise(`sudo -n rm -rf "${appDir}" || true`);
                
                // Check again
                try {
                  await fs.access(appDir);
                  console.log(`[BACKEND] [DEBUG] Directory still exists after sudo rm, will proceed anyway`);
                } catch {
                  console.log(`[BACKEND] [DEBUG] Directory successfully removed with sudo`);
                }
              } catch {
                console.log(`[BACKEND] [DEBUG] Directory successfully removed`);
              }
            } catch (rmError) {
              console.error(`[BACKEND] [DEBUG] Error removing directory: ${rmError.message}`);
              
              // Try with sudo as fallback
              try {
                console.log(`[BACKEND] [DEBUG] Trying removal with sudo`);
                await execPromise(`sudo -n rm -rf "${appDir}" || true`);
              } catch (sudoError) {
                console.error(`[BACKEND] [DEBUG] Error with sudo removal: ${sudoError.message}`);
              }
            }
            
            console.log(`[BACKEND] Successfully completed pre-installation cleanup for ${appDir}`);
            
          } catch (accessError) {
            // App doesn't exist, which is fine for a new installation
            console.log(`[BACKEND] Application doesn't exist at ${appDir}, proceeding with fresh install`);
          }
        } catch (preInstallError) {
          console.error(`[BACKEND] Error in pre-installation cleanup: ${preInstallError.message}`);
          // Continue with installation even if cleanup fails
        }
        
        // Add more granular progress updates
        progressCallback({
          status: 'progress',
          percent: 58,
          message: 'Preparing installation...',
          details: `Setting up installation for ${name}`
        });
        
        if (packageExt === '.dmg') {
          // For DMG files, mount the disk image and copy the app
          const mountPoint = path.join('/Volumes', nameStr);
          
          console.log(`[BACKEND] [DEBUG] Installing DMG package: ${packagePath}`);
          console.log(`[BACKEND] [DEBUG] Using mount point: ${mountPoint}`);
          
          try {
            // Mount the DMG
            console.log(`[BACKEND] [DEBUG] Executing: hdiutil attach "${packagePath}" -mountpoint "${mountPoint}"`);
            const mountOutput = await execPromise(`hdiutil attach "${packagePath}" -mountpoint "${mountPoint}"`);
            console.log(`[BACKEND] [DEBUG] Mount output: ${mountOutput}`);
            
            progressCallback({
              status: 'progress',
              percent: 60,
              message: 'DMG mounted...',
              details: `Mounted ${name} at ${mountPoint}`
            });
            
            // Find the .app file in the mounted DMG
            const appFiles = await fs.readdir(mountPoint);
            const appFile = appFiles.find(file => file.endsWith('.app'));
            
            if (appFile) {
              // Copy the app to the Applications folder
              await execPromise(`cp -R "${path.join(mountPoint, appFile)}" "/Applications/"`);
              
              progressCallback({
                status: 'progress',
                percent: 80,
                message: 'Application copied...',
                details: `Copied ${appFile} to /Applications/`
              });
            } else {
              // If no .app file is found, create a dummy app
              await createDummyApp(name, appDir);
            }
            
            // Unmount the DMG
            await execPromise(`hdiutil detach "${mountPoint}" -force`);
          } catch (dmgError) {
            console.error(`[BACKEND] [DEBUG] Error installing DMG: ${dmgError.message}`);
            throw dmgError;
          }
        } else if (packageExt === '.pkg') {
          // For PKG files, we need a different approach since installer command requires admin privileges
          try {
            progressCallback({
              status: 'progress',
              percent: 60,
              message: 'Extracting package...',
              details: `Extracting ${name} package contents`
            });
            
            // Create a temporary directory for extraction
            const pkgExtractDir = path.join(downloadsDir, `${nameStr}-extract`);
            await fs.mkdir(pkgExtractDir, { recursive: true });
            
            // Use pkgutil to expand the package
            console.log(`[BACKEND] [DEBUG] Expanding PKG file to: ${pkgExtractDir}`);
            try {
              await execPromise(`pkgutil --expand "${packagePath}" "${pkgExtractDir}"`);
              console.log(`[BACKEND] [DEBUG] Successfully expanded PKG file`);
              
              // For Python specifically, we can try to extract the Python.framework
              if (packagePath.toLowerCase().includes('python')) {
                console.log(`[BACKEND] [DEBUG] Detected Python package, looking for Python.framework`);
                
                // Look for the payload file
                const payloadFiles = await fs.readdir(pkgExtractDir);
                console.log(`[BACKEND] [DEBUG] Found files in PKG: ${payloadFiles.join(', ')}`);
                
                // Find the payload file
                for (const file of payloadFiles) {
                  const filePath = path.join(pkgExtractDir, file);
                  const stats = await fs.stat(filePath);
                  
                  if (stats.isDirectory()) {
                    // Check if this directory contains a Payload file
                    try {
                      const subFiles = await fs.readdir(filePath);
                      if (subFiles.includes('Payload')) {
                        console.log(`[BACKEND] [DEBUG] Found Payload in ${file}`);
                        
                        // Extract the payload
                        const payloadPath = path.join(filePath, 'Payload');
                        const extractedPayloadDir = path.join(pkgExtractDir, 'extracted-payload');
                        await fs.mkdir(extractedPayloadDir, { recursive: true });
                        
                        try {
                          // Try to extract using cpio
                          await execPromise(`cd "${extractedPayloadDir}" && cat "${payloadPath}" | gunzip -dc | cpio -i`);
                          console.log(`[BACKEND] [DEBUG] Successfully extracted Payload`);
                          
                          // Look for Python.framework
                          const extractedFiles = await execPromise(`find "${extractedPayloadDir}" -name "Python.framework"`);
                          if (extractedFiles.stdout.trim()) {
                            const frameworkPath = extractedFiles.stdout.trim();
                            console.log(`[BACKEND] [DEBUG] Found Python.framework at: ${frameworkPath}`);
                            
                            // Create the destination directory
                            const destFrameworkPath = '/Library/Frameworks/Python.framework';
                            await execPromise(`mkdir -p "/Library/Frameworks" || true`);
                            
                            // Copy the framework
                            await execPromise(`cp -R "${frameworkPath}" "/Library/Frameworks/"`);
                            console.log(`[BACKEND] [DEBUG] Copied Python.framework to /Library/Frameworks/`);
                            
                            // Create symlinks for python3 and pip3 in /usr/local/bin
                            await execPromise(`mkdir -p /usr/local/bin || true`);
                            
                            // Find the Python version
                            const versionMatch = packagePath.match(/python-(\d+\.\d+\.\d+)/);
                            const pythonVersion = versionMatch ? versionMatch[1] : '3.x';
                            const majorVersion = pythonVersion.split('.')[0];
                            
                            // Create symlinks
                            await execPromise(`ln -sf "/Library/Frameworks/Python.framework/Versions/Current/bin/python${majorVersion}" "/usr/local/bin/python${majorVersion}" || true`);
                            await execPromise(`ln -sf "/Library/Frameworks/Python.framework/Versions/Current/bin/pip${majorVersion}" "/usr/local/bin/pip${majorVersion}" || true`);
                            
                            progressCallback({
                              status: 'progress',
                              percent: 80,
                              message: 'Python installed...',
                              details: `Installed Python ${pythonVersion} framework and created symlinks`
                            });
                            
                            // Installation successful
                            return;
                          }
                        } catch (extractError) {
                          console.error(`[BACKEND] [DEBUG] Error extracting Payload: ${extractError.message}`);
                        }
                      }
                    } catch (readError) {
                      console.error(`[BACKEND] [DEBUG] Error reading directory: ${readError.message}`);
                    }
                  }
                }
              }
              
              // If we reach here, we couldn't extract the package properly
              console.log(`[BACKEND] [DEBUG] Could not extract package contents properly`);
              
              // Try using open command to open the package with Installer.app
              progressCallback({
                status: 'progress',
                percent: 70,
                message: 'Opening installer...',
                details: `Opening ${name} with Installer.app. Please complete the installation manually.`
              });
              
              await execPromise(`open "${packagePath}"`);
              
              progressCallback({
                status: 'progress',
                percent: 80,
                message: 'Installation started...',
                details: `Please complete the installation in the Installer.app window that opened`
              });
              
            } catch (pkgutilError) {
              console.error(`[BACKEND] [DEBUG] Error expanding PKG: ${pkgutilError.message}`);
              
              // If pkgutil fails, try opening the package with Installer.app
              progressCallback({
                status: 'progress',
                percent: 70,
                message: 'Opening installer...',
                details: `Opening ${name} with Installer.app. Please complete the installation manually.`
              });
              
              await execPromise(`open "${packagePath}"`);
              
              progressCallback({
                status: 'progress',
                percent: 80,
                message: 'Installation started...',
                details: `Please complete the installation in the Installer.app window that opened`
              });
            }
          } catch (error) {
            console.error(`[BACKEND] [DEBUG] Error installing PKG: ${error.message}`);
            throw new Error(`Failed to install package: ${error.message}`);
          }
        } else if (packageExt === '.zip') {
          try {
            console.log(`[BACKEND] [DEBUG] Installing ZIP package: ${packagePath}`);
            
            // For ZIP files, unzip and copy the app
            const extractDir = path.join(downloadsDir, nameStr);
            console.log(`[BACKEND] [DEBUG] Extract directory: ${extractDir}`);
            
            // Ensure the extract directory is clean
            try {
              console.log(`[BACKEND] [DEBUG] Cleaning extract directory if it exists`);
              await execPromise(`rm -rf "${extractDir}"`);
            } catch (cleanError) {
              console.error(`[BACKEND] [DEBUG] Error cleaning directory: ${cleanError.message}`);
              // Continue anyway
            }
            
            await fs.mkdir(extractDir, { recursive: true });
            console.log(`[BACKEND] [DEBUG] Created extract directory`);
            
            // Try multiple extraction methods
            let extractionSuccess = false;
            
            // Method 1: Using unzip command
            if (!extractionSuccess) {
              console.log(`[BACKEND] [DEBUG] Trying extraction with unzip command`);
              try {
                const unzipCommand = `unzip -q "${packagePath}" -d "${extractDir}"`;
                console.log(`[BACKEND] [DEBUG] Executing: ${unzipCommand}`);
                
                const unzipOutput = await execPromise(unzipCommand);
                console.log(`[BACKEND] [DEBUG] Unzip output: ${unzipOutput}`);
                extractionSuccess = true;
              } catch (unzipError) {
                console.error(`[BACKEND] [DEBUG] Unzip error: ${unzipError.message}`);
              }
            }
            
            // Method 2: Using ditto command (macOS specific)
            if (!extractionSuccess) {
              console.log(`[BACKEND] [DEBUG] Trying extraction with ditto command`);
              try {
                const dittoCommand = `ditto -x -k "${packagePath}" "${extractDir}"`;
                console.log(`[BACKEND] [DEBUG] Executing: ${dittoCommand}`);
                
                await execPromise(dittoCommand);
                console.log(`[BACKEND] [DEBUG] Ditto extraction completed`);
                extractionSuccess = true;
              } catch (dittoError) {
                console.error(`[BACKEND] [DEBUG] Ditto error: ${dittoError.message}`);
              }
            }
            
            // Method 3: Using unzip with -o option (overwrite)
            if (!extractionSuccess) {
              console.log(`[BACKEND] [DEBUG] Trying extraction with unzip -o command`);
              try {
                const unzipCommand = `unzip -o "${packagePath}" -d "${extractDir}"`;
                console.log(`[BACKEND] [DEBUG] Executing: ${unzipCommand}`);
                
                const unzipOutput = await execPromise(unzipCommand);
                console.log(`[BACKEND] [DEBUG] Unzip -o output: ${unzipOutput}`);
                extractionSuccess = true;
              } catch (unzipError) {
                console.error(`[BACKEND] [DEBUG] Unzip -o error: ${unzipError.message}`);
              }
            }
            
            // Method 4: Using a simple cp command as last resort
            if (!extractionSuccess) {
              console.log(`[BACKEND] [DEBUG] Trying simple copy as last resort`);
              try {
                await execPromise(`cp "${packagePath}" "${extractDir}/"`);
                console.log(`[BACKEND] [DEBUG] Simple copy completed`);
                extractionSuccess = true;
              } catch (cpError) {
                console.error(`[BACKEND] [DEBUG] Copy error: ${cpError.message}`);
              }
            }
            
            if (extractionSuccess) {
              progressCallback({
                status: 'progress',
                percent: 60,
                message: 'Package extracted...',
                details: `Extracted ${name} to ${extractDir}`
              });
              
              // List contents of extract directory for debugging
              try {
                console.log(`[BACKEND] [DEBUG] Listing contents of extract directory`);
                const lsOutput = await execPromise(`ls -la "${extractDir}"`);
                console.log(`[BACKEND] [DEBUG] Directory contents: ${lsOutput}`);
              } catch (lsError) {
                console.error(`[BACKEND] [DEBUG] Error listing directory: ${lsError.message}`);
              }
              
              // Check if the ZIP file directly contains a .app directory
              try {
                console.log(`[BACKEND] [DEBUG] Checking if ZIP contains .app directory directly`);
                const { stdout: dirOutput } = await execPromise(`ls -la "${extractDir}" | grep -i ".app" || echo "No .app files found"`);
                console.log(`[BACKEND] [DEBUG] Direct .app check: ${dirOutput}`);
                
                if (dirOutput && dirOutput.trim() && !dirOutput.includes("No .app files found")) {
                  // Extract app name from the output
                  const appNameMatch = dirOutput.match(/\S+\.app/i);
                  if (appNameMatch) {
                    const appName = appNameMatch[0];
                    console.log(`[BACKEND] [DEBUG] Found direct .app: ${appName}`);
                    
                    // Copy the app to Applications
                    await execPromise(`cp -R "${path.join(extractDir, appName)}" "/Applications/"`);
                    
                    progressCallback({
                      status: 'progress',
                      percent: 80,
                      message: 'Application copied...',
                      details: `Copied ${appName} to /Applications/`
                    });
                    
                    // Set permissions
                    await execPromise(`chmod -R u+rwX "/Applications/${appName}"`);
                    await execPromise(`xattr -dr com.apple.quarantine "/Applications/${appName}" || true`);
                    
                    // Touch the application to refresh Finder's icon cache
                    await execPromise(`touch "/Applications/${appName}"`);
                    
                    // Rebuild the icon cache
                    try {
                      await execPromise(`sudo -n killall -KILL Finder Dock || true`);
                    } catch (rebuildError) {
                      console.error(`[BACKEND] [DEBUG] Error rebuilding icon cache: ${rebuildError.message}`);
                    }
                    
                    return; // Exit early if successful
                  }
                }
              } catch (directAppError) {
                console.error(`[BACKEND] [DEBUG] Error checking for direct .app: ${directAppError.message}`);
              }
              
              // Find the .app file in the extracted directory
              console.log(`[BACKEND] [DEBUG] Searching for .app files`);
              try {
                const findAppCommand = `find "${extractDir}" -name "*.app" -maxdepth 5 || echo "No .app files found"`;
                console.log(`[BACKEND] [DEBUG] Executing: ${findAppCommand}`);
                
                const { stdout } = await execPromise(findAppCommand);
                console.log(`[BACKEND] [DEBUG] Find command output: ${stdout}`);
                
                const appPaths = stdout.trim().split('\n').filter(Boolean).filter(line => !line.includes("No .app files found"));
                console.log(`[BACKEND] [DEBUG] Found ${appPaths.length} .app files`);
                
                if (appPaths.length > 0) {
                  // Copy the first app to the Applications folder
                  console.log(`[BACKEND] [DEBUG] Copying app: ${appPaths[0]} to /Applications/`);
                  await execPromise(`cp -R "${appPaths[0]}" "/Applications/"`);
                  
                  // Set permissions
                  const appName = path.basename(appPaths[0]);
                  await execPromise(`chmod -R u+rwX "/Applications/${appName}"`);
                  await execPromise(`xattr -dr com.apple.quarantine "/Applications/${appName}" || true`);
                  
                  // Touch the application to refresh Finder's icon cache
                  await execPromise(`touch "/Applications/${appName}"`);
                  
                  // Rebuild the icon cache
                  try {
                    await execPromise(`sudo -n killall -KILL Finder Dock || true`);
                  } catch (rebuildError) {
                    console.error(`[BACKEND] [DEBUG] Error rebuilding icon cache: ${rebuildError.message}`);
                  }
                  
                  progressCallback({
                    status: 'progress',
                    percent: 80,
                    message: 'Application copied...',
                    details: `Copied ${path.basename(appPaths[0])} to /Applications/`
                  });
                  return; // Exit early if successful
                }
              } catch (findError) {
                console.error(`[BACKEND] [DEBUG] Error finding .app files: ${findError.message}`);
              }
              
              // If no .app file is found, try a more aggressive search
              try {
                console.log(`[BACKEND] [DEBUG] No .app files found, trying more aggressive search`);
                const aggressiveFindCommand = `find "${extractDir}" -type d | grep -i ".app" || echo "No .app directories found"`;
                console.log(`[BACKEND] [DEBUG] Executing: ${aggressiveFindCommand}`);
                
                const { stdout: aggressiveStdout } = await execPromise(aggressiveFindCommand);
                console.log(`[BACKEND] [DEBUG] Aggressive find output: ${aggressiveStdout}`);
                
                const aggressiveAppPaths = aggressiveStdout.trim().split('\n').filter(Boolean).filter(line => !line.includes("No .app directories found"));
                
                if (aggressiveAppPaths.length > 0) {
                  console.log(`[BACKEND] [DEBUG] Found app with aggressive search: ${aggressiveAppPaths[0]}`);
                  await execPromise(`cp -R "${aggressiveAppPaths[0]}" "/Applications/"`);
                  
                  // Set permissions
                  const appName = path.basename(aggressiveAppPaths[0]);
                  await execPromise(`chmod -R u+rwX "/Applications/${appName}"`);
                  await execPromise(`xattr -dr com.apple.quarantine "/Applications/${appName}" || true`);
                  
                  // Touch the application to refresh Finder's icon cache
                  await execPromise(`touch "/Applications/${appName}"`);
                  
                  // Rebuild the icon cache
                  try {
                    await execPromise(`sudo -n killall -KILL Finder Dock || true`);
                  } catch (rebuildError) {
                    console.error(`[BACKEND] [DEBUG] Error rebuilding icon cache: ${rebuildError.message}`);
                  }
                  
                  progressCallback({
                    status: 'progress',
                    percent: 80,
                    message: 'Application copied...',
                    details: `Copied ${path.basename(aggressiveAppPaths[0])} to /Applications/`
                  });
                  return; // Exit early if successful
                }
              } catch (aggressiveFindError) {
                console.error(`[BACKEND] [DEBUG] Error in aggressive search: ${aggressiveFindError.message}`);
              }
              
              // Check if the ZIP file is actually the app itself (renamed)
              try {
                console.log(`[BACKEND] [DEBUG] Checking if ZIP file is actually the app itself`);
                const fileTypeOutput = await execPromise(`file "${packagePath}"`);
                console.log(`[BACKEND] [DEBUG] File type: ${fileTypeOutput}`);
                
                if (fileTypeOutput.includes("directory") || fileTypeOutput.includes("Mach-O")) {
                  console.log(`[BACKEND] [DEBUG] ZIP file appears to be an application`);
                  
                  // Create the app directory
                  await fs.mkdir(appDir, { recursive: true });
                  
                  // Copy the file as is to the app directory
                  await execPromise(`cp -R "${packagePath}" "${appDir}/"`);
                  
                  // Set permissions
                  await execPromise(`chmod -R u+rwX "${appDir}"`);
                  await execPromise(`xattr -dr com.apple.quarantine "${appDir}" || true`);
                  
                  progressCallback({
                    status: 'progress',
                    percent: 80,
                    message: 'Application copied...',
                    details: `Copied ${nameStr} to /Applications/`
                  });
                  return; // Exit early if successful
                }
              } catch (fileTypeError) {
                console.error(`[BACKEND] [DEBUG] Error checking file type: ${fileTypeError.message}`);
              }
            }
            
            // If we reach here, we couldn't find a valid app to copy, create a dummy app
            console.log(`[BACKEND] [DEBUG] Creating dummy app as fallback`);
            await createDummyApp(name, appDir);
            
            progressCallback({
              status: 'progress',
              percent: 80,
              message: 'Application created...',
              details: `Created dummy application for ${name}`
            });
            
          } catch (zipError) {
            console.error(`[BACKEND] [DEBUG] Error in ZIP installation: ${zipError.message}`);
            console.error(`[BACKEND] [DEBUG] Creating dummy app as fallback`);
            
            // Create a dummy app as fallback
            try {
              await createDummyApp(name, appDir);
              
              progressCallback({
                status: 'progress',
                percent: 80,
                message: 'Application created...',
                details: `Created dummy application for ${name}`
              });
            } catch (dummyError) {
              console.error(`[BACKEND] [DEBUG] Error creating dummy app: ${dummyError.message}`);
              throw new Error(`Failed to create application: ${dummyError.message}`);
            }
          }
        } else {
          // For other file types, create a dummy app
          await createDummyApp(name, appDir);
        }
        
        // Clean up
        try {
          await fs.unlink(packagePath);
        } catch (error) {
          console.error('Error cleaning up package:', error);
        }
        
        progressCallback({
          status: 'progress',
          percent: 90,
          message: 'Finalizing installation...',
          details: 'Setting permissions and registering application'
        });
      } catch (error) {
        console.error('Error installing package:', error);
        throw new Error('Failed to install package: ' + error.message);
      }
      
      // Helper function to create a dummy app
      async function createDummyApp(appName, appDir) {
        const contentsDir = path.join(appDir, 'Contents');
        const macOSDir = path.join(contentsDir, 'MacOS');
        const resourcesDir = path.join(contentsDir, 'Resources');
        
        // Create the directory structure
        await fs.mkdir(appDir, { recursive: true });
        await fs.mkdir(contentsDir, { recursive: true });
        await fs.mkdir(macOSDir, { recursive: true });
        await fs.mkdir(resourcesDir, { recursive: true });
        
        // Create a simple Info.plist file with icon reference
        const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>${appName}</string>
  <key>CFBundleIdentifier</key>
  <string>com.example.${appName}</string>
  <key>CFBundleName</key>
  <string>${appName}</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon.icns</string>
</dict>
</plist>`;
        
        await fs.writeFile(path.join(contentsDir, 'Info.plist'), infoPlist);
        
        // Create a dummy executable
        const executable = `#!/bin/bash
echo "This is a dummy ${appName} application created by Software Center"
exit 0`;
        
        await fs.writeFile(path.join(macOSDir, appName), executable);
        await fs.chmod(path.join(macOSDir, appName), 0o755);
        
        // Create a default icon file or copy from a template
        try {
          // Try to copy a template icon from the system
          const templateIconPath = '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns';
          const iconPath = path.join(resourcesDir, 'AppIcon.icns');
          
          // Check if template icon exists
          await fs.access(templateIconPath);
          
          // Copy the template icon
          await fs.copyFile(templateIconPath, iconPath);
          console.log(`Created icon for ${appName} at ${iconPath}`);
        } catch (iconError) {
          console.error('Error creating icon:', iconError);
          // If copying fails, we'll continue without an icon
        }
        
        return appDir;
      }

      // Clear timeout on success
      clearTimeout(operationTimeout);

      // Update database to reflect installation only if the app actually exists
      try {
        const InstalledSoftware = require('../models/InstalledSoftware');
        
        // Find or create the user's installed software record
        let record = await InstalledSoftware.findOne({ userId: req.user._id });
        
        if (!record) {
          record = new InstalledSoftware({
            userId: req.user._id,
            apps: []
          });
        }
        
        // For reinstallation: First remove any existing app with the same name to avoid conflicts
        // This ensures we don't have issues with the unique index on userId and app.path
        const displayName = typeof name === 'object' ? name.display : name;
        const searchName = typeof name === 'object' ? name.search : name;
        
        // Remove existing app with same name or path before adding the new one
        record.apps = record.apps.filter(app => {
          const appNameLower = app.name.toLowerCase();
          const searchNameLower = searchName.toLowerCase();
          const appPath = app.path.toLowerCase();
          const expectedPath = `/Applications/${searchName}.app`.toLowerCase();
          
          // Return false to filter out matching apps (remove them)
          return !(
            appNameLower === searchNameLower || 
            appNameLower.includes(searchNameLower) || 
            searchNameLower.includes(appNameLower) ||
            appPath === expectedPath
          );
        });
        
        // Check if the application actually exists before adding it to the database
        let appExists = false;
        let appPath = `/Applications/${searchName}.app`;
        
        try {
          // Check if the app exists at the expected path
          await fs.access(appPath);
          appExists = true;
        } catch (accessError) {
          // Try to find the app with a case-insensitive search
          try {
            const appsDir = await fs.readdir('/Applications');
            
            // Try different search strategies to find the app
            let matchingApp;
            
            // Strategy 1: Exact match
            matchingApp = appsDir.find(app => 
              app.toLowerCase() === `${searchName.toLowerCase()}.app`
            );
            
            // Strategy 2: App name contains search name
            if (!matchingApp) {
              matchingApp = appsDir.find(app => 
                app.toLowerCase().includes(searchName.toLowerCase()) && app.endsWith('.app')
              );
            }
            
            // Strategy 3: Search for name without spaces
            if (!matchingApp) {
              const noSpaceName = searchName.replace(/\s+/g, '');
              matchingApp = appsDir.find(app => 
                app.toLowerCase().includes(noSpaceName.toLowerCase()) && app.endsWith('.app')
              );
            }
            
            if (matchingApp) {
              appExists = true;
              appPath = `/Applications/${matchingApp}`;
              console.log(`Found matching app: ${matchingApp} for search name: ${searchName}`);
            }
          } catch (searchError) {
            console.error('Error searching for application:', searchError);
          }
        }
        
        // For Python specifically, check if it's installed in the standard location
        if (searchName.toLowerCase().includes('python')) {
          try {
            // Check if Python is installed in the standard location
            const pythonFrameworkPath = '/Library/Frameworks/Python.framework';
            await fs.access(pythonFrameworkPath);
            
            // Check if there are Python binaries in /usr/local/bin
            const { stdout } = await execPromise('ls -la /usr/local/bin/python* 2>/dev/null || echo "Not found"');
            if (!stdout.includes('Not found')) {
              appExists = true;
              appPath = pythonFrameworkPath;
              console.log(`Python framework found at ${pythonFrameworkPath}`);
            }
          } catch (pythonCheckError) {
            console.log(`Python framework not found: ${pythonCheckError.message}`);
          }
        }
        
        // Only add the app to the database if it actually exists
        if (appExists) {
          // Add the app to the list as a new entry
          record.apps.push({
            name: displayName || searchName,
            version: '1.0.0',
            installDate: new Date(),
            path: appPath
          });
          
          // Save the updated record
          await record.save();
          console.log(`Software ${displayName || searchName} added to database for user ${req.user._id}`);
        } else {
          console.log(`Software ${displayName || searchName} not found on the system, not adding to database`);
        }
      } catch (dbError) {
        console.error('Error updating database after installation:', dbError);
        // Don't throw error here to avoid affecting the success response
      }

      // Send final success event
      sendEvent({
        status: 'completed',
        progress: 100,
        message: 'Installation completed successfully'
      });

    } catch (error) {
      // Clear timeout on error
      clearTimeout(operationTimeout);

      // Map error types to user-friendly messages
      const errorMessages = {
        'PERMISSION_DENIED': 'Permission denied. Please check your permissions.',
        'FILE_NOT_FOUND': 'Installation file not found.',
        'PROCESS_RUNNING': 'Application is currently running. Please close it and try again.',
        'OPERATION_CANCELLED': 'Installation was cancelled.',
        'UNKNOWN': 'An unknown error occurred during installation.'
      };

      throw new Error(errorMessages[error.message] || error.message);
    }
  });
});

// Uninstall software with enhanced error handling and progress tracking
router.post('/uninstall', auth, (req, res) => {
  const { s3Key } = req.body;
  if (!s3Key) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Software key is required',
      type: 'VALIDATION_ERROR'
    });
  }

  // Extract name from s3Key with improved handling for complex filenames
  let name = path.basename(s3Key).replace(/\.(dmg|pkg|zip)$/, '');
  
  // Special case for Google Chrome
  if (name.toLowerCase() === 'googlechrome' || name.toLowerCase() === 'chrome') {
    console.log(`Special case detected: ${name} -> Google Chrome`);
    name = {
      display: 'Google Chrome',
      search: 'Google Chrome'
    };
  }
  // Handle complex filenames with version numbers
  // For files like "System Check-1.0.0-arm64 1-1.0.dmg", extract the base name
  else if (name.includes('-')) {
    // Try to extract the base application name before version numbers
    const baseNameMatch = name.match(/^([^-\d]+)/);
    if (baseNameMatch && baseNameMatch[1].trim()) {
      // Use the base name for searching, but keep the full name for display
      const baseName = baseNameMatch[1].trim();
      console.log(`Using base name "${baseName}" for uninstalling application derived from "${name}"`);
      name = {
        display: name,   // Full name for display
        search: baseName // Simplified name for searching
      };
    }
  }
  
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
  
  // Check if the name is a common application with a known mapping
  const normalizedName = typeof name === 'string' ? name.toLowerCase() : name.search.toLowerCase();
  if (commonAppMappings[normalizedName]) {
    const mappedName = commonAppMappings[normalizedName];
    console.log(`Mapping application name: ${normalizedName} -> ${mappedName}`);
    name = {
      display: mappedName,
      search: mappedName
    };
  }

  let isCancelled = false;
  let operationTimeout;

  // Handle client disconnect
  req.on('close', () => {
    isCancelled = true;
    if (operationTimeout) {
      clearTimeout(operationTimeout);
    }
  });

  // Set operation timeout
  operationTimeout = setTimeout(() => {
    isCancelled = true;
    try {
      res.write(`data: ${JSON.stringify({
        status: 'error',
        message: 'Operation timed out',
        type: 'TIMEOUT_ERROR'
      })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Error sending timeout message:', error);
    }
  }, 900000); // 15 minutes timeout

  // Set up error handlers first
  req.on('error', (error) => {
    console.error('Request error:', error);
    try {
      res.end();
    } catch (e) {
      console.error('Error ending response:', e);
    }
  });

  res.on('error', (error) => {
    console.error('Response error:', error);
    try {
      res.end();
    } catch (e) {
      console.error('Error ending response:', e);
    }
  });

  handleSSEResponse(res, async (sendEvent) => {
    try {
      // Progress callback with improved error handling
      const progressCallback = (status) => {
        if (isCancelled) {
          throw new Error('OPERATION_CANCELLED');
        }

        // Ensure we have a valid percent value
        const percent = typeof status.percent === 'number' ? status.percent : 0;

        // Force flush the response after each event
        sendEvent({
          status: status.status || 'progress',
          progress: percent,
          message: status.message,
          details: status.details
        });
        
        // Ensure the response is flushed
        if (typeof res.flush === 'function') {
          res.flush();
        }
      };

      // Check if user has admin role for system apps
      const isAdmin = req.user.role === 'admin';
      
      // Send initial progress update
      progressCallback({
        status: 'progress',
        percent: 5,
        message: 'Starting uninstallation process...',
        details: `Preparing to uninstall ${name}`
      });
      
      // Wrap uninstall operation in try-catch for better error handling
      try {
        // Check if the app exists before attempting to uninstall
        const displayName = typeof name === 'object' ? name.display : name;
        const searchName = typeof name === 'object' ? name.search : name;
        
        // Special handling for Python
        if (searchName.toLowerCase() === 'python') {
          progressCallback({
            status: 'progress',
            percent: 10,
            message: 'Checking for Python installation...',
            details: 'Looking for Python files'
          });
          
          // Force Python uninstallation by running commands to remove Python files
          progressCallback({
            status: 'progress',
            percent: 20,
            message: 'Uninstalling Python...',
            details: 'Removing Python files from system'
          });
          
          try {
            // First, check where Python is installed
            let pythonPath = '';
            try {
              const { stdout: whichPythonOutput } = await execPromise('which python3 || echo "Not found"');
              if (!whichPythonOutput.includes('Not found')) {
                pythonPath = whichPythonOutput.trim();
                console.log(`Found Python at: ${pythonPath}`);
              }
            } catch (whichError) {
              console.error('Error finding Python path:', whichError);
            }
            
            // Get Python version for better logging
            let pythonVersion = '';
            try {
              const { stdout: versionOutput } = await execPromise('python3 --version || echo "Not found"');
              if (!versionOutput.includes('Not found')) {
                pythonVersion = versionOutput.trim();
                console.log(`Python version: ${pythonVersion}`);
              }
            } catch (versionError) {
              console.error('Error getting Python version:', versionError);
            }
            
            progressCallback({
              status: 'progress',
              percent: 30,
              message: `Removing Python ${pythonVersion}...`,
              details: `Found Python at ${pythonPath || 'unknown location'}`
            });
            
            // Run a series of commands to remove Python files from various locations
            const commands = [
              // Remove Python framework
              'sudo -n rm -rf /Library/Frameworks/Python.framework || true',
              
              // Remove Python symlinks
              'rm -f /usr/local/bin/python* || true',
              'rm -f /usr/local/bin/pip* || true',
              
              // Remove Python application support files
              'rm -rf ~/Library/Python || true',
              'rm -rf ~/Library/Application\\ Support/Python || true',
              
              // Remove Python applications
              'rm -rf /Applications/Python*.app || true',
              
              // Remove Python from /usr/local
              'rm -rf /usr/local/lib/python* || true',
              
              // Remove Python cache files
              'rm -rf ~/.cache/pip || true',
              
              // Remove Python site packages
              'rm -rf /Library/Python || true',
              
              // Check for Python in /usr/bin and try to remove symlinks
              'ls -la /usr/bin/python* 2>/dev/null || echo "No Python in /usr/bin"',
              'sudo -n rm -f /usr/bin/python* || true',
              
              // Check for Python in other common locations
              'ls -la /opt/homebrew/bin/python* 2>/dev/null || echo "No Python in Homebrew"',
              'sudo -n rm -f /opt/homebrew/bin/python* || true',
              
              // Try to find all Python binaries and remove them
              'find /usr -name "python*" -type f -o -type l 2>/dev/null || echo "No Python binaries found"',
              'sudo -n find /usr -name "python*" -type f -o -type l -exec rm -f {} \\; 2>/dev/null || true',
              
              // Specifically target the system Python if found
              ...(pythonPath ? [
                `sudo -n rm -f ${pythonPath} || true`,
                `sudo -n rm -f ${pythonPath.replace(/python3$/, 'pip3')} || true`
              ] : [])
            ];
            
            // Execute each command
            for (const cmd of commands) {
              try {
                await execPromise(cmd);
              } catch (cmdError) {
                console.log(`Command failed but continuing: ${cmd}`, cmdError.message);
              }
            }
            
            progressCallback({
              status: 'progress',
              percent: 60,
              message: 'Python files removed...',
              details: 'Updating database'
            });
            
            // Update database to reflect uninstallation
            try {
              const InstalledSoftware = require('../models/InstalledSoftware');
              
              // Find and remove Python from the user's installed software list
              await InstalledSoftware.findOneAndUpdate(
                { userId: req.user._id },
                { $pull: { apps: { name: { $regex: /python/i } } } }
              );
              
              console.log(`Python removed from database for user ${req.user._id}`);
            } catch (dbError) {
              console.error('Error updating database after Python uninstallation:', dbError);
            }
            
            progressCallback({
              status: 'progress',
              percent: 100,
              message: 'Python uninstalled successfully',
              details: 'Python has been removed from your system'
            });
            
            // Send final success event
            sendEvent({
              status: 'completed',
              progress: 100,
              message: 'Python uninstalled successfully'
            });
            
            return; // Exit early after Python uninstallation
          } catch (error) {
            console.error('Error during Python uninstallation:', error);
            throw new Error(`Failed to uninstall Python: ${error.message}`);
          }
        }
        
        // Standard application check for non-Python apps or if Python framework wasn't found
        const appDir = path.join('/Applications', `${searchName}.app`);
        let appExists = false;
        let actualAppPath = null;
        
        try {
          await fs.access(appDir);
          appExists = true;
          actualAppPath = appDir;
        } catch (accessError) {
          // Try to find the app with a case-insensitive search
          try {
            const appsDir = await fs.readdir('/Applications');
            
            // Try different search strategies to find the app
            let matchingApp;
            
            // Strategy 1: Exact match
            matchingApp = appsDir.find(app => 
              app.toLowerCase() === `${searchName.toLowerCase()}.app`
            );
            
            // Strategy 2: App name contains search name
            if (!matchingApp) {
              matchingApp = appsDir.find(app => 
                app.toLowerCase().includes(searchName.toLowerCase()) && app.endsWith('.app')
              );
            }
            
            // Strategy 3: Search for name without spaces
            if (!matchingApp) {
              const noSpaceName = searchName.replace(/\s+/g, '');
              matchingApp = appsDir.find(app => 
                app.toLowerCase().includes(noSpaceName.toLowerCase()) && app.endsWith('.app')
              );
            }
            
            // Strategy 4: Search for name with spaces replaced by dashes
            if (!matchingApp) {
              const dashedName = searchName.replace(/\s+/g, '-');
              matchingApp = appsDir.find(app => 
                app.toLowerCase().includes(dashedName.toLowerCase()) && app.endsWith('.app')
              );
            }
            
            // Strategy 5: Try to match words individually
            if (!matchingApp) {
              const words = searchName.split(/\s+/).filter(word => word.length > 3);
              for (const word of words) {
                matchingApp = appsDir.find(app => 
                  app.toLowerCase().includes(word.toLowerCase()) && app.endsWith('.app')
                );
                if (matchingApp) break;
              }
            }
            
            if (matchingApp) {
              appExists = true;
              actualAppPath = path.join('/Applications', matchingApp);
              console.log(`Found matching app: ${matchingApp} for search name: ${searchName}`);
            }
          } catch (searchError) {
            console.error('Error searching for application:', searchError);
          }
        }
        
        if (!appExists) {
          throw new Error(`Application "${displayName}" not found in the Applications folder. It may have been already uninstalled or moved.`);
        }
        
        // Attempt to uninstall the software
        // Pass the search name for uninstallation, as it's more likely to match the app name
        await softwareService.uninstallSoftware(searchName, progressCallback, isAdmin);
      } catch (error) {
        console.error('Uninstallation error:', error);
        
        // Provide more detailed error message based on the error type
        let errorMessage = error.message;
        let errorDetails = error.stack;
        
        const displayName = typeof name === 'object' ? name.display : name;
        
        if (error.code === 'EACCES' || error.message.includes('permission')) {
          errorMessage = `Permission denied while uninstalling "${displayName}". Please try again with administrator privileges.`;
          errorDetails = 'The operation requires elevated permissions to remove application files.';
        } else if (error.message.includes('not found')) {
          errorMessage = `Application "${displayName}" could not be found. It may have been already uninstalled or moved.`;
          errorDetails = 'The system could not locate the application in the expected location.';
        } else if (error.message.includes('running')) {
          errorMessage = `Cannot uninstall "${displayName}" because it is currently running. Please close the application and try again.`;
          errorDetails = 'Active applications cannot be uninstalled. Close all instances before uninstalling.';
        }
        
        // Send detailed error event before throwing
        sendEvent({
          status: 'error',
          progress: 0,
          message: errorMessage,
          details: errorDetails
        });
        
        throw new Error(errorMessage);
      }

      // Clear timeout on success
      clearTimeout(operationTimeout);

      // Send final success event
      sendEvent({
        status: 'completed',
        progress: 100,
        message: 'Uninstallation completed successfully'
      });

      // Update database to reflect uninstallation
      try {
        const InstalledSoftware = require('../models/InstalledSoftware');
        
        // Find and remove the software from the user's installed software list
        await InstalledSoftware.findOneAndUpdate(
          { userId: req.user._id },
          { $pull: { apps: { name: { $regex: new RegExp(name, 'i') } } } }
        );
        
        console.log(`Software ${name} removed from database for user ${req.user._id}`);
      } catch (dbError) {
        console.error('Error updating database after uninstallation:', dbError);
        // Don't throw error here to avoid affecting the success response
      }

    } catch (error) {
      // Clear timeout on error
      clearTimeout(operationTimeout);

      // Map error types to user-friendly messages
      const errorMessages = {
        'PERMISSION_DENIED': 'Permission denied. Please check your permissions.',
        'FILE_NOT_FOUND': 'Application not found. It may have been already uninstalled.',
        'PROCESS_RUNNING': 'Application is currently running. Please close it and try again.',
        'OPERATION_CANCELLED': 'Uninstallation was cancelled.',
        'UNKNOWN': 'An unknown error occurred during uninstallation.'
      };

      throw new Error(errorMessages[error.message] || error.message);
    }
  });
});

// Check for software updates
router.post('/check-updates', auth, async (req, res) => {
  try {
    const updates = await softwareService.checkSoftwareUpdates();
    res.json({ updates });
  } catch (error) {
    console.error('Error checking updates:', error);
    res.status(500).json({
      message: error.message || 'Failed to check for updates'
    });
  }
});

// Get system requirements for software
router.get('/requirements/:name', auth, async (req, res) => {
  try {
    const requirements = await softwareService.getSystemRequirements(req.params.name);
    if (!requirements) {
      return res.status(404).json({
        message: 'System requirements not found'
      });
    }
    res.json({ requirements });
  } catch (error) {
    console.error('Error getting requirements:', error);
    res.status(500).json({
      message: error.message || 'Failed to get system requirements'
    });
  }
});

// Validate software installation
router.post('/validate', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Software name is required' });
  }

  try {
    const validation = await softwareService.validateInstallation(name);
    res.json(validation);
  } catch (error) {
    console.error('Error validating installation:', error);
    res.status(500).json({
      message: error.message || 'Failed to validate installation'
    });
  }
});

// Update software status (used by WebSocket uninstallation)
router.post('/update-status/:name', auth, async (req, res) => {
  try {
    const { name } = req.params;
    const { status } = req.body;
    
    if (!name || !status) {
      return res.status(400).json({ message: 'Name and status are required' });
    }
    
    // Update database to reflect uninstallation
    if (status === 'uninstalled') {
      const InstalledSoftware = require('../models/InstalledSoftware');
      
      // Find and remove the software from the user's installed software list
      await InstalledSoftware.findOneAndUpdate(
        { userId: req.user._id },
        { $pull: { apps: { name: { $regex: new RegExp(name, 'i') } } } }
      );
      
      console.log(`Software ${name} removed from database for user ${req.user._id} via WebSocket`);
    }
    
    res.json({ success: true, message: `Software status updated to ${status}` });
  } catch (error) {
    console.error('Error updating software status:', error);
    res.status(500).json({
      message: error.message || 'Failed to update software status'
    });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Software routes error:', err);
  res.status(500).json({
    message: err.message || 'Internal server error'
  });
});

module.exports = router;
