'use client';

import { ReactNode } from 'react';
import { ChatProvider, AuthProvider } from '../hooks';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ChatProvider>{children}</ChatProvider>
    </AuthProvider>
  );
}

export function ChatProviderWrapper({ children }: { children: ReactNode }) {
  return <ChatProvider>{children}</ChatProvider>;
} 