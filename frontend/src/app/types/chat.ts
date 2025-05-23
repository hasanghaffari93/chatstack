export interface Message {
  content: string;
  isUser: boolean;
  timestamp?: string;
}

export interface ConversationMetadata {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;  // Renamed from timestamp to match backend
  user_id: string;     // Added user_id field
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;  // Renamed from timestamp to match backend
  user_id: string;     // Added user_id field
  messages: Array<{
    role: string;
    content: string;
  }>;
}

export interface ChatResponse {
  response: string;
  conversation_id: string;
  model_used?: string;  // Optional field for the model used in the response
}
