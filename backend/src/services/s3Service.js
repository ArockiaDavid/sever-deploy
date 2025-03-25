const AWS = require('aws-sdk');
const s3Config = require('../config/s3Config');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: s3Config.accessKeyId,
  secretAccessKey: s3Config.secretAccessKey,
  region: s3Config.region
});

const s3 = new AWS.S3();
const BUCKET_NAME = s3Config.bucket;

class S3Service {
  async listPackages() {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Prefix: 'packages/' // Assuming packages are stored in a 'packages' folder
      };

      const data = await s3.listObjectsV2(params).promise();
      
      // Handle empty bucket or no packages folder
      if (!data.Contents || data.Contents.length === 0) {
        console.log('No packages found in S3');
        return [];
      }

      // Transform S3 objects into package info
      const packages = await Promise.all(data.Contents.map(async (object) => {
        // Get object metadata
        const headParams = {
          Bucket: BUCKET_NAME,
          Key: object.Key
        };
        const metadata = await s3.headObject(headParams).promise();

        return {
          id: object.Key.split('/').pop(), // filename as id
          name: metadata.Metadata.name || object.Key.split('/').pop(),
          version: metadata.Metadata.version || '1.0.0',
          size: object.Size,
          uploadDate: object.LastModified,
          description: metadata.Metadata.description || '',
          s3Key: object.Key
        };
      }));

      return packages;
    } catch (error) {
      console.error('Error listing S3 packages:', error);
      throw error;
    }
  }

  async getDownloadUrl(s3Key) {
    try {
      console.log('Getting download URL for:', { s3Key, bucket: BUCKET_NAME });
      
      // Check if bucket exists
      try {
        await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
        console.log('Bucket exists and is accessible');
      } catch (error) {
        console.error('Bucket error:', error);
        throw new Error(`Bucket ${BUCKET_NAME} is not accessible`);
      }

      // Get the object metadata first
      const headParams = {
        Bucket: BUCKET_NAME,
        Key: s3Key
      };
      const metadata = await s3.headObject(headParams).promise();

      const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Expires: 3600, // URL expires in 1 hour
        ResponseContentDisposition: `attachment; filename="${s3Key.split('/').pop()}"`,
        ResponseContentType: metadata.ContentType || 'application/octet-stream',
        ResponseContentLength: metadata.ContentLength
      };

      // Check if object exists
      try {
        await s3.headObject({ Bucket: BUCKET_NAME, Key: s3Key }).promise();
        console.log('Object exists in bucket');
      } catch (error) {
        console.error('Object error:', error);
        throw new Error(`Object ${s3Key} not found in bucket`);
      }

      const url = await s3.getSignedUrlPromise('getObject', params);
      console.log('Generated signed URL:', url);
      return { url };
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw error;
    }
  }

  async getUploadUrl(fileName, contentType, metadata) {
    try {
      const key = `packages/${fileName}`;
      const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Expires: 3600,
        ContentType: contentType,
        Metadata: metadata
      };

      const url = await s3.getSignedUrlPromise('putObject', params);
      return {
        url,
        fields: {
          key,
          ...metadata
        }
      };
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw error;
    }
  }

  async downloadPackage(s3Key) {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key
      };

      // Create temp directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const tempDir = path.join(os.tmpdir(), 'software-center-downloads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create temp file path
      const tempFile = path.join(tempDir, path.basename(s3Key));
      console.log('Downloading to:', tempFile);

      // Get the object as a stream
      const fileStream = fs.createWriteStream(tempFile);
      const s3Stream = s3.getObject(params).createReadStream();

      // Wait for download to complete
      await new Promise((resolve, reject) => {
        s3Stream.pipe(fileStream)
          .on('error', error => {
            console.error('Error streaming file:', error);
            reject(error);
          })
          .on('finish', () => {
            console.log('Download completed');
            resolve();
          });
      });

      return tempFile;
    } catch (error) {
      console.error('Error downloading package:', error);
      throw error;
    }
  }
}

module.exports = new S3Service();
