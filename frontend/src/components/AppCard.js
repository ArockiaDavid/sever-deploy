import React, { useState, useCallback } from 'react';
import { Card, CardContent, Typography, Box, Chip, Button } from '@mui/material';
import { 
  Code as CodeIcon,
  Terminal as TerminalIcon,
  Apps as AppsIcon,
  Storage as StorageIcon,
  Language as LanguageIcon,
  Check as CheckIcon,
  GetApp as InstallIcon,
  Delete as UninstallIcon,
  Web as WebIcon,
  Code as CodeEditorIcon,
  Terminal as TerminalCodeIcon,
  Storage as DatabaseIcon,
  Build as ToolIcon,
  Extension as ExtensionIcon,
  CloudDownload as CloudDownloadIcon,
  GitHub as GitHubIcon,
  Android as ChromeIcon,
  DesktopWindows as DesktopIcon
} from '@mui/icons-material';
import '../styles/AppCard.css';
import { softwareService } from '../services/softwareService';
import InstallProgress from './InstallProgress';

const getSoftwareIcon = (name) => {
  // Map software names to specific icons
  const softwareIcons = {
    'GitHub Desktop': <GitHubIcon className="github-icon" />,
    'GitHubDesktop': <GitHubIcon className="github-icon" />,
    'Google Chrome': <ChromeIcon className="chrome-icon" />,
    'googlechrome': <ChromeIcon className="chrome-icon" />,
    'Visual Studio Code': <CodeIcon className="vscode-icon" />,
    'Node.js': <TerminalIcon className="node-icon" />,
    'Python': <CodeIcon className="python-icon" />,
    'python': <CodeIcon className="python-icon" />,
    'Docker Desktop': <StorageIcon className="docker-icon" />
  };
  
  // Check if we have a specific icon for this software
  for (const [softwareName, icon] of Object.entries(softwareIcons)) {
    if (name.toLowerCase().includes(softwareName.toLowerCase())) {
      return icon;
    }
  }
  
  // Fallback to category-based icons
  return null;
};

const getMaterialIcon = (iconType, name) => {
  // First try to get a software-specific icon
  const softwareIcon = getSoftwareIcon(name);
  if (softwareIcon) {
    return softwareIcon;
  }
  
  // If no software-specific icon, fall back to category-based icons
  const icons = {
    'fa-globe': <WebIcon />,
    'fa-code': <CodeEditorIcon />,
    'fa-terminal': <TerminalCodeIcon />,
    'fa-database': <DatabaseIcon />,
    'fa-wrench': <ToolIcon />,
    'fa-cube': <ExtensionIcon />
  };
  
  // If iconType is a specific icon name, return that icon
  if (icons[iconType]) {
    return icons[iconType];
  }
  
  // Otherwise, determine icon based on category
  if (iconType.includes('browser')) {
    return icons['fa-globe'];
  } else if (iconType.includes('ide')) {
    return icons['fa-code'];
  } else if (iconType.includes('language')) {
    return icons['fa-terminal'];
  } else if (iconType.includes('database')) {
    return icons['fa-database'];
  } else if (iconType.includes('tool')) {
    return icons['fa-wrench'];
  }
  
  // Default icon
  return icons['fa-cube'];
};

