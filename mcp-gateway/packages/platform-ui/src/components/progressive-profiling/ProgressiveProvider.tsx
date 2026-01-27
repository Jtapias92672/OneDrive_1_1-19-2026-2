'use client';

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { ProgressiveQuestion as ProgressiveQuestionType, ProgressiveTrigger } from '@/lib/persona/types';
import { useProgressiveTrigger } from './hooks/useProgressiveTrigger';
import { ProgressiveQuestion } from './ProgressiveQuestion';

interface ProgressiveContextValue {
  /**
   * Check and potentially show a question for a trigger.
   * Returns true if a question was shown.
   */
  checkTrigger: (trigger: ProgressiveTrigger, context?: TriggerContext) => boolean;

  /**
   * Evaluate all triggers based on context and show appropriate question.
   * Returns the question shown, or null if none.
   */
  evaluate: (context: TriggerContext) => ProgressiveQuestionType | null;

  /**
   * Check if a question is currently being shown.
   */
  isShowing: boolean;
}

interface TriggerContext {
  taskComplexity?: number;
  isTaskAbandoned?: boolean;
  isTaskCompleted?: boolean;
  daysSinceSignup?: number;
}

const ProgressiveContext = createContext<ProgressiveContextValue | null>(null);

interface ProgressiveProviderProps {
  children: ReactNode;
}

/**
 * Context provider for progressive profiling.
 * Wrap your app with this to enable progressive profiling throughout.
 */
export function ProgressiveProvider({ children }: ProgressiveProviderProps) {
  const {
    activeQuestion,
    checkTrigger: internalCheck,
    evaluateContext,
    answerQuestion,
    skipQuestion,
    dismissQuestion,
  } = useProgressiveTrigger();

  const [currentQuestion, setCurrentQuestion] = useState<ProgressiveQuestionType | null>(null);

  const checkTrigger = useCallback(
    (trigger: ProgressiveTrigger, context?: TriggerContext): boolean => {
      const shouldShow = internalCheck(trigger, context);
      if (shouldShow) {
        const question = evaluateContext(context || {});
        if (question) {
          setCurrentQuestion(question);
          return true;
        }
      }
      return false;
    },
    [internalCheck, evaluateContext]
  );

  const evaluate = useCallback(
    (context: TriggerContext): ProgressiveQuestionType | null => {
      const question = evaluateContext(context);
      if (question) {
        setCurrentQuestion(question);
      }
      return question;
    },
    [evaluateContext]
  );

  const handleAnswer = useCallback(
    (response: string) => {
      answerQuestion(response);
      setCurrentQuestion(null);
    },
    [answerQuestion]
  );

  const handleSkip = useCallback(() => {
    skipQuestion();
    setCurrentQuestion(null);
  }, [skipQuestion]);

  const handleDismiss = useCallback(() => {
    dismissQuestion();
    setCurrentQuestion(null);
  }, [dismissQuestion]);

  const displayQuestion = activeQuestion || currentQuestion;

  return (
    <ProgressiveContext.Provider
      value={{
        checkTrigger,
        evaluate,
        isShowing: displayQuestion !== null,
      }}
    >
      {children}

      {/* Render the question modal */}
      {displayQuestion && (
        <ProgressiveQuestion
          question={displayQuestion}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
          onDismiss={handleDismiss}
        />
      )}
    </ProgressiveContext.Provider>
  );
}

/**
 * Hook to access progressive profiling functionality.
 */
export function useProgressive(): ProgressiveContextValue {
  const context = useContext(ProgressiveContext);
  if (!context) {
    throw new Error('useProgressive must be used within a ProgressiveProvider');
  }
  return context;
}
