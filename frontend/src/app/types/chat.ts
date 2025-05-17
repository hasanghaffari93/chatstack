export interface Message {
  content: string;
  isUser: boolean;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  timestamp: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

export interface ChatResponse {
  response: string;
  conversation_id: string;
}
