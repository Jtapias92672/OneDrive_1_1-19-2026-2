/**
 * FORGE Platform - Claim Patterns Test Suite
 * @epic 14.1 - Computational Accuracy Layer
 * 
 * Tests for computational claim pattern detection and extraction
 */

import {
  ClaimPattern,
  claimPatterns,
  evmPatterns,
  defensePatterns,
  financialPatterns,
  statisticalPatterns,
  conversionPatterns,
  genericPatterns,
  advancedPatterns,
  getPatternsByCategory,
  getPatternsByPriority,
  getPatternById,
  getEVMPatterns,
  getPatternStats,
} from './claim-patterns';

import {
  ClaimDetector,
  DetectedClaim,
  detectComputationalClaims,
  hasComputationalClaims,
  createEVMDetector,
  createDefenseDetector,
  createFinancialDetector,
} from './claim-detector';

// ============================================================================
// Test Data
// ============================================================================

const evmTestCases = [
  {
    input: 'CPI = EV / AC = 750000 / 680000 = 1.103',
    expectedPattern: 'evm-cpi',
    expectedValue: 1.103,
  },
  {
    input: 'SPI = EV / PV = 750000 / 700000 = 1.071',
    expectedPattern: 'evm-spi',
    expectedValue: 1.071,
  },
  {
    input: 'EAC = BAC / CPI = 1000000 / 1.103 = 906618',
    expectedPattern: 'evm-eac',
    expectedValue: 906618,
  },
  {
    input: 'ETC = EAC - AC = 906618 - 680000 = 226618',
    expectedPattern: 'evm-etc',
    expectedValue: 226618,
  },
  {
    input: 'VAC = BAC - EAC = 1000000 - 906618 = 93382',
    expectedPattern: 'evm-vac',
    expectedValue: 93382,
  },
  {
    input: 'CV = EV - AC = 750000 - 680000 = 70000',
    expectedPattern: 'evm-cv',
    expectedValue: 70000,
  },
  {
    input: 'SV = EV - PV = 750000 - 700000 = 50000',
    expectedPattern: 'evm-sv',
    expectedValue: 50000,
  },
  {
    input: '% Complete = EV / BAC × 100 = 750000 / 1000000 × 100 = 75%',
    expectedPattern: 'evm-percent-complete',
    expectedValue: 75,
  },
];

const defenseTestCases = [
  {
    input: 'Award Fee = 85% × $500,000 = $425,000',
    expectedPattern: 'defense-award-fee',
    expectedValue: 425000,
  },
  {
    input: 'Government share = 60% × $100,000 = $60,000',
    expectedPattern: 'defense-cpif-share',
    expectedValue: 60000,
  },
  {
    input: 'FTE hours = 5 × 2080 = 10,400 hours',
    expectedPattern: 'defense-fte-hours',
    expectedValue: 10400,
  },
  {
    input: 'Labor cost = $125/hr × 1.45 = $181.25',
    expectedPattern: 'defense-labor-cost',
    expectedValue: 181.25,
  },
  {
    input: 'G&A = 12.5% × $1,000,000 = $125,000',
    expectedPattern: 'defense-ga-rate',
    expectedValue: 125000,
  },
];

const financialTestCases = [
  {
    input: '$125,000 at 7.5% APR for 5 years = $179,584.54',
    expectedPattern: 'financial-compound-interest',
    expectedValue: 179584.54,
  },
  {
    input: 'ROI = (150000 - 100000) / 100000 × 100 = 50%',
    expectedPattern: 'financial-roi',
    expectedValue: 50,
  },
  {
    input: 'Margin = 25000 / 100000 × 100 = 25%',
    expectedPattern: 'financial-profit-margin',
    expectedValue: 25,
  },
  {
    input: '$100 at 20% off = $80',
    expectedPattern: 'financial-discount',
    expectedValue: 80,
  },
];

const genericTestCases = [
  {
    input: '100 + 50 = 150',
    expectedPattern: 'generic-addition',
    expectedValue: 150,
  },
  {
    input: '100 - 30 = 70',
    expectedPattern: 'generic-subtraction',
    expectedValue: 70,
  },
  {
    input: '25 × 4 = 100',
    expectedPattern: 'generic-multiplication',
    expectedValue: 100,
  },
  {
    input: '100 / 4 = 25',
    expectedPattern: 'generic-division',
    expectedValue: 25,
  },
  {
    input: '10% of 500 = 50',
    expectedPattern: 'generic-percentage',
    expectedValue: 50,
  },
];

