/**
 * useChat Hook
 * Custom hook to manage chat state and functionality
 */

import { useState, useEffect } from 'react';
import { Message, Conversation } from '../app/types/chat';
import { fetchConversations, sendMessage } from '../services';
import { useErrorHandler } from './useErrorHandler';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { error, handleError, clearError } = useErrorHandler();

  // Fetch conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  /**
   * Loads all conversations from the API
   */
  const loadConversations = async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (err) {
      handleError(err, 'loadConversations');
    }
  };

  /**
   * Handles sending a new message
   */
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message to state immediately
    setMessages((prev) => [...prev, { content, isUser: true }]);
    setIsLoading(true);
    clearError();

    try {
      const data = await sendMessage(content, conversationId);
      setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        { content: data.response, isUser: false },
      ]);
      
      // Refresh conversations after sending a message
      loadConversations();
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

  /**
   * Starts a new chat conversation
   */
  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    clearError();
  };

  /**
   * Selects an existing conversation
   */
  const handleSelectConversation = (id: string) => {
    const conversation = conversations.find((c) => c.id === id);
    if (!conversation) return;

    setConversationId(id);
    setMessages(
      conversation.messages.map((msg) => ({
        content: msg.content,
        isUser: msg.role === "user",
      }))
    );
    clearError();
  };

  return {
    messages,
    isLoading,
    conversationId,
    conversations,
    error,
    handleSendMessage,
    handleNewChat,
    handleSelectConversation,
  };
}