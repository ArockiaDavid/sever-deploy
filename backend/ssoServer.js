const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.sso') });

// Create SSO server
const ssoServer = express();

// SSO Middleware
ssoServer.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
ssoServer.use(express.json());
ssoServer.use(cookieParser());
ssoServer.use(session({
  secret: process.env.SSO_SESSION_SECRET || 'sso-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Import SSO routes
const ssoRoutes = require('./src/routes/ssoRoutes');

// Health check endpoint
ssoServer.get('/health', (req, res) => {
  res.json({ 
    status: 'SSO Server is running',
    config: {
      domain: process.env.DOMAIN,
      port: process.env.SSO_PORT
    }
  });
});

// Mount SSO routes
ssoServer.use('/api/sso', ssoRoutes);

// SSO Error handling
ssoServer.use((err, req, res, next) => {
  console.error('SSO Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'SSO server error'
  });
});

// Start SSO server on different port
const SSO_PORT = process.env.SSO_PORT || 5001;

// Start server
const server = ssoServer.listen(SSO_PORT, () => {
  console.log(`SSO Server running on port ${SSO_PORT}`);
  console.log(`SSO Health check: http://localhost:${SSO_PORT}/health`);
  console.log('Domain:', process.env.DOMAIN);
});

// Handle server errors
server.on('error', (error) => {
  console.error('SSO Server error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down SSO server...');
  server.close(() => {
    console.log('SSO Server closed');
    process.exit(0);
  });
});

module.exports = ssoServer;
