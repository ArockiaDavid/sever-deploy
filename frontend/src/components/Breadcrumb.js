import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Link, Typography } from '@mui/material';
import { 
  ChevronRight as ChevronRightIcon,
  HomeWork as HomeWorkIcon,
  BarChart as BarChartIcon,
  Group as GroupIcon,
  AccountCircle as AccountCircleIcon,
  Widgets as WidgetsIcon
} from '@mui/icons-material';

const getIcon = (type) => {
  switch (type) {
    case 'home':
      return <HomeWorkIcon sx={{ fontSize: 20 }} />;
    case 'dashboard':
      return <BarChartIcon sx={{ fontSize: 20 }} />;
    case 'users':
      return <GroupIcon sx={{ fontSize: 20 }} />;
    case 'user':
      return <AccountCircleIcon sx={{ fontSize: 20 }} />;
    case 'apps':
      return <WidgetsIcon sx={{ fontSize: 20 }} />;
    default:
      return null;
  }
};

const Breadcrumb = ({ items = [] }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Box 
      sx={{ 
        display: 'flex',
        alignItems: 'center',
        '& > *': {
          display: 'flex',
          alignItems: 'center'
        }
      }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const icon = getIcon(item.icon);
        
        return (
          <React.Fragment key={item.text}>
            {isLast ? (
              <Box
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  color: 'rgba(253, 106, 66, 0.9)',
                  fontWeight: 600,
                  gap: 0.75
                }}
              >
                {icon}
                <Typography 
                  variant="body2"
                  sx={{ 
                    fontWeight: 600,
                    color: 'rgba(253, 106, 66, 0.9)'
                  }}
                >
                  {item.text}
                </Typography>
              </Box>
            ) : (
              <>
                <Link
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.secondary',
                    textDecoration: 'none',
                    gap: 0.75,
                    transition: 'all 0.2s ease-out',
                    '&:hover': {
                      color: 'rgba(253, 106, 66, 0.9)',
                      textDecoration: 'none'
                    }
                  }}
                >
                  {icon}
                  <Typography 
                    variant="body2"
                    sx={{ 
                      fontWeight: 500,
                      transition: 'all 0.2s ease-out'
                    }}
                  >
                    {item.text}
                  </Typography>
                </Link>
                <ChevronRightIcon 
                  sx={{ 
                    mx: 1,
                    color: 'rgba(253, 106, 66, 0.5)',
                    fontSize: 20
                  }} 
                />
              </>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
};

export default React.memo(Breadcrumb);
