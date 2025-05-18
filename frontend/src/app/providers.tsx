'use client';

import { ReactNode } from 'react';
import { ChatProvider } from '../hooks';

export function ChatProviderWrapper({ children }: { children: ReactNode }) {
  return <ChatProvider>{children}</ChatProvider>;
} 