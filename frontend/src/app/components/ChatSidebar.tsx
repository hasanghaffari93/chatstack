import { Conversation } from '../types/chat';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <div className="w-64 bg-gray-800 text-white p-4 flex flex-col h-full">
      <button
        onClick={onNewChat}
        className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        New Chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-2">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full p-3 text-left rounded-lg hover:bg-gray-700 transition-colors ${
              activeConversationId === conversation.id ? 'bg-gray-700' : ''
            }`}
          >            <div className="font-medium truncate">{conversation.title}</div>
            <div className="text-sm text-gray-400 truncate">
              Created {new Date(conversation.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
