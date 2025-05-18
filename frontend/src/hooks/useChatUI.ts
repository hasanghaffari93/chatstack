/**
 * useChatUI Hook
 * Custom hook to manage UI-specific state for the chat interface
 */

import { useState } from 'react';

export function useChatUI() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  /**
   * Toggles the sidebar open/closed state
   */
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return {
    isSidebarOpen,
    toggleSidebar,
  };
}