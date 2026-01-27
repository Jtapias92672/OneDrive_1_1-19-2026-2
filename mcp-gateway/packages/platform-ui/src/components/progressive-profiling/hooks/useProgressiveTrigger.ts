'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ProgressiveTrigger,
  ProgressiveQuestion,
  PROGRESSIVE_QUESTIONS,
} from '@/lib/persona/types';
import { useProgressiveState } from './useProgressiveState';

interface TriggerContext {
  taskComplexity?: number;
  isTaskAbandoned?: boolean;
  isTaskCompleted?: boolean;
  daysSinceSignup?: number;
}

interface UseTriggerResult {
  activeQuestion: ProgressiveQuestion | null;
  checkTrigger: (trigger: ProgressiveTrigger, context?: TriggerContext) => boolean;
  evaluateContext: (context: TriggerContext) => ProgressiveQuestion | null;
  dismissQuestion: () => void;
  answerQuestion: (response: string) => void;
  skipQuestion: () => void;
}

/**
 * Hook to evaluate progressive profiling triggers and manage the active question.
 */
export function useProgressiveTrigger(): UseTriggerResult {
  const {
    hasAsked,
    canShowInSession,
    recordAsked,
    recordResponse,
    recordSkipped,
  } = useProgressiveState();

  const [activeQuestion, setActiveQuestion] = useState<ProgressiveQuestion | null>(null);

  /**
   * Check if a specific trigger should fire.
   */
  const checkTrigger = useCallback(
    (trigger: ProgressiveTrigger, context?: TriggerContext): boolean => {
      // Already asked this question
      if (hasAsked(trigger)) {
        return false;
      }

      // Already showed a question this session
      if (!canShowInSession()) {
        return false;
      }

      // Trigger-specific logic
      switch (trigger) {
        case 'first_complex_task':
          return (context?.taskComplexity ?? 0) >= 3;

        case 'first_failure':
          return context?.isTaskAbandoned === true;

        case 'first_success':
          return context?.isTaskCompleted === true;

        case 'day_7_checkin':
          return (context?.daysSinceSignup ?? 0) >= 7;

        default:
          return false;
      }
    },
    [hasAsked, canShowInSession]
  );

  /**
   * Evaluate context and return the appropriate question if any trigger fires.
   */
  const evaluateContext = useCallback(
    (context: TriggerContext): ProgressiveQuestion | null => {
      // Check triggers in priority order
      const triggerOrder: ProgressiveTrigger[] = [
        'first_failure',     // Highest priority - understand pain points
        'first_success',     // Celebrate and learn
        'first_complex_task', // Understand project context
        'day_7_checkin',     // General feedback
      ];

      for (const trigger of triggerOrder) {
        if (checkTrigger(trigger, context)) {
          const question = PROGRESSIVE_QUESTIONS.find((q) => q.trigger === trigger);
          if (question) {
            return question;
          }
        }
      }

      return null;
    },
    [checkTrigger]
  );

  /**
   * Show a question for a specific trigger.
   */
  const showQuestion = useCallback(
    (question: ProgressiveQuestion): void => {
      recordAsked(question.trigger, question.id);
      setActiveQuestion(question);
    },
    [recordAsked]
  );

  /**
   * Dismiss the active question without answering.
   */
  const dismissQuestion = useCallback((): void => {
    setActiveQuestion(null);
  }, []);

  /**
   * Answer the active question.
   */
  const answerQuestion = useCallback(
    (response: string): void => {
      if (activeQuestion) {
        recordResponse(activeQuestion.id, response);
        setActiveQuestion(null);
      }
    },
    [activeQuestion, recordResponse]
  );

  /**
   * Skip the active question.
   */
  const skipQuestion = useCallback((): void => {
    if (activeQuestion) {
      recordSkipped(activeQuestion.id);
      setActiveQuestion(null);
    }
  }, [activeQuestion, recordSkipped]);

  return {
    activeQuestion,
    checkTrigger,
    evaluateContext,
    dismissQuestion,
    answerQuestion,
    skipQuestion,
  };
}

/**
 * Hook to automatically evaluate triggers based on provided context.
 * Use this in components that should show progressive profiling questions.
 */
export function useAutoTrigger(context: TriggerContext): {
  question: ProgressiveQuestion | null;
  answer: (response: string) => void;
  skip: () => void;
  dismiss: () => void;
} {
  const { activeQuestion, evaluateContext, answerQuestion, skipQuestion, dismissQuestion } =
    useProgressiveTrigger();

  const [evaluated, setEvaluated] = useState(false);
  const [question, setQuestion] = useState<ProgressiveQuestion | null>(null);

  useEffect(() => {
    if (evaluated) return;

    const result = evaluateContext(context);
    if (result) {
      setQuestion(result);
    }
    setEvaluated(true);
  }, [context, evaluated, evaluateContext]);

  return {
    question: activeQuestion || question,
    answer: answerQuestion,
    skip: skipQuestion,
    dismiss: dismissQuestion,
  };
}
