'use client';

import { useAuth } from '../../hooks';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--foreground)]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
      <div className="w-full max-w-md p-8 space-y-8 bg-[var(--chat-bg)] rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Welcome to ChatStack</h1>
          <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
            Sign in to continue to your account
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="flex justify-center">
            <GoogleLoginButton />
          </div>
        </div>
      </div>
    </div>
  );
} 