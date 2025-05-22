/**
 * MessageList Component
 * Displays a list of chat messages with automatic scrolling
 */

import { useRef, useEffect } from 'react';
import { Message } from '../types/chat';
import ChatMessage from './ChatMessage';
import Loading from './Loading';
import { useAuth } from '../../hooks';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto py-4 px-4 md:px-8 lg:px-16 xl:px-32 space-y-6 transition-all duration-300 ease-in-out">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">ChatStack</h2>
            <p className="text-sm opacity-60">How can I help you today?</p>
          </div>
        </div>
      )}
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message} />
      ))}
      {isLoading && isAuthenticated && (
        <div className="flex items-start justify-start px-4">
          <div className="bg-[var(--bot-message-bg)] border border-[var(--input-border)] p-4 rounded-2xl">
            <Loading />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}