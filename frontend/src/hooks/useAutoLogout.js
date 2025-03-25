import { useState, useEffect, useCallback } from 'react';

// Disable auto logout for now
const IDLE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours (effectively disabled)
const WARNING_TIME = 60 * 1000; // 1 minute before logout
const CHECK_INTERVAL = 1000; // Check every second

const useAutoLogout = (onLogout) => {
  // Always return false for showWarning to disable the logout warning
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(WARNING_TIME / 1000);

  const resetTimer = useCallback(() => {
    // Do nothing
  }, []);

  const onStayLoggedIn = useCallback(() => {
    setShowWarning(false);
  }, []);

  // No-op implementation to disable auto logout
  return {
    showWarning: false, // Always false to disable warning
    remainingTime,
    onStayLoggedIn
  };
};

export default useAutoLogout;
