/**
 * useChatUI Hook
 * Custom hook to manage UI-specific state for the chat interface
 */

import { useState, useEffect, useRef } from 'react';
import { useAspectRatio } from './useAspectRatio';

export function useChatUI() {
  // Get mobile state for initial sidebar state
  const { hasAspectRatioChanged, isMobile } = useAspectRatio();
  const hasHydratedRef = useRef(false);
  
  // Initialize sidebar state - closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // For SSR compatibility, default to true, then adjust in useEffect
    if (typeof window === 'undefined') {
      return true;
    }
    // Close sidebar by default on mobile devices
    return window.innerWidth > 768;
  });

  /**
   * Toggles the sidebar open/closed state
   */
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  /**
   * Closes the sidebar
   */
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  /**
   * Effect to handle initial mobile state (for SSR compatibility)
   * Only runs once on initial hydration
   */
  useEffect(() => {
    // Only adjust on first hydration, not on subsequent changes
    if (!hasHydratedRef.current && isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    hasHydratedRef.current = true;
  }, [isMobile]); // Removed isSidebarOpen from dependencies

  /**
   * Effect to handle aspect ratio changes and close sidebar on mobile
   */
  useEffect(() => {
    // Close sidebar when aspect ratio changes on mobile devices
    if (hasAspectRatioChanged && isMobile) {
      closeSidebar();
    }
  }, [hasAspectRatioChanged, isMobile]);

  return {
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
  };
}