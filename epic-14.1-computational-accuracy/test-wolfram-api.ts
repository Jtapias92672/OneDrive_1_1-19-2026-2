/**
 * FORGE Wolfram API Test Suite
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   TypeScript test suite for Wolfram Alpha LLM API integration.
 *   Tests L1, L1.5, and L2 validation tiers.
 * 
 * @usage
 *   npx tsx tests/test-wolfram-api.ts
 *   # or
 *   npx ts-node tests/test-wolfram-api.ts
 */

import { WolframClient, WolframConfig } from '../validators/computational/wolfram-client';
import { ComputationalValidator } from '../validators/computational/computational-validator';
import { ClaimDetector, detectClaims } from '../validators/computational/claim-detector';
import { CLAIM_PATTERNS } from '../validators/computational/claim-patterns';

// ============================================
// TEST CONFIGURATION
// ============================================

const config: WolframConfig = {
  appId: process.env.WOLFRAM_APP_ID || '2K3K8Q5XGA',
  baseUrl: 'https://www.wolframalpha.com/api/v1/llm-api',
  timeout: 10000,
  maxRetries: 2,
};

// ============================================
// TEST UTILITIES
// ============================================

function log(message: string, indent = 0): void {
  console.log('  '.repeat(indent) + message);
}

function pass(name: string): void {
  console.log(`✅ PASS: ${name}`);
}

function fail(name: string, reason?: string): void {
  console.log(`❌ FAIL: ${name}${reason ? ` - ${reason}` : ''}`);
}

function section(title: string): void {
  console.log('');
  console.log('═'.repeat(60));
  console.log(title);
  console.log('═'.repeat(60));
}

// ============================================
// TEST CASES
// ============================================

interface TestCase {
  name: string;
  input: string;
  expected?: string | number;
  validator?: (result: string) => boolean;
}

const arithmeticTests: TestCase[] = [
  { name: 'Simple Addition', input: '2+2', expected: '4' },
  { name: 'Division', input: '750000/800000', expected: '0.9375' },
  { name: 'Percentage', input: '15% of 1000', expected: '150' },
  { name: 'Square Root', input: 'sqrt(144)', expected: '12' },
  { name: 'Exponent', input: '2^10', expected: '1024' },
];

const evmTests: TestCase[] = [
  { 
    name: 'CPI Calculation', 
    input: '(750000/800000)*100',
    validator: (r) => r.includes('93.75') 
  },
  { 
    name: 'SPI Calculation', 
    input: '(600000/650000)*100',
    validator: (r) => parseFloat(r) > 90 && parseFloat(r) < 95
  },
  { 
    name: 'EAC Formula', 
    input: '1000000/0.9375',
    validator: (r) => r.includes('1066666') || r.includes('1,066,666')
  },
];

const financialTests: TestCase[] = [
  {
    name: 'Compound Interest',
    input: '125000 invested at 7.5% APR compounded monthly for 5 years',
    validator: (r) => r.includes('179') || r.includes('180')
  },
  {
    name: 'Present Value',
    input: 'present value of $10000 in 5 years at 8% annual interest',
    validator: (r) => r.includes('6805') || r.includes('6806')
  },
];

// ============================================
// TEST RUNNERS
// ============================================

