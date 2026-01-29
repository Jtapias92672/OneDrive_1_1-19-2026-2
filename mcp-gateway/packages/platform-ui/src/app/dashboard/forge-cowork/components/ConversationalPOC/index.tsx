'use client';

/**
 * ConversationalPOC Component
 * Main container for the conversational POC interface
 */

import { useCallback } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { useConversation } from '../../hooks/useConversation';
import { Thread } from './Thread';

export function ConversationalPOC() {
  const {
    messages,
    state,
    isExecuting,
    selectOption,
    submitText,
    toggleConfigOption,
    confirmGeneration,
    restart,
  } = useConversation();

  // Handle option selection based on state
  const handleSelectOption = useCallback(
    (option: string) => {
      if (state === 'discover') {
        selectOption(option);
      } else if (state === 'confirm') {
        if (option === 'Generate') {
          confirmGeneration();
        } else if (option === 'Adjust Settings') {
          // Go back to config - for now just restart
          restart();
        }
      } else if (state === 'complete') {
        if (option === 'Start New') {
          restart();
        } else if (option === 'Try Again') {
          restart();
        }
        // View Files and Export ZIP would need additional handling
      }
    },
    [state, selectOption, confirmGeneration, restart]
  );

  // Handle multi-select toggle
  const handleToggleOption = useCallback(
    (option: string) => {
      if (state === 'config') {
        toggleConfigOption(option);
      }
    },
    [state, toggleConfigOption]
  );

  // Handle confirm for multi-select
  const handleConfirm = useCallback(() => {
    if (state === 'config') {
      confirmGeneration();
    }
  }, [state, confirmGeneration]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              FORGE Generator
            </h2>
            <p className="text-xs text-gray-500">
              Design to code in seconds
            </p>
          </div>
        </div>

        {/* Restart Button */}
        {messages.length > 1 && (
          <button
            onClick={restart}
            disabled={isExecuting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Start Over
          </button>
        )}
      </div>

      {/* Thread */}
      <Thread
        messages={messages}
        onSelectOption={handleSelectOption}
        onToggleOption={handleToggleOption}
        onConfirm={handleConfirm}
        onSubmitText={submitText}
      />
    </div>
  );
}

export default ConversationalPOC;
