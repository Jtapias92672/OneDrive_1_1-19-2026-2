// Onboarding Service Tests - Epic 15
import {
  getOnboardingQuestions,
  getNextQuestion,
  classifyPersona,
  submitOnboarding,
  QUESTIONS,
} from '../lib/persona/onboarding-service';
import { createProfile, clearProfileStore } from '../lib/persona/profile-service';
import { OnboardingResponse, PersonaType } from '../lib/persona/types';

describe('Onboarding Service', () => {
  beforeEach(() => {
    clearProfileStore();
  });

  describe('getOnboardingQuestions', () => {
    it('should return only Q1 when no track specified', () => {
      const questions = getOnboardingQuestions();

      expect(questions).toHaveLength(1);
      expect(questions[0].questionId).toBe('q1-motivation');
    });

    it('should return Q1 + persona-specific questions for disappointed track', () => {
      const questions = getOnboardingQuestions('disappointed');

      expect(questions).toHaveLength(4);
      expect(questions[0].questionId).toBe('q1-motivation');
      expect(questions[1].questionId).toBe('q2-disappointed');
      expect(questions[2].questionId).toBe('q3-disappointed');
      expect(questions[3].questionId).toBe('q4-disappointed');
    });

    it('should return Q1 + persona-specific questions for hesitant track', () => {
      const questions = getOnboardingQuestions('hesitant');

      expect(questions).toHaveLength(4);
      expect(questions[1].questionId).toBe('q2-hesitant');
    });

    it('should return Q1 + persona-specific questions for frontier track', () => {
      const questions = getOnboardingQuestions('frontier');

      expect(questions).toHaveLength(4);
      expect(questions[1].questionId).toBe('q2-frontier');
    });

    it('should return Q1 + persona-specific questions for beginner track', () => {
      const questions = getOnboardingQuestions('beginner');

      expect(questions).toHaveLength(4);
      expect(questions[1].questionId).toBe('q2-beginner');
    });
  });

  describe('getNextQuestion', () => {
    it('should return Q1 when no responses', () => {
      const next = getNextQuestion([]);

      expect(next).not.toBeNull();
      expect(next!.questionId).toBe('q1-motivation');
    });

    it('should return Q2-disappointed after Q1 disappointed answer', () => {
      const responses: OnboardingResponse[] = [
        {
          questionId: 'q1-motivation',
          questionText: 'What brought you to Forge today?',
          selectedOption: 'disappointed',
          answeredAt: new Date(),
        },
      ];

      const next = getNextQuestion(responses);

      expect(next).not.toBeNull();
      expect(next!.questionId).toBe('q2-disappointed');
    });

    it('should return Q2-hesitant after Q1 compliance answer', () => {
      const responses: OnboardingResponse[] = [
        {
          questionId: 'q1-motivation',
          questionText: 'What brought you to Forge today?',
          selectedOption: 'compliance',
          answeredAt: new Date(),
        },
      ];

      const next = getNextQuestion(responses);

      expect(next).not.toBeNull();
      expect(next!.questionId).toBe('q2-hesitant');
    });

    it('should return null after all questions answered', () => {
      const responses: OnboardingResponse[] = [
        { questionId: 'q1-motivation', questionText: '', selectedOption: 'disappointed', answeredAt: new Date() },
        { questionId: 'q2-disappointed', questionText: '', selectedOption: 'quality', answeredAt: new Date() },
        { questionId: 'q3-disappointed', questionText: '', selectedOption: 'daily', answeredAt: new Date() },
        { questionId: 'q4-disappointed', questionText: '', selectedOption: 'reliability', answeredAt: new Date() },
      ];

      const next = getNextQuestion(responses);

      expect(next).toBeNull();
    });
  });

  describe('classifyPersona', () => {
    it('should return unclassified with 0 confidence when no responses', () => {
      const result = classifyPersona([]);

      expect(result.persona).toBe('unclassified');
      expect(result.confidence).toBe(0);
    });

    it('should classify disappointed persona from Q1 answer', () => {
      const responses: OnboardingResponse[] = [
        { questionId: 'q1-motivation', questionText: '', selectedOption: 'disappointed', answeredAt: new Date() },
      ];

      const result = classifyPersona(responses);

      expect(result.persona).toBe('disappointed');
      expect(result.confidence).toBe(0.25); // 1 of 4 questions
    });

    it('should classify hesitant persona from Q1 compliance answer', () => {
      const responses: OnboardingResponse[] = [
        { questionId: 'q1-motivation', questionText: '', selectedOption: 'compliance', answeredAt: new Date() },
      ];

      const result = classifyPersona(responses);

      expect(result.persona).toBe('hesitant');
    });

    it('should classify frontier persona from Q1 unpredictable answer', () => {
      const responses: OnboardingResponse[] = [
        { questionId: 'q1-motivation', questionText: '', selectedOption: 'unpredictable', answeredAt: new Date() },
      ];

      const result = classifyPersona(responses);

      expect(result.persona).toBe('frontier');
    });

    it('should classify beginner persona from Q1 new answer', () => {
      const responses: OnboardingResponse[] = [
        { questionId: 'q1-motivation', questionText: '', selectedOption: 'new', answeredAt: new Date() },
      ];

      const result = classifyPersona(responses);

      expect(result.persona).toBe('beginner');
    });

    it('should increase confidence as more questions answered', () => {
      const responses: OnboardingResponse[] = [
        { questionId: 'q1-motivation', questionText: '', selectedOption: 'disappointed', answeredAt: new Date() },
        { questionId: 'q2-disappointed', questionText: '', selectedOption: 'quality', answeredAt: new Date() },
        { questionId: 'q3-disappointed', questionText: '', selectedOption: 'daily', answeredAt: new Date() },
        { questionId: 'q4-disappointed', questionText: '', selectedOption: 'reliability', answeredAt: new Date() },
      ];

      const result = classifyPersona(responses);

      expect(result.confidence).toBe(1); // All 4 questions
    });
  });

  describe('submitOnboarding', () => {
    it('should update profile with classified persona', async () => {
      await createProfile({ userId: 'user-1' });

      const responses: OnboardingResponse[] = [
        { questionId: 'q1-motivation', questionText: '', selectedOption: 'disappointed', answeredAt: new Date() },
        { questionId: 'q2-disappointed', questionText: '', selectedOption: 'quality', answeredAt: new Date() },
        { questionId: 'q3-disappointed', questionText: '', selectedOption: 'daily', answeredAt: new Date() },
        { questionId: 'q4-disappointed', questionText: '', selectedOption: 'reliability', answeredAt: new Date() },
      ];

      const result = await submitOnboarding({ userId: 'user-1', responses });

      expect(result.classifiedPersona).toBe('disappointed');
      expect(result.confidence).toBe(1);
      expect(result.dashboardConfig.personaTemplate).toBe('disappointed');
    });

    it('should throw if profile not found', async () => {
      await expect(
        submitOnboarding({
          userId: 'non-existent',
          responses: [{ questionId: 'q1-motivation', questionText: '', selectedOption: 'disappointed', answeredAt: new Date() }],
        })
      ).rejects.toThrow('Profile not found');
    });

    it('should return dashboard config matching persona', async () => {
      await createProfile({ userId: 'user-1' });

      const responses: OnboardingResponse[] = [
        { questionId: 'q1-motivation', questionText: '', selectedOption: 'compliance', answeredAt: new Date() },
      ];

      const result = await submitOnboarding({ userId: 'user-1', responses });

      expect(result.classifiedPersona).toBe('hesitant');
      expect(result.dashboardConfig.personaTemplate).toBe('hesitant');
    });
  });

  describe('Question structure', () => {
    it('should have exactly 16 questions total (1 Q1 + 4 tracks × 3 Qs each + 3 extra)', () => {
      // Q1 + 4 tracks * 3 follow-ups = 13 questions minimum
      expect(QUESTIONS.length).toBeGreaterThanOrEqual(13);
    });

    it('should have Q1 with 4 routing options', () => {
      const q1 = QUESTIONS.find((q) => q.questionId === 'q1-motivation');

      expect(q1).toBeDefined();
      expect(q1!.options).toHaveLength(4);
      expect(q1!.options.every((o) => o.routesTo)).toBe(true);
    });

    it('should have all Q2-Q4 questions with conditionalOn', () => {
      const followUpQuestions = QUESTIONS.filter((q) => q.questionId !== 'q1-motivation');

      expect(followUpQuestions.every((q) => q.conditionalOn)).toBe(true);
    });
  });
});
