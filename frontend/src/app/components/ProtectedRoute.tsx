'use client';

import { useAuth } from '../../hooks';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if authentication is explicitly required for this route
    if (!isLoading && !isAuthenticated && requireAuth) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, requireAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--foreground)]"></div>
      </div>
    );
  }

  // Always render children, even for unauthenticated users
  return <>{children}</>;
} 