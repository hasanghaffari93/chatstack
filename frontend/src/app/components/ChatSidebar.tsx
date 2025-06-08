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
      onSelectConversation(conversationId);
    }
  };

  return (
    <div className="w-[var(--sidebar-width)] h-full bg-[var(--sidebar-bg)] text-[var(--foreground)] flex flex-col h-screen border-r border-[var(--input-border)] transition-all duration-300 ease-in-out">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header with title and new chat button */}
        <div className="p-4 border-b border-[var(--input-border)] relative">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--foreground)] opacity-80">Chat History</h2>
            <button
              onClick={handleNewChat}
              className="p-2 rounded-lg bg-transparent hover:bg-[var(--sidebar-hover)] transition-all duration-200 ease-in-out group"
              title="New chat"
              aria-label="Start new chat"
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-[var(--foreground)] opacity-70 group-hover:opacity-100 transition-opacity duration-200"
              >
                <path 
                  d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C10.269 21 8.66491 20.4923 7.31802 19.6123L3.5 21L4.88771 17.218C4.00775 15.8711 3.5 14.267 3.5 12.5C3.5 12.335 3.5055 12.1706 3.51638 12.0075" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M9 12H15M12 9V15" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          
          {showLoginNotification && (
            <div className="absolute top-16 left-4 right-4 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 shadow-sm text-sm z-10 animate-fadeIn">
              You must be logged in to create new chats. Please log in first.
            </div>
          )}
        </div>

        {/* Conversations list */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
          <div className="space-y-1">
            {conversations.length > 0 && (
              <div className="text-xs font-medium text-[var(--foreground)] opacity-60 px-3 py-2">Today</div>
            )}
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`relative group w-full rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors ${
                  activeConversationId === conversation.id ? 'bg-[var(--sidebar-active)]' : ''
                }`}
              >
                <button
                  onClick={() => handleSelectConversation(conversation.id)}
                  className="w-full p-3 text-left text-sm group-hover:pr-10 transition-all duration-200"
                >
                  <div className="font-medium truncate">{conversation.title}</div>
                  <div className="text-xs opacity-60 truncate mt-1">
                    {new Date(conversation.updated_at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </button>
                
                {/* Three dots menu icon */}
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--sidebar-hover)] transition-all duration-200 ease-in-out"
                  aria-label="More options"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Add menu functionality here
                  }}
                >
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[var(--foreground)] opacity-90"
                  >
                    <circle 
                      cx="12" 
                      cy="12" 
                      r="2.0" 
                      fill="currentColor"
                    />
                    <circle 
                      cx="12" 
                      cy="5" 
                      r="2.0" 
                      fill="currentColor"
                    />
                    <circle 
                      cx="12" 
                      cy="19" 
                      r="2.0" 
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="p-4 text-center">
                <div className="text-sm text-[var(--foreground)] opacity-60">
                  No conversations yet
                </div>
                <div className="text-xs text-[var(--foreground)] opacity-40 mt-1">
                  Start a new chat to begin
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
