/**
 * Chat Service
 * Handles all API communication related to chat functionality
 */

import { Message, Conversation, ChatResponse, ConversationMetadata } from '../app/types/chat';
import { handleApiError } from '../utils/errorHandling';

// Get base URL from environment without /api suffix
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Append /api to form the actual API base URL
const API_BASE_URL = `${BASE_URL}/api`;

// Log the API base URL for debugging
console.log('API_BASE_URL:', API_BASE_URL);

// Default fetch options with credentials to include cookies for authentication
const defaultFetchOptions = {
  credentials: 'include' as RequestCredentials,
  headers: {
    'Content-Type': 'application/json',
  }
};

/**
 * Fetches metadata for all conversations (titles and timestamps only)
 */
export async function fetchConversationMetadata(): Promise<ConversationMetadata[]> {
  try {
    // Correctly construct the API URL
    const url = `${API_BASE_URL}/conversations/metadata`;
    console.log('Fetching conversation metadata from:', url);
    
    const response = await fetch(url, defaultFetchOptions);
    
    // If user is not authenticated, return empty array instead of throwing an error
    if (response.status === 401) {
      console.log('User not authenticated. Please log in to view conversations.');
      return [];
    }
    
    // Handle 404 - This usually means the user has no conversations yet
    if (response.status === 404) {
      console.log('No conversations found. This is normal for new users.');
      return [];
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch conversation metadata: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    // Ensure we always return an array, even if the backend response doesn't include conversations
    return data?.conversations || [];
  } catch (error) {
    console.error('Error fetching conversation metadata:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

/**
 * Fetches a specific conversation by ID including all messages
 */
export async function fetchConversationById(conversationId: string): Promise<Conversation | null> {
  try {
    // Correctly construct the API URL
    const url = `${API_BASE_URL}/conversations/${conversationId}`;
    console.log('Fetching conversation by ID from:', url);
    
    const response = await fetch(url, defaultFetchOptions);
    
    // If user is not authenticated, return null instead of throwing an error
    if (response.status === 401) {
      console.log('User not authenticated. Please log in to view this conversation.');
      return null;
    }
    
    // Handle 404 - This means the conversation wasn't found
    if (response.status === 404) {
      console.log(`Conversation ${conversationId} not found.`);
      return null;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch conversation: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    return data.conversation;
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    return null;
  }
}

/**
 * Fetches all conversations from the API
 * @deprecated Use fetchConversationMetadata instead
 */
export async function fetchConversations(): Promise<Conversation[]> {
  try {
    // Correctly construct the API URL
    const url = `${API_BASE_URL}/conversations`;
    console.log('Fetching all conversations from:', url);
    
    const response = await fetch(url, defaultFetchOptions);
    
    // If user is not authenticated, return empty array instead of throwing an error
    if (response.status === 401) {
      console.log('User not authenticated. Please log in to view conversations.');
      return [];
    }
    
    // Handle 404 - This usually means the user has no conversations yet
    if (response.status === 404) {
      console.log('No conversations found. This is normal for new users.');
      return [];
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch conversations: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    // Ensure we always return an array, even if the backend response doesn't include conversations
    return data?.conversations || [];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

/**
 * Sends a chat message to the API
 */
export async function sendMessage(content: string, conversationId: string | null): Promise<ChatResponse> {
  try {
    // Correctly construct the API URL
    const url = `${API_BASE_URL}/chat`;
    console.log('Sending message to API:', url);
    
    const payload = {
      content,
      conversation_id: conversationId
    };
    console.log('Request payload:', payload);
    
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Log the response status for debugging
    console.log('API response status:', response.status, response.statusText);

    if (response.status === 401) {
      throw new Error('You must be logged in to send messages');
    }

    // Handle 404 - Most likely the API endpoint is not found
    if (response.status === 404) {
      console.error('API endpoint not found:', url);
      throw new Error('API endpoint not found. Please check server configuration.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      
      let errorDetail = 'API request failed';
      
      try {
        // Try to parse as JSON to get the detailed error message
        const errorData = JSON.parse(errorText);
        if (errorData.detail) {
          errorDetail = errorData.detail;
        }
      } catch (e) {
        // If parsing fails, use the raw error text
        errorDetail = errorText || response.statusText;
      }
      
      throw new Error(errorDetail);
    }

    const responseData = await response.json();
    console.log('API response data:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error sending message:', error);
    // Rethrow the error to let the caller handle it
    throw error;
  }
}