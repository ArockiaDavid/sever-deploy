const express = require('express');
const User = require('../models/User');
const AppMetadata = require('../models/AppMetadata');
const InstalledSoftware = require('../models/InstalledSoftware');
const auth = require('../middleware/auth');
const router = express.Router();

// Create admin user route
router.post('/setup', async (req, res) => {
  try {
    const adminData = {
      name: 'Admin User',
      email: 'adm@piramal.com',
      password: '123456',
      role: 'admin'
    };

    let admin = await User.findOne({ email: adminData.email });
    if (!admin) {
      admin = new User(adminData);
      await admin.save();
      res.json({ message: 'Admin user created successfully' });
    } else {
      admin.password = adminData.password;
      await admin.save();
      res.json({ message: 'Admin user password updated' });
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

// Dashboard data route
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get user count
    const userCount = await User.countDocuments();

    // Get software count
    const softwareCount = await AppMetadata.countDocuments();

    // Get installation count
    const installationData = await InstalledSoftware.aggregate([
      { $unwind: '$apps' },
      { $count: 'total' }
    ]);
    const installationCount = installationData.length > 0 ? installationData[0].total : 0;

    // Get software by category
    const softwareByCategory = await AppMetadata.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    // Return dashboard data
    res.json({
      userCount,
      softwareCount,
      installationCount,
      softwareByCategory
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

module.exports = router;
