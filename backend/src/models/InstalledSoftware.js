const mongoose = require('mongoose');

const installedSoftwareSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apps: [{
    name: {
      type: String,
      required: true
    },
    version: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    bundleId: {
      type: String
    },
    isSystemApp: {
      type: Boolean,
      default: false
    },
    installDate: {
      type: Date,
      default: Date.now
    },
    lastUpdateCheck: {
      type: Date,
      default: Date.now
    }
  }],
  lastScanDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index on userId
installedSoftwareSchema.index({ userId: 1 });

// Create unique compound index on userId and app path
installedSoftwareSchema.index({ userId: 1, 'apps.path': 1 }, { unique: true });

const InstalledSoftware = mongoose.model('InstalledSoftware', installedSoftwareSchema);

module.exports = InstalledSoftware;
