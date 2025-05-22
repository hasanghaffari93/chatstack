/**
 * ChatInput Component
 * Handles user input for sending messages
 */

import { useState, useRef } from 'react';
import { useAuth } from '../../hooks';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showLoginNotification, setShowLoginNotification] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isAuthenticated } = useAuth();

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!isAuthenticated) {
      setShowLoginNotification(true);
      // Hide notification after 3 seconds
      setTimeout(() => setShowLoginNotification(false), 3000);
      return;
    }

    onSendMessage(input);
    setInput('');
    
    // Reset textarea height and scroll state
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '44px';
      textareaRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="relative transition-all duration-300 ease-in-out">
      {showLoginNotification && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 shadow-sm text-sm animate-fadeIn">
          You must be logged in to send messages. Please log in first.
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative">
        <div className="border border-[var(--input-border)] bg-[var(--input-bg)] rounded-lg overflow-hidden shadow-sm transition-all duration-300 ease-in-out">
          <textarea
            value={input}
            ref={textareaRef}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={isAuthenticated ? "Message ChatStack..." : "Log in to send messages..."}
            className="w-full p-3 pr-12 bg-transparent focus:outline-none text-[var(--foreground)] placeholder-opacity-60 resize-none min-h-[44px] max-h-[200px] overflow-y-hidden text-sm transition-all duration-300 ease-in-out"
            disabled={isLoading}
            rows={1}
            style={{
              height: '44px',
              minHeight: '44px',
              maxHeight: '200px',
              overflowY: input.length > 0 ? 'auto' : 'hidden'
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 bottom-2 p-1.5 rounded-md text-[var(--primary)] hover:bg-[var(--sidebar-hover)] disabled:opacity-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}