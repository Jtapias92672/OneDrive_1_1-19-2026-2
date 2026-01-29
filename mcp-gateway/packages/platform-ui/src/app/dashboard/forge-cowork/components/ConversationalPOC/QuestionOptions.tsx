'use client';

/**
 * QuestionOptions Component
 * Renders clickable option buttons for AI questions
 */

import { memo } from 'react';
import { Check, ArrowRight } from 'lucide-react';

interface QuestionOptionsProps {
  options: string[];
  multiSelect?: boolean;
  selectedOptions?: string[];
  onSelect?: (option: string) => void;
  onToggle?: (option: string) => void;
  onConfirm?: () => void;
}

export const QuestionOptions = memo(function QuestionOptions({
  options,
  multiSelect = false,
  selectedOptions = [],
  onSelect,
  onToggle,
  onConfirm,
}: QuestionOptionsProps) {
  if (multiSelect) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = selectedOptions.includes(option);
            return (
              <button
                key={option}
                onClick={() => onToggle?.(option)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-150 text-sm font-medium ${
                  isSelected
                    ? 'bg-violet-100 border-violet-300 text-violet-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-violet-50 hover:border-violet-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected
                      ? 'bg-violet-600 border-violet-600'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                {option}
              </button>
            );
          })}
        </div>

        {/* Confirm Button for MultiSelect */}
        <button
          onClick={onConfirm}
          disabled={selectedOptions.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Single select options
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect?.(option)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all duration-150"
        >
          {option}
        </button>
      ))}
    </div>
  );
});