const getCategoryInfo = (category = 'tool') => {
  const categories = {
    'browser': { label: 'Browser', className: 'browser-tag' },
    'ide': { label: 'IDE & Editor', className: 'ide-tag' },
    'language': { label: 'Language', className: 'language-tag' },
    'database': { label: 'Database', className: 'database-tag' },
    'tool': { label: 'Tool', className: 'tool-tag' }
  };
  return categories[category] || categories.tool;
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) {
    return "0 Bytes";
  }
  
  const mb = bytes / (1024 * 1024);
  
  if (mb >= 1) {
    return `${Math.round(mb)} MB`;
  } else {
    const kb = bytes / 1024;
    if (kb >= 1) {
      return `${Math.round(kb)} KB`;
    } else {
      return `${Math.round(bytes)} Bytes`;
    }
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatVersion = (version) => {
  if (!version) return 'v1.0.0';
  
  // If version doesn't start with 'v', add it
  if (!version.toString().startsWith('v')) {
    return `v${version}`;
  }
  
  return version;
};

const AppCard = ({ 
  id,
  name, 
  description, 
  category,
  isInstalled, 
  version,
  icon,
  s3Key,
  size,
  lastModified,
  onStatusChange
}) => {
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState(null);
  const categoryInfo = getCategoryInfo(category);
  
  // Format the date properly
  const dateString = formatDate(lastModified);
  
  // Format the version with a 'v' prefix for better visibility
  const versionTag = formatVersion(version);
  
  // Format the file size from S3 metadata
  const displaySize = formatFileSize(size);

  const handleProgress = useCallback((progress, status) => {
    setProgress(progress);
    setMessage(status.message || '');
    setDetails(status.details || '');
  }, []);

  const handleError = useCallback((error) => {
    setError(error.message);
    setProgress(0);
  }, []);

  const handleComplete = useCallback(() => {
    setProgress(100);
    setMessage('Operation completed successfully');
    setTimeout(() => {
      setInstalling(false);
      setUninstalling(false);
      setProgress(0);
      setMessage('');
      setDetails('');
      setError(null);
      onStatusChange?.();
    }, 1000);
  }, [onStatusChange]);

  const handleInstall = useCallback(async () => {
    try {
      setInstalling(true);
      setError(null);
      setProgress(0);
      setMessage('Starting installation...');

      // Use softwareService instead of s3Service for installation
      await softwareService.installSoftware(s3Key, (data) => {
        setProgress(data.progress || 0);
        setMessage(data.message || 'Installing...');
        setDetails(data.details || '');
      });
      
      // Force a delay to ensure backend database updates are complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      handleComplete();
    } catch (error) {
      console.error('Installation error:', error);
      handleError(error);
    }
  }, [s3Key, handleComplete, handleError]);

  const handleUninstall = useCallback(async () => {
    try {
      setUninstalling(true);
      setError(null);
      setProgress(0);
      setMessage('Starting uninstallation...');

      // Use softwareService instead of websocketService for uninstallation
      await softwareService.uninstallSoftware(s3Key || name, (data) => {
        setProgress(data.progress || 0);
        setMessage(data.message || 'Uninstalling...');
        setDetails(data.details || '');
      });
      
      // Force a delay to ensure backend database updates are complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      handleComplete();
    } catch (error) {
      console.error('Uninstallation error:', error);
      handleError(error);
    }
  }, [s3Key, name, handleComplete, handleError]);

  const handleClose = useCallback(() => {
    setInstalling(false);
    setUninstalling(false);
    setProgress(0);
    setMessage('');
    setDetails('');
    setError(null);
  }, []);
  
  return (
    <>
      <Card className="simple-app-card" elevation={1}>
        <CardContent className="simple-card-content">
          {/* Top section with icon, name, version and date */}
          <Box className="simple-card-header">
            <Box className="simple-card-title-section">
              <Box className="simple-icon-name-container">
                <Box className="simple-app-icon">
                  {getMaterialIcon(icon, name)}
                </Box>
                <Typography className="simple-app-name">
                  {name}
                </Typography>
              </Box>
              <Box className="simple-version-tag">
                {versionTag}
              </Box>
            </Box>
            <Typography className="simple-date">
              {dateString}
            </Typography>
          </Box>
          
          {/* Category tag */}
          <Box className="simple-category-container">
            <Box className={`simple-category-tag ${categoryInfo.className}`}>
              {categoryInfo.label}
            </Box>
          </Box>
          
          {/* Description */}
          {description && (
            <Typography className="simple-description" variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
          
          {/* File size */}
          <Typography className="simple-file-size">
            {displaySize}
          </Typography>
          
          {/* Action button */}
          <Box className="simple-action-container">
            {isInstalled ? (
              <Button
                variant="outlined"
                className="simple-uninstall-button"
                startIcon={<UninstallIcon />}
                onClick={handleUninstall}
                fullWidth
              >
                Uninstall
              </Button>
            ) : (
              <Button
                variant="contained"
                className="simple-install-button"
                startIcon={<CloudDownloadIcon />}
                onClick={handleInstall}
                fullWidth
              >
                Install
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <InstallProgress
        open={installing || uninstalling}
        onClose={handleClose}
        progress={progress}
        message={message}
        details={details}
        error={error}
        title={installing ? 'Installation Progress' : 'Uninstallation Progress'}
      />
    </>
  );
};

export default AppCard;
