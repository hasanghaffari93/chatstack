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

  // Google OAuth login
  const login = () => {
    // Instead of generating our own state and redirecting directly,
    // use the backend's /google-login endpoint which handles state generation
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

  // Handle OAuth redirect
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      // Get the URL search parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        try {
          // No need to verify state parameter here anymore as it's handled by the backend
          console.log('Exchanging code for tokens...');
          
          // Exchange the code for tokens via our backend
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-callback`, {
            method: 'POST',
            credentials: 'include', // Include cookies
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              state,
              redirect_uri: window.location.origin + '/login'
            }),
          });
          
          if (!response.ok) {
            // Try to get more detailed error information
            let errorDetail = response.statusText;
            try {
              const errorData = await response.json();
              if (errorData && errorData.detail) {
                errorDetail = errorData.detail;
              }
            } catch (jsonError) {
              console.error('Error parsing error response:', jsonError);
            }
            
            // Redirect to login page with error message
            const loginUrl = '/login?error=' + encodeURIComponent(errorDetail);
            window.location.href = loginUrl;
            return;
          }
          
          const userData = await response.json();
          console.log('Authentication successful!');
          
          // Save user data in state (not localStorage)
          setUser(userData);
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error during authentication:', error);
          // Redirect to login page with error message
          const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
          const loginUrl = '/login?error=' + encodeURIComponent(errorMessage);
          window.location.href = loginUrl;
        }
      }
    };
    
    handleOAuthRedirect();
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