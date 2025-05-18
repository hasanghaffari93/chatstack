/**
 * ChatMessage Component
 * Renders a single chat message with proper styling based on sender
 */

import { Message } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import CodeBlock from './CodeBlock';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
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
  );
}