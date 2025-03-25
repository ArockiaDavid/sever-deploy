import React, { useCallback, useEffect, useRef } from 'react';
import { IconButton, Tooltip, Box } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ChevronRight,
  Assessment as AssessmentIcon,
  Apps as AppsIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

// Custom keyframes for animations
const pulseAnimation = {
  '@keyframes pulse': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.15)' },
    '100%': { transform: 'scale(1)' }
  }
};

const bounceAnimation = {
  '@keyframes bounce': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-5px)' }
  }
};

const rotateAnimation = {
  '@keyframes rotate': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  }
};

// Toggle button animations
const floatAnimation = {
  '@keyframes float': {
    '0%, 100%': { transform: 'translateY(0) rotate(-180deg)' },
    '50%': { transform: 'translateY(-5px) rotate(-180deg)' }
  }
};

const wiggleAnimation = {
  '@keyframes wiggle': {
    '0%, 100%': { transform: 'rotate(0deg)' },
    '25%': { transform: 'rotate(-10deg)' },
    '75%': { transform: 'rotate(10deg)' }
  }
};

const glowAnimation = {
  '@keyframes glow': {
    '0%, 100%': { 
      boxShadow: '0 0 5px rgba(253, 106, 66, 0.5)',
      borderColor: 'rgba(253, 106, 66, 0.5)'
    },
    '50%': { 
      boxShadow: '0 0 15px rgba(253, 106, 66, 0.8)',
      borderColor: 'rgba(253, 106, 66, 0.8)'
    }
  }
};

const spinAnimation = {
  '@keyframes spin': {
    '0%': { transform: 'rotate(-180deg)' },
    '100%': { transform: 'rotate(180deg)' }
  }
};

// Background gradient animation
const gradientAnimation = {
  '@keyframes gradientShift': {
    '0%': { 
      backgroundPosition: '0% 50%' 
    },
    '50%': { 
      backgroundPosition: '100% 50%' 
    },
    '100%': { 
      backgroundPosition: '0% 50%' 
    }
  }
};

// Different color themes for each menu item
const menuThemes = [
  {
    name: 'orange',
    hoverBg: 'rgba(253, 106, 66, 0.08)',
    activeBg: 'rgba(253, 106, 66, 0.16)',
    hoverColor: 'rgba(253, 106, 66, 0.9)', // Orange
    activeColor: 'rgba(253, 106, 66, 0.9)',
    indicatorColor: 'rgba(253, 106, 66, 0.9)'
  },
  {
    name: 'orange',
    hoverBg: 'rgba(253, 106, 66, 0.08)',
    activeBg: 'rgba(253, 106, 66, 0.16)',
    hoverColor: 'rgba(253, 106, 66, 0.9)', // Orange
    activeColor: 'rgba(253, 106, 66, 0.9)',
    indicatorColor: 'rgba(253, 106, 66, 0.9)'
  },
  {
    name: 'orange',
    hoverBg: 'rgba(253, 106, 66, 0.08)',
    activeBg: 'rgba(253, 106, 66, 0.16)',
    hoverColor: 'rgba(253, 106, 66, 0.9)', // Orange
    activeColor: 'rgba(253, 106, 66, 0.9)',
    indicatorColor: 'rgba(253, 106, 66, 0.9)'
  }
];

// Sidebar background themes
const sidebarThemes = {
  light: {
    background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(245,245,245,1) 100%)',
    borderColor: 'rgba(0,0,0,0.1)',
    textColor: 'text.primary'
  },
  dark: {
    background: 'linear-gradient(135deg, rgba(40,44,52,1) 0%, rgba(30,33,39,1) 100%)',
    borderColor: 'rgba(255,255,255,0.1)',
    textColor: 'white'
  },
  blue: {
    background: 'linear-gradient(135deg, rgba(240,249,255,1) 0%, rgba(224,242,254,1) 100%)',
    borderColor: 'rgba(25,118,210,0.2)',
    textColor: 'text.primary'
  },
  colorful: {
    background: 'linear-gradient(135deg, rgba(240,249,255,0.95) 0%, rgba(236,253,245,0.95) 50%, rgba(243,232,255,0.95) 100%)',
    borderColor: 'rgba(0,0,0,0.1)',
    textColor: 'text.primary',
    animation: 'gradientShift 15s ease infinite',
    backgroundSize: '200% 200%'
  }
};

