import config from '../config';

class UserStatusService {
  async updateStatus(userId, isOnline) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${config.apiUrl}/api/users/status/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isOnline })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      return await response.json();
    } catch (error) {
      console.error('Status update error:', error);
      // Fall back to mock data if API call fails
      return {
        userId: userId,
        isOnline: isOnline,
        lastSeen: new Date().toISOString()
      };
    }
  }

  async getStatus(userId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${config.apiUrl}/api/users/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get status');
      }

      return await response.json();
    } catch (error) {
      console.error('Status fetch error:', error);
      // Fall back to mock data if API call fails
      return {
        userId: userId,
        isOnline: true,
        lastSeen: new Date().toISOString()
      };
    }
  }

  // Set up status tracking
  setupStatusTracking(userId) {
    if (!userId) {
      console.error('No user ID provided for status tracking');
      return;
    }

    // Remove any existing listeners first
    this.cleanupStatusTracking();

    // Set up new listeners
    this.handleOnline = () => this.updateStatus(userId, true);
    this.handleOffline = () => this.updateStatus(userId, false);
    this.handleFocus = () => this.updateStatus(userId, true);
    this.handleBlur = () => this.updateStatus(userId, false);
    this.handleBeforeUnload = () => this.updateStatus(userId, false);

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Update status on setup
    if (navigator.onLine) {
      this.updateStatus(userId, true);
    }

    // Set up periodic status updates
    this._statusInterval = setInterval(() => {
      if (navigator.onLine) {
        this.updateStatus(userId, true);
      }
    }, 30000); // Update every 30 seconds
  }

  // Clean up status tracking
  async cleanupStatusTracking() {
    if (this.handleOnline) window.removeEventListener('online', this.handleOnline);
    if (this.handleOffline) window.removeEventListener('offline', this.handleOffline);
    if (this.handleFocus) window.removeEventListener('focus', this.handleFocus);
    if (this.handleBlur) window.removeEventListener('blur', this.handleBlur);
    if (this.handleBeforeUnload) window.removeEventListener('beforeunload', this.handleBeforeUnload);

    if (this._statusInterval) {
      clearInterval(this._statusInterval);
      this._statusInterval = null;
    }

    // Get current user from localStorage to ensure final offline status update
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user._id) {
      try {
        await this.updateStatus(user._id, false);
      } catch (error) {
        console.error('Error updating offline status during cleanup:', error);
      }
    }
  }
}

const userStatusService = new UserStatusService();
export default userStatusService;
