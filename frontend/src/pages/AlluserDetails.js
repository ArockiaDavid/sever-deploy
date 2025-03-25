import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Avatar,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Badge,
  Container
} from '@mui/material';
import config from '../config';
import { styled } from '@mui/material/styles';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Engineering as EngineerIcon,
  Visibility as VisibilityIcon,
  FiberManualRecord as StatusIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#4caf50',
    color: '#4caf50',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const getRoleIcon = (role) => {
  switch (role) {
    case 'admin':
      return <AdminIcon />;
    case 'engineer':
      return <EngineerIcon />;
    default:
      return <PersonIcon />;
  }
};

const getRoleColor = (role) => {
  switch (role) {
    case 'admin':
      return '#0088FE';
    case 'engineer':
      return '#00C49F';
    default:
      return '#FFBB28';
  }
};

const AlluserDetails = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'admin') {
        navigate('/login');
        return;
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Effect to update current user's online status
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
            console.log('Updated current user status to online');
          } catch (error) {
            console.error('Failed to update current user status:', error);
          }
        };
        
        updateCurrentUserStatus();
        
        // Set up interval to keep updating status
        const keepAliveInterval = setInterval(updateCurrentUserStatus, 30000);
        return () => clearInterval(keepAliveInterval);
      }
    }
  }, []);

  // Function to fetch users
  const fetchUsers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${config.apiUrl}/api/users/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      // Ensure current user shows as online
      const userData = localStorage.getItem('user');
      if (userData) {
        const currentUser = JSON.parse(userData);
        if (currentUser && currentUser._id) {
          data.forEach(user => {
            if (user._id === currentUser._id) {
              user.isOnline = true;
              user.lastActive = new Date();
            }
          });
        }
      }
      
      setUsers(data);
      if (showLoading) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchUsers(false);
    setSnackbar({
      open: true,
      message: 'User status refreshed',
      severity: 'success'
    });
  };

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-refresh users every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchUsers(false);
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const handleRowClick = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  const handleDeleteClick = (user) => {
    setDeleteDialog({ open: true, user });
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/api/users/${deleteDialog.user._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(u => u._id !== deleteDialog.user._id));
      setSnackbar({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete user',
        severity: 'error'
      });
    } finally {
      setDeleteDialog({ open: false, user: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, user: null });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (isOnline, lastActive, lastLogin) => {
    // Directly use isOnline field from database
    if (isOnline === true) return '#4caf50'; // Online - bright green
    
    // Different colors based on how long the user has been offline
    if (lastLogin) {
      const lastLoginDate = new Date(lastLogin);
      const now = new Date();
      const diffMs = now - lastLoginDate;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 60) {
        return '#1976d2'; // Recently seen (< 1 hour) - thick blue
      } else if (diffMinutes < 24 * 60) {
        return '#ff9800'; // Seen in the last 24 hours - orange
      }
    }
    
    return '#e53935'; // Offline - red
  };

  // Format date to a very simple, readable format with AM/PM
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      // Parse the ISO string directly
      const parts = dateString.split('T');
      if (parts.length !== 2) return 'Invalid date format';
      
      // Parse date part (YYYY-MM-DD)
      const dateParts = parts[0].split('-');
      if (dateParts.length !== 3) return 'Invalid date format';
      
      const year = dateParts[0];
      const month = dateParts[1]; // Already zero-padded
      const day = dateParts[2]; // Already zero-padded
      
      // Parse time part (HH:MM:SS.sss+00:00)
      const timeParts = parts[1].split('.')[0].split(':');
      if (timeParts.length < 2) return 'Invalid time format';
      
      // Convert UTC hours to IST (UTC+5:30)
      let hours = parseInt(timeParts[0], 10);
      let minutes = parseInt(timeParts[1], 10);
      
      // Add 5 hours and 30 minutes for IST
      hours = hours + 5;
      minutes = minutes + 30;
      
      // Handle minute overflow
      if (minutes >= 60) {
        hours += 1;
        minutes -= 60;
      }
      
      // Handle hour overflow
      if (hours >= 24) {
        hours -= 24;
      }
      
      // Convert to 12-hour format with AM/PM
      let period = 'AM';
      if (hours >= 12) {
        period = 'PM';
        if (hours > 12) {
          hours -= 12;
        }
      }
      if (hours === 0) {
        hours = 12;
      }
      
      // Format minutes with zero-padding
      const formattedMinutes = minutes.toString().padStart(2, '0');
      
      // Format: "DD/MM/YYYY h:MM AM/PM"
      return `${day}/${month}/${year} ${hours}:${formattedMinutes} ${period}`;
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Date error';
    }
  };

  const getStatusText = (isOnline, lastActive, lastLogin) => {
    // Directly use isOnline field from database
    if (isOnline === true) return 'Online';
    
    // If offline, show time difference in minutes or hours
    if (lastLogin) {
      const lastLoginDate = new Date(lastLogin);
      const now = new Date();
      const diffMs = now - lastLoginDate;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) {
        return 'Last: Just now';
      } else if (diffMinutes < 60) {
        return `Last: ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        return `Last: ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      }
    }
    
    return 'Offline';
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminUsers = filteredUsers.filter(user => user.role === 'admin');
  const regularUsers = filteredUsers.filter(user => user.role !== 'admin');
  const currentUsers = activeTab === 0 ? adminUsers : regularUsers;
  const paginatedUsers = currentUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          width: '100%'
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%' }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            mb: 3,
            width: '100%',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: { xs: 2, sm: 0 }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                User Management
              </Typography>
              <IconButton 
                color="primary" 
                onClick={handleRefresh}
                title="Refresh user status"
                sx={{ ml: 1 }}
              >
                <RefreshIcon />
              </IconButton>
            </Box>
            <TextField
              size="small"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                width: { xs: '100%', sm: 250 }
              }}
            />
          </Box>

          {/* Tabs */}
          <Box sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{ 
                borderBottom: '1px solid',
                borderColor: 'rgba(25, 118, 210, 0.2)',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  minWidth: 'auto',
                  px: 3,
                  py: 1.5,
                  fontWeight: 500,
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'rgba(25, 118, 210, 0.9)',
                    backgroundColor: 'rgba(25, 118, 210, 0.05)'
                  }
                },
                '& .Mui-selected': {
                  color: 'rgba(25, 118, 210, 0.9)',
                  fontWeight: 600,
                  backgroundColor: 'rgba(25, 118, 210, 0.08)'
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'rgba(25, 118, 210, 0.9)',
                  height: 3
                }
              }}
            >
              <Tab 
                label={`Administrators (${adminUsers.length})`}
                icon={<AdminIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                sx={{ borderRadius: '4px 4px 0 0' }}
              />
              <Tab 
                label={`Users (${regularUsers.length})`}
                icon={<PersonIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                sx={{ borderRadius: '4px 4px 0 0' }}
              />
            </Tabs>
          </Box>

          {error ? (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          ) : (
            <>
              {/* Table */}
              <TableContainer sx={{ width: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <Table sx={{ 
                  width: '100%', 
                  tableLayout: 'fixed', 
                  '& .MuiTableCell-root': { 
                    px: 3,
                    borderRight: '1px solid rgba(224, 224, 224, 0.5)'
                  },
                  '& .MuiTableCell-root:last-child': {
                    borderRight: 'none'
                  }
                }}>
                  <TableHead>
                    <TableRow sx={{
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      '& th': {
                        fontWeight: 600,
                        color: 'rgba(25, 118, 210, 0.9)',
                        borderBottom: '1px solid',
                        borderColor: 'rgba(25, 118, 210, 0.2)',
                        py: 1.5
                      }
                    }}>
                      <TableCell width="40%">User</TableCell>
                      <TableCell width="30%">Email</TableCell>
                      <TableCell width="20%">Status</TableCell>
                      <TableCell width="10%" align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow 
                        key={user._id}
                        onClick={() => user.role !== 'admin' ? handleRowClick(user._id) : null}
                        sx={{
                          cursor: user.role !== 'admin' ? 'pointer' : 'default',
                          '&:hover': {
                            backgroundColor: user.role !== 'admin' ? 'rgba(0, 0, 0, 0.02)' : 'inherit'
                          },
                          '& td': {
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            py: 2
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {user.isOnline ? (
                              <StyledBadge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                variant="dot"
                              >
                                <Avatar
                                  src={user.avatar ? `${config.apiUrl}${user.avatar}` : null}
                                  alt={user.name}
                                  sx={{ 
                                    width: 40, 
                                    height: 40,
                                    border: `2px solid ${getRoleColor(user.role)}`,
                                    bgcolor: `${getRoleColor(user.role)}20`
                                  }}
                                >
                                  {user.name?.charAt(0).toUpperCase()}
                                </Avatar>
                              </StyledBadge>
                            ) : (
                              <Avatar
                                src={user.avatar ? `${config.apiUrl}${user.avatar}` : null}
                                alt={user.name}
                                sx={{ 
                                  width: 40, 
                                  height: 40,
                                  border: `2px solid ${getRoleColor(user.role)}`,
                                  bgcolor: `${getRoleColor(user.role)}20`
                                }}
                              >
                                {user.name?.charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {user.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {user.position || user.department || 'Software Engineer'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{user.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<StatusIcon sx={{ fontSize: '0.8rem' }} />}
                            label={getStatusText(user.isOnline, user.lastActive, user.lastLogin)}
                            size="small"
                            sx={{
                              backgroundColor: `${getStatusColor(user.isOnline, user.lastActive, user.lastLogin)}20`,
                              color: getStatusColor(user.isOnline, user.lastActive, user.lastLogin),
                              '& .MuiChip-icon': {
                                color: getStatusColor(user.isOnline, user.lastActive, user.lastLogin)
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {user.role !== 'admin' && (
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(user._id);
                                }}
                                sx={{ 
                                  color: 'primary.main',
                                  '&:hover': { backgroundColor: 'primary.lighter' }
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(user);
                                }}
                                sx={{ 
                                  color: 'error.main',
                                  '&:hover': { backgroundColor: 'error.lighter' }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                py: 2,
                px: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Rows per page:
                  </Typography>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => handleChangeRowsPerPage(e)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      backgroundColor: 'transparent'
                    }}
                  >
                    {[5, 10, 25].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, currentUsers.length)} of {currentUsers.length}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      disabled={page === 0}
                      onClick={() => handleChangePage(null, page - 1)}
                      sx={{ color: page === 0 ? 'text.disabled' : 'text.primary' }}
                    >
                      <PrevIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      disabled={page >= Math.ceil(currentUsers.length / rowsPerPage) - 1}
                      onClick={() => handleChangePage(null, page + 1)}
                      sx={{ color: page >= Math.ceil(currentUsers.length / rowsPerPage) - 1 ? 'text.disabled' : 'text.primary' }}
                    >
                      <NextIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {deleteDialog.user?.name}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AlluserDetails;
