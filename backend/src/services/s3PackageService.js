const AWS = require('aws-sdk');
const s3Config = require('../config/s3Config');
const metadataService = require('./metadataService');

class S3PackageService {
  constructor() {
    this.s3 = new AWS.S3(s3Config);
    this.bucket = s3Config.bucket;
  }

  async checkBucketAccess() {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
      return true;
    } catch (error) {
      console.error('Error checking bucket access:', error);
      return false;
    }
  }

  async getPackageMetadata(key) {
    try {
      const metadata = await this.s3.headObject({
        Bucket: this.bucket,
        Key: key
      }).promise();

      return {
        name: metadata.Metadata?.name || key.split('/').pop().split('-')[0],
        category: metadata.Metadata?.category || 'tool',
        version: metadata.Metadata?.version || '1.0.0',
        icon: metadata.Metadata?.icon || '',
        description: metadata.Metadata?.description || ''
      };
    } catch (error) {
      console.error(`Error getting metadata for ${key}:`, error);
      return null;
    }
  }

  async updatePackageMetadata(key, metadata) {
    try {
      // Get existing object metadata
      const headObject = await this.s3.headObject({
        Bucket: this.bucket,
        Key: key
      }).promise();

      // Copy object to itself with new metadata
      await this.s3.copyObject({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${key}`,
        Key: key,
        Metadata: {
          ...headObject.Metadata,
          ...metadata
        },
        MetadataDirective: 'REPLACE'
      }).promise();

      return true;
    } catch (error) {
      console.error('Error updating package metadata:', error);
      return false;
    }
  }

  async listPackages() {
    try {
      console.log('Listing packages from S3 bucket:', this.bucket);
      
      const data = await this.s3.listObjects({
        Bucket: this.bucket,
        Prefix: 'packages/'
      }).promise();

      console.log('S3 listObjects response:', data);

      if (!data.Contents) {
        console.log('No contents found in S3 bucket');
        return [];
      }
      
      console.log('Found', data.Contents.length, 'objects in S3 bucket');

      // Get metadata for each object
      const packages = await Promise.all(data.Contents.map(async (object) => {
        const metadata = await this.getPackageMetadata(object.Key);
        if (!metadata) return null;

        // If no icon or description, try to fetch from Google
        if (!metadata.icon || !metadata.description) {
          try {
            const enrichedMetadata = await metadataService.searchSoftwareInfo(
              metadata.name,
              metadata.category
            );

            if (enrichedMetadata) {
              // Update S3 metadata with enriched data
              await this.updatePackageMetadata(object.Key, enrichedMetadata);
              metadata.icon = enrichedMetadata.icon || metadata.icon;
              metadata.description = enrichedMetadata.description || metadata.description;
            }
          } catch (error) {
            console.error('Error enriching metadata:', error);
          }
        }

        return {
          ...metadata,
          s3Key: object.Key,
          size: object.Size,
          lastModified: object.LastModified
        };
      }));

      // Filter out any null entries and sort by name
      return packages
        .filter(pkg => pkg !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error listing packages:', error);
      throw error;
    }
  }

  async deletePackage(key) {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting package:', error);
      throw error;
    }
  }

  async downloadPackage(key, destinationPath) {
    try {
      console.log(`Downloading package ${key} to ${destinationPath}`);
      
      // Create a write stream to the destination file
      const fs = require('fs');
      const path = require('path');
      
      // Create directory if it doesn't exist
      const dir = path.dirname(destinationPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create a write stream
      const fileStream = fs.createWriteStream(destinationPath);
      
      // Get the object from S3
      const s3Stream = this.s3.getObject({
        Bucket: this.bucket,
        Key: key
      }).createReadStream();
      
      // Return a promise that resolves when the download is complete
      return new Promise((resolve, reject) => {
        // Handle errors
        s3Stream.on('error', (err) => {
          console.error(`Error downloading ${key}:`, err);
          fileStream.end();
          reject(err);
        });
        
        fileStream.on('error', (err) => {
          console.error(`Error writing to ${destinationPath}:`, err);
          fileStream.end();
          reject(err);
        });
        
        // When the download is complete, resolve the promise
        fileStream.on('finish', () => {
          console.log(`Successfully downloaded ${key} to ${destinationPath}`);
          resolve(destinationPath);
        });
        
        // Pipe the S3 stream to the file stream
        s3Stream.pipe(fileStream);
      });
    } catch (error) {
      console.error(`Error downloading package ${key}:`, error);
      throw error;
    }
  }
}

module.exports = new S3PackageService();
