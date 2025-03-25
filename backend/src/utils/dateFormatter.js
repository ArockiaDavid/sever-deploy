/**
 * Utility functions for formatting dates
 */

/**
 * Format a date to a readable format with AM/PM
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  if (!date) return null;
  
  try {
    // Convert to IST (UTC+5:30)
    const istDate = new Date(date);
    istDate.setHours(istDate.getHours() + 5);
    istDate.setMinutes(istDate.getMinutes() + 30);
    
    // Format date part: DD/MM/YYYY
    const day = istDate.getDate().toString().padStart(2, '0');
    const month = (istDate.getMonth() + 1).toString().padStart(2, '0');
    const year = istDate.getFullYear();
    
    // Format time part with AM/PM
    let hours = istDate.getHours();
    const minutes = istDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be displayed as 12
    
    // Return formatted date
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
}

module.exports = {
  formatDate
};
