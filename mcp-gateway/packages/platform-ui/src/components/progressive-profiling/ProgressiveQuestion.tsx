'use client';

import React, { useState, useCallback } from 'react';
import { ProgressiveQuestion as ProgressiveQuestionType } from '@/lib/persona/types';
import { forgeSignals } from '@/lib/signals';

interface ProgressiveQuestionProps {
  question: ProgressiveQuestionType;
  onAnswer: (response: string) => void;
  onSkip: () => void;
  onDismiss: () => void;
}

/**
 * Modal/toast component for displaying progressive profiling questions.
 */
export function ProgressiveQuestion({
  question,
  onAnswer,
  onSkip,
  onDismiss,
}: ProgressiveQuestionProps) {
  const [response, setResponse] = useState('');
  const [selectedRating, setSelectedRating] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    const value = question.inputType === 'rating' ? selectedRating : response;
    if (!value) return;

    // Track the answer signal
    forgeSignals.track('progressive_question_answered', {
      questionId: question.id,
      trigger: question.trigger,
      hasResponse: true,
    });

    onAnswer(value);
  }, [question, response, selectedRating, onAnswer]);

  const handleSkip = useCallback(() => {
    // Track the skip signal
    forgeSignals.track('progressive_question_skipped', {
      questionId: question.id,
      trigger: question.trigger,
    });

    onSkip();
  }, [question, onSkip]);

  const isValid =
    question.inputType === 'rating'
      ? selectedRating !== null
      : response.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Quick Question</h3>
            <button
              onClick={onDismiss}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-900 font-medium mb-4">{question.questionText}</p>

          {/* Text input */}
          {question.inputType === 'text' && (
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Your thoughts..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
            />
          )}

          {/* Select input */}
          {question.inputType === 'select' && question.options && (
            <select
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select an option...</option>
              {question.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {/* Rating input */}
          {question.inputType === 'rating' && question.options && (
            <div className="flex justify-center gap-2">
              {question.options.map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSelectedRating(rating)}
                  className={`w-12 h-12 rounded-full font-bold text-lg transition-all ${
                    selectedRating === rating
                      ? 'bg-purple-600 text-white scale-110'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
          {question.skippable && (
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Skip for now
            </button>
          )}

          <div className="flex gap-3 ml-auto">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isValid
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
