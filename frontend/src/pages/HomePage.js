import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import DisplaySoftwareList from '../components/DisplaySoftwareList';
import CategorySidebar from '../components/CategorySidebar';
import UserProfileSettings from '../components/UserProfileSettings';
import userStatusService from '../api/userStatusService';
import config from '../config';
import '../styles/HomePage.css';

// Create a global event for settings navigation
window.showSettingsPage = false;

const HomePage = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSettings, setShowSettings] = useState(window.showSettingsPage || false);

  // Extract search term from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search');
    if (search) {
      setSearchTerm(search);
    } else {
      setSearchTerm('');
    }
  }, [location.search]);

  // Update user's online status when the home page loads
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const currentUser = JSON.parse(userData);
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
            console.log('HomePage: Updated user status to online');
          } catch (error) {
            console.error('Failed to update user status:', error);
          }
        };
        
        // Update status immediately
        updateCurrentUserStatus();
        
        // Ensure status tracking is set up
        userStatusService.setupStatusTracking(currentUser._id);
        
        // Set up interval to keep updating status
        const keepAliveInterval = setInterval(updateCurrentUserStatus, 30000);
        return () => clearInterval(keepAliveInterval);
      }
    }
  }, []);

  // Listen for global settings navigation event
  useEffect(() => {
    const handleSettingsNavigation = () => {
      console.log('HomePage: Global settings navigation event received');
      setShowSettings(true);
    };

    // Create a custom event listener
    window.addEventListener('showSettings', handleSettingsNavigation);

    // Check the global variable on mount
    if (window.showSettingsPage) {
      setShowSettings(true);
      window.showSettingsPage = false; // Reset after use
    }

    return () => {
      window.removeEventListener('showSettings', handleSettingsNavigation);
    };
  }, []);

  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  // Handle navigation to home (software list)
  const handleNavigateToHome = useCallback(() => {
    console.log('HomePage: handleNavigateToHome called');
    setShowSettings(false);
  }, []);

  // Handle navigation to settings
  const handleNavigateToSettings = useCallback(() => {
    console.log('HomePage: handleNavigateToSettings called');
    setShowSettings(true);
  }, []);

  // For direct access from Layout/Header
  window.navigateToSettings = () => {
    console.log('Global navigateToSettings called');
    setShowSettings(true);
  };

  return (
    <Layout>
      <div style={{ 
        display: 'flex',
        width: '100%',
        height: 'calc(100vh - 64px)', // Adjust for header height
        overflow: 'hidden'
      }}>
        {/* Sidebar - Only show when not in settings */}
        {!showSettings && (
          <div style={{ height: '100%' }}>
            <CategorySidebar 
              selectedCategory={selectedCategory} 
              onCategorySelect={handleCategorySelect} 
            />
          </div>
        )}
        
        {/* Main content */}
        <div style={{ 
          flexGrow: 1,
          overflow: 'auto',
          backgroundColor: '#f5f5f5',
          position: 'relative'
        }}>
          {showSettings ? (
            <UserProfileSettings onNavigateToHome={handleNavigateToHome} />
          ) : (
            <DisplaySoftwareList 
              externalSearchTerm={searchTerm}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
