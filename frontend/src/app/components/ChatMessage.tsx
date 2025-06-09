/**
 * ChatMessage Component
 * Renders a single chat message with proper styling based on sender
 * Supports RTL languages like Persian, Arabic, Hebrew, and Urdu
 * User messages are always on the right, bot messages positioned by language direction
 */

import { Message } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import CodeBlock from './CodeBlock';
import { RTLText, useRTLTextInfo } from '../../components/RTLText';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const rtlInfo = useRTLTextInfo(message.content);
  
  return (
    <div
      className={`flex items-start ${
        message.isUser 
          ? "justify-end"  // User messages always on right
          : rtlInfo.isRTL ? "justify-end" : "justify-start"  // Bot messages based on language direction
      } px-4 mb-4`}
    >
      <div
        className={`p-3 ${
          message.isUser
            ? "max-w-[80%] bg-gray-100 text-gray-900 rounded-2xl shadow-sm"
            : "max-w-[100%] bg-transparent text-gray-900"
        }`}
      >
        <RTLText 
          className="message-content"
          style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            lineHeight: '1.8',
          }}
        >
          <ReactMarkdown
            components={{
              code: ({inline, className, children}: React.HTMLAttributes<HTMLElement> & {inline?: boolean; children?: React.ReactNode}) => {
                return inline
                  ? <code className={className}>{children}</code>
                  : <CodeBlock className={className}>{children}</CodeBlock>;
              },
              p: ({ ...props }) => (
                <div 
                  {...props} 
                  className="whitespace-pre-wrap text-sm"
                  style={{
                    direction: rtlInfo.direction,
                    textAlign: rtlInfo.isRTL ? 'right' : 'left',
                    lineHeight: '1.8',
                  }}
                />
              ),
              // Handle other markdown elements with RTL support
              h1: ({ ...props }) => (
                <h1 
                  {...props} 
                  style={{
                    direction: rtlInfo.direction,
                    textAlign: rtlInfo.isRTL ? 'right' : 'left',
                    lineHeight: '1.8',
                  }}
                />
              ),
              h2: ({ ...props }) => (
                <h2 
                  {...props} 
                  style={{
                    direction: rtlInfo.direction,
                    textAlign: rtlInfo.isRTL ? 'right' : 'left',
                    lineHeight: '1.8',
                  }}
                />
              ),
              h3: ({ ...props }) => (
                <h3 
                  {...props} 
                  style={{
                    direction: rtlInfo.direction,
                    textAlign: rtlInfo.isRTL ? 'right' : 'left',
                    lineHeight: '1.8',
                  }}
                />
              ),
              li: ({ ...props }) => (
                <li 
                  {...props} 
                  style={{
                    direction: rtlInfo.direction,
                    textAlign: rtlInfo.isRTL ? 'right' : 'left',
                    lineHeight: '1.8',
                  }}
                />
              ),
              blockquote: ({ ...props }) => (
                <blockquote 
                  {...props} 
                  style={{
                    direction: rtlInfo.direction,
                    textAlign: rtlInfo.isRTL ? 'right' : 'left',
                    borderLeft: rtlInfo.isRTL ? 'none' : '4px solid #e5e7eb',
                    borderRight: rtlInfo.isRTL ? '4px solid #e5e7eb' : 'none',
                    paddingLeft: rtlInfo.isRTL ? '0' : '1rem',
                    paddingRight: rtlInfo.isRTL ? '1rem' : '0',
                    lineHeight: '1.8',
                  }}
                />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </RTLText>
      </div>
    </div>
  );
}