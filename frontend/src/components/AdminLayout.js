import React, { useState, useEffect } from 'react';
import { Box, useTheme } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import authService from '../api/authService';
import Header from './Header';
import Sidebar from './Sidebar';
import LogoutWarning from './LogoutWarning';
import useAutoLogout from '../hooks/useAutoLogout';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import Breadcrumb from './Breadcrumb';

const HEADER_HEIGHT = 64;
const COLLAPSED_WIDTH = 50; // Width of collapsed sidebar

const AdminLayout = () => {
  const { breadcrumbs } = useBreadcrumb();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState(() => {
    const savedState = localStorage.getItem('sidebarExpanded');
    return savedState === null ? true : savedState === 'true';
  });
  const [user, setUser] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(expanded ? 200 : COLLAPSED_WIDTH); // Default width

  // Update sidebar width when expanded state changes
  useEffect(() => {
    // Use a ref to get the actual width of the sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      const width = sidebar.getBoundingClientRect().width;
      setSidebarWidth(width);
    } else {
      setSidebarWidth(expanded ? 200 : COLLAPSED_WIDTH);
    }
  }, [expanded]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin-login', { replace: true });
      return;
    }
    setUser(currentUser);

    const handleUserUpdate = (event) => {
      setUser(event.detail);
    };
    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, [navigate]);

  // Add click outside handler to collapse sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the sidebar is expanded and the click is outside the sidebar
      if (expanded && !event.target.closest('.sidebar') && !event.target.closest('.sidebar-toggle')) {
        // Collapse the sidebar
        handleSidebarExpand(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded]);

  const handleLogout = () => {
    authService.logout();
    navigate('/admin-login', { replace: true });
  };

  const { showWarning, remainingTime, onStayLoggedIn } = useAutoLogout(handleLogout);

  const handleSidebarToggle = () => setSidebarOpen(!sidebarOpen);
  const handleSidebarClose = () => setSidebarOpen(false);
  const handleSidebarExpand = (value) => {
    setExpanded(value);
    localStorage.setItem('sidebarExpanded', value);
  };

  useEffect(() => {
    if (sidebarOpen) handleSidebarClose();
  }, [location.pathname]);

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden', 
      bgcolor: 'grey.50'
    }}>
      {/* Header */}
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1200,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(255, 255, 255, 0.9)'
      }}>
        <Header 
          user={user}
          onLogout={handleLogout}
          onSidebarToggle={handleSidebarToggle}
          sx={{ 
            height: HEADER_HEIGHT,
            borderBottom: 1,
            borderColor: 'divider',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            display: 'flex',
            alignItems: 'center',
            px: 3
          }}
        />
      </Box>

      {/* Sidebar Container */}
      <Box 
        sx={{ 
          position: 'fixed',
          top: HEADER_HEIGHT,
          left: 0,
          bottom: 0,
          width: 'auto',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: 200,
          }),
          display: { xs: 'none', md: 'block' },
          zIndex: 1150
        }}
      >
        <Sidebar
          open={sidebarOpen}
          expanded={expanded}
          onExpand={handleSidebarExpand}
          onClose={handleSidebarClose}
        />
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          pt: `${HEADER_HEIGHT}px`,
          pl: { xs: 0, md: `${sidebarWidth}px` }, // Dynamic padding based on sidebar width
          transition: theme.transitions.create('padding-left', {
            easing: theme.transitions.easing.sharp,
            duration: 200,
          }),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Breadcrumb */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Box 
            sx={{ 
              height: '48px',
              borderBottom: 1,
              borderColor: 'divider',
              px: 3,
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(255, 255, 255, 0.9)'
            }}
          >
            <Breadcrumb items={breadcrumbs} />
          </Box>
        )}

        {/* Page Content */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 3,
          '& > *': {
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            bgcolor: 'background.paper',
            p: 3,
            mb: 3
          }
        }}>
          <Outlet />
        </Box>
      </Box>
      <LogoutWarning 
        open={showWarning}
        onStayLoggedIn={onStayLoggedIn}
        onLogout={handleLogout}
        remainingTime={remainingTime}
      />
    </Box>
  );
};

export default AdminLayout;
