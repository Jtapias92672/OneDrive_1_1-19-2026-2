'use client';

/**
 * Thread Component
 * Scrollable list of conversation messages
 */

import { memo, useEffect, useRef } from 'react';
import type { Message as MessageType } from '../../hooks/useConversation';
import { Message } from './Message';

interface ThreadProps {
  messages: MessageType[];
  onSelectOption: (option: string) => void;
  onToggleOption: (option: string) => void;
  onConfirm: () => void;
  onSubmitText: (text: string) => void;
}

export const Thread = memo(function Thread({
  messages,
  onSelectOption,
  onToggleOption,
  onConfirm,
  onSubmitText,
}: ThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map((message, index) => (
        <Message
          key={message.id}
          message={message}
          onSelectOption={onSelectOption}
          onToggleOption={onToggleOption}
          onConfirm={onConfirm}
          onSubmitText={onSubmitText}
          isLatest={index === messages.length - 1}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
});