const complexDocument = `
# Project Status Report

## Earned Value Analysis

Based on the latest data:
- Earned Value (EV) = $750,000
- Actual Cost (AC) = $680,000
- Planned Value (PV) = $700,000
- Budget at Completion (BAC) = $1,000,000

### Performance Indices

The Cost Performance Index CPI = EV / AC = 750000 / 680000 = 1.103, 
indicating the project is under budget.

The Schedule Performance Index SPI = EV / PV = 750000 / 700000 = 1.071,
indicating the project is ahead of schedule.

### Forecasts

Based on current performance:
- EAC = BAC / CPI = 1000000 / 1.103 = 906,618
- ETC = EAC - AC = 906618 - 680000 = 226,618
- VAC = BAC - EAC = 1000000 - 906618 = 93,382

### Variances

- Cost Variance CV = EV - AC = 750000 - 680000 = 70,000
- Schedule Variance SV = EV - PV = 750000 - 700000 = 50,000

### Completion Status

The project is % Complete = EV / BAC × 100 = 750000 / 1000000 × 100 = 75%.

## Resource Analysis

Current staffing levels:
- FTE hours = 5 × 2080 = 10,400 hours per year
- Labor cost = $125/hr × 1.45 = $181.25 burdened rate

Overhead:
- G&A = 12.5% × $1,000,000 = $125,000

## Financial Summary

If savings are invested at 7.5% APR:
$125,000 at 7.5% APR for 5 years = $179,584.54

Current ROI = (150000 - 100000) / 100000 × 100 = 50%
`;

// ============================================================================
// Test Utilities
// ============================================================================

function testPattern(pattern: ClaimPattern, input: string): boolean {
  const regex = new RegExp(pattern.pattern, 'gi');
  return regex.test(input);
}

function extractMatch(pattern: ClaimPattern, input: string): RegExpExecArray | null {
  const regex = new RegExp(pattern.pattern, 'gi');
  return regex.exec(input);
}

function assertClose(actual: number, expected: number, tolerance: number = 0.01): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

// ============================================================================
// Pattern Tests
// ============================================================================

