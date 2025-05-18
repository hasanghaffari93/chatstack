'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
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
    // Google OAuth parameters
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    // Use a fixed redirect URI that matches what's configured in Google Cloud Console
    const redirectUri = "http://localhost:3000/login";
    const scope = 'email profile';
    
    // Construct OAuth URL with properly encoded redirect URI for authorization code flow
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline`;
    
    console.log('Redirecting to:', authUrl);
    // Redirect to Google's OAuth page
    window.location.href = authUrl;
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Handle OAuth redirect
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      // Get the URL search parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        try {
          // Exchange the code for tokens via our backend
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              redirect_uri: window.location.origin + '/login'
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Authentication failed: ${response.statusText}`);
          }
          
          const userData = await response.json();
          
          // Save user data
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error during authentication:', error);
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
      logout 
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