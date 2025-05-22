"use client";

import ChatSidebar from "./components/ChatSidebar";
import ChatInput from "./components/ChatInput";
import MessageList from "./components/MessageList";
import ErrorMessage from "./components/ErrorMessage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import { useChat, useChatUI, useAuth } from "../hooks";


export default function Home() {
  // Use the custom UI hook to manage UI-specific state
  const { isSidebarOpen, toggleSidebar } = useChatUI();
  const { isAuthenticated } = useAuth();
  
  // Use the custom chat hook to manage chat state and functionality
  const {
    messages,
    isLoading,
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
    <ProtectedRoute requireAuth={false}>
      <main className="flex min-h-screen bg-[var(--background)]">
        <div className={`sidebar-container transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-0 overflow-hidden'}`}>
          <ChatSidebar
            conversations={conversationMetadata}
            activeConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />
        </div>
        
        <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
          <div className="w-full bg-[var(--chat-bg)] overflow-hidden flex flex-col h-screen">
            <Header 
              isSidebarOpen={isSidebarOpen} 
              onToggleSidebar={toggleSidebar} 
            />

            {error && <div className="px-4 md:px-8 lg:px-16 xl:px-32 pt-4 transition-all duration-300 ease-in-out">
               <ErrorMessage message={error} />
             </div>}
             <MessageList messages={messages} isLoading={isLoading} />

            <div className="px-4 md:px-8 lg:px-16 xl:px-32 pb-4 pt-2 transition-all duration-300 ease-in-out">
              <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
              <Footer />
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
