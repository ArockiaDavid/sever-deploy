const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const s3PackageService = require('../services/s3PackageService');
const { scanInstalledSoftware } = require('../services/softwareScanService');

// List all packages
router.get('/packages', auth, async (req, res) => {
  try {
    console.log('Checking S3 bucket access...');
    const hasAccess = await s3PackageService.checkBucketAccess();
    if (!hasAccess) {
      throw new Error('Cannot access S3 bucket');
    }
    console.log('S3 bucket is accessible');

    const packages = await s3PackageService.listPackages();
    console.log('Packages retrieved from S3:', packages);
    
    if (!packages || packages.length === 0) {
      console.log('No packages found in S3 bucket');
      return res.json([]);
    }
    
    // Ensure each package has an id
    const packagesWithIds = packages.map(pkg => ({
      ...pkg,
      id: pkg.s3Key || pkg._id || Math.random().toString(36).substring(2, 15)
    }));
    
    console.log('Returning packages with IDs:', packagesWithIds);
    res.json(packagesWithIds);
  } catch (error) {
    console.error('Error listing packages:', error);
    res.status(500).json({ message: 'Failed to list packages' });
  }
});

// Scan installed software
router.get('/scan', auth, async (req, res) => {
  try {
    console.log('Scanning installed software for user:', req.user._id);
    
    // Scan the system for installed software
    const scannedApps = await scanInstalledSoftware();
    console.log('System scan found apps:', scannedApps.length);
    
    // Format the results
    const formattedApps = scannedApps.map(app => ({
      name: app.name,
      version: app.version,
      path: app.path,
      status: 'installed',
      isSystemApp: app.isSystemApp
    }));
    
    console.log('Returning installed apps:', formattedApps.length);
    res.json({ installedApps: formattedApps });
  } catch (error) {
    console.error('Error scanning installed software:', error);
    res.status(500).json({ message: 'Failed to scan installed software' });
  }
});

// Delete a package
router.post('/delete-package', auth, async (req, res) => {
  try {
    const { s3Key } = req.body;
    if (!s3Key) {
      return res.status(400).json({ message: 'S3 key is required' });
    }

    await s3PackageService.deletePackage(s3Key);
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ message: 'Failed to delete package' });
  }
});

// Check sudo access
router.get('/check-sudo', auth, async (req, res) => {
  try {
    // This is a placeholder. In a real implementation,
    // you would check if the user has sudo access.
    res.json({ hasAccess: true });
  } catch (error) {
    console.error('Error checking sudo access:', error);
    res.status(500).json({ message: 'Failed to check sudo access' });
  }
});

module.exports = router;
