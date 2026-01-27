'use client';

import { useState, useEffect, useCallback } from 'react';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingQuestion } from './OnboardingQuestion';
import { OnboardingComplete } from './OnboardingComplete';
import {
  OnboardingQuestion as QuestionType,
  OnboardingResponse,
  PersonaType,
} from '@/lib/persona/types';
import {
  getOnboardingQuestions,
  getNextQuestion,
  classifyPersona,
} from '@/lib/persona/onboarding-service';

interface OnboardingFlowProps {
  userId: string;
  onComplete: (persona: PersonaType) => void;
  onSkip?: () => void;
}

type OnboardingState = 'loading' | 'question' | 'complete';

export function OnboardingFlow({ userId, onComplete, onSkip }: OnboardingFlowProps) {
  const [state, setState] = useState<OnboardingState>('loading');
  const [responses, setResponses] = useState<OnboardingResponse[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionType | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [classifiedPersona, setClassifiedPersona] = useState<PersonaType>('unclassified');
  const [startTime] = useState(() => Date.now());

  // Load initial question
  useEffect(() => {
    const questions = getOnboardingQuestions();
    if (questions.length > 0) {
      setCurrentQuestion(questions[0]);
      setState('question');
    }
  }, []);

  const handleSelect = useCallback((value: string) => {
    setSelectedValue(value);
  }, []);

  const handleNext = useCallback(async () => {
    if (!currentQuestion || !selectedValue) return;

    // Record response
    const response: OnboardingResponse = {
      questionId: currentQuestion.questionId,
      questionText: currentQuestion.questionText,
      selectedOption: selectedValue,
      answeredAt: new Date(),
    };

    const newResponses = [...responses, response];
    setResponses(newResponses);

    // Get next question
    const nextQuestion = getNextQuestion(newResponses);

    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      setSelectedValue(null);
    } else {
      // Onboarding complete
      const { persona } = classifyPersona(newResponses);
      setClassifiedPersona(persona);
      setState('complete');

      // Submit to API
      try {
        await fetch('/api/onboarding/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, responses: newResponses }),
        });
      } catch (error) {
        console.error('Failed to submit onboarding:', error);
      }
    }
  }, [currentQuestion, selectedValue, responses, userId]);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete('unclassified');
    }
  }, [onSkip, onComplete]);

  const handleContinue = useCallback(() => {
    onComplete(classifiedPersona);
  }, [onComplete, classifiedPersona]);

  // Calculate progress
  const currentQuestionNumber = responses.length + 1;
  const totalQuestions = 4;

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (state === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <OnboardingComplete persona={classifiedPersona} onContinue={handleContinue} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xl">
        <OnboardingProgress current={currentQuestionNumber} total={totalQuestions} />

        {currentQuestion && (
          <OnboardingQuestion
            question={currentQuestion}
            selectedValue={selectedValue}
            onSelect={handleSelect}
          />
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Skip for now
          </button>

          <button
            onClick={handleNext}
            disabled={!selectedValue}
            className={`
              px-6 py-2 rounded-lg font-medium transition-all
              ${selectedValue
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {currentQuestionNumber === totalQuestions ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
