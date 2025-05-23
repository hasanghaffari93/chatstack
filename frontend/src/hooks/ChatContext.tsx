'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Message, ConversationMetadata } from '../app/types/chat';
import { fetchConversationMetadata, fetchConversationById, sendMessage } from '../services';
import { useErrorHandler } from './useErrorHandler';
import { useAuth } from './AuthContext';

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  conversationId: string | null;
  conversationMetadata: ConversationMetadata[];
  error: string | null;
  handleSendMessage: (content: string, model?: string) => Promise<void>;
  handleNewChat: () => void;
  handleSelectConversation: (id: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationMetadata, setConversationMetadata] = useState<ConversationMetadata[]>([]);
  const { error, handleError, clearError } = useErrorHandler();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Refs to track conversation state
  const isMountedRef = useRef(true);
  const activeSelectionRef = useRef<string | null>(null);
  const lastUrlChangeRef = useRef<string | null>(null);
  
  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Check for URL changes on each render
  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;
    
    // Extract conversation ID from URL if on chat page
    const path = window.location.pathname;
    const match = path.match(/\/chat\/([^\/]+)/);
    const urlConversationId = match ? match[1] : null;
    
    // Skip if we just changed the URL to this value to avoid loops
    if (urlConversationId === lastUrlChangeRef.current) {
      lastUrlChangeRef.current = null;
      return;
    }
    
    // If URL has a conversation ID and it doesn't match our state
    if (urlConversationId && urlConversationId !== conversationId && isAuthenticated) {
      // Only load if we're not already loading this conversation
      if (activeSelectionRef.current !== urlConversationId) {
        console.log('Loading conversation from URL change:', urlConversationId);
        // Use internal method to avoid URL manipulation
        loadConversation(urlConversationId);
      }
    } else if (!urlConversationId && conversationId && path === '/') {
      // We're on the home page but have a conversation loaded - reset
      console.log('Resetting conversation from URL change to home page');
      resetConversation();
    }
  });
  
  // Reset conversation state without changing URL
  const resetConversation = () => {
    if (!conversationId) return; // Already reset
    
    setMessages([]);
    setConversationId(null);
    clearError();
  };
  
  // Internal method to load conversation data without URL manipulation
  const loadConversation = async (id: string) => {
    if (!isAuthenticated) {
      // If not authenticated, clear conversation state
      setMessages([]);
      setConversationId(null);
      clearError();
      return;
    }
    
    if (id === conversationId) return;
    if (activeSelectionRef.current === id) return;
    
    activeSelectionRef.current = id;
    setIsLoading(true);
    clearError();
    
    try {
      const conversation = await fetchConversationById(id);
      
      // If component unmounted or we're already loading something else, bail out
      if (!isMountedRef.current || activeSelectionRef.current !== id) return;
      
      if (!conversation) {
        console.log('Conversation not found:', id);
        resetConversation();
        return;
      }
      
      // Update state all at once to avoid React reconciliation issues
      setConversationId(id);
      setMessages(
        conversation.messages.map((msg) => ({
          content: msg.content,
          isUser: msg.role === "user",
        }))
      );
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error loading conversation:', err);
        handleError(err, 'loadConversation');
      }
    } finally {
      if (isMountedRef.current && activeSelectionRef.current === id) {
        setIsLoading(false);
        activeSelectionRef.current = null;
      }
    }
  };
  
  // Fetch conversation metadata on mount and when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      loadConversationMetadata();
      
      // If we have a conversation ID in the URL, load it
      const path = window.location.pathname;
      const match = path.match(/\/chat\/([^\/]+)/);
      const urlConversationId = match ? match[1] : null;
      
      if (urlConversationId) {
        loadConversation(urlConversationId);
      }
    } else {
      // Clear conversations if not authenticated
      setConversationMetadata([]);
      setMessages([]);
      setConversationId(null);
      setIsLoading(false); // Ensure loading is false when not authenticated
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadConversationMetadata = async () => {
    if (!isAuthenticated) {
      // Don't attempt to load conversations if not authenticated
      setConversationMetadata([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const data = await fetchConversationMetadata();
      // Even if the backend returns null, ensure we have an empty array
      setConversationMetadata(data || []);
    } catch (err) {
      // Only handle the error if it's not an authentication error
      console.error('Error loading conversations:', err);
      // Set empty array to avoid UI errors
      setConversationMetadata([]);
      handleError(err, 'loadConversationMetadata');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string, model?: string) => {
    if (!content.trim()) return;
    
    console.log('ChatContext: handleSendMessage called with model:', model);
    
    if (!isAuthenticated) {
      handleError(new Error("You must be logged in to send messages"), 'handleSendMessage');
      return;
    }

    // Add user message to state immediately
    setMessages((prev) => [...prev, { content, isUser: true }]);
    setIsLoading(true);
    clearError();

    try {
      console.log('Sending message:', content, 'to conversation:', conversationId);
      const data = await sendMessage(content, conversationId, model);
      console.log('Response received:', data);
      
      // Set new conversation ID and update URL if this is a new conversation
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
        
        // Update URL and track the change
        const newUrl = `/chat/${data.conversation_id}`;
        if (window.location.pathname !== newUrl) {
          console.log('New conversation created, updating URL to:', newUrl);
          lastUrlChangeRef.current = data.conversation_id;
          window.history.replaceState(null, '', newUrl);
        }
      }
      
      setMessages((prev) => [
        ...prev,
        { content: data.response, isUser: false },
      ]);
      
      // Refresh conversation metadata after sending a message
      loadConversationMetadata();
    } catch (err) {
      const friendlyError = handleError(err, 'handleSendMessage');
      setMessages((prev) => [
        ...prev,
        {
          content: friendlyError,
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    // If we're already on a new chat, do nothing
    if (!conversationId && window.location.pathname === '/') {
      return;
    }
    
    // Reset conversation state
    resetConversation();
    
    // Update URL directly and track the change
    if (window.location.pathname !== '/') {
      lastUrlChangeRef.current = null; // No ID for home page
      window.history.pushState(null, '', '/');
    }
  };

  // Public method for components to select a conversation
  const handleSelectConversation = async (id: string): Promise<void> => {
    // If already on this conversation, do nothing
    if (id === conversationId) return Promise.resolve();
    
    // Check authentication
    if (!isAuthenticated && !authLoading) {
      handleError(new Error("You must be logged in to view conversations"), 'handleSelectConversation');
      return Promise.resolve();
    }
    
    // Update URL and track the change to prevent loops
    const newUrl = `/chat/${id}`;
    if (window.location.pathname !== newUrl) {
      console.log('Updating URL for conversation:', id);
      lastUrlChangeRef.current = id;
      window.history.pushState(null, '', newUrl);
    }
    
    // Load the conversation data (internal method handles duplicates)
    await loadConversation(id);
    
    return Promise.resolve();
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        conversationId,
        conversationMetadata,
        error,
        handleSendMessage,
        handleNewChat,
        handleSelectConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 