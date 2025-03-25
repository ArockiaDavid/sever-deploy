import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  CircularProgress,
  Grid,
  Alert,
  Paper
} from '@mui/material';
import AppCard from './AppCard';
import { s3Service } from '../api/s3Service';

const DisplaySoftwareList = ({ externalSearchTerm, selectedCategory, onCategorySelect }) => {
  const [loading, setLoading] = useState(true);
  const [software, setSoftware] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  
  // Update searchTerm when externalSearchTerm changes
  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
    }
  }, [externalSearchTerm]);

  // Load software list from S3 bucket
  const loadSoftware = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get software list from S3 bucket
      const softwareList = await s3Service.listPackages();
      
      console.log('Software list from S3:', softwareList);
      
      if (!softwareList || softwareList.length === 0) {
        // If no software is found, show sample data for development
        const sampleSoftware = [
          {
            id: 'github-desktop',
            name: 'GitHub Desktop',
            description: 'GitHub Desktop is a seamless way to contribute to projects on GitHub.',
            category: 'tool',
            version: '3.0.0',
            icon: 'fa-github',
            s3Key: 'packages/github-desktop-3.0.0.dmg',
            size: 100 * 1024 * 1024, // 100 MB
            lastModified: new Date()
          },
          {
            id: 'google-chrome',
            name: 'Google Chrome',
            description: 'A fast, secure, and free web browser built for the modern web.',
            category: 'browser',
            version: '93.0.4577.82',
            icon: 'fa-chrome',
            s3Key: 'packages/googlechrome-93.0.4577.82.dmg',
            size: 150 * 1024 * 1024, // 150 MB
            lastModified: new Date()
          },
          {
            id: 'vscode',
            name: 'Visual Studio Code',
            description: 'Code editing. Redefined.',
            category: 'ide',
            version: '1.85.0',
            icon: 'fa-code',
            s3Key: 'packages/vscode-1.85.0.dmg',
            size: 200 * 1024 * 1024, // 200 MB
            lastModified: new Date()
          },
          {
            id: 'nodejs',
            name: 'Node.js',
            description: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine.',
            category: 'language',
            version: '20.9.0',
            icon: 'fa-node-js',
            s3Key: 'packages/nodejs-20.9.0.pkg',
            size: 50 * 1024 * 1024, // 50 MB
            lastModified: new Date()
          },
          {
            id: 'python',
            name: 'Python',
            description: 'Python is a programming language that lets you work quickly and integrate systems more effectively.',
            category: 'language',
            version: '3.10.0',
            icon: 'fa-python',
            s3Key: 'packages/python-3.10.0.pkg',
            size: 40 * 1024 * 1024, // 40 MB
            lastModified: new Date()
          }
        ];
        
        console.log('Using sample software data');
        
        // Check if installed
        const installedSoftware = await s3Service.scanInstalledSoftware();
        console.log('Installed software:', installedSoftware);
        
        // Update installation status
        const updatedSoftwareList = sampleSoftware.map(pkg => {
          const isInstalled = installedSoftware.some(app => {
            const appName = app.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            const pkgName = pkg.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            return appName && pkgName && (appName === pkgName || appName.includes(pkgName) || pkgName.includes(appName));
          });
          
          return { ...pkg, isInstalled };
        });
        
        setSoftware(updatedSoftwareList);
      } else {
        // Check if installed
        const installedSoftware = await s3Service.scanInstalledSoftware();
        console.log('Installed software:', installedSoftware);
        
        // Update installation status
        const updatedSoftwareList = softwareList.map(pkg => {
          const isInstalled = installedSoftware.some(app => {
            const appName = app.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            const pkgName = pkg.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
            return appName && pkgName && (appName === pkgName || appName.includes(pkgName) || pkgName.includes(appName));
          });
          
          return { ...pkg, isInstalled };
        });
        
        setSoftware(updatedSoftwareList);
      }
    } catch (error) {
      console.error('Error loading software:', error);
      setError(error.message || 'Failed to load software. Please try again later.');
      
      // Show sample data even on error for development
      const sampleSoftware = [
        {
          id: 'github-desktop',
          name: 'GitHub Desktop',
          description: 'GitHub Desktop is a seamless way to contribute to projects on GitHub.',
          category: 'tool',
          version: '3.0.0',
          icon: 'fa-github',
          s3Key: 'packages/github-desktop-3.0.0.dmg',
          size: 100 * 1024 * 1024, // 100 MB
          lastModified: new Date(),
          isInstalled: false
        },
        {
          id: 'google-chrome',
          name: 'Google Chrome',
          description: 'A fast, secure, and free web browser built for the modern web.',
          category: 'browser',
          version: '93.0.4577.82',
          icon: 'fa-chrome',
          s3Key: 'packages/googlechrome-93.0.4577.82.dmg',
          size: 150 * 1024 * 1024, // 150 MB
          lastModified: new Date(),
          isInstalled: true
        }
      ];
      
      console.log('Using fallback sample data due to error');
      setSoftware(sampleSoftware);
    } finally {
      setLoading(false);
    }
  };

  // Load software when component mounts
  useEffect(() => {
    loadSoftware();
  }, []);

  // Filter software based on category and search
  const filteredSoftware = software.filter(pkg => {
    const matchesCategory = selectedCategory === 'all' || pkg.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ width: '100%', padding: '16px' }}>
      <Paper elevation={3} style={{ padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
        <Typography variant="h4" style={{ marginBottom: '8px' }}>
          {selectedCategory === 'all' ? 'All Software' : 
           selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          {searchTerm && ` - Search: "${searchTerm}"`}
        </Typography>
      </Paper>
      
      {error && (
        <Paper elevation={3} style={{ padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
          <Alert severity="error" style={{ marginBottom: '8px' }}>
            {error}
            <div style={{ marginTop: '8px' }}>
              <Typography variant="body2" component="span" style={{ marginRight: '8px' }}>
                Unable to load software data.
              </Typography>
              <Typography 
                variant="body2" 
                component="span" 
                style={{ 
                  color: '#1976d2', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                onClick={loadSoftware}
              >
                Try again
              </Typography>
            </div>
          </Alert>
        </Paper>
      )}
      
      <Paper elevation={3} style={{ padding: '16px', borderRadius: '8px', overflow: 'visible' }}>
        {loading ? (
          // Loading state
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <CircularProgress />
          </div>
        ) : (
          // App card grid view
          <div style={{ overflow: 'visible' }}>
            {filteredSoftware.length === 0 && !error ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  No software found matching your criteria
                </Typography>
              </div>
            ) : (
              <Grid container spacing={3}>
                {filteredSoftware.map((pkg) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={pkg.id}>
                    <AppCard
                      id={pkg.id}
                      name={pkg.name}
                      description={pkg.description}
                      category={pkg.category}
                      isInstalled={pkg.isInstalled}
                      version={pkg.version}
                      icon={pkg.icon || `fa-${pkg.category === 'browser' ? 'globe' : 
                                         pkg.category === 'ide' ? 'code' :
                                         pkg.category === 'language' ? 'terminal' :
                                         pkg.category === 'database' ? 'database' : 'cube'}`}
                      s3Key={pkg.s3Key}
                      size={pkg.size}
                      lastModified={pkg.lastModified}
                      onStatusChange={() => {
                        // Refresh software list after status change
                        loadSoftware();
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </div>
        )}
      </Paper>
    </div>
  );
};

export default DisplaySoftwareList;
