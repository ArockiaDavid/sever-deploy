import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  InputBase,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AppCard from './AppCard';
import { installationService } from '../api/installationService';
import '../styles/SoftwareList.css';

const defaultIcons = {
  'Google Chrome': '/icons/chrome.png',
  'Firefox': '/icons/firefox.png',
  'Visual Studio Code': '/icons/vscode.png',
  'Node.js': '/icons/nodejs.png',
  'Git': '/icons/git.png'
};

const defaultDescriptions = {
  'Google Chrome': 'A fast, secure, and free web browser built for the modern web.',
  'Firefox': 'A free and open-source web browser developed by Mozilla.',
  'Visual Studio Code': 'A lightweight but powerful source code editor.',
  'Node.js': 'A JavaScript runtime built on Chrome\'s V8 JavaScript engine.',
  'Git': 'A free and open source distributed version control system.'
};

const defaultDevelopers = {
  'Google Chrome': 'Google',
  'Firefox': 'Mozilla',
  'Visual Studio Code': 'Microsoft',
  'Node.js': 'OpenJS Foundation',
  'Git': 'Git Project'
};

const SoftwareList = () => {
  const [software, setSoftware] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSoftware = async () => {
      try {
        const data = await installationService.getInstalledSoftware();
        console.log('Fetched software:', data);
        setSoftware(data);
      } catch (error) {
        console.error('Error fetching software:', error);
        setError(error.message || 'Failed to load software list');
      } finally {
        setLoading(false);
      }
    };

    fetchSoftware();
  }, []);

  const filteredSoftware = software.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <Alert severity="error" className="error-alert">
        {error}
      </Alert>
    );
  }

  return (
    <div className="software-list-container">
      <div className="actions-container">
        {/* Scan Button */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={async () => {
            try {
              setLoading(true);
              await installationService.scanInstalledSoftware();
              // Refresh software list after scan
              window.location.reload();
            } catch (error) {
              setError(error.message || 'Failed to scan software');
            } finally {
              setLoading(false);
            }
          }}
        >
          Scan Installed Software
        </Button>

        {/* Search Bar */}
        <Paper className="search-bar">
          <InputBase
            className="search-input"
            placeholder="Search software..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <IconButton type="button" className="search-button" aria-label="search">
            <SearchIcon />
          </IconButton>
        </Paper>
      </div>

      {/* Software Grid */}
      {filteredSoftware.length === 0 ? (
        <Typography variant="h6" className="no-software-message">
          No software found
        </Typography>
      ) : (
        <Grid container spacing={3} className="software-grid">
          {filteredSoftware.map((app) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={app._id}>
              <AppCard
                name={app.name}
                developer={defaultDevelopers[app.name] || 'Unknown Developer'}
                description={defaultDescriptions[app.name] || 'No description available'}
                icon={defaultIcons[app.name] || '/icons/default.png'}
                version={app.version}
                isInstalled={app.status === 'installed'}
                onCardClick={() => console.log('Card clicked:', app.name)}
                onInstall={() => console.log('Install clicked:', app.name)}
                onCheck={() => console.log('Check clicked:', app.name)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
};

export default SoftwareList;