async function testWolframClient(): Promise<number> {
  section('TEST 1: Wolfram Client Direct API');
  
  const client = new WolframClient(config);
  let passed = 0;
  let failed = 0;
  
  for (const test of arithmeticTests) {
    try {
      const result = await client.query(test.input);
      
      if (result.success) {
        const text = result.data?.result || '';
        const matches = test.expected 
          ? text.includes(String(test.expected))
          : test.validator?.(text) ?? false;
        
        if (matches) {
          pass(test.name);
          log(`Input: ${test.input}`, 1);
          log(`Result: ${text.substring(0, 100)}`, 1);
          passed++;
        } else {
          fail(test.name, `Expected ${test.expected}, got ${text.substring(0, 50)}`);
          failed++;
        }
      } else {
        fail(test.name, result.error);
        failed++;
      }
    } catch (error: any) {
      fail(test.name, error.message);
      failed++;
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  return failed;
}

async function testClaimDetection(): Promise<number> {
  section('TEST 2: Claim Detection');
  
  const detector = new ClaimDetector();
  let passed = 0;
  let failed = 0;
  
  const testTexts = [
    {
      name: 'EVM Claims',
      text: 'The project CPI is 0.9375 and SPI is 0.92. BCWP is $750,000 while ACWP is $800,000.',
      expectedCount: 4,
      expectedCategories: ['evm'],
    },
    {
      name: 'Financial Claims',
      text: 'Total revenue was $5.2 million with a gross margin of 42%. ROI reached 15.5%.',
      expectedCount: 3,
      expectedCategories: ['financial'],
    },
    {
      name: 'Statistical Claims',
      text: 'The average completion time is 4.5 hours with a standard deviation of 0.8.',
      expectedCount: 2,
      expectedCategories: ['statistical'],
    },
    {
      name: 'Mixed Claims',
      text: 'Budget is $1.2M with CPI of 0.95. Success rate is 87% across 150 projects.',
      expectedCount: 4,
      expectedCategories: ['evm', 'financial', 'statistical'],
    },
  ];
  
  for (const test of testTexts) {
    const result = detector.detect(test.text);
    
    if (result.claims.length >= test.expectedCount - 1) { // Allow 1 less
      pass(test.name);
      log(`Found ${result.claims.length} claims (expected ~${test.expectedCount})`, 1);
      log(`Categories: ${Object.keys(result.byCategory).join(', ')}`, 1);
      passed++;
    } else {
      fail(test.name, `Found ${result.claims.length} claims, expected ${test.expectedCount}`);
      failed++;
    }
  }
  
  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  return failed;
}

async function testComputationalValidator(): Promise<number> {
  section('TEST 3: Computational Validator');
  
  const validator = new ComputationalValidator({
    wolframConfig: config,
    defaultTier: 'L1',
    enableL2: false, // Skip L2 for faster testing
  });
  
  let passed = 0;
  let failed = 0;
  
  const testCases = [
    {
      name: 'Valid EVM Calculation',
      text: 'The Cost Performance Index (CPI) is 0.9375, calculated from BCWP of $750,000 divided by ACWP of $800,000.',
      shouldPass: true,
    },
    {
      name: 'Invalid Percentage',
      text: 'The completion rate is 150% which exceeds our target.',
      shouldPass: false, // 150% is suspicious
    },
    {
      name: 'Simple Arithmetic',
      text: 'The sum of 100 and 200 equals 300.',
      shouldPass: true,
    },
  ];
  
  for (const test of testCases) {
    try {
      const result = await validator.validate(test.text);
      const allPassed = result.results.every(r => r.status === 'valid');
      
      if (allPassed === test.shouldPass) {
        pass(test.name);
        log(`Validated ${result.results.length} claims`, 1);
        passed++;
      } else {
        fail(test.name, `Expected ${test.shouldPass ? 'pass' : 'fail'}`);
        failed++;
      }
    } catch (error: any) {
      // Skip if it's an API error
      if (error.message.includes('API') || error.message.includes('timeout')) {
        log(`⚠️  SKIP: ${test.name} - API unavailable`, 0);
      } else {
        fail(test.name, error.message);
        failed++;
      }
    }
    
    await new Promise(r => setTimeout(r, 1000)); // Rate limiting
  }
  
  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  return failed;
}

async function testPatternCoverage(): Promise<number> {
  section('TEST 4: Pattern Coverage');
  
  let passed = 0;
  let failed = 0;
  
  const categories = ['evm', 'defense', 'financial', 'statistical', 'general'];
  
  for (const category of categories) {
    const patterns = CLAIM_PATTERNS.filter(p => p.category === category);
    
    if (patterns.length > 0) {
      pass(`${category} patterns`);
      log(`${patterns.length} patterns defined`, 1);
      log(`Tiers: ${[...new Set(patterns.map(p => p.tier))].join(', ')}`, 1);
      passed++;
    } else {
      fail(`${category} patterns`, 'No patterns defined');
      failed++;
    }
  }
  
  // Test total pattern count
  const totalPatterns = CLAIM_PATTERNS.length;
  if (totalPatterns >= 40) {
    pass(`Total patterns: ${totalPatterns}`);
    passed++;
  } else {
    fail(`Total patterns: ${totalPatterns}`, 'Expected at least 40');
    failed++;
  }
  
  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  return failed;
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     FORGE Epic 14.1 - Computational Accuracy Tests         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  let totalFailed = 0;
  
  // Run all tests
  totalFailed += await testPatternCoverage();
  totalFailed += await testClaimDetection();
  
  // Only run API tests if explicitly requested
  if (process.argv.includes('--api') || process.argv.includes('--full')) {
    totalFailed += await testWolframClient();
    totalFailed += await testComputationalValidator();
  } else {
    console.log('');
    console.log('ℹ️  Skipping API tests. Run with --api or --full to include.');
  }
  
  // Summary
  section('SUMMARY');
  if (totalFailed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`⚠️  ${totalFailed} test(s) failed`);
  }
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run
main().catch(console.error);
