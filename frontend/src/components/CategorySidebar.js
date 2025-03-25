import React, { useState, useCallback, useRef } from 'react';
import { Tooltip, IconButton } from '@mui/material';
import {
  Apps as AppsIcon,
  Web as WebIcon,
  Code as CodeIcon,
  Terminal as TerminalIcon,
  Storage as DatabaseIcon,
  Build as ToolIcon,
  ChevronRight
} from '@mui/icons-material';

// Animation keyframes
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

// Category themes
const categoryThemes = {
  all: {
    hoverBg: 'rgba(253, 106, 66, 0.08)',
    activeBg: 'rgba(253, 106, 66, 0.16)',
    hoverColor: 'rgba(253, 106, 66, 0.9)',
    activeColor: 'rgba(253, 106, 66, 0.9)',
    indicatorColor: 'rgba(253, 106, 66, 0.9)'
  },
  browser: {
    hoverBg: 'rgba(25, 118, 210, 0.08)',
    activeBg: 'rgba(25, 118, 210, 0.16)',
    hoverColor: '#1976d2',
    activeColor: '#1976d2',
    indicatorColor: '#1976d2'
  },
  ide: {
    hoverBg: 'rgba(63, 81, 181, 0.08)',
    activeBg: 'rgba(63, 81, 181, 0.16)',
    hoverColor: '#3f51b5',
    activeColor: '#3f51b5',
    indicatorColor: '#3f51b5'
  },
  language: {
    hoverBg: 'rgba(46, 125, 50, 0.08)',
    activeBg: 'rgba(46, 125, 50, 0.16)',
    hoverColor: '#2e7d32',
    activeColor: '#2e7d32',
    indicatorColor: '#2e7d32'
  },
  database: {
    hoverBg: 'rgba(194, 24, 91, 0.08)',
    activeBg: 'rgba(194, 24, 91, 0.16)',
    hoverColor: '#c2185b',
    activeColor: '#c2185b',
    indicatorColor: '#c2185b'
  },
  tool: {
    hoverBg: 'rgba(255, 143, 0, 0.08)',
    activeBg: 'rgba(255, 143, 0, 0.16)',
    hoverColor: '#ff8f00',
    activeColor: '#ff8f00',
    indicatorColor: '#ff8f00'
  }
};

// Sidebar theme
const sidebarTheme = {
  background: 'linear-gradient(135deg, rgba(40,44,52,1) 0%, rgba(30,33,39,1) 100%)',
  borderColor: 'rgba(255,255,255,0.1)',
  textColor: 'white'
};

const CategoryItem = ({ category, selectedCategory, onCategorySelect, expanded }) => {
  const active = selectedCategory === category.id;
  const theme = categoryThemes[category.id] || categoryThemes.all;
  
  const handleClick = useCallback(() => {
    onCategorySelect(category.id);
  }, [onCategorySelect, category.id]);

  const menuItem = (
    <div 
      onClick={handleClick}
      role="button"
      tabIndex={0}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: expanded ? '12px 12px 12px 16px' : '12px 8px',
        marginBottom: '4px',
        cursor: 'pointer',
        borderRadius: '4px',
        textDecoration: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        color: active ? theme.activeColor : sidebarTheme.textColor,
        backgroundColor: active ? theme.activeBg : 'transparent',
        justifyContent: expanded ? 'flex-start' : 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div 
        className="menu-icon"
        style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: expanded ? '32px' : 'auto',
          height: '32px',
          marginRight: expanded ? '12px' : '0',
          color: active ? theme.activeColor : sidebarTheme.textColor,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {category.icon}
      </div>
      {expanded && (
        <div style={{ 
          fontSize: '0.875rem',
          fontWeight: active ? 600 : 400,
          whiteSpace: 'nowrap',
          opacity: 1,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {category.label}
        </div>
      )}
      {active && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          backgroundColor: theme.indicatorColor,
          borderTopRightRadius: '4px',
          borderBottomRightRadius: '4px'
        }} />
      )}
    </div>
  );

  return expanded ? menuItem : (
    <Tooltip 
      title={category.label} 
      placement="right"
      arrow
    >
      {menuItem}
    </Tooltip>
  );
};

const CategorySidebar = ({ selectedCategory, onCategorySelect }) => {
  const [expanded, setExpanded] = useState(false);
  const sidebarRef = useRef(null);

  // Define categories with their icons and labels
  const categories = [
    { id: 'all', label: 'All Software', icon: <AppsIcon /> },
    { id: 'browser', label: 'Browsers', icon: <WebIcon /> },
    { id: 'ide', label: 'IDE & Editors', icon: <CodeIcon /> },
    { id: 'language', label: 'Languages', icon: <TerminalIcon /> },
    { id: 'database', label: 'Databases', icon: <DatabaseIcon /> },
    { id: 'tool', label: 'Tools', icon: <ToolIcon /> }
  ];

  const handleToggle = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  return (
    <div
      ref={sidebarRef}
      className="sidebar"
      style={{
        width: expanded ? '200px' : '60px',
        height: '100%',
        minHeight: '100%',
        background: sidebarTheme.background,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid',
        borderColor: sidebarTheme.borderColor,
        boxShadow: '1px 0 2px 0 rgb(0 0 0 / 0.05)',
        zIndex: 1100,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        position: 'sticky',
        top: 0,
        left: 0
      }}
    >
      <div style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: expanded ? '12px' : '4px',
        position: 'relative'
      }}>
        <div style={{ height: '48px', marginBottom: '8px' }} />
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {categories.map((category) => (
            <CategoryItem 
              key={category.id}
              category={category}
              selectedCategory={selectedCategory}
              onCategorySelect={onCategorySelect}
              expanded={expanded}
            />
          ))}
        </div>
        <div style={{ 
          position: 'absolute',
          top: '12px',
          right: expanded ? '8px' : 'auto',
          left: expanded ? 'auto' : '50%',
          transform: expanded ? 'none' : 'translateX(-50%)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Tooltip 
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            placement="right"
            arrow
          >
            <IconButton
              className="sidebar-toggle"
              onClick={handleToggle}
              size="small"
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: 'white',
                color: 'rgba(253, 106, 66, 0.9)',
                border: '2px solid',
                borderColor: 'rgba(253, 106, 66, 0.9)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transform: expanded ? 'rotate(-180deg)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <ChevronRight 
                fontSize="small" 
                style={{
                  transition: 'transform 0.3s ease'
                }}
              />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default CategorySidebar;
