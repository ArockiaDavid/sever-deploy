const InstalledSoftware = require('../models/InstalledSoftware');
const User = require('../models/User');

const createInstalledSoftware = async (userId, softwareData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const software = new InstalledSoftware({
      userId,
      userEmail: user.email,
      ...softwareData,
      status: 'installed'
    });

    await software.save();
    return software;
  } catch (error) {
    console.error('Error creating installed software:', error);
    throw error;
  }
};

const getInstalledSoftwareByUser = async (userId) => {
  try {
    const software = await InstalledSoftware.find({ userId });
    return software;
  } catch (error) {
    console.error('Error fetching installed software:', error);
    throw error;
  }
};

const updateSoftwareStatus = async (softwareId, status) => {
  try {
    const software = await InstalledSoftware.findById(softwareId);
    if (!software) {
      throw new Error('Software not found');
    }

    software.status = status;
    await software.save();
    return software;
  } catch (error) {
    console.error('Error updating software status:', error);
    throw error;
  }
};

const deleteSoftware = async (softwareId) => {
  try {
    const software = await InstalledSoftware.findByIdAndDelete(softwareId);
    if (!software) {
      throw new Error('Software not found');
    }
    return software;
  } catch (error) {
    console.error('Error deleting software:', error);
    throw error;
  }
};

// Add some default software for a new user
const addDefaultSoftware = async (userId, userEmail) => {
  try {
    const defaultSoftware = [
      { name: 'Chrome', version: '120.0.6099.129' },
      { name: 'Firefox', version: '121.0' },
      { name: 'VS Code', version: '1.85.1' },
      { name: 'Node.js', version: '20.10.0' },
      { name: 'Git', version: '2.43.0' }
    ];

    const softwarePromises = defaultSoftware.map(software => 
      new InstalledSoftware({
        userId,
        userEmail,
        name: software.name,
        version: software.version,
        status: 'installed'
      }).save()
    );

    await Promise.all(softwarePromises);
  } catch (error) {
    console.error('Error adding default software:', error);
    throw error;
  }
};

module.exports = {
  createInstalledSoftware,
  getInstalledSoftwareByUser,
  updateSoftwareStatus,
  deleteSoftware,
  addDefaultSoftware
};
