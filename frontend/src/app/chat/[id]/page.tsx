"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatSidebar from "../../components/ChatSidebar";
import ChatInput from "../../components/ChatInput";
import MessageList from "../../components/MessageList";
import ErrorMessage from "../../components/ErrorMessage";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useChat, useChatUI } from "../../../hooks";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id as string;
  
  // Use the custom UI hook to manage UI-specific state
  const { isSidebarOpen, toggleSidebar } = useChatUI();
  
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

  // Load the specific conversation on mount
  useEffect(() => {
    if (chatId && chatId !== conversationId) {
      handleSelectConversation(chatId);
    }
  }, [chatId]);

  // Handle sending messages from the input component
  const onSendMessage = async (message: string) => {
    await handleSendMessage(message);
  };

  return (
    <main className="flex min-h-screen bg-[var(--background)]">
      {isSidebarOpen && (
        <ChatSidebar
          conversations={conversationMetadata}
          activeConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
        />
      )}
      
      <div className="flex-1 flex flex-col">
        <div className="w-full bg-[var(--chat-bg)] overflow-hidden flex flex-col h-screen">
          <Header 
            isSidebarOpen={isSidebarOpen} 
            onToggleSidebar={toggleSidebar} 
          />

          {error && <div className="px-4 md:px-8 lg:px-16 xl:px-32 pt-4">
             <ErrorMessage message={error} />
           </div>}
           <MessageList messages={messages} isLoading={isLoading} />

          <div className="px-4 md:px-8 lg:px-16 xl:px-32 pb-4 pt-2">
            <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
            <Footer />
          </div>
        </div>
      </div>
    </main>
  );
} 