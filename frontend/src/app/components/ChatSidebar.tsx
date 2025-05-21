import { ConversationMetadata } from '../types/chat';
import { useAuth } from '../../hooks';
import { useState } from 'react';

interface ChatSidebarProps {
  conversations: ConversationMetadata[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => Promise<void>;
  onNewChat: () => void;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ChatSidebarProps) {
  const { isAuthenticated } = useAuth();
  const [showLoginNotification, setShowLoginNotification] = useState(false);

  const handleNewChat = () => {
    if (!isAuthenticated) {
      setShowLoginNotification(true);
      // Hide notification after 3 seconds
      setTimeout(() => setShowLoginNotification(false), 3000);
      return;
    }
    onNewChat();
  };

  const handleSelectConversation = (conversationId: string) => {
    if (!isAuthenticated) {
      setShowLoginNotification(true);
      setTimeout(() => setShowLoginNotification(false), 3000);
      return;
    }

    // Only trigger selection if it's different from current active conversation
    if (conversationId !== activeConversationId) {
      console.log('Sidebar selecting conversation:', conversationId);
      onSelectConversation(conversationId);
    }
  };

  return (
    <div className="w-64 bg-[var(--sidebar-bg)] text-[var(--foreground)] p-2 flex flex-col h-screen border-r border-[var(--input-border)]">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-2 py-3 relative">
          {showLoginNotification && (
            <div className="absolute top-14 left-4 right-4 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 shadow-sm text-sm z-10 animate-fadeIn">
              You must be logged in to create new chats. Please log in first.
            </div>
          )}
          <button
            onClick={handleNewChat}
            className="w-full mb-1 px-3 py-3 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-3 text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New chat
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1 px-2">
          <div className="text-xs font-medium text-[var(--foreground)] opacity-60 px-3 py-2">Today</div>
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation.id)}
              className={`w-full p-3 text-left rounded-md hover:bg-[var(--sidebar-hover)] transition-colors text-sm ${
                activeConversationId === conversation.id ? 'bg-[var(--sidebar-active)]' : ''
              }`}
            >
              <div className="font-medium truncate">{conversation.title}</div>
              <div className="text-xs opacity-60 truncate mt-1">
                {new Date(conversation.updated_at).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
