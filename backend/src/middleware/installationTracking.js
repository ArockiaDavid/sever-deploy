const { trackInstallation, trackUpdate } = require('../services/installationTrackingService');

const getBrewName = (appId) => {
  const brewMap = {
    'visual-studio-code': 'visual-studio-code',
    'sublime-text': 'sublime-text',
    'node': 'node',
    'firefox': 'firefox',
    'chrome': 'google-chrome',
    'spotify': 'spotify',
    'slack': 'slack',
    'docker': 'docker',
    'postman': 'postman'
  };
  return brewMap[appId] || appId;
};

const trackInstallationMiddleware = async (req, res, next) => {
  // Store the original send function
  const originalSend = res.send;

  // Override the send function
  res.send = function(data) {
    // Parse the response data
    let responseData = data;
    if (typeof data === 'string') {
      try {
        responseData = JSON.parse(data);
      } catch (e) {
        responseData = data;
      }
    }

    // If installation was successful and user is authenticated
    if (responseData.success && req.user) {
      const { appId, action } = req.query;
      const brewName = getBrewName(appId);

      // Track based on action type
      if (action === 'install') {
        trackInstallation(req.user._id, appId, brewName)
          .catch(error => console.error('Error tracking installation:', error));
      } else if (action === 'update') {
        trackUpdate(req.user._id, appId, brewName)
          .catch(error => console.error('Error tracking update:', error));
      }
    }

    // Call the original send function
    originalSend.call(this, data);
  };

  next();
};

module.exports = trackInstallationMiddleware;
