'use client';

/**
 * Message Component
 * Renders a single conversation message (AI or User)
 */

import { memo, useState, useCallback, KeyboardEvent } from 'react';
import { Bot, User, AlertCircle, Send } from 'lucide-react';
import type { Message as MessageType } from '../../hooks/useConversation';
import { QuestionOptions } from './QuestionOptions';
import { ExecutionProgress } from './ExecutionProgress';
import { ResultCard } from './ResultCard';

interface MessageProps {
  message: MessageType;
  onSelectOption?: (option: string) => void;
  onToggleOption?: (option: string) => void;
  onConfirm?: () => void;
  onSubmitText?: (text: string) => void;
  isLatest?: boolean;
}

export const Message = memo(function Message({
  message,
  onSelectOption,
  onToggleOption,
  onConfirm,
  onSubmitText,
  isLatest = false,
}: MessageProps) {
  const isAI = message.role === 'ai';
  const isError = message.type === 'error';
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && onSubmitText) {
      onSubmitText(trimmed);
      setInputValue('');
    }
  }, [inputValue, onSubmitText]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAI
            ? isError
              ? 'bg-red-100 text-red-600'
              : 'bg-violet-100 text-violet-600'
            : 'bg-teal-600 text-white'
        }`}
      >
        {isAI ? (
          isError ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isAI ? 'max-w-[85%]' : 'max-w-[80%]'}`}>
        <div
          className={`rounded-xl p-4 ${
            isAI
              ? isError
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-white border border-gray-200 shadow-sm'
              : 'bg-teal-600 text-white'
          }`}
        >
          {/* Progress Message */}
          {message.type === 'progress' && (
            <ExecutionProgress
              progress={message.progress || 0}
              message={message.progressMessage || message.content}
            />
          )}

          {/* Result Message */}
          {message.type === 'result' && message.result && (
            <ResultCard
              content={message.content}
              result={message.result}
              options={message.options}
              onSelectOption={onSelectOption}
            />
          )}

          {/* Regular Text Content */}
          {message.type !== 'progress' && message.type !== 'result' && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Inline Text Input for text-input messages */}
          {message.type === 'text-input' && isLatest && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste URL here..."
                autoFocus
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Options for Questions */}
          {message.options &&
            message.type !== 'result' &&
            message.type !== 'progress' &&
            isLatest && (
              <div className="mt-4">
                <QuestionOptions
                  options={message.options}
                  multiSelect={message.multiSelect}
                  selectedOptions={message.selectedOptions}
                  onSelect={onSelectOption}
                  onToggle={onToggleOption}
                  onConfirm={onConfirm}
                />
              </div>
            )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[10px] text-gray-400 mt-1 ${
            isAI ? '' : 'text-right'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
});
