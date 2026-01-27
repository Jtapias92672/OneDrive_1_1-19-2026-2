'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProgressiveQuestionRecord, ProgressiveTrigger } from '@/lib/persona/types';

const STORAGE_KEY = 'forge_progressive_questions';
const SESSION_KEY = 'forge_progressive_session_asked';

interface ProgressiveState {
  questionsAsked: ProgressiveQuestionRecord[];
  sessionQuestionShown: boolean;
}

/**
 * Hook to manage progressive profiling question state.
 * Tracks which questions have been asked and enforces the "max 1 per session" rule.
 */
export function useProgressiveState() {
  const [state, setState] = useState<ProgressiveState>({
    questionsAsked: [],
    sessionQuestionShown: false,
  });

  // Load state from storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const questionsAsked: ProgressiveQuestionRecord[] = stored ? JSON.parse(stored) : [];

      const sessionAsked = sessionStorage.getItem(SESSION_KEY) === 'true';

      setState({
        questionsAsked,
        sessionQuestionShown: sessionAsked,
      });
    } catch (error) {
      console.error('[ProgressiveState] Failed to load state:', error);
    }
  }, []);

  /**
   * Check if a specific trigger has already been asked.
   */
  const hasAsked = useCallback(
    (trigger: ProgressiveTrigger): boolean => {
      return state.questionsAsked.some((q) => q.trigger === trigger);
    },
    [state.questionsAsked]
  );

  /**
   * Check if we can show a question in this session.
   */
  const canShowInSession = useCallback((): boolean => {
    return !state.sessionQuestionShown;
  }, [state.sessionQuestionShown]);

  /**
   * Record that a question was asked.
   */
  const recordAsked = useCallback(
    (trigger: ProgressiveTrigger, questionId: string): void => {
      const record: ProgressiveQuestionRecord = {
        questionId,
        trigger,
        askedAt: new Date(),
        skipped: false,
      };

      const updated = [...state.questionsAsked, record];

      setState((prev) => ({
        ...prev,
        questionsAsked: updated,
        sessionQuestionShown: true,
      }));

      // Persist to storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      sessionStorage.setItem(SESSION_KEY, 'true');
    },
    [state.questionsAsked]
  );

  /**
   * Record a response to a question.
   */
  const recordResponse = useCallback(
    (questionId: string, response: string): void => {
      const updated = state.questionsAsked.map((q) =>
        q.questionId === questionId
          ? { ...q, answeredAt: new Date(), response, skipped: false }
          : q
      );

      setState((prev) => ({
        ...prev,
        questionsAsked: updated,
      }));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [state.questionsAsked]
  );

  /**
   * Record that a question was skipped.
   */
  const recordSkipped = useCallback(
    (questionId: string): void => {
      const updated = state.questionsAsked.map((q) =>
        q.questionId === questionId ? { ...q, skipped: true } : q
      );

      setState((prev) => ({
        ...prev,
        questionsAsked: updated,
      }));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [state.questionsAsked]
  );

  /**
   * Get all answered questions.
   */
  const getAnswered = useCallback((): ProgressiveQuestionRecord[] => {
    return state.questionsAsked.filter((q) => q.answeredAt && !q.skipped);
  }, [state.questionsAsked]);

  /**
   * Reset all state (for testing).
   */
  const reset = useCallback((): void => {
    setState({
      questionsAsked: [],
      sessionQuestionShown: false,
    });
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return {
    questionsAsked: state.questionsAsked,
    sessionQuestionShown: state.sessionQuestionShown,
    hasAsked,
    canShowInSession,
    recordAsked,
    recordResponse,
    recordSkipped,
    getAnswered,
    reset,
  };
}
