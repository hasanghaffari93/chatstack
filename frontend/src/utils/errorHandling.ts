/**
 * Error Handling Utilities
 * Provides consistent error handling patterns across the application
 */

/**
 * Standard error handler for API requests
 * @param error The error object caught in the try/catch block
 * @param context Optional context information about where the error occurred
 * @returns A standardized error message
 */
export function handleApiError(error: unknown, context?: string): string {
  if (error instanceof Error) {
    // Handle standard Error objects
    return error.message || 'An unexpected error occurred';
  } else if (typeof error === 'string') {
    // Handle string errors
    return error;
  } else {
    // Handle unknown error types
    return 'An unexpected error occurred';
  }
}

/**
 * Creates a user-friendly error message for display in the UI
 * @param errorMessage The error message to display
 * @returns A user-friendly error message
 */
export function createUserFriendlyErrorMessage(errorMessage: string): string {
  // Map common error messages to user-friendly versions
  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network Error')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  if (errorMessage.includes('Timeout')) {
    return 'The server is taking too long to respond. Please try again later.';
  }
  
  // Default message for other errors
  return errorMessage || 'Sorry, something went wrong. Please try again.';
}