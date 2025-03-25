const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return v.endsWith('@piramal.com');
      },
      message: 'Only piramal.com email addresses are allowed'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  department: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  avatar: {
    type: Buffer,
    contentType: String,
    maxSize: 1024 * 1024 // 1MB max size
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }

    console.log('Hashing new password');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('Comparing passwords for:', this.email);
    if (!this.password) {
      console.error('No password hash stored for user');
      return false;
    }
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('Password match result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
};

// Static method to find user by email with avatar
userSchema.statics.findByEmailWithAvatar = async function(email) {
  return this.findOne({ email }).select('+avatar');
};

// Static method to find user by id with avatar
userSchema.statics.findByIdWithAvatar = async function(id) {
  return this.findById(id).select('+avatar');
};

// Method to update user's online status
userSchema.methods.updateOnlineStatus = async function(isOnline) {
  this.isOnline = isOnline;
  this.lastActive = new Date();
  await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
