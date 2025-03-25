import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import authService from '../api/authService';
import userProfileService from '../api/userProfileService';
import userStatusService from '../api/userStatusService';
import config from '../config';
import Header from './Header';
import LogoutWarning from './LogoutWarning';
import useAutoLogout from '../hooks/useAutoLogout';

const HEADER_HEIGHT = 64;

const Layout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Fetch user profile on mount and set up event listeners
  useEffect(() => {
    // Define the user update handler first
    const handleUserUpdate = (event) => {
      console.log('Layout: userUpdated event received with data:', event.detail);
      setUser(event.detail);
    };
    
    // Initial user load from localStorage
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    console.log('Layout: Initial user loaded from localStorage:', currentUser);
    
    // Fetch complete user profile from the server
    const fetchUserProfile = async () => {
      try {
        const profileData = await userProfileService.getUserProfile();
        console.log('Layout: Fetched user profile from server:', profileData);
        
        // Update user state with the fetched profile data
        setUser(prevUser => ({
          ...prevUser,
          ...profileData
        }));
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
    
    // Listen for user updates
    window.addEventListener('userUpdated', handleUserUpdate);
    
    // Update user's online status
    let keepAliveInterval;
    if (currentUser && currentUser._id) {
      // Update the current user's status to online
      const updateCurrentUserStatus = async () => {
        try {
          await fetch(`${config.apiUrl}/api/users/status/${currentUser._id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ isOnline: true })
          });
          console.log('Layout: Updated user status to online');
        } catch (error) {
          console.error('Failed to update user status:', error);
        }
      };
      
      // Update status immediately
      updateCurrentUserStatus();
      
      // Ensure status tracking is set up
      userStatusService.setupStatusTracking(currentUser._id);
      
      // Set up interval to keep updating status
      keepAliveInterval = setInterval(updateCurrentUserStatus, 30000);
    }
    
    // Cleanup function
    return () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  // Handle user logout
  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  // Update user state when auth changes
  useEffect(() => {
    const checkAuth = () => {
      if (!authService.isAuthenticated()) {
        navigate('/login', { replace: true });
        return;
      }
      
      // Get the current user from localStorage
      const currentUser = authService.getCurrentUser();
      
      // Update the user state with the current user
      setUser(prevUser => {
        // Only update if the user has changed
        if (JSON.stringify(prevUser) !== JSON.stringify(currentUser)) {
          console.log('Layout: User updated from localStorage:', currentUser);
          return currentUser;
        }
        return prevUser;
      });
    };

    checkAuth();
    
    // Check auth status periodically
    const interval = setInterval(checkAuth, 60000); // every minute
    
    return () => clearInterval(interval);
  }, [navigate]);

  // Set up auto logout
  const { showWarning, remainingTime, onStayLoggedIn } = useAutoLogout(handleLogout);

  // Force re-render when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        console.log('Layout: Storage event detected, updating user:', currentUser);
        setUser(currentUser);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      overflow: 'visible'
    }}>
      <Header 
        user={user}
        onLogout={handleLogout}
      />
      <div
        style={{
          flexGrow: 1,
          width: '100%',
          marginTop: `${HEADER_HEIGHT}px`,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.easeOut,
            duration: 200,
          }),
          overflow: 'visible'
        }}
      >
        {children || <Outlet />}
      </div>
      <LogoutWarning 
        open={showWarning}
        onStayLoggedIn={onStayLoggedIn}
        onLogout={handleLogout}
        remainingTime={remainingTime}
      />
    </div>
  );
};

export default Layout;
