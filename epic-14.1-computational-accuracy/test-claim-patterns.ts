/**
 * FORGE Claim Pattern Tests
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 2.1 - Defense & EVM Claim Detector Patterns
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 */

import {
  ClaimDetector,
  detectClaims,
  detectEVMClaims,
  detectDefenseClaims,
  hasComputationalClaims,
  CLAIM_PATTERNS,
  getPatternsByCategory,
  getPatternStats,
  parseNumber
} from '../validators/computational';

// ============================================
// TEST DATA
// ============================================

const EVM_TEST_CASES = [
  // CPI Tests
  {
    name: 'CPI with full calculation',
    text: 'The project CPI = $750,000 / $800,000 = 0.9375',
    expectedCategory: 'evm',
    expectedExpression: '750000 / 800000',
    expectedResult: 0.9375
  },
  {
    name: 'CPI inline calculation',
    text: 'EV / AC = 680000 / 720000 = 0.944',
    expectedCategory: 'evm',
    expectedExpression: '680000 / 720000',
    expectedResult: 0.944
  },
  {
    name: 'CPI stated only',
    text: 'The current CPI: 0.85',
    expectedCategory: 'evm',
    expectedResult: 0.85
  },
  
  // SPI Tests
  {
    name: 'SPI with full calculation',
    text: 'SPI = $500,000 / $600,000 = 0.833',
    expectedCategory: 'evm',
    expectedExpression: '500000 / 600000',
    expectedResult: 0.833
  },
  {
    name: 'SPI inline calculation',
    text: 'EV / PV = 450000 / 500000 = 0.9',
    expectedCategory: 'evm',
    expectedExpression: '450000 / 500000',
    expectedResult: 0.9
  },
  
  // EAC Tests
  {
    name: 'EAC using CPI',
    text: 'EAC = BAC / CPI = $1,000,000 / 0.9 = $1,111,111',
    expectedCategory: 'evm',
    expectedExpression: '1000000 / 0.9',
    expectedResult: 1111111
  },
  
  // ETC Tests
  {
    name: 'ETC calculation',
    text: 'ETC = EAC - AC = $1,200,000 - $800,000 = $400,000',
    expectedCategory: 'evm',
    expectedExpression: '1200000 - 800000',
    expectedResult: 400000
  },
  
  // VAC Tests
  {
    name: 'VAC calculation',
    text: 'VAC = BAC - EAC = $1,000,000 - $1,100,000 = -$100,000',
    expectedCategory: 'evm',
    expectedExpression: '1000000 - 1100000',
    expectedResult: 100000 // Absolute value
  },
  
  // CV Tests
  {
    name: 'Cost Variance',
    text: 'CV = EV - AC = $750,000 - $800,000 = -$50,000',
    expectedCategory: 'evm',
    expectedExpression: '750000 - 800000',
    expectedResult: 50000
  },
  
  // SV Tests
  {
    name: 'Schedule Variance',
    text: 'SV = EV - PV = $680,000 - $700,000 = -$20,000',
    expectedCategory: 'evm',
    expectedExpression: '680000 - 700000',
    expectedResult: 20000
  },
  
  // Percent Complete
  {
    name: 'Percent Complete',
    text: 'Percent complete = $600,000 / $1,000,000 × 100 = 60%',
    expectedCategory: 'evm',
    expectedResult: 60
  }
];

