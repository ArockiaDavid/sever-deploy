const mongoose = require('mongoose');

const userSystemConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  osName: {
    type: String,
    required: true
  },
  osVersion: {
    type: String,
    required: true
  },
  totalMemory: {
    type: Number,
    required: true
  },
  freeMemory: {
    type: Number,
    required: true
  },
  totalDiskSpace: {
    type: Number,
    required: true
  },
  freeDiskSpace: {
    type: Number,
    required: true
  },
  cpuModel: {
    type: String,
    required: true
  },
  cpuCores: {
    type: Number,
    required: true
  },
  architecture: {
    type: String,
    required: true
  },
  hostname: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const UserSystemConfig = mongoose.model('UserSystemConfig', userSystemConfigSchema);

module.exports = UserSystemConfig;
