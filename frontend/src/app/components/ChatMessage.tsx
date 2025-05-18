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
      <div
        className={`p-4 ${message.isUser
          ? "bg-gray-100 text-gray-900 rounded-full shadow-sm"
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
            p: ({ node, ...props }) => <div {...props} className="whitespace-pre-wrap text-sm" />
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}