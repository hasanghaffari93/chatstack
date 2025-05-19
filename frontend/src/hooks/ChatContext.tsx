'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Message, ConversationMetadata } from '../app/types/chat';
import { fetchConversationMetadata, fetchConversationById, sendMessage } from '../services';
import { useErrorHandler } from './useErrorHandler';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  conversationId: string | null;
  conversationMetadata: ConversationMetadata[];
  error: string | null;
  handleSendMessage: (content: string) => Promise<void>;
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
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Fetch conversation metadata on mount and when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      loadConversationMetadata();
    } else {
      // Clear conversations if not authenticated
      setConversationMetadata([]);
      setMessages([]);
      setConversationId(null);
    }
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

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
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
      const data = await sendMessage(content, conversationId);
      console.log('Response received:', data);
      
      // Set new conversation ID and update URL if this is a new conversation
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
        router.push(`/chat/${data.conversation_id}`);
        console.log('New conversation created with ID:', data.conversation_id);
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
    setMessages([]);
    setConversationId(null);
    clearError();
    router.push('/');
  };

  const handleSelectConversation = async (id: string) => {
    if (!isAuthenticated) {
      handleError(new Error("You must be logged in to view conversations"), 'handleSelectConversation');
      return;
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const conversation = await fetchConversationById(id);
      if (!conversation) {
        // If the conversation doesn't exist, create a new conversation instead of showing an error
        console.log('Conversation not found, switching to new chat');
        handleNewChat();
        return;
      }

      setConversationId(id);
      setMessages(
        conversation.messages.map((msg) => ({
          content: msg.content,
          isUser: msg.role === "user",
        }))
      );
      
      // Update URL to reflect the selected conversation
      router.push(`/chat/${id}`);
    } catch (err) {
      console.error('Error selecting conversation:', err);
      // If there's an error selecting a conversation, create a new chat
      handleNewChat();
      handleError(err, 'handleSelectConversation');
    } finally {
      setIsLoading(false);
    }
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