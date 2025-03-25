const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

async function checkAndCreateAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user exists
    const adminUser = await User.findOne({ email: 'adm@piramal.com' });

    if (adminUser) {
      console.log('Admin user exists:', adminUser);
    } else {
      // Create admin user
      const newAdmin = new User({
        name: 'Admin',
        email: 'adm@piramal.com',
        password: 'admin123',
        role: 'admin'
      });

      await newAdmin.save();
      console.log('Admin user created successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndCreateAdmin();
