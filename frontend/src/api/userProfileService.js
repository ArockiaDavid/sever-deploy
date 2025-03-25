import config from '../config';

class UserProfileService {
  async getUserProfile() {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const response = await fetch(`${config.apiUrl}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch user profile');

      const profileData = await response.json();
      console.log('Fetched profile data:', profileData);
      
      // Fix avatarUrl if it's not using the correct API path
      if (profileData.avatarUrl && !profileData.avatarUrl.includes('/api/users/avatar/')) {
        const userId = profileData._id;
        profileData.avatarUrl = `${config.apiUrl}/api/users/avatar/${userId}`;
        console.log('Fixed avatarUrl:', profileData.avatarUrl);
      }
      
      // Update the user in localStorage with the latest profile data
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const updatedUser = { ...currentUser, ...profileData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Dispatch a userUpdated event to notify components
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      
      return profileData;
    } catch (error) {
      console.error('Profile fetch error:', error);
      // Return the current user from localStorage as fallback
      return JSON.parse(localStorage.getItem('user')) || {};
    }
  }

  async updateUserProfile(profileData, isFormData = true) {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      console.log('Updating user profile with:', isFormData ? 'FormData' : 'JSON data');
      
      let options = {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: profileData
      };
      
      if (!isFormData) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(profileData);
      }
      
      // Log the request details for debugging
      console.log('Request options:', {
        url: `${config.apiUrl}/api/users/profile`,
        method: options.method,
        headers: options.headers,
        body: isFormData ? 'FormData (not shown)' : options.body
      });
      
      const response = await fetch(`${config.apiUrl}/api/users/profile`, options);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile update failed:', response.status, errorText);
        throw new Error(`Failed to update user profile: ${response.status} ${errorText}`);
      }

      const updatedProfile = await response.json();
      console.log('Profile update response:', updatedProfile);
      
      // Fix avatarUrl if it's not using the correct API path
      if (updatedProfile.avatarUrl && !updatedProfile.avatarUrl.includes('/api/users/avatar/')) {
        const userId = updatedProfile._id;
        updatedProfile.avatarUrl = `${config.apiUrl}/api/users/avatar/${userId}`;
        console.log('Fixed avatarUrl:', updatedProfile.avatarUrl);
      }
      
      // Update the user in localStorage with the latest profile data
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const updatedUser = { ...currentUser, ...updatedProfile };
      
      // Ensure avatarUrl is included in the updated user
      if (updatedProfile.avatarUrl) {
        updatedUser.avatarUrl = updatedProfile.avatarUrl;
        console.log('Setting avatarUrl in localStorage:', updatedProfile.avatarUrl);
      }
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Dispatch a userUpdated event to notify components
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      
      // Force a refresh of the user profile from the server
      setTimeout(() => {
        this.getUserProfile();
      }, 500);
      
      return updatedProfile;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }
}

const userProfileService = new UserProfileService();
export default userProfileService;
