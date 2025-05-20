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
      console.error('Token refresh error:', error);
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

  useEffect(() => {
    // Check if user is already authenticated by validating session cookie
    const checkAuth = async () => {
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
        }
      } catch (error) {
        console.error('Authentication error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

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
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle errors from OAuth flow redirects
  useEffect(() => {
    const handleLoginErrors = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      
      if (error) {
        console.error('Authentication error:', error);
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