/**
 * ModelSelector Component
 * Provides a dropdown for selecting OpenAI models
 */

import { useState, useEffect, useRef } from 'react';
import { fetchAvailableModels } from '../../services/chatService';

interface Model {
  id: string;
  name: string;
  description: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({ selectedModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownPosition, setDropdownPosition] = useState<{ 
    top?: number | 'auto'; 
    bottom?: number | 'auto'; 
    left: number 
  }>({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        const availableModels = await fetchAvailableModels();
        setModels(availableModels);
      } catch (_error) {
        // Fallback to default models
        setModels([
          {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "description": "Fast and efficient"},
          {"id": "gpt-4", "name": "GPT-4", "description": "Most capable model"}
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 240; // max-h-60 = 240px
      
      // Calculate if there's enough space above, otherwise position below
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      
      if (spaceAbove >= dropdownHeight || spaceAbove > spaceBelow) {
        // Position above the button
        setDropdownPosition({
          bottom: viewportHeight - rect.top + 8,
          left: rect.left
        });
      } else {
        // Position below the button
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left
        });
      }
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedModelData = models.find(model => model.id === selectedModel);

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[var(--foreground)] bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md opacity-50"
      >
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        Loading...
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[var(--foreground)] bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md hover:bg-[var(--sidebar-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4"/>
          <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
          <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
          <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/>
          <path d="M12 21c0-1-1-3-3-3s-3 2-3 3 1 3 3 3 3-2 3-3"/>
        </svg>
        <span className="truncate max-w-[100px]">
          {selectedModelData?.name || selectedModel}
        </span>
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {isOpen && (
        <div 
          className="fixed w-64 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
          style={{
            ...(dropdownPosition.top !== undefined && { top: dropdownPosition.top }),
            ...(dropdownPosition.bottom !== undefined && { bottom: dropdownPosition.bottom }),
            left: dropdownPosition.left
          }}
        >
          <div className="p-2">
            <div className="text-xs font-medium text-[var(--foreground)] opacity-70 mb-2 px-2">
              Select Model
            </div>
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedModel === model.id
                    ? 'bg-[var(--primary)] text-white'
                    : 'hover:bg-[var(--sidebar-hover)] text-[var(--foreground)]'
                }`}
              >
                <div className="font-medium">{model.name}</div>
                <div className="text-xs opacity-70 mt-0.5">{model.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 