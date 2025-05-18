/**
 * Chat Service
 * Handles all API communication related to chat functionality
 */

import { Message, Conversation, ChatResponse, ConversationMetadata } from '../app/types/chat';
import { handleApiError } from '../utils/errorHandling';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Fetches metadata for all conversations (titles and timestamps only)
 */
export async function fetchConversationMetadata(): Promise<ConversationMetadata[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/metadata`);
    if (!response.ok) throw new Error('Failed to fetch conversation metadata');
    const data = await response.json();
    return data.conversations;
  } catch (error) {
    handleApiError(error, 'fetchConversationMetadata');
    return [];
  }
}

/**
 * Fetches a specific conversation by ID including all messages
 */
export async function fetchConversationById(conversationId: string): Promise<Conversation | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`);
    if (!response.ok) throw new Error('Failed to fetch conversation');
    const data = await response.json();
    return data.conversation;
  } catch (error) {
    handleApiError(error, 'fetchConversationById');
    return null;
  }
}

/**
 * Fetches all conversations from the API
 * @deprecated Use fetchConversationMetadata instead
 */
export async function fetchConversations(): Promise<Conversation[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations`);
    if (!response.ok) throw new Error('Failed to fetch conversations');
    const data = await response.json();
    return data.conversations;
  } catch (error) {
    handleApiError(error, 'fetchConversations');
    return [];
  }
}

/**
 * Sends a chat message to the API
 */
export async function sendMessage(content: string, conversationId: string | null): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      conversation_id: conversationId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${errorText}`);
  }

  return await response.json();
}