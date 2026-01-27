'use client';

import { OnboardingOption } from './OnboardingOption';
import { OnboardingQuestion as QuestionType } from '@/lib/persona/types';

interface OnboardingQuestionProps {
  question: QuestionType;
  selectedValue: string | null;
  onSelect: (value: string) => void;
}

export function OnboardingQuestion({
  question,
  selectedValue,
  onSelect,
}: OnboardingQuestionProps) {
  return (
    <div className="w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
        {question.questionText}
      </h2>
      <div className="space-y-3">
        {question.options.map((option) => (
          <OnboardingOption
            key={option.value}
            value={option.value}
            label={option.label}
            selected={selectedValue === option.value}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
