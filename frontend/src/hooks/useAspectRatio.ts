/**
 * useAspectRatio Hook
 * Custom hook to detect aspect ratio changes
 */

import { useState, useEffect } from 'react';

interface AspectRatioState {
  aspectRatio: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isMobile: boolean;
}

export function useAspectRatio() {
  const [aspectRatioState, setAspectRatioState] = useState<AspectRatioState>(() => {
    if (typeof window === 'undefined') {
      return {
        aspectRatio: 1,
        isPortrait: false,
        isLandscape: true,
        isMobile: false,
      };
    }

    const aspectRatio = window.innerWidth / window.innerHeight;
    const isMobile = window.innerWidth <= 768;
    
    return {
      aspectRatio,
      isPortrait: aspectRatio < 1,
      isLandscape: aspectRatio >= 1,
      isMobile,
    };
  });

  const [previousAspectRatio, setPreviousAspectRatio] = useState(aspectRatioState.aspectRatio);

  useEffect(() => {
    const updateAspectRatio = () => {
      const aspectRatio = window.innerWidth / window.innerHeight;
      const isMobile = window.innerWidth <= 768;
      
      const newState = {
        aspectRatio,
        isPortrait: aspectRatio < 1,
        isLandscape: aspectRatio >= 1,
        isMobile,
      };

      setAspectRatioState(newState);
      setPreviousAspectRatio(aspectRatioState.aspectRatio);
    };

    // Listen for both resize and orientation change events
    window.addEventListener('resize', updateAspectRatio);
    window.addEventListener('orientationchange', updateAspectRatio);

    return () => {
      window.removeEventListener('resize', updateAspectRatio);
      window.removeEventListener('orientationchange', updateAspectRatio);
    };
  }, [aspectRatioState.aspectRatio]);

  // Check if aspect ratio has changed significantly (threshold to avoid minor changes)
  const hasAspectRatioChanged = Math.abs(aspectRatioState.aspectRatio - previousAspectRatio) > 0.1;

  return {
    ...aspectRatioState,
    hasAspectRatioChanged,
    previousAspectRatio,
  };
} 