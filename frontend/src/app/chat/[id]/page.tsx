"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import ChatSidebar from "../../components/ChatSidebar";
import ChatInput from "../../components/ChatInput";
import MessageList from "../../components/MessageList";
import ErrorMessage from "../../components/ErrorMessage";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useChat, useChatUI, useAuth } from "../../../hooks";

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.id as string;
  const { isAuthenticated } = useAuth();
  
  // Use the custom UI hook to manage UI-specific state
  const { isSidebarOpen, toggleSidebar } = useChatUI();
  
  // Use the custom chat hook to manage chat state and functionality
  const {
    messages,
    isLoading: chatLoading,
    conversationId,
    conversationMetadata,
    error,
    handleSendMessage,
    handleNewChat,
    handleSelectConversation
  } = useChat();

  // Handle sending messages from the input component
  const onSendMessage = async (message: string) => {
    await handleSendMessage(message);
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <main className="flex min-h-screen bg-[var(--background)] relative">
        {/* Desktop sidebar - takes space and pushes content */}
        <div className={`sidebar-container hidden md:block transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-0 overflow-hidden'}`}>
          <ChatSidebar
            conversations={conversationMetadata}
            activeConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />
        </div>

        {/* Mobile sidebar - overlays content */}
        <div className={`fixed top-0 left-0 h-full w-[var(--sidebar-width)] z-50 md:hidden transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <ChatSidebar
            conversations={conversationMetadata}
            activeConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />
        </div>

        {/* Mobile backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={toggleSidebar}
          />
        )}
        
        <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
          <div className="w-full bg-[var(--chat-bg)] overflow-hidden flex flex-col h-screen">
            <Header 
              isSidebarOpen={isSidebarOpen} 
              onToggleSidebar={toggleSidebar} 
            />

            {error && <div className="px-4 md:px-8 lg:px-16 xl:px-32 pt-4 transition-all duration-300 ease-in-out">
              <ErrorMessage message={error} />
            </div>}
            <MessageList messages={messages} isLoading={chatLoading} />

            <div className="px-4 md:px-8 lg:px-16 xl:px-32 pb-4 pt-2 transition-all duration-300 ease-in-out">
              <ChatInput onSendMessage={onSendMessage} isLoading={chatLoading} />
              <Footer />
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
} 