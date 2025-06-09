/**
 * ChatInput Component
 * Handles user input for sending messages
 * Supports RTL languages like Persian, Arabic, Hebrew, and Urdu
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks';
import ModelSelector from './ModelSelector';
import SystemPromptModal from './SystemPromptModal';
import { fetchSystemPrompt, saveSystemPrompt } from '../../services/chatService';
import { useRTLTextInfo } from '../../components/RTLText';

interface ChatInputProps {
  onSendMessage: (message: string, model?: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [showLoginNotification, setShowLoginNotification] = useState(false);
  const [isSystemPromptModalOpen, setIsSystemPromptModalOpen] = useState(false);
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isAuthenticated } = useAuth();

  // RTL detection for input text
  const rtlInfo = useRTLTextInfo(input);

  // Load system prompt when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSystemPrompt();
    }
  }, [isAuthenticated]);

  const loadSystemPrompt = async () => {
    try {
      const prompt = await fetchSystemPrompt();
      setCurrentSystemPrompt(prompt);
    } catch (error) {
      console.error('Error loading system prompt:', error);
    }
  };

  const handleSaveSystemPrompt = async (prompt: string) => {
    try {
      await saveSystemPrompt(prompt);
      setCurrentSystemPrompt(prompt);
    } catch (error) {
      console.error('Error saving system prompt:', error);
      throw error;
    }
  };

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

    onSendMessage(input, selectedModel);
    setInput('');
    
    // Reset textarea height and scroll state
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '44px';
      textareaRef.current.scrollTop = 0;
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
  };

  return (
    <div className="relative transition-all duration-300 ease-in-out">
      {showLoginNotification && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 shadow-sm text-sm animate-fadeIn">
          You must be logged in to send messages. Please log in first.
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative">
        <div className="border border-[var(--input-border)] bg-[var(--input-bg)] rounded-lg shadow-sm transition-all duration-300 ease-in-out overflow-visible">
          {/* Main input area */}
          <textarea
            value={input}
            ref={textareaRef}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={isAuthenticated ? "Message ChatStack..." : "Log in to send messages..."}
            className="w-full p-3 bg-transparent focus:outline-none text-[var(--foreground)] placeholder-opacity-60 resize-none min-h-[44px] max-h-[200px] overflow-y-hidden text-sm transition-all duration-300 ease-in-out"
            disabled={isLoading}
            rows={1}
            dir={rtlInfo.direction}
            style={{
              height: '44px',
              minHeight: '44px',
              maxHeight: '200px',
              overflowY: input.length > 0 ? 'auto' : 'hidden',
              textAlign: rtlInfo.isRTL ? 'right' : 'left',
              fontFamily: rtlInfo.fontFamily || undefined,
              unicodeBidi: rtlInfo.hasRTL ? 'embed' : undefined,
            }}
          />
          
          {/* Bottom row with model selector, system prompt button, and send button */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-2">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                disabled={isLoading || !isAuthenticated}
              />
              
              <button
                type="button"
                onClick={() => setIsSystemPromptModalOpen(true)}
                disabled={isLoading || !isAuthenticated}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[var(--foreground)] bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md hover:bg-[var(--sidebar-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={currentSystemPrompt ? "System prompt is set" : "Set system prompt"}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                <span className="truncate max-w-[80px]">
                  System Prompt
                </span>
                {currentSystemPrompt && (
                  <div className="w-2 h-2 bg-[var(--primary)] rounded-full" title="System prompt is set" />
                )}
              </button>
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-md text-[var(--primary)] hover:bg-[var(--sidebar-hover)] disabled:opacity-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </form>

      {/* System Prompt Modal */}
      <SystemPromptModal
        isOpen={isSystemPromptModalOpen}
        onClose={() => setIsSystemPromptModalOpen(false)}
        onSave={handleSaveSystemPrompt}
        currentPrompt={currentSystemPrompt}
      />
    </div>
  );
}