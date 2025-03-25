import config from '../config';

class S3Service {
  async makeRequest(endpoint, options = {}) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const url = `${config.apiUrl}/api/s3/${endpoint}`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      };
      
      if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request to ${endpoint} failed with status ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Software service error (${endpoint}):`, error);
      throw error;
    }
  }

  async listPackages() {
    try {
      const response = await this.makeRequest('packages');
      return await response.json();
    } catch (error) {
      console.error('Error listing packages:', error);
      throw error;
    }
  }

  async installPackage(s3Key, onProgress, signal) {
    try {
      const response = await this.makeRequest('install', {
        method: 'POST',
        body: JSON.stringify({ s3Key }),
        signal
      });

      return await this.handleStreamedOperation(response, onProgress, signal, 'Installation');
    } catch (error) {
      console.error('Error installing package:', error);
      
      const errorMessages = {
        'PERMISSION_DENIED': 'Permission denied. Please check your permissions.',
        'FILE_NOT_FOUND': 'Installation file not found.',
        'PROCESS_RUNNING': 'Application is currently running. Please close it and try again.',
        'INSTALLATION_CANCELLED': 'Installation was cancelled.',
        'UNKNOWN': 'An unknown error occurred during installation.'
      };

      throw new Error(errorMessages[error.message] || error.message);
    }
  }

  async uninstallPackage(s3Key, onProgress, signal) {
    try {
      const response = await this.makeRequest('uninstall', {
        method: 'POST',
        body: JSON.stringify({ s3Key }),
        signal
      });

      return await this.handleStreamedOperation(response, onProgress, signal, 'Uninstallation');
    } catch (error) {
      console.error('Error uninstalling package:', error);
      
      const errorMessages = {
        'PERMISSION_DENIED': 'Permission denied. Please check your permissions.',
        'FILE_NOT_FOUND': 'Application not found. It may have been already uninstalled.',
        'PROCESS_RUNNING': 'Application is currently running. Please close it and try again.',
        'INSTALLATION_CANCELLED': 'Uninstallation was cancelled.',
        'UNKNOWN': 'An unknown error occurred during uninstallation.'
      };

      throw new Error(errorMessages[error.message] || error.message);
    }
  }

  async handleStreamedOperation(response, onProgress, signal, operationType) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      let lastProgress = 0;
      let lastMessage = '';
      let accumulatedDetails = [];

      while (true) {
        if (signal?.aborted) {
          throw new Error('OPERATION_CANCELLED');
        }

        const { done, value } = await reader.read();
        if (done) break;

        // Append new data to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          // Skip empty lines and keepalive messages
          if (!line.trim() || line === ':keepalive') continue;

          if (line.startsWith('data: ')) {
            try {
              // Remove 'data: ' prefix and trim whitespace
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              const data = JSON.parse(jsonStr);

              // Handle error status
              if (data.status === 'error') {
                throw new Error(data.message || `${operationType} failed`);
              }

              // Track operation details
              if (data.details) {
                accumulatedDetails.push(data.details);
              }

              // Always update progress to ensure UI feedback
              lastProgress = data.percent || data.progress || lastProgress;
              lastMessage = data.message || lastMessage;
              
              onProgress?.(lastProgress, {
                status: data.status,
                message: lastMessage,
                details: accumulatedDetails.join('\n')
              });

              // Handle completion
              if (data.status === 'completed') {
                return data.package || true;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, 'Line:', line);
              // Only throw if it's an actual operation error
              if (e.message && e.message.includes('failed')) {
                throw e;
              }
              // Otherwise continue processing other messages
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.replace(/^data: /, '').trim());
          if (data.status === 'error') {
            throw new Error(data.message || `${operationType} failed`);
          }
        } catch (e) {
          console.error('Error parsing final buffer:', e);
        }
      }

      return true;
    } catch (error) {
      reader.cancel();
      throw error;
    } finally {
      reader.cancel();
    }
  }

  async scanInstalledSoftware() {
    try {
      const response = await this.makeRequest('scan');
      const data = await response.json();
      return data.installedApps || [];
    } catch (error) {
      console.error('Error scanning installed software:', error);
      throw error;
    }
  }

  async deletePackage(s3Key) {
    try {
      const response = await this.makeRequest('delete-package', {
        method: 'POST',
        body: JSON.stringify({ s3Key })
      });

      await response.json();
      return true;
    } catch (error) {
      console.error('Error deleting package:', error);
      throw error;
    }
  }

  async checkSudoAccess() {
    try {
      const response = await this.makeRequest('check-sudo', {
        method: 'GET'
      });

      const data = await response.json();
      return data.hasAccess;
    } catch (error) {
      console.error('Error checking sudo access:', error);
      return false;
    }
  }
}

export const s3Service = new S3Service();
