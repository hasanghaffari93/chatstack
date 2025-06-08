/**
 * SystemPromptModal Component
 * Modal for users to set their system prompt
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';

interface SystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: string) => void;
  currentPrompt?: string;
}

export default function SystemPromptModal({ isOpen, onClose, onSave, currentPrompt = '' }: SystemPromptModalProps) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setPrompt(currentPrompt);
  }, [currentPrompt, isOpen]);

  const handleSave = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      await onSave(prompt);
      onClose();
    } catch (error) {
      console.error('Error saving system prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPrompt(currentPrompt);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--input-border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">System Prompt</h2>
          <button
            onClick={handleCancel}
            className="p-1 rounded-md hover:bg-[var(--sidebar-hover)] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-[var(--foreground)] opacity-70 mb-2">
              Set a system prompt that will be used for all your conversations. This helps define the AI's behavior and personality.
            </p>
            <p className="text-xs text-[var(--foreground)] opacity-50">
              Leave empty to use the default system behavior.
            </p>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your system prompt here... (e.g., 'You are a helpful assistant that always responds in a friendly and professional manner.')"
            className="w-full h-40 p-3 bg-[var(--background)] border border-[var(--input-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] placeholder-opacity-60 resize-none text-sm"
            disabled={isLoading}
          />

          <div className="text-xs text-[var(--foreground)] opacity-50 mt-2">
            {prompt.length} characters
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--input-border)]">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--sidebar-hover)] rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 