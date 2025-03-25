import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Checkbox,
  TextField,
  InputAdornment,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { s3Service } from '../api/s3Service';
import UploadPackageDialog from '../components/UploadPackageDialog';

const ApplicationManager = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [selected, setSelected] = useState([]);
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await s3Service.listPackages();
      
      // Add uploadDate if it doesn't exist
      const processedData = data.map(pkg => ({
        ...pkg,
        uploadDate: pkg.lastModified || new Date()
      }));
      
      setPackages(processedData);
    } catch (error) {
      console.error('Error loading packages:', error);
      setError('Failed to load packages. Please try again.');
      setSnackbar({
        open: true,
        message: 'Error loading packages',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const currentPageItems = packages
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map(pkg => pkg.s3Key);
      setSelected([...new Set([...selected, ...currentPageItems])]);
    } else {
      const currentPageItems = packages
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map(pkg => pkg.s3Key);
      setSelected(selected.filter(s3Key => !currentPageItems.includes(s3Key)));
    }
  };

  const handleSelect = (s3Key) => {
    const selectedIndex = selected.indexOf(s3Key);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, s3Key);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const handleSort = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    
    const sortedPackages = [...packages].sort((a, b) => {
      if (newOrder === 'asc') {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
    
    setPackages(sortedPackages);
  };

  const handleUploadComplete = async () => {
    setOpenUploadDialog(false);
    await loadPackages();
    setSnackbar({
      open: true,
      message: 'Package uploaded successfully',
      severity: 'success'
    });
  };

  const handleDeletePackage = async (s3Key) => {
    try {
      await s3Service.deletePackage(s3Key);
      await loadPackages();
      setSnackbar({
        open: true,
        message: 'Package deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting package:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting package',
        severity: 'error'
      });
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400,
        width: '100%'
      }}>
        <CircularProgress sx={{ color: 'rgba(253, 106, 66, 0.7)' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="error" gutterBottom>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 3,
              backgroundColor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              '&:hover': {
                boxShadow: 4
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" component="h1">
                Application Manager
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenUploadDialog(true)}
                sx={{
                  backgroundColor: 'rgba(253, 106, 66, 255)',
                  '&:hover': {
                    backgroundColor: 'rgba(253, 106, 66, 0.9)',
                  }
                }}
              >
                Add Application
              </Button>
            </Box>

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <TextField
                placeholder="Search software..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  width: '300px',
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'rgba(253, 106, 66, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(253, 106, 66, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'rgba(253, 106, 66, 0.7)',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'rgba(253, 106, 66, 0.7)' }} />
                    </InputAdornment>
                  ),
                }}
              />
              {selected.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    {selected.length} selected
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={async () => {
                      try {
                        for (const s3Key of selected) {
                          await s3Service.deletePackage(s3Key);
                        }
                        await loadPackages();
                        setSelected([]);
                        setSnackbar({
                          open: true,
                          message: `Successfully deleted ${selected.length} items`,
                          severity: 'success'
                        });
                      } catch (error) {
                        setSnackbar({
                          open: true,
                          message: 'Error deleting items',
                          severity: 'error'
                        });
                      }
                    }}
                  >
                    Delete Selected
                  </Button>
                </Box>
              )}
            </Box>

            <TableContainer 
              component={Paper} 
              sx={{
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                overflow: 'hidden'
              }}
            >
              <Table sx={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                '& thead': {
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                },
                '& tbody tr:nth-of-type(odd)': {
                  backgroundColor: 'rgba(0, 0, 0, 0.02)'
                },
                '& tbody tr': {
                  transition: 'background-color 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(253, 106, 66, 0.04)'
                  }
                },
                '& td, & th': {
                  padding: '8px 16px',
                  borderBottom: '1px solid rgba(224, 224, 224, 1)',
                  borderRight: '1px solid rgba(224, 224, 224, 0.8)',
                  textAlign: 'center',
                  '&:last-child': {
                    borderRight: 'none'
                  }
                },
                '& td': {
                  '&:nth-of-type(2)': {
                    textTransform: 'capitalize'
                  }
                },
                '& td[padding="checkbox"], & th[padding="checkbox"]': {
                  width: '48px',
                  padding: '0 8px',
                  '& > *': {
                    margin: '0 auto'
                  }
                }
              }}>
                <TableHead>
                  <TableRow sx={{ 
                    backgroundColor: 'rgba(253, 106, 66, 0.15)',
                    '& th': {
                      fontWeight: 700,
                      color: 'rgba(0, 0, 0, 0.87)',
                      fontSize: '0.95rem',
                      padding: '12px 16px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '2px solid rgba(253, 106, 66, 0.3)',
                      borderRight: '1px solid rgba(224, 224, 224, 0.8)',
                      '&:last-child': {
                        borderRight: 'none'
                      }
                    }
                  }}>
                    <TableCell padding="checkbox" sx={{ textAlign: 'center' }}>
                      <Checkbox
                        sx={{ display: 'block', margin: '0 auto' }}
                        indeterminate={
                          selected.length > 0 && 
                          selected.length < filteredPackages
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .length
                        }
                        checked={
                          filteredPackages
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .every(pkg => selected.includes(pkg.s3Key))
                        }
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell 
                      component="th" 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          '& .sort-icon': {
                            opacity: 1
                          }
                        }
                      }} 
                      onClick={handleSort}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Application
                        <Box 
                          className="sort-icon"
                          sx={{ 
                            display: 'flex',
                            ml: 1,
                            opacity: 0.7,
                            transition: 'opacity 0.2s ease'
                          }}
                        >
                          {sortOrder === 'asc' ? 
                            <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : 
                            <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                          }
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell component="th">Category</TableCell>
                    <TableCell component="th">Version</TableCell>
                    <TableCell component="th">Size</TableCell>
                    <TableCell component="th">Upload Date</TableCell>
                    <TableCell component="th">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPackages
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((pkg) => (
                    <TableRow 
                      key={pkg.s3Key}
                      selected={selected.indexOf(pkg.s3Key) !== -1}
                      sx={{
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(253, 106, 66, 0.08) !important'
                        }
                      }}
                    >
                      <TableCell padding="checkbox" sx={{ textAlign: 'center' }}>
                        <Checkbox
                          sx={{ display: 'block', margin: '0 auto' }}
                          checked={selected.indexOf(pkg.s3Key) !== -1}
                          onChange={() => handleSelect(pkg.s3Key)}
                        />
                      </TableCell>
                      <TableCell>{pkg.name}</TableCell>
                      <TableCell>{pkg.category}</TableCell>
                      <TableCell>{pkg.version}</TableCell>
                      <TableCell>{formatSize(pkg.size)}</TableCell>
                      <TableCell>{formatDate(pkg.uploadDate)}</TableCell>
                      <TableCell>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() => handleDeletePackage(pkg.s3Key)}
                            sx={{ display: 'inline-flex' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredPackages.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{
                  '.MuiTablePagination-select': {
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: 'rgba(253, 106, 66, 0.04)'
                    }
                  },
                  '.MuiTablePagination-selectIcon': {
                    color: 'rgba(253, 106, 66, 0.7)'
                  },
                  '.MuiTablePagination-actions button': {
                    '&:hover': {
                      backgroundColor: 'rgba(253, 106, 66, 0.04)'
                    },
                    '&.Mui-disabled': {
                      opacity: 0.3
                    }
                  }
                }}
              />
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <UploadPackageDialog
        open={openUploadDialog}
        onClose={() => setOpenUploadDialog(false)}
        onUploadComplete={handleUploadComplete}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApplicationManager;
