import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Box,
  CircularProgress,
  Card,
  useTheme,
  Paper,
  Divider,
  Tabs,
  Tab,
  Button
} from '@mui/material';
import {
  People as PeopleIcon,
  Apps as AppsIcon,
  Category as CategoryIcon,
  Storage as DatabaseIcon,
  Code as CodeIcon,
  Web as BrowserIcon,
  Build as ToolIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip, 
  Sector
} from 'recharts';
import config from '../config';

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color }) => (
  <Card sx={{ 
    p: 3,
    height: '100%',
    borderRadius: 2,
    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 25px 0 rgba(0,0,0,0.1)'
    }
  }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Box>
        <Typography color="text.secondary" fontSize="0.875rem" mb={1}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight="600" mb={1}>
          {value}
        </Typography>
      </Box>
      <Box sx={{ 
        p: 1.5,
        borderRadius: 2,
        bgcolor: `${color}15`,
        color: color,
        transition: 'transform 0.3s ease',
        '&:hover': {
          transform: 'scale(1.1)'
        }
      }}>
        <Icon fontSize="medium" />
      </Box>
    </Box>
  </Card>
);

// Custom Tooltip for PieChart
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          minWidth: 150
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {payload[0].name}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          Count: {payload[0].value}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {payload[0].payload.percentage}% of total
        </Typography>
      </Box>
    );
  }
  return null;
};

// Active shape for pie chart animation
const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const { 
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value 
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} style={{ fontWeight: 600 }}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

// Get icon for software category
const getCategoryIcon = (category) => {
  switch (category) {
    case 'browser':
      return <BrowserIcon />;
    case 'ide':
      return <CodeIcon />;
    case 'language':
      return <CodeIcon />;
    case 'database':
      return <DatabaseIcon />;
    case 'tool':
      return <ToolIcon />;
    default:
      return <AppsIcon />;
  }
};

const AdminDashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    users: 0,
    adminUsers: 0,
    regularUsers: 0,
    software: 0,
    installations: 0
  });
  const [softwareByCategory, setSoftwareByCategory] = useState([]);
  const [usersByRole, setUsersByRole] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [activeUserPieIndex, setActiveUserPieIndex] = useState(0);

  // Colors for pie charts
  const SOFTWARE_COLORS = [
    '#0088FE', // browser - blue
    '#00C49F', // ide - green
    '#FFBB28', // language - yellow
    '#FF8042', // database - orange
    '#8884D8'  // tool - purple
  ];
  
  const USER_COLORS = [
    '#FF6384', // admin - pink
    '#36A2EB'  // regular - blue
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // For demo purposes, use mock data directly
        console.log('Using mock data for dashboard');
        
        // Mock data based on the s3Service.js sample packages
        const mockTotalUsers = 8;
        const mockAdminUsers = 2;
        const mockRegularUsers = mockTotalUsers - mockAdminUsers;
        const mockSoftware = 16;
        const mockInstallations = 24;
        
        // Calculate software by category from s3Service.js sample packages
        const mockCategoryData = [
          { category: 'browser', count: 3 },
          { category: 'ide', count: 3 },
          { category: 'language', count: 3 },
          { category: 'database', count: 3 },
          { category: 'tool', count: 4 }
        ];
        
        // Update stats
        setStats({
          users: mockTotalUsers,
          adminUsers: mockAdminUsers,
          regularUsers: mockRegularUsers,
          software: mockSoftware,
          installations: mockInstallations
        });
        
        // Process software by category data for pie chart
        const total = mockCategoryData.reduce((sum, item) => sum + item.count, 0);
        
        const formattedData = mockCategoryData.map(item => ({
          name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
          value: item.count,
          percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
          color: getCategoryColor(item.category)
        }));
        
        setSoftwareByCategory(formattedData);
        
        // Process users by role data for pie chart
        setUsersByRole([
          { name: 'Admin Users', value: mockAdminUsers, percentage: Math.round((mockAdminUsers / mockTotalUsers) * 100), color: USER_COLORS[0] },
          { name: 'Regular Users', value: mockRegularUsers, percentage: Math.round((mockRegularUsers / mockTotalUsers) * 100), color: USER_COLORS[1] }
        ]);
        
        setError(''); // Clear any previous errors
      } catch (error) {
        console.error('Error setting up dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Get color for category
  const getCategoryColor = (category) => {
    switch (category) {
      case 'browser': return SOFTWARE_COLORS[0];
      case 'ide': return SOFTWARE_COLORS[1];
      case 'language': return SOFTWARE_COLORS[2];
      case 'database': return SOFTWARE_COLORS[3];
      case 'tool': return SOFTWARE_COLORS[4];
      default: return '#999999';
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handlePieEnter = (_, index) => {
    setActivePieIndex(index);
  };
  
  const handleUserPieEnter = (_, index) => {
    setActiveUserPieIndex(index);
  };
  
  const handleRefresh = () => {
    setLoading(true);
    // Simulate refresh delay
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400,
        width: '100%'
      }}>
        <CircularProgress sx={{ color: 'rgba(253, 106, 66, 0.9)' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{ 
            mt: 2,
            bgcolor: 'rgba(253, 106, 66, 0.9)',
            '&:hover': {
              bgcolor: 'rgba(253, 106, 66, 0.8)'
            }
          }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #f8f9fa 100%)',
      p: 3,
      borderRadius: 2,
      minHeight: '100%'
    }}>
      {/* Dashboard Header */}
      <Box sx={{ 
        mb: 4, 
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'rgba(253, 106, 66, 0.2)'
      }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          color: 'rgba(253, 106, 66, 0.9)',
          mb: 1
        }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Overview of software center statistics and analytics
        </Typography>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <StatsCard
            title="Total Users"
            value={stats.users}
            icon={PeopleIcon}
            color="rgba(253, 106, 66, 0.9)"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard
            title="Software Packages"
            value={stats.software}
            icon={AppsIcon}
            color="rgba(253, 106, 66, 0.9)"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard
            title="Total Installations"
            value={stats.installations}
            icon={CategoryIcon}
            color="rgba(253, 106, 66, 0.9)"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Software Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3, 
            borderRadius: 2,
            height: '100%',
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            borderTop: '4px solid rgba(253, 106, 66, 0.9)',
            '&:hover': {
              boxShadow: '0 8px 25px 0 rgba(253, 106, 66, 0.15)'
            }
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'rgba(253, 106, 66, 0.9)' }}>Software Distribution</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Breakdown of software packages by category
            </Typography>
            
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape}
                    data={softwareByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    onMouseEnter={handlePieEnter}
                    paddingAngle={2}
                  >
                    {softwareByCategory.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={SOFTWARE_COLORS[index % SOFTWARE_COLORS.length]} 
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{
                      paddingLeft: '30px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={1}>
                {softwareByCategory.map((category, index) => (
                  <Grid item xs={6} sm={4} key={index}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 1,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: `${category.color}10`,
                        borderColor: category.color,
                        transform: 'translateY(-2px)'
                      }
                    }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: category.color,
                        mr: 1
                      }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {category.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {category.value} ({category.percentage}%)
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </Grid>
        
        {/* User Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3, 
            borderRadius: 2,
            height: '100%',
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            borderTop: '4px solid rgba(253, 106, 66, 0.9)',
            '&:hover': {
              boxShadow: '0 8px 25px 0 rgba(253, 106, 66, 0.15)'
            }
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'rgba(253, 106, 66, 0.9)' }}>User Distribution</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Breakdown of users by role
            </Typography>
            
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeUserPieIndex}
                    activeShape={renderActiveShape}
                    data={usersByRole}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    onMouseEnter={handleUserPieEnter}
                    paddingAngle={2}
                  >
                    {usersByRole.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={USER_COLORS[index % USER_COLORS.length]} 
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{
                      paddingLeft: '30px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                {usersByRole.map((role, index) => (
                  <Grid item xs={6} key={index}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 1.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: `${role.color}10`,
                        borderColor: role.color,
                        transform: 'translateY(-2px)'
                      }
                    }}>
                      <Box sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        bgcolor: `${role.color}20`,
                        color: role.color,
                        mr: 2
                      }}>
                        {index === 0 ? <AdminIcon /> : <UserIcon />}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {role.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.value} ({role.percentage}%)
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