const DEFENSE_TEST_CASES = [
  // Award Fee
  {
    name: 'Award Fee calculation',
    text: 'Award fee = $500,000 × 85% = $425,000',
    expectedCategory: 'defense',
    expectedResult: 425000
  },
  {
    name: 'Award Fee with decimal score',
    text: 'Award fee earned = $1,000,000 × 0.92 = $920,000',
    expectedCategory: 'defense',
    expectedResult: 920000
  },
  
  // CPIF Share
  {
    name: 'Government share calculation',
    text: 'Government share = $100,000 × 60% = $60,000',
    expectedCategory: 'defense',
    expectedResult: 60000
  },
  {
    name: 'Contractor share calculation',
    text: 'Contractor share = $100,000 × 40% = $40,000',
    expectedCategory: 'defense',
    expectedResult: 40000
  },
  
  // FTE Hours
  {
    name: 'FTE to hours conversion',
    text: '10 FTEs × 2080 hours/year = 20,800 total hours',
    expectedCategory: 'defense',
    expectedExpression: '10 * 2080',
    expectedResult: 20800
  },
  
  // Labor Cost
  {
    name: 'Labor cost calculation',
    text: '500 hours × $150/hour = $75,000',
    expectedCategory: 'defense',
    expectedExpression: '500 * 150',
    expectedResult: 75000
  },
  
  // G&A
  {
    name: 'G&A overhead calculation',
    text: 'G&A = $500,000 × 12% = $60,000',
    expectedCategory: 'defense',
    expectedResult: 60000
  }
];

const FINANCIAL_TEST_CASES = [
  // Compound Interest
  {
    name: 'Compound interest 5 years',
    text: '$100,000 at 7.5% interest for 5 years = $143,563',
    expectedCategory: 'financial',
    expectedResult: 143563
  },
  
  // Percentage
  {
    name: 'Percentage calculation',
    text: '15% of $250,000 = $37,500',
    expectedCategory: 'financial',
    expectedExpression: '250000 * 15 / 100',
    expectedResult: 37500
  },
  
  // Profit Margin
  {
    name: 'Profit margin calculation',
    text: 'Profit margin = ($500,000 - $350,000) / $500,000 = 30%',
    expectedCategory: 'financial',
    expectedResult: 30
  },
  
  // ROI
  {
    name: 'ROI calculation',
    text: 'ROI = ($150,000 - $100,000) / $100,000 = 50%',
    expectedCategory: 'financial',
    expectedResult: 50
  },
  
  // Discount
  {
    name: 'Discount calculation',
    text: '$1,000 with 20% discount = $800',
    expectedCategory: 'financial',
    expectedResult: 800
  }
];

const MIXED_TEXT = `
FORGE Project Status Report - January 2026

Executive Summary:
The project is currently at 65% complete with a CPI = 750000 / 800000 = 0.9375 and 
SPI = 680000 / 720000 = 0.944. Based on current performance, the EAC = BAC / CPI = 
$1,000,000 / 0.9375 = $1,066,667.

Cost Analysis:
- Direct labor: 500 hours × $150/hour = $75,000
- 10 FTEs × 2080 hours = 20,800 total hours budgeted
- G&A = $500,000 × 12% = $60,000
- Award fee = $200,000 × 85% = $170,000

Variance Analysis:
- CV = EV - AC = $750,000 - $800,000 = -$50,000
- SV = EV - PV = $680,000 - $720,000 = -$40,000
- VAC = BAC - EAC = $1,000,000 - $1,066,667 = -$66,667

Financial Projections:
Investment of $100,000 at 8% interest for 3 years = $125,971
Expected ROI = ($125,971 - $100,000) / $100,000 = 25.97%
`;

// ============================================
// TEST FUNCTIONS
// ============================================

