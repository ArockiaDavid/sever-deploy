import config from '../config';
import userStatusService from './userStatusService';
import userProfileService from './userProfileService';

class AuthService {
  async login(email, password, role = 'user') {
    try {
      // Make the actual API call to the backend
      const url = `${config.apiUrl}/api/auth/login`;
      console.log('Making login request to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, role })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`${response.status}:${error.message || 'Failed to login'}`);
      }

      const data = await response.json();
      console.log('Login response data:', data);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Dispatch a userUpdated event to notify components
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: data.user }));
      
      // Update user status to online
      if (data.user && data.user._id) {
        try {
          await fetch(`${config.apiUrl}/api/users/status/${data.user._id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            },
            body: JSON.stringify({ isOnline: true })
          });
          console.log('Updated user status to online after login');
        } catch (statusError) {
          console.error('Error updating user status after login:', statusError);
        }
      }
      
      // Fetch complete user profile after login
      try {
        await userProfileService.getUserProfile();
        // The userUpdated event will be triggered by getUserProfile
      } catch (profileError) {
        console.error('Error fetching user profile after login:', profileError);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      
      // Don't fall back to mock data, throw the error to be handled by the login component
      throw error;
    }
  }

  async refreshToken() {
    try {
      const token = this.getToken();
      if (!token) throw new Error('No token found');

      const response = await fetch(`${config.apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to refresh token');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      return data.token;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, log out the user
      await this.logout();
      throw error;
    }
  }

  async logout() {
    try {
      const user = this.getCurrentUser();
      const token = this.getToken();
      
      if (user && user._id) {
        // Update user status to offline
        try {
          await fetch(`${config.apiUrl}/api/users/status/${user._id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isOnline: false })
          });
          console.log('Updated user status to offline during logout');
        } catch (statusError) {
          console.error('Error updating user status during logout:', statusError);
        }
        
        await userStatusService.cleanupStatusTracking();

        if (token) {
          await fetch(`${config.apiUrl}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              userId: user._id
            })
          });
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Dispatch a userUpdated event to notify components that the user has logged out
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: null }));
    }
  }

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // For JWT tokens, decode the payload
      if (token.split('.').length === 3) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp * 1000;
        if (Date.now() >= expiry) {
          this.logout();
          return false;
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async signup(userData) {
    try {
      const response = await fetch(`${config.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`${response.status}:${error.message || 'Failed to signup'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async forgotPassword(email, newPassword, role = 'user') {
    try {
      const response = await fetch(`${config.apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, newPassword, role })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`${response.status}:${error.message || 'Failed to reset password'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const token = this.getToken();
      if (!token) throw new Error('No token found');

      const response = await fetch(`${config.apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }

      return true;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }
}

const authService = new AuthService();
export const refreshToken = () => authService.refreshToken();
export default authService;
