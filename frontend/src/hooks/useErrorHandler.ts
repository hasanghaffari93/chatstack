/**
 * useErrorHandler Hook
 * Custom hook to centralize error handling logic across components
 */

import { useState } from 'react';
import { handleApiError, createUserFriendlyErrorMessage } from '../utils/errorHandling';

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles API errors and updates error state
   * @param err The error object caught in try/catch
   * @param context Optional context information about where the error occurred
   * @returns A user-friendly error message
   */
  const handleError = (err: unknown, context?: string): string => {
    const errorMessage = handleApiError(err, context);
    const friendlyError = createUserFriendlyErrorMessage(errorMessage);
    setError(friendlyError);
    return friendlyError;
  };

  /**
   * Clears the current error state
   */
  const clearError = () => {
    setError(null);
  };

  return {
    error,
    handleError,
    clearError,
  };
}