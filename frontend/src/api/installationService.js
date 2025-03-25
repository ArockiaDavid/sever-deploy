import config from '../config';

class InstallationService {
  async getInstalledSoftware() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch installed software');
      }

      const userData = await response.json();
      return userData.installedSoftware || [];
    } catch (error) {
      console.error('Error fetching installed software:', error);
      throw error;
    }
  }

  async checkForUpdates(softwareId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/api/software/${softwareId}/check-update`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw error;
    }
  }
  async downloadPackage(s3Key, onProgress) {
    try {
      const { url } = await fetch(`${config.apiUrl}/api/s3/download-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ s3Key })
      }).then(res => res.json());

      const response = await fetch(url);
      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length');

      let receivedLength = 0;
      while(true) {
        const {done, value} = await reader.read();
        
        if (done) {
          break;
        }

        receivedLength += value.length;
        const progress = (receivedLength / contentLength) * 100;
        onProgress?.(Math.round(progress));
      }

      return true;
    } catch (error) {
      console.error('Error downloading package:', error);
      throw error;
    }
  }

  async installPackage(packageId, onProgress) {
    try {
      const response = await fetch(`${config.apiUrl}/api/s3/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ packageId })
      });

      if (!response.ok) {
        throw new Error('Failed to install package');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            onProgress?.(data.progress);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error installing package:', error);
      throw error;
    }
  }
}

export const installationService = new InstallationService();
