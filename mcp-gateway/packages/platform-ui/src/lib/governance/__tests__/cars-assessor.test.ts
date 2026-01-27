import { carsAssessor, CARSContext, CARSAction } from '../cars';

describe('CARSAssessor', () => {
  beforeEach(() => {
    carsAssessor.clearUserHistory();
  });

  const baseContext: CARSContext = {
    environment: 'development',
    dataClassification: 1,
    scope: 'single-file',
    userId: 'user-123',
    workflowType: 'figma-to-code',
  };

  const baseAction: CARSAction = {
    type: 'code-generation',
    target: 'src/components/Button',
    reversible: true,
    estimatedImpact: 'low',
  };

  describe('assess', () => {
    it('returns low risk for minimal context', () => {
      const result = carsAssessor.assess(baseContext, baseAction);

      expect(result.risk.level).toBe('low');
      expect(result.risk.score).toBeLessThanOrEqual(25);
      expect(result.risk.factors).toHaveLength(6);
    });

    it('returns high risk for production + high impact', () => {
      const context: CARSContext = {
        ...baseContext,
        environment: 'production',
        dataClassification: 3,
      };
      const action: CARSAction = {
        ...baseAction,
        reversible: false,
        estimatedImpact: 'high',
      };

      const result = carsAssessor.assess(context, action);

      expect(result.risk.level).toBe('high');
      expect(result.risk.score).toBeGreaterThan(50);
    });

    it('returns critical risk for maximum risk factors', () => {
      const context: CARSContext = {
        environment: 'production',
        dataClassification: 4,
        scope: 'system-wide',
        userId: 'user-456',
        workflowType: 'deployment',
      };
      const action: CARSAction = {
        type: 'deployment',
        target: 'production-system',
        reversible: false,
        estimatedImpact: 'high',
      };

      const result = carsAssessor.assess(context, action);

      expect(result.risk.level).toBe('critical');
      expect(result.risk.score).toBeGreaterThan(75);
    });

    it('includes assessment ID and timestamp', () => {
      const result = carsAssessor.assess(baseContext, baseAction);

      expect(result.id).toMatch(/^cars-/);
      expect(result.assessedAt).toBeInstanceOf(Date);
    });

    it('stores context and action in assessment', () => {
      const result = carsAssessor.assess(baseContext, baseAction);

      expect(result.context).toEqual(baseContext);
      expect(result.action).toEqual(baseAction);
    });
  });

  describe('risk factors', () => {
    it('calculates data sensitivity factor correctly', () => {
      const contexts = [
        { ...baseContext, dataClassification: 1 as const },
        { ...baseContext, dataClassification: 2 as const },
        { ...baseContext, dataClassification: 3 as const },
        { ...baseContext, dataClassification: 4 as const },
      ];

      const results = contexts.map((c) => carsAssessor.assess(c, baseAction));
      const dataFactors = results.map(
        (r) => r.risk.factors.find((f) => f.name === 'Data Sensitivity')!
      );

      expect(dataFactors[0].value).toBe(0);
      expect(dataFactors[1].value).toBe(25);
      expect(dataFactors[2].value).toBe(50);
      expect(dataFactors[3].value).toBe(100);
    });

    it('calculates environment factor correctly', () => {
      const contexts = [
        { ...baseContext, environment: 'development' as const },
        { ...baseContext, environment: 'staging' as const },
        { ...baseContext, environment: 'production' as const },
      ];

      const results = contexts.map((c) => carsAssessor.assess(c, baseAction));
      const envFactors = results.map(
        (r) => r.risk.factors.find((f) => f.name === 'Environment')!
      );

      expect(envFactors[0].value).toBe(0);
      expect(envFactors[1].value).toBe(40);
      expect(envFactors[2].value).toBe(100);
    });

    it('calculates scope factor correctly', () => {
      const contexts = [
        { ...baseContext, scope: 'single-file' as const },
        { ...baseContext, scope: 'multiple-files' as const },
        { ...baseContext, scope: 'system-wide' as const },
      ];

      const results = contexts.map((c) => carsAssessor.assess(c, baseAction));
      const scopeFactors = results.map(
        (r) => r.risk.factors.find((f) => f.name === 'Scope')!
      );

      expect(scopeFactors[0].value).toBe(20);
      expect(scopeFactors[1].value).toBe(50);
      expect(scopeFactors[2].value).toBe(100);
    });

    it('calculates reversibility factor correctly', () => {
      const actions = [
        { ...baseAction, reversible: true },
        { ...baseAction, reversible: false },
      ];

      const results = actions.map((a) => carsAssessor.assess(baseContext, a));
      const revFactors = results.map(
        (r) => r.risk.factors.find((f) => f.name === 'Reversibility')!
      );

      expect(revFactors[0].value).toBe(0);
      expect(revFactors[1].value).toBe(100);
    });

    it('calculates impact factor correctly', () => {
      const actions = [
        { ...baseAction, estimatedImpact: 'low' as const },
        { ...baseAction, estimatedImpact: 'medium' as const },
        { ...baseAction, estimatedImpact: 'high' as const },
      ];

      const results = actions.map((a) => carsAssessor.assess(baseContext, a));
      const impactFactors = results.map(
        (r) => r.risk.factors.find((f) => f.name === 'Impact')!
      );

      expect(impactFactors[0].value).toBe(20);
      expect(impactFactors[1].value).toBe(50);
      expect(impactFactors[2].value).toBe(100);
    });

    it('calculates previous failures factor', () => {
      // First assessment - no history
      const result1 = carsAssessor.assess(baseContext, baseAction);
      expect(
        result1.risk.factors.find((f) => f.name === 'Previous Failures')!.value
      ).toBe(0);

      // Record some failures
      carsAssessor.recordOperationResult('user-123', false);
      carsAssessor.recordOperationResult('user-123', false);
      carsAssessor.recordOperationResult('user-123', true);

      // Second assessment - should have elevated risk
      const result2 = carsAssessor.assess(baseContext, baseAction);
      const failureFactor = result2.risk.factors.find(
        (f) => f.name === 'Previous Failures'
      )!;

      expect(failureFactor.value).toBeGreaterThan(0);
    });
  });

  describe('safeguards', () => {
    it('returns minimal safeguards for low risk', () => {
      const result = carsAssessor.assess(baseContext, baseAction);

      expect(result.safeguards.testsRequired).toBe(false);
      expect(result.safeguards.reviewRequired).toBe(false);
      expect(result.safeguards.approvalRequired).toBe(false);
      expect(result.safeguards.rollbackPlan).toBe(false);
    });

    it('requires tests for medium risk', () => {
      // Medium risk requires score 26-50
      // staging=40*0.2=8, tier2=25*0.25=6.25, scope=20*0.15=3, impact=50*0.15=7.5 = ~25
      // Need to push it over 25 a bit
      const context: CARSContext = {
        ...baseContext,
        environment: 'staging',
        dataClassification: 2,
        scope: 'multiple-files',
      };
      const action: CARSAction = {
        ...baseAction,
        estimatedImpact: 'medium',
      };

      const result = carsAssessor.assess(context, action);

      expect(result.risk.level).toBe('medium');
      expect(result.safeguards.testsRequired).toBe(true);
      expect(result.safeguards.approvalRequired).toBe(false);
    });

    it('requires approval for high risk', () => {
      // High risk requires score 51-75
      // prod=100*0.2=20, tier3=50*0.25=12.5, multiple=50*0.15=7.5, irreversible=100*0.15=15, high=100*0.15=15 = 70
      const context: CARSContext = {
        ...baseContext,
        environment: 'production',
        dataClassification: 3,
        scope: 'multiple-files',
      };
      const action: CARSAction = {
        ...baseAction,
        reversible: false,
        estimatedImpact: 'high',
      };

      const result = carsAssessor.assess(context, action);

      expect(result.risk.level).toBe('high');
      expect(result.safeguards.approvalRequired).toBe(true);
      expect(result.safeguards.reviewRequired).toBe(true);
    });

    it('requires all safeguards for critical risk', () => {
      const context: CARSContext = {
        environment: 'production',
        dataClassification: 4,
        scope: 'system-wide',
        userId: 'user-123',
        workflowType: 'deployment',
      };
      const action: CARSAction = {
        ...baseAction,
        reversible: false,
        estimatedImpact: 'high',
      };

      const result = carsAssessor.assess(context, action);

      expect(result.risk.level).toBe('critical');
      expect(result.safeguards.testsRequired).toBe(true);
      expect(result.safeguards.reviewRequired).toBe(true);
      expect(result.safeguards.approvalRequired).toBe(true);
      expect(result.safeguards.rollbackPlan).toBe(true);
      expect(result.safeguards.additionalChecks.length).toBeGreaterThan(0);
    });
  });

  describe('user history tracking', () => {
    it('tracks operation results', () => {
      expect(carsAssessor.getUserHistory('user-test')).toBeUndefined();

      carsAssessor.recordOperationResult('user-test', true);
      carsAssessor.recordOperationResult('user-test', false);

      const history = carsAssessor.getUserHistory('user-test');
      expect(history).toBeDefined();
      expect(history!.totalOperations).toBe(2);
      expect(history!.recentFailures).toBe(1);
    });

    it('clears user history', () => {
      carsAssessor.recordOperationResult('user-a', true);
      carsAssessor.recordOperationResult('user-b', true);

      carsAssessor.clearUserHistory('user-a');
      expect(carsAssessor.getUserHistory('user-a')).toBeUndefined();
      expect(carsAssessor.getUserHistory('user-b')).toBeDefined();

      carsAssessor.clearUserHistory();
      expect(carsAssessor.getUserHistory('user-b')).toBeUndefined();
    });
  });
});
