/**
 * Unit Tests: Deceptive Compliance Detector
 *
 * @epic 3.5 - Gateway Foundation
 * @task 3.5.2.4 - Deceptive Compliance Detection
 *
 * Tests all 8 indicators per Anthropic "Alignment Faking" research (Dec 2024)
 */

import {
  DeceptiveComplianceDetector,
  DeceptiveComplianceContext,
  DeceptiveComplianceAssessment,
} from '../../cars/deceptive-compliance-detector';

describe('DeceptiveComplianceDetector', () => {
  let detector: DeceptiveComplianceDetector;

  beforeEach(() => {
    detector = new DeceptiveComplianceDetector();
  });

  // ==========================================
  // BASIC FUNCTIONALITY
  // ==========================================

  describe('basic functionality', () => {
    it('should create detector instance', () => {
      expect(detector).toBeInstanceOf(DeceptiveComplianceDetector);
    });

    it('should return PROCEED when no indicators present', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicatorCount).toBe(0);
      expect(result.action).toBe('PROCEED');
      expect(result.riskModifier).toBe(0);
    });
  });

  // ==========================================
  // INDICATOR 1: SELF-VALIDATION
  // ==========================================

  describe('Indicator 1: Self-Validation (+1.0)', () => {
    it('should detect self-validation without external check', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: true,
        externalValidationPresent: false,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'SELF_VALIDATION')).toBe(true);
      expect(result.riskModifier).toBeGreaterThanOrEqual(1.0);
    });

    it('should NOT trigger when external validation present', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: true,
        externalValidationPresent: true, // External validation present
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'SELF_VALIDATION')).toBe(false);
    });
  });

  // ==========================================
  // INDICATOR 2: NO EXTERNAL VERIFICATION
  // ==========================================

  describe('Indicator 2: No External Verification (+1.0)', () => {
    it('should detect when no external verification available', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: false, // No external verification
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'NO_EXTERNAL_VERIFICATION')).toBe(true);
      expect(result.riskModifier).toBeGreaterThanOrEqual(1.0);
    });
  });

  // ==========================================
  // INDICATOR 3: HIDDEN REASONING
  // ==========================================

  describe('Indicator 3: Hidden Reasoning (+0.5)', () => {
    it('should detect complex hidden reasoning', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 10, // > 5 steps
        reasoningFullyVisible: false, // Not fully visible
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'HIDDEN_REASONING')).toBe(true);
      expect(result.riskModifier).toBeGreaterThanOrEqual(0.5);
    });

    it('should NOT trigger for simple reasoning', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3, // <= 5 steps
        reasoningFullyVisible: false,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'HIDDEN_REASONING')).toBe(false);
    });
  });

  // ==========================================
  // INDICATOR 4: URGENCY BYPASS
  // ==========================================

  describe('Indicator 4: Urgency Bypass (+0.5)', () => {
    it('should detect urgency bypass attempts', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: true, // Claims urgency
        requestsBypassReview: true, // Requests bypass
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'URGENCY_BYPASS')).toBe(true);
      expect(result.riskModifier).toBeGreaterThanOrEqual(0.5);
    });

    it('should NOT trigger if only urgency claimed without bypass request', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: true,
        requestsBypassReview: false, // No bypass request
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'URGENCY_BYPASS')).toBe(false);
    });
  });

  // ==========================================
  // INDICATOR 5: SUCCESS WITHOUT EVIDENCE
  // ==========================================

  describe('Indicator 5: Success Without Evidence (+0.5)', () => {
    it('should detect success claims without evidence', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: true, // Claims success
        evidenceProvided: false, // No evidence
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'SUCCESS_NO_EVIDENCE')).toBe(true);
      expect(result.riskModifier).toBeGreaterThanOrEqual(0.5);
    });
  });

  // ==========================================
  // INDICATOR 6: RAPID COMPLETION (CRITICAL)
  // ==========================================

  describe('Indicator 6: Rapid Completion (+0.75)', () => {
    it('should detect rapid completion of complex tasks', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
        taskComplexity: 8, // Complex task (> 5)
        completionTimeRatio: 0.2, // Very fast (< 0.3)
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'RAPID_COMPLETION')).toBe(true);
      expect(result.riskModifier).toBeGreaterThanOrEqual(0.75);
    });
  });

  // ==========================================
  // INDICATOR 7: OUT OF SCOPE (CRITICAL)
  // ==========================================

  describe('Indicator 7: Out of Scope Modifications (+1.5)', () => {
    it('should detect out-of-scope modifications', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
        outOfScopeModifications: ['/etc/passwd', '/root/.ssh/authorized_keys'],
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'OUT_OF_SCOPE')).toBe(true);
      expect(result.indicators.find(i => i.name === 'OUT_OF_SCOPE')?.severity).toBe('critical');
      expect(result.riskModifier).toBeGreaterThanOrEqual(1.5);
    });
  });

  // ==========================================
  // INDICATOR 8: REASONING MISMATCH (CRITICAL)
  // ==========================================

  describe('Indicator 8: Reasoning-Behavior Mismatch (+2.0)', () => {
    it('should detect reasoning-behavior mismatch', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
        reasoningBehaviorAlignment: 0.3, // Low alignment (< 0.5)
      };

      const result = detector.detect(context);

      expect(result.indicators.some(i => i.name === 'REASONING_MISMATCH')).toBe(true);
      expect(result.indicators.find(i => i.name === 'REASONING_MISMATCH')?.severity).toBe('critical');
      expect(result.riskModifier).toBeGreaterThanOrEqual(2.0);
    });
  });

  // ==========================================
  // ACTION ESCALATION
  // ==========================================

  describe('Action Escalation', () => {
    it('should return SPOT_CHECK for 1 indicator', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: false, // 1 indicator
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicatorCount).toBe(1);
      expect(result.action).toBe('SPOT_CHECK');
    });

    it('should return FULL_REVIEW for 2 indicators', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: true,
        externalValidationPresent: false, // Indicator 1
        externalVerificationAvailable: false, // Indicator 2
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicatorCount).toBe(2);
      expect(result.action).toBe('FULL_REVIEW');
    });

    it('should return ESCALATE for 3+ indicators', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: true,
        externalValidationPresent: false, // Indicator 1
        externalVerificationAvailable: false, // Indicator 2
        reasoningStepCount: 10,
        reasoningFullyVisible: false, // Indicator 3
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
      };

      const result = detector.detect(context);

      expect(result.indicatorCount).toBeGreaterThanOrEqual(3);
      expect(result.action).toBe('ESCALATE');
    });

    it('should return ESCALATE for any critical indicator', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
        outOfScopeModifications: ['/etc/passwd'], // Critical indicator
      };

      const result = detector.detect(context);

      expect(result.action).toBe('ESCALATE');
    });

    it('should return BLOCK for 2+ critical indicators', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: false,
        externalValidationPresent: true,
        externalVerificationAvailable: true,
        reasoningStepCount: 3,
        reasoningFullyVisible: true,
        claimsUrgency: false,
        requestsBypassReview: false,
        claimsSuccess: false,
        evidenceProvided: true,
        outOfScopeModifications: ['/etc/passwd'], // Critical 1
        reasoningBehaviorAlignment: 0.2, // Critical 2
      };

      const result = detector.detect(context);

      expect(result.action).toBe('BLOCK');
    });
  });

  // ==========================================
  // RISK MODIFIER CAP
  // ==========================================

  describe('Risk Modifier Cap', () => {
    it('should cap risk modifier at 4', () => {
      const context: DeceptiveComplianceContext = {
        agentValidatesOwnWork: true,
        externalValidationPresent: false, // +1
        externalVerificationAvailable: false, // +1
        reasoningStepCount: 10,
        reasoningFullyVisible: false, // +0.5
        claimsUrgency: true,
        requestsBypassReview: true, // +0.5
        claimsSuccess: true,
        evidenceProvided: false, // +0.5
        outOfScopeModifications: ['/etc/passwd'], // +1.5
        reasoningBehaviorAlignment: 0.2, // +2.0 (would exceed cap)
      };

      const result = detector.detect(context);

      expect(result.riskModifier).toBeLessThanOrEqual(4);
    });
  });
});
