'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Message, ConversationMetadata } from '../app/types/chat';
import { fetchConversationMetadata, fetchConversationById, sendMessage } from '../services';
import { useErrorHandler } from './useErrorHandler';
import { useRouter } from 'next/navigation';

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

  // Fetch conversation metadata on mount
  useEffect(() => {
    loadConversationMetadata();
  }, []);

  const loadConversationMetadata = async () => {
    try {
      const data = await fetchConversationMetadata();
      setConversationMetadata(data);
    } catch (err) {
      handleError(err, 'loadConversationMetadata');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message to state immediately
    setMessages((prev) => [...prev, { content, isUser: true }]);
    setIsLoading(true);
    clearError();

    try {
      const data = await sendMessage(content, conversationId);
      
      // Set new conversation ID and update URL if this is a new conversation
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
        router.push(`/chat/${data.conversation_id}`);
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
    setIsLoading(true);
    clearError();
    
    try {
      const conversation = await fetchConversationById(id);
      if (!conversation) {
        throw new Error('Conversation not found');
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