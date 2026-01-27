/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useProgressiveTrigger } from '../hooks/useProgressiveTrigger';

// Mock useProgressiveState
const mockHasAsked = jest.fn().mockReturnValue(false);
const mockCanShowInSession = jest.fn().mockReturnValue(true);
const mockRecordAsked = jest.fn();
const mockRecordResponse = jest.fn();
const mockRecordSkipped = jest.fn();

jest.mock('../hooks/useProgressiveState', () => ({
  useProgressiveState: () => ({
    hasAsked: mockHasAsked,
    canShowInSession: mockCanShowInSession,
    recordAsked: mockRecordAsked,
    recordResponse: mockRecordResponse,
    recordSkipped: mockRecordSkipped,
  }),
}));

describe('useProgressiveTrigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasAsked.mockReturnValue(false);
    mockCanShowInSession.mockReturnValue(true);
  });

  describe('checkTrigger', () => {
    it('returns true for first_complex_task when complexity >= 3', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      const shouldShow = result.current.checkTrigger('first_complex_task', {
        taskComplexity: 3,
      });

      expect(shouldShow).toBe(true);
    });

    it('returns false for first_complex_task when complexity < 3', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      const shouldShow = result.current.checkTrigger('first_complex_task', {
        taskComplexity: 2,
      });

      expect(shouldShow).toBe(false);
    });

    it('returns true for first_failure when task abandoned', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      const shouldShow = result.current.checkTrigger('first_failure', {
        isTaskAbandoned: true,
      });

      expect(shouldShow).toBe(true);
    });

    it('returns true for first_success when task completed', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      const shouldShow = result.current.checkTrigger('first_success', {
        isTaskCompleted: true,
      });

      expect(shouldShow).toBe(true);
    });

    it('returns true for day_7_checkin when days >= 7', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      const shouldShow = result.current.checkTrigger('day_7_checkin', {
        daysSinceSignup: 7,
      });

      expect(shouldShow).toBe(true);
    });

    it('returns false when already asked', () => {
      mockHasAsked.mockReturnValue(true);

      const { result } = renderHook(() => useProgressiveTrigger());

      const shouldShow = result.current.checkTrigger('first_complex_task', {
        taskComplexity: 5,
      });

      expect(shouldShow).toBe(false);
    });

    it('returns false when session question already shown', () => {
      mockCanShowInSession.mockReturnValue(false);

      const { result } = renderHook(() => useProgressiveTrigger());

      const shouldShow = result.current.checkTrigger('first_complex_task', {
        taskComplexity: 5,
      });

      expect(shouldShow).toBe(false);
    });
  });

  describe('evaluateContext', () => {
    it('returns question for matching trigger', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      const question = result.current.evaluateContext({
        taskComplexity: 4,
      });

      expect(question).not.toBeNull();
      expect(question?.trigger).toBe('first_complex_task');
    });

    it('returns null when no triggers match', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      const question = result.current.evaluateContext({
        taskComplexity: 1,
      });

      expect(question).toBeNull();
    });

    it('prioritizes first_failure over other triggers', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      const question = result.current.evaluateContext({
        isTaskAbandoned: true,
        isTaskCompleted: true, // Also true, but failure takes priority
        taskComplexity: 5,
      });

      expect(question?.trigger).toBe('first_failure');
    });
  });

  describe('answerQuestion', () => {
    it('does not call recordResponse when no active question', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      act(() => {
        result.current.answerQuestion('My answer');
      });

      // No active question, so recordResponse won't be called
      expect(result.current.activeQuestion).toBeNull();
    });
  });

  describe('skipQuestion', () => {
    it('does not call recordSkipped when no active question', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      act(() => {
        result.current.skipQuestion();
      });

      // No active question, so recordSkipped won't be called
      expect(result.current.activeQuestion).toBeNull();
    });
  });

  describe('dismissQuestion', () => {
    it('clears active question', () => {
      const { result } = renderHook(() => useProgressiveTrigger());

      act(() => {
        result.current.dismissQuestion();
      });

      expect(result.current.activeQuestion).toBeNull();
    });
  });
});
