import React, { createContext, useContext, useState, useCallback } from 'react';

const BreadcrumbContext = createContext();

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    console.warn('useBreadcrumb must be used within a BreadcrumbProvider');
    return { breadcrumbs: [], updateBreadcrumbs: () => {} };
  }
  return context;
};

export const BreadcrumbProvider = ({ children }) => {
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  const updateBreadcrumbs = useCallback((items) => {
    if (Array.isArray(items)) {
      setBreadcrumbs(items);
    } else {
      console.warn('Invalid breadcrumb items:', items);
      setBreadcrumbs([]);
    }
  }, []);

  const value = {
    breadcrumbs,
    updateBreadcrumbs
  };

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
};
