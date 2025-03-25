import { useEffect } from 'react';
import { useBreadcrumb } from '../context/BreadcrumbContext';

const useBreadcrumbUpdate = (items) => {
  const { updateBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    try {
      if (Array.isArray(items)) {
        updateBreadcrumbs(items);
      }
    } catch (error) {
      console.error('Error updating breadcrumbs:', error);
    }

    // Cleanup function to prevent memory leaks
    return () => {
      try {
        updateBreadcrumbs([]);
      } catch (error) {
        console.error('Error cleaning up breadcrumbs:', error);
      }
    };
  }, [items, updateBreadcrumbs]);
};

export default useBreadcrumbUpdate;
