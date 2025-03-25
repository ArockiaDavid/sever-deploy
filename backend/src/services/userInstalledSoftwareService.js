const InstalledSoftware = require('../models/InstalledSoftware');

const getUserInstalledSoftware = async (userId) => {
  try {
    console.log('Fetching installed software for user:', userId);
    const software = await InstalledSoftware.find({ user: userId })
      .select('name version status installDate lastUpdateCheck')
      .lean();
    
    console.log('Found installed software:', software);
    return software;
  } catch (error) {
    console.error('Error fetching user installed software:', error);
    throw error;
  }
};

module.exports = {
  getUserInstalledSoftware
};
