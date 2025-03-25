import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { library } from '@fortawesome/fontawesome-svg-core';
import { 
  faGlobe, 
  faCode, 
  faTerminal, 
  faDatabase, 
  faWrench,
  faCube 
} from '@fortawesome/free-solid-svg-icons';
import theme from './theme';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDetailsPage from './pages/UserDetailsPage';
import AlluserDetails from './pages/AlluserDetails';
import ApplicationManager from './pages/ApplicationManager';
import UserSettingsPage from './pages/UserSettingsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import authService from './api/authService';
import { BreadcrumbProvider, useBreadcrumb } from './context/BreadcrumbContext';
import './App.css';

// Initialize Font Awesome icons
library.add(faGlobe, faCode, faTerminal, faDatabase, faWrench, faCube);

const PrivateRoute = ({ children }) => {
  // Check if user is authenticated
  const isAuthenticated = authService.isAuthenticated();
  console.log('Authentication check in PrivateRoute:', isAuthenticated);
  
  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If authenticated, render children
  return children;
};

const AdminRoute = ({ children }) => {
  // Always return children without checking authentication
  console.log('Authentication check bypassed in AdminRoute');
  return children;
};

const BreadcrumbManager = () => {
  const { updateBreadcrumbs } = useBreadcrumb();
  const location = useLocation();

  useEffect(() => {
    const getBreadcrumbs = (pathname) => {
      const paths = pathname.split('/').filter(Boolean);
      const breadcrumbs = [];

      if (paths[0] === 'admin') {
        breadcrumbs.push({ text: 'Admin Dashboard', path: '/admin', icon: 'home' });

        if (paths[1]) {
          switch (paths[1]) {
            case 'users':
              breadcrumbs.push({ text: 'User Management', path: '/admin/users', icon: 'users' });
              if (paths[2]) {
                breadcrumbs.push({ text: 'User Details', icon: 'user' });
              }
              break;
            case 'application-manager':
              breadcrumbs.push({ text: 'Application Manager', icon: 'apps' });
              break;
            case 'settings':
              breadcrumbs.push({ text: 'Admin Settings', path: '/admin/settings', icon: 'user' });
              break;
            default:
              breadcrumbs.push({ text: 'Dashboard', icon: 'dashboard' });
          }
        }
      }

      updateBreadcrumbs(breadcrumbs);
    };

    getBreadcrumbs(location.pathname);
  }, [location, updateBreadcrumbs]);

  return null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BreadcrumbProvider>
        <Router>
          <BreadcrumbManager />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AlluserDetails />} />
              <Route path="users/:id" element={<UserDetailsPage />} />
              <Route path="application-manager" element={<ApplicationManager />} />
            </Route>
            
            <Route path="/home" element={
              <PrivateRoute>
                <HomePage />
              </PrivateRoute>
            } />
            
            <Route path="/settings" element={
              <PrivateRoute>
                <UserSettingsPage />
              </PrivateRoute>
            } />
            
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </BreadcrumbProvider>
    </ThemeProvider>
  );
}

export default App;