const MenuItem = React.memo(({ item, expanded, index, theme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname === item.path;
  
  // Get theme based on index
  const menuTheme = menuThemes[index % menuThemes.length];

  // Different animation for each menu item
  const getAnimation = (idx) => {
    switch (idx % 3) {
      case 0:
        return {
          '&:hover .menu-icon': {
            animation: 'pulse 0.6s ease-in-out infinite',
            color: menuTheme.hoverColor
          },
          ...pulseAnimation
        };
      case 1:
        return {
          '&:hover .menu-icon': {
            animation: 'bounce 0.6s ease-in-out infinite',
            color: menuTheme.hoverColor
          },
          ...bounceAnimation
        };
      case 2:
        return {
          '&:hover .menu-icon': {
            animation: 'rotate 1s linear infinite',
            color: menuTheme.hoverColor
          },
          ...rotateAnimation
        };
      default:
        return {};
    }
  };

  const handleClick = useCallback((e) => {
    e.preventDefault();
    if (item.path) {
      navigate(item.path);
    }
  }, [navigate, item.path]);

  const menuItem = (
    <Box 
      component="a"
      href={item.path}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: expanded ? 1.5 : 1,
        py: 1.5,
        mb: 0.5,
        cursor: 'pointer',
        borderRadius: 1,
        textDecoration: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        color: active ? menuTheme.activeColor : theme.textColor,
        bgcolor: active ? menuTheme.activeBg : 'transparent',
        justifyContent: expanded ? 'flex-start' : 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::after': active ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          backgroundColor: menuTheme.indicatorColor,
          borderTopRightRadius: '4px',
          borderBottomRightRadius: '4px'
        } : {},
        '&:hover': {
          bgcolor: active ? menuTheme.activeBg : menuTheme.hoverBg,
          color: menuTheme.hoverColor,
          transform: expanded ? 'translateX(4px)' : 'none',
        },
        ...getAnimation(index)
      }}
    >
      <Box 
        className="menu-icon"
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: expanded ? 32 : 'auto',
          height: 32,
          mr: expanded ? 1.5 : 0,
          color: active ? menuTheme.activeColor : theme.textColor,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '& svg': {
            fontSize: 20,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          },
          ...(active && {
            transform: 'scale(1.1)',
            filter: `drop-shadow(0 0 2px ${menuTheme.activeColor}40)`
          })
        }}
      >
        {item.icon}
      </Box>
      {expanded && (
        <Box sx={{ 
          fontSize: '0.875rem',
          fontWeight: active ? 600 : 400,
          whiteSpace: 'nowrap',
          opacity: 1,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {item.text}
        </Box>
      )}
    </Box>
  );

  return expanded ? menuItem : (
    <Tooltip 
      title={item.text} 
      placement="right"
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: menuTheme.activeColor,
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 500,
            borderRadius: 1,
            py: 1,
            px: 1.5,
            boxShadow: 2
          }
        }
      }}
      arrow
    >
      {menuItem}
    </Tooltip>
  );
});

const Sidebar = ({ open, expanded, onExpand, onClose }) => {
  const sidebarRef = useRef(null);
  // Choose a theme - you can change this to any of the themes defined above
  const currentTheme = sidebarThemes.dark;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleToggle = useCallback(() => {
    onExpand(!expanded);
  }, [expanded, onExpand]);

  const adminMenuItems = [
    {
      text: 'Dashboard',
      icon: <AssessmentIcon />,
      path: '/admin'
    },
    {
      text: 'User Management',
      icon: <PeopleIcon />,
      path: '/admin/users'
    },
    {
      text: 'Application Manager',
      icon: <AppsIcon />,
      path: '/admin/application-manager'
    }
  ];

  return (
    <Box
      ref={sidebarRef}
      className="sidebar"
      sx={{
        width: 'auto',
        minWidth: expanded ? 'auto' : 50,
        maxWidth: expanded ? 'max-content' : 50,
        height: '100%',
        background: currentTheme.background,
        backgroundSize: currentTheme.backgroundSize || 'cover',
        animation: currentTheme.animation,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: open ? 'translateX(0)' : { xs: 'translateX(-100%)', md: 'none' },
        visibility: { xs: open ? 'visible' : 'hidden', md: 'visible' },
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRight: '1px solid',
        borderColor: currentTheme.borderColor,
        boxShadow: '1px 0 2px 0 rgb(0 0 0 / 0.05)',
        zIndex: 1200,
        whiteSpace: 'nowrap',
        ...floatAnimation,
        ...wiggleAnimation,
        ...glowAnimation,
        ...spinAnimation,
        ...gradientAnimation
      }}
    >
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: expanded ? 1.5 : 0.5,
        position: 'relative'
      }}>
        <Box sx={{ height: 48, mb: 1 }} />
        <Box sx={{ 
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: 4
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(0,0,0,0.1)',
            borderRadius: 2
          }
        }}>
          {adminMenuItems.map((item, index) => (
            <MenuItem 
              key={item.text}
              item={item}
              expanded={expanded}
              index={index}
              theme={currentTheme}
            />
          ))}
        </Box>
        <Box sx={{ 
          position: 'absolute',
          top: 12,
          right: expanded ? 8 : 'auto',
          left: expanded ? 'auto' : '50%',
          transform: expanded ? 'none' : 'translateX(-50%)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Tooltip 
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            placement="right"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: 'rgba(253, 106, 66, 0.9)',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: 1,
                  py: 1,
                  px: 1.5,
                  boxShadow: 2
                }
              }
            }}
            arrow
          >
            <IconButton
              className="sidebar-toggle"
              onClick={handleToggle}
              size="small"
              sx={{
                width: 28,
                height: 28,
                bgcolor: 'background.paper',
                color: 'rgba(253, 106, 66, 0.9)',
                border: '2px solid',
                borderColor: 'rgba(253, 106, 66, 0.9)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transform: expanded ? 'rotate(-180deg)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'rgba(253, 106, 66, 0.08)',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                  animation: expanded 
                    ? 'float 1s ease-in-out infinite' 
                    : 'wiggle 0.5s ease-in-out infinite'
                },
                '&:active': {
                  animation: expanded 
                    ? 'spin 0.5s ease-in-out' 
                    : 'glow 0.5s ease-in-out'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  right: -4,
                  bottom: -4,
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: 'rgba(253, 106, 66, 0.9)',
                  borderBottomColor: 'rgba(253, 106, 66, 0.9)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                },
                '&:hover::before': {
                  opacity: 0.5,
                  animation: 'rotate 2s linear infinite'
                }
              }}
            >
              <ChevronRight 
                fontSize="small" 
                sx={{
                  transition: 'transform 0.3s ease',
                  transform: expanded ? 'rotate(0)' : 'rotate(0)',
                  '&:hover': {
                    transform: expanded ? 'rotate(-30deg)' : 'rotate(30deg)'
                  }
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;
