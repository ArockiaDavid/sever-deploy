const WebSocket = require('ws');
const AWS = require('aws-sdk');
const s3Config = require('../config/s3Config');
const jwt = require('jsonwebtoken');
const metadataService = require('../services/metadataService');
const softwareService = require('../services/softwareService');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Initialize S3
const s3 = new AWS.S3(s3Config);

// Function to verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Function to handle file upload to S3
const handleS3Upload = async (fileData, metadata, onProgress) => {
  const upload = s3.upload({
    Bucket: s3Config.bucket,
    Key: `packages/${metadata.name}-${metadata.version}${metadata.extension}`,
    Body: fileData,
    ContentType: metadata.contentType,
    Metadata: {
      name: metadata.name,
      category: metadata.category,
      version: metadata.version
    }
  });

  // Track upload progress
  upload.on('httpUploadProgress', (progress) => {
    const percent = Math.round((progress.loaded / progress.total) * 100);
    onProgress(percent);
  });

  const result = await upload.promise();

  // After successful upload, enrich metadata with icon and description
  try {
    const enrichedMetadata = await metadataService.enrichPackageMetadata(
      result.Key,
      metadata.name,
      metadata.category
    );

    if (enrichedMetadata) {
      console.log('Successfully enriched metadata:', enrichedMetadata);
    }
  } catch (error) {
    console.error('Error enriching metadata:', error);
  }

  return result;
};

// Function to send WebSocket message
const sendMessage = (ws, type, data = {}) => {
  try {
    ws.send(JSON.stringify({ type, ...data }));
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
  }
};

// Function to download file from S3
const downloadFromS3 = async (s3Key, onProgress) => {
  const tempDir = path.join(os.tmpdir(), 'SoftwareCenter');
  await fs.mkdir(tempDir, { recursive: true });

  const fileName = path.basename(s3Key);
  const filePath = path.join(tempDir, fileName);

  const downloadParams = {
    Bucket: s3Config.bucket,
    Key: s3Key
  };

  // Get file size
  const { ContentLength } = await s3.headObject(downloadParams).promise();
  
  // Create write stream
  const fileStream = require('fs').createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    let downloadedBytes = 0;

    const s3Stream = s3.getObject(downloadParams).createReadStream();

    s3Stream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const progress = Math.round((downloadedBytes / ContentLength) * 100);
      onProgress?.(progress);
    });

    s3Stream.pipe(fileStream)
      .on('error', (error) => {
        fileStream.end();
        reject(error);
      })
      .on('finish', () => {
        fileStream.end();
        resolve(filePath);
      });

    s3Stream.on('error', (error) => {
      fileStream.end();
      reject(error);
    });
  });
};

// Function to handle software installation
const handleInstallation = async (ws, s3Key) => {
  try {
    // First download the file
    sendMessage(ws, 'progress', {
      progress: 0,
      message: 'Downloading package...'
    });

    const filePath = await downloadFromS3(s3Key, (progress) => {
      sendMessage(ws, 'progress', {
        progress: Math.round(progress * 0.4), // 40% of total progress for download
        message: `Downloading package: ${progress}%`
      });
    });

    // Then install it
    await softwareService.installSoftware(filePath, (progress) => {
      const totalProgress = 40 + Math.round(progress.percent * 0.6); // Remaining 60% for installation
      sendMessage(ws, 'progress', {
        progress: totalProgress,
        message: progress.message || `Installing: ${progress.percent}%`,
        details: progress.details || ''
      });
    });

    // Clean up downloaded file
    await fs.unlink(filePath).catch(console.error);

    sendMessage(ws, 'completed', {
      data: { s3Key, status: 'installed' }
    });
  } catch (error) {
    console.error('Installation error:', error);
    sendMessage(ws, 'error', {
      message: error.message || 'Installation failed'
    });
  }
};

// Create WebSocket server
const createUploadServer = (server) => {
  const wss = new WebSocket.Server({
    server,
    path: '/ws/upload',
    maxPayload: 1024 * 1024 * 500 // 500MB max payload
  });

  wss.on('connection', async (ws, req) => {
    console.log('WebSocket connection established');

    // Extract token from query string
    const url = new URL(req.url, 'ws://localhost');
    const token = url.searchParams.get('token');
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      sendMessage(ws, 'error', { message: 'Unauthorized' });
      ws.close();
      return;
    }

    let fileBuffer = Buffer.from([]);
    let metadata = null;
    let uploadStarted = false;

    // Send initial progress
    sendMessage(ws, 'progress', {
      progress: 0,
      message: 'Connection established'
    });

    ws.on('message', async (data) => {
      try {
        // Parse message as JSON first
        let message;
        try {
          message = JSON.parse(data.toString());
        } catch (e) {
          // If parsing fails, treat as binary data
          message = null;
        }

        // Handle different message types
        if (message) {
          if (message.type === 'install') {
            await handleInstallation(ws, message.s3Key);
            return;
          } else if (message.type === 'uninstall') {
            // Uninstallation is now handled via HTTP API
            sendMessage(ws, 'error', { 
              message: 'Uninstallation via WebSocket is no longer supported. Please use the HTTP API instead.' 
            });
            return;
          } else if (!uploadStarted) {
            // Treat as upload metadata
            metadata = message;
            
            // Validate metadata
            if (!metadata.name || !metadata.category || !metadata.version || !metadata.size) {
              throw new Error('Invalid metadata');
            }

            // Check file size limit (500MB)
            if (metadata.size > 1024 * 1024 * 500) {
              throw new Error('File size exceeds limit of 500MB');
            }

            sendMessage(ws, 'ready');
            uploadStarted = true;
            return;
          }
        }

        // Handle file upload chunks
        if (metadata && !message) {
          fileBuffer = Buffer.concat([fileBuffer, data]);
          
          // Calculate progress based on expected file size
          const progress = Math.round((fileBuffer.length / metadata.size) * 100);
          sendMessage(ws, 'progress', {
            progress,
            message: `Uploading: ${progress}%`
          });

          // If we've received all the data, upload to S3
          if (fileBuffer.length === metadata.size) {
            try {
              // Send processing message
              sendMessage(ws, 'progress', {
                progress: 95,
                message: 'Processing package...'
              });

              const result = await handleS3Upload(fileBuffer, metadata, (progress) => {
                // Map S3 upload progress to remaining 5%
                const scaledProgress = 95 + (progress * 0.05);
                sendMessage(ws, 'progress', {
                  progress: Math.round(scaledProgress),
                  message: 'Processing package...'
                });
              });

              // Send completion message
              sendMessage(ws, 'completed', {
                data: {
                  name: metadata.name,
                  category: metadata.category,
                  version: metadata.version,
                  s3Key: result.Key,
                  size: metadata.size,
                  uploadDate: new Date()
                }
              });

              // Clean up
              fileBuffer = Buffer.from([]);
              metadata = null;
              uploadStarted = false;
            } catch (error) {
              console.error('Error uploading to S3:', error);
              sendMessage(ws, 'error', {
                message: error.message || 'Upload failed'
              });
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        sendMessage(ws, 'error', {
          message: error.message || 'Operation failed'
        });
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      fileBuffer = Buffer.from([]);
      metadata = null;
      uploadStarted = false;
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      fileBuffer = Buffer.from([]);
      metadata = null;
      uploadStarted = false;
    });
  });

  return wss;
};

module.exports = createUploadServer;
