'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type User = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Key for localStorage to track authentication status
const AUTH_STATUS_KEY = 'chatstack_auth_status';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to refresh the token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  // Setup token refresh interval
  useEffect(() => {
    if (!user) return;

    // Refresh token every 45 minutes (before the 60-minute expiration)
    const refreshInterval = setInterval(async () => {
      const success = await refreshToken();
      if (!success) {
        // If refresh fails, log the user out
        logout();
      }
    }, 45 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [user, refreshToken]);

  // Check if cookie is valid and user is authenticated
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include', // Important: include cookies in the request
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // Store authentication status in localStorage
        localStorage.setItem(AUTH_STATUS_KEY, 'authenticated');
      } else {
        // If auth check fails, set user to null and update localStorage
        setUser(null);
        localStorage.setItem(AUTH_STATUS_KEY, 'unauthenticated');
      }
    } catch (error) {
      // Error checking auth status, assume not authenticated
      setUser(null);
      localStorage.setItem(AUTH_STATUS_KEY, 'unauthenticated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial auth check on component mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle cross-tab authentication sync
  useEffect(() => {
    // Listen for storage events (logout in other tabs)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === AUTH_STATUS_KEY) {
        if (event.newValue === 'unauthenticated' && user !== null) {
          // Another tab logged out, update this tab
          setUser(null);
        } else if (event.newValue === 'authenticated' && user === null) {
          // Another tab logged in, recheck auth status
          checkAuth();
        }
      }
    };

    // Also periodically check auth status to detect cookie expiration
    const authCheckInterval = setInterval(() => {
      checkAuth();
    }, 60 * 1000); // Check every minute

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(authCheckInterval);
    };
  }, [user, checkAuth]);

  // Google OAuth login - redirect to backend for OAuth flow
  const login = () => {
    // The backend now handles the entire OAuth flow including PKCE
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-login`;
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include cookies
      });
      setUser(null);
      // Update localStorage to notify other tabs
      localStorage.setItem(AUTH_STATUS_KEY, 'unauthenticated');
      // We don't redirect the user after logout, allowing them to stay on the main page
    } catch (error) {
      // Handle logout error silently
    }
  };

  // Handle errors from OAuth flow redirects
  useEffect(() => {
    const handleLoginErrors = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      
      if (error) {
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    
    handleLoginErrors();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated: !!user, 
      login, 
      logout,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 