const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const WebSocket = require('ws');
const createUploadServer = require('./src/websocket/uploadHandler');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const s3Routes = require('./src/routes/s3Routes');
const appMetadataRoutes = require('./src/routes/appMetadataRoutes');
const systemConfigRoutes = require('./src/routes/systemConfigRoutes');
const softwareRoutes = require('./src/routes/softwareRoutes');
const userSoftwareRoutes = require('./src/routes/userSoftwareRoutes');

// Load environment variables from root .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Set development mode if not specified
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
console.log(`Environment: ${process.env.NODE_ENV}`);

const app = express();

// Middleware
// Configure CORS with specific options
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // In production, check if origin matches Elastic IP or is localhost
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [
        // Allow the Elastic IP with various protocols and ports
        `http://${process.env.ELASTIC_IP}`,
        `https://${process.env.ELASTIC_IP}`,
        `http://${process.env.ELASTIC_IP}:3000`,
        `http://${process.env.ELASTIC_IP}:4000`,
        // Allow localhost for development and testing
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4000'
      ];
      
      // If the origin is in our allowed list, allow it
      if (allowedOrigins.indexOf(origin) !== -1 || origin.includes(process.env.ELASTIC_IP)) {
        callback(null, true);
      } else {
        // Otherwise, log the origin and allow it anyway (for now)
        console.log('CORS: Allowing unknown origin:', origin);
        callback(null, true);
      }
    } else {
      // In development, allow all origins
      callback(null, true);
    }
  },
  credentials: true, // Allow cookies and credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('Created temp directory:', tempDir);
}

app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  abortOnLimit: true,
  responseOnLimit: 'File size limit has been reached (5MB)',
  debug: true, // Enable debug mode for file uploads
  useTempFiles: true, // Use temp files instead of memory for file uploads
  tempFileDir: tempDir // Temp directory for file uploads
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// Ensure avatars directory exists
const avatarsDir = path.join(__dirname, 'public/uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
  console.log('Created avatars directory:', avatarsDir);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/software-center')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import user status routes
const userStatusRoutes = require('./src/routes/userStatusRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/s3', s3Routes);
app.use('/api/metadata', appMetadataRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/software', softwareRoutes);
app.use('/api/user-software', userSoftwareRoutes);
app.use('/api/users/status', userStatusRoutes);

// User status route
app.post('/api/user-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isOnline } = req.body;

    // Update user status in database
    const user = await mongoose.model('User').findByIdAndUpdate(
      userId,
      { 
        isOnline,
        ...(isOnline ? {} : { lastSeen: new Date() })
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

// Create HTTP server
const server = require('http').createServer(app);

// Start server
let PORT;
if (process.env.NODE_ENV === 'production') {
  PORT = process.env.PROD_PORT || 3007;
  console.log(`Production mode: Using PROD_PORT from environment: ${process.env.PROD_PORT || '(not set, using default 3007)'}`);
} else {
  PORT = process.env.PORT || 5001;
  console.log(`Development mode: Using PORT from environment: ${process.env.PORT || '(not set, using default 5001)'}`);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // If we have an Elastic IP in the environment, use that for logging
  if (process.env.ELASTIC_IP) {
    console.log(`Server URL: http://${process.env.ELASTIC_IP}:${PORT}`);
  } else {
    console.log(`Server URL: http://localhost:${PORT}`);
  }
});

// Create a separate WebSocket server on a different port
const WS_PORT = process.env.WS_PORT || 5002;
const wsServer = require('http').createServer();
const wss = createUploadServer(wsServer);

wsServer.listen(WS_PORT, () => {
  console.log(`WebSocket server running on port ${WS_PORT}`);
});

// Handle WebSocket server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Handle server shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
