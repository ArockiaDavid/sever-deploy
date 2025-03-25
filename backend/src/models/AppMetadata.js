const mongoose = require('mongoose');

const appMetadataSchema = new mongoose.Schema({
  packageName: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  version: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['browser', 'ide', 'language', 'database', 'tool']
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: false
  },
  s3Key: {
    type: String,
    required: true,
    unique: true
  },
  size: {
    type: Number,
    required: true
  },
  installCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  requirements: {
    os: [{
      type: String,
      enum: ['macos', 'windows', 'linux']
    }],
    processor: String,
    ram: String,
    disk: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Calculate average rating before saving
appMetadataSchema.pre('save', function(next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = totalRating / this.reviews.length;
  }
  next();
});

// Virtual for review count
appMetadataSchema.virtual('reviewCount').get(function() {
  return this.reviews ? this.reviews.length : 0;
});

// Indexes
appMetadataSchema.index({ packageName: 1 }, { unique: true });
appMetadataSchema.index({ s3Key: 1 }, { unique: true });
appMetadataSchema.index({ category: 1 });
appMetadataSchema.index({ uploadedBy: 1 });
appMetadataSchema.index({ 'reviews.userId': 1 });

const AppMetadata = mongoose.model('AppMetadata', appMetadataSchema);

module.exports = AppMetadata;