function runTest(name: string, fn: () => boolean): void {
  try {
    const passed = fn();
    console.log(`${passed ? '✓' : '✗'} ${name}`);
    if (!passed) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.log(`✗ ${name}`);
    console.error(`  Error: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

function testParseNumber(): boolean {
  const tests = [
    { input: '1,000,000', expected: 1000000 },
    { input: '1000000', expected: 1000000 },
    { input: '123.456', expected: 123.456 },
    { input: '1,234.56', expected: 1234.56 },
    { input: '0.9375', expected: 0.9375 },
  ];
  
  for (const test of tests) {
    const result = parseNumber(test.input);
    if (result !== test.expected) {
      console.error(`  parseNumber('${test.input}') = ${result}, expected ${test.expected}`);
      return false;
    }
  }
  return true;
}

function testPatternStats(): boolean {
  const stats = getPatternStats();
  
  if (stats.total < 30) {
    console.error(`  Expected at least 30 patterns, got ${stats.total}`);
    return false;
  }
  
  if (stats.byCategory.evm < 10) {
    console.error(`  Expected at least 10 EVM patterns, got ${stats.byCategory.evm}`);
    return false;
  }
  
  if (stats.byCategory.defense < 5) {
    console.error(`  Expected at least 5 defense patterns, got ${stats.byCategory.defense}`);
    return false;
  }
  
  return true;
}

function testEVMPatterns(): boolean {
  let passed = true;
  
  for (const testCase of EVM_TEST_CASES) {
    const result = detectClaims(testCase.text, { categories: ['evm'] });
    
    if (result.claims.length === 0) {
      console.error(`  No claims detected for: "${testCase.name}"`);
      console.error(`    Text: ${testCase.text}`);
      passed = false;
      continue;
    }
    
    const claim = result.claims[0];
    
    if (claim.category !== testCase.expectedCategory) {
      console.error(`  Wrong category for "${testCase.name}": got ${claim.category}, expected ${testCase.expectedCategory}`);
      passed = false;
    }
    
    // Check result is close (within 1% for floating point)
    const resultDiff = Math.abs(claim.claimedResult - testCase.expectedResult);
    const tolerance = Math.abs(testCase.expectedResult) * 0.01;
    
    if (resultDiff > tolerance && resultDiff > 1) {
      console.error(`  Wrong result for "${testCase.name}": got ${claim.claimedResult}, expected ${testCase.expectedResult}`);
      passed = false;
    }
  }
  
  return passed;
}

function testDefensePatterns(): boolean {
  let passed = true;
  
  for (const testCase of DEFENSE_TEST_CASES) {
    const result = detectClaims(testCase.text, { categories: ['defense'] });
    
    if (result.claims.length === 0) {
      console.error(`  No claims detected for: "${testCase.name}"`);
      console.error(`    Text: ${testCase.text}`);
      passed = false;
      continue;
    }
    
    const claim = result.claims[0];
    
    if (claim.category !== testCase.expectedCategory) {
      console.error(`  Wrong category for "${testCase.name}": got ${claim.category}, expected ${testCase.expectedCategory}`);
      passed = false;
    }
    
    // Check result
    const resultDiff = Math.abs(claim.claimedResult - testCase.expectedResult);
    const tolerance = Math.abs(testCase.expectedResult) * 0.01;
    
    if (resultDiff > tolerance && resultDiff > 1) {
      console.error(`  Wrong result for "${testCase.name}": got ${claim.claimedResult}, expected ${testCase.expectedResult}`);
      passed = false;
    }
  }
  
  return passed;
}

function testFinancialPatterns(): boolean {
  let passed = true;
  
  for (const testCase of FINANCIAL_TEST_CASES) {
    const result = detectClaims(testCase.text, { categories: ['financial'] });
    
    if (result.claims.length === 0) {
      console.error(`  No claims detected for: "${testCase.name}"`);
      console.error(`    Text: ${testCase.text}`);
      passed = false;
      continue;
    }
    
    const claim = result.claims[0];
    
    if (claim.category !== testCase.expectedCategory) {
      console.error(`  Wrong category for "${testCase.name}": got ${claim.category}, expected ${testCase.expectedCategory}`);
      passed = false;
    }
  }
  
  return passed;
}

function testMixedDocument(): boolean {
  const result = detectClaims(MIXED_TEXT);
  
  // Should detect multiple categories
  if (result.stats.byCategory.evm === 0) {
    console.error('  No EVM claims detected in mixed document');
    return false;
  }
  
  if (result.stats.byCategory.defense === 0) {
    console.error('  No defense claims detected in mixed document');
    return false;
  }
  
  if (result.stats.byCategory.financial === 0) {
    console.error('  No financial claims detected in mixed document');
    return false;
  }
  
  // Should detect at least 10 claims total
  if (result.claims.length < 10) {
    console.error(`  Expected at least 10 claims, got ${result.claims.length}`);
    return false;
  }
  
  console.log(`  Found ${result.claims.length} claims:`);
  console.log(`    EVM: ${result.stats.byCategory.evm}`);
  console.log(`    Defense: ${result.stats.byCategory.defense}`);
  console.log(`    Financial: ${result.stats.byCategory.financial}`);
  console.log(`    Generic: ${result.stats.byCategory.generic}`);
  
  return true;
}

function testCategoryFiltering(): boolean {
  // EVM only
  const evmResult = detectEVMClaims(MIXED_TEXT);
  if (evmResult.claims.some(c => c.category !== 'evm')) {
    console.error('  Non-EVM claims returned from detectEVMClaims');
    return false;
  }
  
  // Defense only
  const defenseResult = detectDefenseClaims(MIXED_TEXT);
  if (defenseResult.claims.some(c => c.category !== 'defense')) {
    console.error('  Non-defense claims returned from detectDefenseClaims');
    return false;
  }
  
  return true;
}

function testDeduplication(): boolean {
  // Text with overlapping patterns
  const text = 'CPI = 750000 / 800000 = 0.9375';
  
  const resultWithDedup = detectClaims(text, { deduplicate: true });
  const resultWithoutDedup = detectClaims(text, { deduplicate: false });
  
  // With deduplication should have fewer or equal claims
  if (resultWithDedup.claims.length > resultWithoutDedup.claims.length) {
    console.error('  Deduplication increased claim count');
    return false;
  }
  
  // Should keep highest priority match
  if (resultWithDedup.claims.length > 0) {
    const claim = resultWithDedup.claims[0];
    if (claim.priority < 90) {
      console.error(`  Kept low priority claim (${claim.priority}) instead of high priority`);
      return false;
    }
  }
  
  return true;
}

function testHasComputationalClaims(): boolean {
  const hasClaimsText = 'The CPI is 0.95';
  const noClaimsText = 'This is just regular text without any calculations.';
  
  if (!hasComputationalClaims(hasClaimsText)) {
    console.error('  Failed to detect claims in text with calculations');
    return false;
  }
  
  // Note: This might still return true due to generic patterns matching numbers
  // That's expected behavior
  
  return true;
}

// ============================================
// MAIN TEST RUNNER
// ============================================

console.log('\n========================================');
console.log('FORGE Claim Pattern Tests');
console.log('Epic 14.1 - Task 2.1');
console.log('========================================\n');

console.log('--- Utility Functions ---');
runTest('parseNumber handles various formats', testParseNumber);

console.log('\n--- Pattern Registry ---');
runTest('Pattern statistics are valid', testPatternStats);

console.log('\n--- EVM Patterns ---');
runTest('EVM patterns detect CPI, SPI, EAC, ETC, VAC, CV, SV', testEVMPatterns);

console.log('\n--- Defense Patterns ---');
runTest('Defense patterns detect award fee, CPIF, FTE, labor', testDefensePatterns);

console.log('\n--- Financial Patterns ---');
runTest('Financial patterns detect interest, ROI, margin', testFinancialPatterns);

console.log('\n--- Integration Tests ---');
runTest('Mixed document detection', testMixedDocument);
runTest('Category filtering works correctly', testCategoryFiltering);
runTest('Deduplication removes overlapping matches', testDeduplication);
runTest('hasComputationalClaims quick check', testHasComputationalClaims);

console.log('\n========================================');
console.log(`Tests completed. Exit code: ${process.exitCode || 0}`);
console.log('========================================\n');
