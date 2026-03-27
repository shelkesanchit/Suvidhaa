/**
 * useServiceAutoOpen Hook
 *
 * Helper hook for service pages to automatically open service dialogs
 * when navigated via voice commands or URL parameters.
 *
 * Usage in service pages:
 * ```jsx
 * const { autoOpenServiceId, clearAutoOpen } = useServiceAutoOpen();
 *
 * useEffect(() => {
 *   if (autoOpenServiceId) {
 *     setSelectedService(autoOpenServiceId);
 *     setDialogOpen(true);
 *     clearAutoOpen();
 *   }
 * }, [autoOpenServiceId]);
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook to handle auto-opening services based on URL parameters
 *
 * @returns {Object} - { autoOpenServiceId, clearAutoOpen }
 */
export function useServiceAutoOpen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [autoOpenServiceId, setAutoOpenServiceId] = useState(null);

  // Check for service parameter in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const serviceParam = searchParams.get('service');

    if (serviceParam) {
      setAutoOpenServiceId(serviceParam);
    }
  }, [location.search]);

  /**
   * Clear the auto-open service and remove URL parameter
   */
  const clearAutoOpen = useCallback(() => {
    setAutoOpenServiceId(null);

    // Remove the service parameter from URL without navigation
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has('service')) {
      searchParams.delete('service');
      const newSearch = searchParams.toString();
      const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;

      // Replace URL without triggering navigation
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search, location.pathname]);

  return {
    autoOpenServiceId,
    clearAutoOpen,
  };
}

export default useServiceAutoOpen;
