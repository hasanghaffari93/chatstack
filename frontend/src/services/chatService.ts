/**
 * Chat Service
 * Handles all API communication related to chat functionality
 */

import { Conversation, ChatResponse, ConversationMetadata } from '../app/types/chat';

// Get base URL from environment without /api suffix
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Append /api to form the actual API base URL
const API_BASE_URL = `${BASE_URL}/api`;

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
    
    const response = await fetch(url, defaultFetchOptions);
    
    // If user is not authenticated, return empty array instead of throwing an error
    if (response.status === 401) {
      return [];
    }
    
    // Handle 404 - This usually means the user has no conversations yet
    if (response.status === 404) {
      return [];
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch conversation metadata: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    // Ensure we always return an array, even if the backend response doesn't include conversations
    return data?.conversations || [];
  } catch (_error) {
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
    
    const response = await fetch(url, defaultFetchOptions);
    
    // If user is not authenticated, return null instead of throwing an error
    if (response.status === 401) {
      return null;
    }
    
    // Handle 404 - This means the conversation wasn't found
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch conversation: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    return data.conversation;
  } catch (_error) {
    return null;
  }
}

/**
 * Fetches available OpenAI models from the API
 */
export async function fetchAvailableModels(): Promise<{id: string; name: string; description: string}[]> {
  try {
    const url = `${API_BASE_URL}/models`;
    
    const response = await fetch(url, defaultFetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch available models: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    return data?.models || [];
  } catch (_error) {
    // Return default models if API fails
    return [
      {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "description": "Fast and efficient"},
      {"id": "gpt-4", "name": "GPT-4", "description": "Most capable model"}
    ];
  }
}

/**
 * Sends a chat message to the API
 */
export async function sendMessage(content: string, conversationId: string | null, model?: string): Promise<ChatResponse> {
  try {
    // Correctly construct the API URL
    const url = `${API_BASE_URL}/chat`;
    
    const payload = {
      content,
      conversation_id: conversationId,
      model: model || "gpt-3.5-turbo"  // Include the selected model
    };
    
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      throw new Error('You must be logged in to send messages');
    }

    // Handle 404 - Most likely the API endpoint is not found
    if (response.status === 404) {
      throw new Error('API endpoint not found. Please check server configuration.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      
      let errorDetail = 'API request failed';
      
      try {
        // Try to parse as JSON to get the detailed error message
        const errorData = JSON.parse(errorText);
        if (errorData.detail) {
          errorDetail = errorData.detail;
        }
      } catch {
        // If parsing fails, use the raw error text
        errorDetail = errorText || response.statusText;
      }
      
      throw new Error(errorDetail);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    // Rethrow the error to let the caller handle it
    throw error;
  }
}

/**
 * Sends a chat message with streaming response
 */
export async function sendMessageStream(
  content: string, 
  conversationId: string | null, 
  onChunk: (chunk: string) => void,
  onConversationId: (id: string) => void,
  onTitle: (title: string) => void,
  onComplete: (modelUsed: string) => void,
  onError: (error: string) => void,
  model?: string
): Promise<void> {
  try {
    const url = `${API_BASE_URL}/chat/stream`;
    
    const payload = {
      content,
      conversation_id: conversationId,
      model: model || "gpt-3.5-turbo"
    };
    
    const response = await fetch(url, {
      ...defaultFetchOptions,
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        ...defaultFetchOptions.headers,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
    });

    if (response.status === 401) {
      throw new Error('You must be logged in to send messages');
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = 'API request failed';
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.detail) {
          errorDetail = errorData.detail;
        }
      } catch {
        errorDetail = errorText || response.statusText;
      }
      
      throw new Error(errorDetail);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'conversation_id':
                  onConversationId(data.conversation_id);
                  break;
                case 'content':
                  onChunk(data.content);
                  break;
                case 'title':
                  onTitle(data.title);
                  break;
                case 'done':
                  onComplete(data.model_used);
                  return;
                case 'error':
                  onError(data.error);
                  return;
              }
            } catch (_e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}