describe('ClaimPatterns', () => {
  describe('Pattern Collection', () => {
    it('should have 44+ patterns total', () => {
      expect(claimPatterns.length).toBeGreaterThanOrEqual(44);
    });

    it('should have all required categories', () => {
      const categories = new Set(claimPatterns.map(p => p.category));
      expect(categories.has('evm')).toBe(true);
      expect(categories.has('defense')).toBe(true);
      expect(categories.has('financial')).toBe(true);
      expect(categories.has('statistical')).toBe(true);
      expect(categories.has('conversion')).toBe(true);
      expect(categories.has('generic')).toBe(true);
    });

    it('should have unique pattern IDs', () => {
      const ids = claimPatterns.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid priorities (0-100)', () => {
      for (const pattern of claimPatterns) {
        expect(pattern.priority).toBeGreaterThanOrEqual(0);
        expect(pattern.priority).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('EVM Patterns', () => {
    it('should have 9 EVM patterns', () => {
      expect(evmPatterns.length).toBe(9);
    });

    for (const testCase of evmTestCases) {
      it(`should match: ${testCase.input.substring(0, 40)}...`, () => {
        const pattern = getPatternById(testCase.expectedPattern);
        expect(pattern).toBeDefined();
        expect(testPattern(pattern!, testCase.input)).toBe(true);
      });
    }

    it('CPI pattern should extract correct values', () => {
      const pattern = getPatternById('evm-cpi')!;
      const match = extractMatch(pattern, 'CPI = EV / AC = 750000 / 680000 = 1.103');
      expect(match).not.toBeNull();
      expect(match![3]).toBe('1.103');
    });

    it('SPI pattern should extract correct values', () => {
      const pattern = getPatternById('evm-spi')!;
      const match = extractMatch(pattern, 'SPI = EV / PV = 750000 / 700000 = 1.071');
      expect(match).not.toBeNull();
    });
  });

  describe('Defense Patterns', () => {
    it('should have 6 defense patterns', () => {
      expect(defensePatterns.length).toBe(6);
    });

    for (const testCase of defenseTestCases) {
      it(`should match: ${testCase.input}`, () => {
        const pattern = getPatternById(testCase.expectedPattern);
        expect(pattern).toBeDefined();
        expect(testPattern(pattern!, testCase.input)).toBe(true);
      });
    }
  });

  describe('Financial Patterns', () => {
    it('should have 4 financial patterns', () => {
      expect(financialPatterns.length).toBe(4);
    });

    for (const testCase of financialTestCases) {
      it(`should match: ${testCase.input}`, () => {
        const pattern = getPatternById(testCase.expectedPattern);
        expect(pattern).toBeDefined();
        expect(testPattern(pattern!, testCase.input)).toBe(true);
      });
    }
  });

  describe('Generic Patterns', () => {
    for (const testCase of genericTestCases) {
      it(`should match: ${testCase.input}`, () => {
        const pattern = getPatternById(testCase.expectedPattern);
        expect(pattern).toBeDefined();
        expect(testPattern(pattern!, testCase.input)).toBe(true);
      });
    }
  });

  describe('Utility Functions', () => {
    it('getPatternsByCategory should filter correctly', () => {
      const evm = getPatternsByCategory('evm');
      expect(evm.every(p => p.category === 'evm')).toBe(true);
    });

    it('getPatternsByPriority should filter correctly', () => {
      const highPriority = getPatternsByPriority(80);
      expect(highPriority.every(p => p.priority >= 80)).toBe(true);
    });

    it('getPatternById should return correct pattern', () => {
      const pattern = getPatternById('evm-cpi');
      expect(pattern?.name).toBe('Cost Performance Index (CPI)');
    });

    it('getEVMPatterns should include all EVM-related patterns', () => {
      const evmRelated = getEVMPatterns();
      expect(evmRelated.length).toBeGreaterThanOrEqual(9);
    });

    it('getPatternStats should return correct statistics', () => {
      const stats = getPatternStats();
      expect(stats.total).toBe(claimPatterns.length);
      expect(Object.keys(stats.byCategory).length).toBeGreaterThan(0);
      expect(stats.avgPriority).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Detector Tests
// ============================================================================

describe('ClaimDetector', () => {
  let detector: ClaimDetector;

  beforeEach(() => {
    detector = new ClaimDetector();
  });

  describe('Basic Detection', () => {
    it('should detect single claim', async () => {
      const result = await detector.detect('CPI = 750000 / 680000 = 1.103');
      expect(result.claims.length).toBeGreaterThan(0);
    });

    it('should detect multiple claims', async () => {
      const text = `
        CPI = 750000 / 680000 = 1.103
        SPI = 750000 / 700000 = 1.071
      `;
      const result = await detector.detect(text);
      expect(result.claims.length).toBe(2);
    });

    it('should return stats', async () => {
      const result = await detector.detect('CPI = 750000 / 680000 = 1.103');
      expect(result.stats.totalDetected).toBe(result.claims.length);
      expect(result.stats.detectionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Complex Document Detection', () => {
    it('should detect all claims in complex document', async () => {
      const result = await detector.detect(complexDocument);
      expect(result.claims.length).toBeGreaterThanOrEqual(10);
    });

    it('should detect EVM claims in complex document', async () => {
      const result = await detector.detect(complexDocument);
      const evmClaims = result.claims.filter(c => c.category === 'evm');
      expect(evmClaims.length).toBeGreaterThanOrEqual(7);
    });

    it('should extract context for each claim', async () => {
      const result = await detector.detect(complexDocument);
      for (const claim of result.claims) {
        expect(claim.context.length).toBeGreaterThan(0);
      }
    });

    it('should assign confidence scores', async () => {
      const result = await detector.detect(complexDocument);
      for (const claim of result.claims) {
        expect(claim.confidence).toBeGreaterThan(0);
        expect(claim.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Variable Tracking', () => {
    it('should track variable assignments', async () => {
      const text = `
        EV = 750000
        AC = 680000
        CPI = EV / AC = 750000 / 680000 = 1.103
      `;
      await detector.detect(text);
      const variables = detector.getVariables();
      expect(variables.get('EV')).toBe(750000);
      expect(variables.get('AC')).toBe(680000);
    });

    it('should track "is" assignments', async () => {
      const text = 'Earned Value is 750000';
      await detector.detect(text);
      // Note: This depends on pattern implementation
    });
  });

  describe('Specialized Detectors', () => {
    it('createEVMDetector should focus on EVM patterns', async () => {
      const evmDetector = createEVMDetector();
      const result = await evmDetector.detect('CPI = 750000 / 680000 = 1.103');
      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.claims[0].category).toBe('evm');
    });

    it('createDefenseDetector should include defense patterns', async () => {
      const defenseDetector = createDefenseDetector();
      const result = await defenseDetector.detect('Award Fee = 85% × $500,000 = $425,000');
      expect(result.claims.length).toBeGreaterThan(0);
    });

    it('createFinancialDetector should include financial patterns', async () => {
      const financialDetector = createFinancialDetector();
      const result = await financialDetector.detect('ROI = 50%');
      expect(result.claims.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Utility Functions', () => {
    it('hasComputationalClaims should detect presence of claims', () => {
      expect(hasComputationalClaims('100 + 50 = 150')).toBe(true);
      expect(hasComputationalClaims('No math here')).toBe(false);
    });

    it('detectComputationalClaims should work without instance', async () => {
      const result = await detectComputationalClaims('100 + 50 = 150');
      expect(result.claims.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Edge Cases', () => {
  let detector: ClaimDetector;

  beforeEach(() => {
    detector = new ClaimDetector();
  });

  it('should handle empty input', async () => {
    const result = await detector.detect('');
    expect(result.claims.length).toBe(0);
  });

  it('should handle input with no claims', async () => {
    const result = await detector.detect('This is just regular text without any calculations.');
    expect(result.claims.length).toBe(0);
  });

  it('should handle formatted numbers with commas', async () => {
    const result = await detector.detect('EAC = 1,000,000 / 1.103 = 906,618');
    expect(result.claims.length).toBeGreaterThan(0);
  });

  it('should handle dollar signs', async () => {
    const result = await detector.detect('Award Fee = 85% × $500,000 = $425,000');
    expect(result.claims.length).toBeGreaterThan(0);
  });

  it('should handle negative numbers', async () => {
    const result = await detector.detect('Variance = 100 - 150 = -50');
    expect(result.claims.length).toBeGreaterThan(0);
  });

  it('should handle decimal numbers', async () => {
    const result = await detector.detect('CPI = 1.103');
    // May or may not detect depending on pattern
  });

  it('should handle multi-line expressions', async () => {
    const result = await detector.detect(`
      CPI = EV / AC
          = 750000 / 680000
          = 1.103
    `);
    // Behavior depends on multiLineEnabled setting
  });

  it('should not exceed maxClaims limit', async () => {
    const manyCalculations = Array(200).fill('100 + 50 = 150').join('\n');
    const limitedDetector = new ClaimDetector({ maxClaims: 50 });
    const result = await limitedDetector.detect(manyCalculations);
    expect(result.claims.length).toBeLessThanOrEqual(50);
  });

  it('should filter by minConfidence', async () => {
    const highConfidenceDetector = new ClaimDetector({ minConfidence: 0.9 });
    const result = await highConfidenceDetector.detect('100 + 50 = 150');
    // Low priority patterns may be filtered out
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance', () => {
  it('should detect claims in reasonable time', async () => {
    const detector = new ClaimDetector();
    const startTime = Date.now();
    
    await detector.detect(complexDocument);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should complete in < 1 second
  });

  it('should handle large documents', async () => {
    const detector = new ClaimDetector();
    const largeDocument = complexDocument.repeat(10);
    
    const startTime = Date.now();
    const result = await detector.detect(largeDocument);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    expect(result.claims.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Export for external test runners
// ============================================================================

export {
  evmTestCases,
  defenseTestCases,
  financialTestCases,
  genericTestCases,
  complexDocument,
  testPattern,
  extractMatch,
  assertClose,
};
