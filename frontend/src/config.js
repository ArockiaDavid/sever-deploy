// Load and validate environment variables
const getEnvVar = (key, defaultValue = undefined, required = false) => {
  const value = process.env[key] || defaultValue;
  if (required && !value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

// Get base URL for API - using Elastic IP for production
const getApiUrl = () => {
  // Get the current hostname (will be the server's IP or domain in production)
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  if (process.env.NODE_ENV === 'production') {
    // In production, use the current hostname with the production port
    if (process.env.REACT_APP_API_URL_PROD) {
      return process.env.REACT_APP_API_URL_PROD;
    }
    // Use the current hostname instead of localhost
    return `http://${currentHostname}:3007`;
  } else {
    // In development
    if (process.env.REACT_APP_API_URL_DEV) {
      return process.env.REACT_APP_API_URL_DEV;
    }
    return 'http://localhost:5001'; // Fallback for development
  }
};

// Get WebSocket URL - using Elastic IP for production
const getWsUrl = () => {
  // Get the current hostname (will be the server's IP or domain in production)
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  if (process.env.NODE_ENV === 'production') {
    // In production, use the WebSocket URL from .env
    if (process.env.REACT_APP_WS_URL_PROD) {
      return process.env.REACT_APP_WS_URL_PROD;
    }
    // Or derive it from the API URL
    if (process.env.REACT_APP_API_URL_PROD) {
      return process.env.REACT_APP_API_URL_PROD.replace(/^http/, 'ws');
    }
    // Use the current hostname instead of localhost
    return `ws://${currentHostname}:5002`;
  } else {
    // In development
    if (process.env.REACT_APP_WS_URL_DEV) {
      return process.env.REACT_APP_WS_URL_DEV;
    }
    return 'ws://localhost:5002'; // Fallback for development
  }
};

// Environment variables configuration
const config = {
  // Environment detection
  env: getEnvVar('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Application information
  appName: getEnvVar('REACT_APP_NAME', 'Software Center'),
  companyName: getEnvVar('REACT_APP_COMPANY_NAME', 'Your Company'),
  supportEmail: getEnvVar('REACT_APP_SUPPORT_EMAIL', 'support@softwarecenter.com'),

  // API Configuration
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(), // WebSocket URL
  frontendUrl: typeof window !== 'undefined' ? window.location.origin : '',

  // Feature flags
  enableAuth: process.env.REACT_APP_ENABLE_AUTH === 'true',
  enableNotifications: process.env.REACT_APP_ENABLE_NOTIFICATIONS === 'true',

  // UI Configuration
  maxUploadSize: parseInt(process.env.REACT_APP_MAX_UPLOAD_SIZE || '10485760', 10),
  sessionTimeout: parseInt(process.env.REACT_APP_SESSION_TIMEOUT || '3600000', 10),
  theme: {
    primaryColor: process.env.REACT_APP_THEME_PRIMARY_COLOR || '#007bff',
    secondaryColor: process.env.REACT_APP_THEME_SECONDARY_COLOR || '#6c757d',
  },

  // Meta Information
  meta: {
    title: process.env.REACT_APP_META_TITLE || 'Software Center - Manage Your Software',
    description: process.env.REACT_APP_META_DESCRIPTION || 'Centralized software management platform',
    keywords: process.env.REACT_APP_META_KEYWORDS || 'software,management,installation,tracking',
  },

  // Helper methods
  getApiEndpoint: (path) => {
    return `${config.apiUrl}${path}`;
  },
};

// Log configuration in development and production
if (typeof window !== 'undefined') {
  console.log(`Config (${process.env.NODE_ENV} mode):`, {
    ...config,
    apiUrl: config.apiUrl,
    wsUrl: config.wsUrl,
    frontendUrl: config.frontendUrl
  });
}

export default config;
