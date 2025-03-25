const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
  bucket: process.env.AWS_S3_BUCKET,
  signatureVersion: 'v4',
  // Enable path-style endpoint for compatibility
  s3ForcePathStyle: true,
  // Add error handling for missing credentials
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  // Add custom endpoint if using non-AWS S3 compatible service
  endpoint: process.env.S3_ENDPOINT || undefined
};

// Validate required configuration
if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucket) {
  console.error('Missing required S3 configuration:');
  if (!s3Config.accessKeyId) console.error('- AWS_ACCESS_KEY_ID not set');
  if (!s3Config.secretAccessKey) console.error('- AWS_SECRET_ACCESS_KEY not set');
  if (!s3Config.bucket) console.error('- AWS_S3_BUCKET not set');
  throw new Error('Missing required S3 configuration');
}

module.exports = s3Config;
