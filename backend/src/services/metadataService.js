const axios = require('axios');
const AWS = require('aws-sdk');
const s3Config = require('../config/s3Config');

const s3 = new AWS.S3(s3Config);

class MetadataService {
  constructor() {
    this.searchApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  }

  getDefaultIcon(category) {
    const icons = {
      browser: 'fa-globe',
      ide: 'fa-code',
      language: 'fa-terminal',
      database: 'fa-database',
      tool: 'fa-wrench'
    };
    return icons[category] || 'fa-cube';
  }

  getDefaultDescription(name, category) {
    const descriptions = {
      browser: `${name} is a web browser for accessing the internet.`,
      ide: `${name} is an Integrated Development Environment for writing code.`,
      language: `${name} is a programming language tool.`,
      database: `${name} is a database management tool.`,
      tool: `${name} is a software utility tool.`
    };
    return descriptions[category] || `${name} is a software application.`;
  }

  async searchSoftwareInfo(name, category) {
    try {
      if (!this.searchApiKey || !this.searchEngineId) {
        return {
          icon: this.getDefaultIcon(category),
          description: this.getDefaultDescription(name, category)
        };
      }

      let iconClass = this.getDefaultIcon(category);
      let description = this.getDefaultDescription(name, category);

      try {
        // Search for software description
        const descriptionResponse = await axios.get(
          `https://www.googleapis.com/customsearch/v1?key=${this.searchApiKey}&cx=${this.searchEngineId}&q=${encodeURIComponent(name + ' ' + category + ' software description')}&num=1`
        );
        if (descriptionResponse.data.items?.[0]?.snippet) {
          description = descriptionResponse.data.items[0].snippet;
        }
      } catch (error) {
        console.warn('Error fetching description:', error.message);
      }

      return {
        icon: iconClass,
        description: description
      };
    } catch (error) {
      console.error('Error in searchSoftwareInfo:', error);
      return {
        icon: this.getDefaultIcon(category),
        description: this.getDefaultDescription(name, category)
      };
    }
  }

  async updateS3ObjectMetadata(s3Key, metadata) {
    try {
      // Get existing object metadata
      const headObject = await s3.headObject({
        Bucket: s3Config.bucket,
        Key: s3Key
      }).promise();

      // Copy object to itself with new metadata
      await s3.copyObject({
        Bucket: s3Config.bucket,
        CopySource: `${s3Config.bucket}/${s3Key}`,
        Key: s3Key,
        Metadata: {
          ...headObject.Metadata,
          icon: metadata.icon || '',
          description: metadata.description || ''
        },
        MetadataDirective: 'REPLACE'
      }).promise();

      return true;
    } catch (error) {
      console.error('Error updating S3 metadata:', error);
      return false;
    }
  }

  async enrichPackageMetadata(s3Key, name, category) {
    try {
      // Search for software info
      const softwareInfo = await this.searchSoftwareInfo(name, category);
      
      if (softwareInfo) {
        // Update S3 object metadata
        await this.updateS3ObjectMetadata(s3Key, softwareInfo);
      }

      return softwareInfo;
    } catch (error) {
      console.error('Error enriching package metadata:', error);
      return {
        icon: this.getDefaultIcon(category),
        description: this.getDefaultDescription(name, category)
      };
    }
  }
}

module.exports = new MetadataService();
