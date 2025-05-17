"use client";

import { useState, useRef, useEffect } from "react";
import Loading from "./components/Loading";
import ChatSidebar from "./components/ChatSidebar";
import { Message, Conversation } from "./types/chat";
import CodeBlock from "./components/CodeBlock";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/conversations");
      if (!response.ok) throw new Error("Failed to fetch conversations");
      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNewChat = () => {
    // Simply reset the current conversation state without deleting anything
    setMessages([]);
    setConversationId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { content: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: userMessage,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${errorText}`);
      }

      const data = await response.json();
      setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        { content: data.response, isUser: false },
      ]);
      
      // Refresh conversations after sending a message
      fetchConversations();
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          content: "Sorry, something went wrong. Please try again.",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = async (id: string) => {
    const conversation = conversations.find((c) => c.id === id);
    if (!conversation) return;

    setConversationId(id);
    setMessages(
      conversation.messages.map((msg) => ({
        content: msg.content,
        isUser: msg.role === "user",
      }))
    );
  };

  return (
    <main className="flex min-h-screen bg-[var(--background)]">
      {isSidebarOpen && (
        <ChatSidebar
          conversations={conversations}
          activeConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
        />
      )}
      
      <div className="flex-1 flex flex-col">
        <div className="w-full bg-[var(--chat-bg)] overflow-hidden flex flex-col h-screen">
          <div className="border-b border-[var(--input-border)] p-3 flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-[var(--sidebar-hover)] rounded-md text-[var(--foreground)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h1 className="ml-3 text-[var(--foreground)] text-lg font-medium">ChatStack</h1>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-4 md:px-8 lg:px-16 xl:px-32 space-y-6">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-semibold text-[var(--foreground)]">ChatStack</h2>
                  <p className="text-sm opacity-60">How can I help you today?</p>
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start ${message.isUser ? "justify-end" : "justify-start"} px-4 mb-2`}
              >
                {!message.isUser && (
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium">
                      AI
                    </div>
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-4 ${message.isUser
                    ? "bg-white text-gray-900 rounded-full shadow-sm"
                    : "bg-transparent text-gray-900"
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      code: ({inline, className, children, ...props}: React.HTMLAttributes<HTMLElement> & {inline?: boolean; children?: React.ReactNode; node?: any}) => {
                        return inline
                          ? <code className={className}>{children}</code>
                          : <CodeBlock className={className}>{children}</CodeBlock>;
                      },
                      p: ({ node, ...props }) => <p {...props} className="whitespace-pre-wrap text-sm" />
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.isUser && (
                  <div className="flex-shrink-0 ml-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-sm font-medium">
                      You
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start justify-start px-4">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium">
                    AI
                  </div>
                </div>
                <div className="bg-[var(--bot-message-bg)] border border-[var(--input-border)] p-4 rounded-2xl">
                  <Loading />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 md:px-8 lg:px-16 xl:px-32 pb-4 pt-2">
            <form onSubmit={handleSubmit} className="relative">
              <div className="border border-[var(--input-border)] bg-[var(--input-bg)] rounded-lg overflow-hidden shadow-sm">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message ChatStack..."
                  className="w-full p-3 pr-12 bg-transparent focus:outline-none text-[var(--foreground)] placeholder-opacity-60"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md text-[var(--primary)] hover:bg-[var(--sidebar-hover)] disabled:opacity-50 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </form>
            <div className="text-xs text-center mt-2 opacity-60">ChatStack can make mistakes. Check important info.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
