/**
 * FORGE Platform - Wolfram Alpha API Test Suite
 * @epic 14.1 - Computational Accuracy Layer
 * 
 * Tests for Wolfram Alpha LLM API integration
 */

import { config } from 'dotenv';

// Load environment variables
config();

// ============================================================================
// Types
// ============================================================================

interface WolframResponse {
  success: boolean;
  result?: string;
  pods?: WolframPod[];
  error?: string;
  latencyMs: number;
}

interface WolframPod {
  title: string;
  scanner: string;
  id: string;
  position: number;
  subpods: Array<{
    title: string;
    plaintext?: string;
    img?: {
      src: string;
      alt: string;
    };
  }>;
}

interface TestResult {
  name: string;
  passed: boolean;
  input: string;
  expected?: string | number;
  actual?: string | number;
  latencyMs: number;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const WOLFRAM_CONFIG = {
  appId: process.env.WOLFRAM_APP_ID || '2K3K8Q5XGA',
  baseUrl: 'https://www.wolframalpha.com/api/v1/llm-api',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// ============================================================================
// API Client
// ============================================================================

async function queryWolfram(input: string): Promise<WolframResponse> {
  const startTime = Date.now();
  
  try {
    const url = new URL(WOLFRAM_CONFIG.baseUrl);
    url.searchParams.set('appid', WOLFRAM_CONFIG.appId);
    url.searchParams.set('input', input);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WOLFRAM_CONFIG.timeout);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const latencyMs = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        latencyMs,
      };
    }
    
    const text = await response.text();
    
    return {
      success: true,
      result: text,
      latencyMs,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

async function queryWithRetry(input: string): Promise<WolframResponse> {
  let lastError: WolframResponse | null = null;
  
  for (let attempt = 1; attempt <= WOLFRAM_CONFIG.retryAttempts; attempt++) {
    const response = await queryWolfram(input);
    
    if (response.success) {
      return response;
    }
    
    lastError = response;
    
    if (attempt < WOLFRAM_CONFIG.retryAttempts) {
      await new Promise(resolve => 
        setTimeout(resolve, WOLFRAM_CONFIG.retryDelay * attempt)
      );
    }
  }
  
  return lastError!;
}

// ============================================================================
// Test Cases
// ============================================================================

const arithmeticTests = [
  { input: '750000 / 680000', expected: '1.103' },
  { input: '750000 / 700000', expected: '1.071' },
  { input: '1000000 / 1.103', expected: '906618' },
  { input: '750000 - 680000', expected: '70000' },
  { input: '750000 - 700000', expected: '50000' },
  { input: '100 + 200 + 300', expected: '600' },
  { input: '25 * 4', expected: '100' },
  { input: 'sqrt(16)', expected: '4' },
  { input: '2^10', expected: '1024' },
];

const evmTests = [
  { 
    input: 'CPI where EV=750000 and AC=680000', 
    description: 'Cost Performance Index',
    expectedContains: '1.1' 
  },
  { 
    input: 'EV/PV where EV=750000 and PV=700000', 
    description: 'Schedule Performance Index',
    expectedContains: '1.07' 
  },
  { 
    input: '(750000 - 680000) / (1000000 - 680000)', 
    description: 'TCPI calculation',
    expectedContains: '0.2' 
  },
];

const compoundInterestTests = [
  { 
    input: '125000 * (1 + 0.075)^5', 
    description: 'Compound interest',
    expected: '179584' 
  },
  { 
    input: '100000 * (1.05)^10', 
    description: '5% interest over 10 years',
    expectedContains: '162889' 
  },
];

const conversionTests = [
  { input: '100 miles in km', expectedContains: '160' },
  { input: '100 celsius to fahrenheit', expectedContains: '212' },
  { input: '1 meter in feet', expectedContains: '3.28' },
];

// ============================================================================
// Test Runner
// ============================================================================

async function runTest(
  name: string,
  input: string,
  validator: (result: string) => boolean
): Promise<TestResult> {
  console.log(`  Running: ${name}`);
  
  const response = await queryWithRetry(input);
  
  if (!response.success) {
    return {
      name,
      passed: false,
      input,
      latencyMs: response.latencyMs,
      error: response.error,
    };
  }
  
  const passed = validator(response.result || '');
  
  return {
    name,
    passed,
    input,
    actual: response.result,
    latencyMs: response.latencyMs,
  };
}

function containsValue(result: string, expected: string): boolean {
  // Normalize and check if expected value is in result
  const normalizedResult = result.replace(/[,\s]/g, '').toLowerCase();
  const normalizedExpected = expected.replace(/[,\s]/g, '').toLowerCase();
  return normalizedResult.includes(normalizedExpected);
}

function approximatelyEquals(result: string, expected: string, tolerance: number = 0.01): boolean {
  // Extract numbers from result
  const numbers = result.match(/[\d.]+/g);
  if (!numbers) return false;
  
  const expectedNum = parseFloat(expected);
  
  for (const numStr of numbers) {
    const num = parseFloat(numStr);
    if (Math.abs(num - expectedNum) / expectedNum <= tolerance) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// Main Test Suite
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('\n========================================');
  console.log('FORGE Wolfram Alpha API Test Suite');
  console.log('========================================\n');
  
  const results: TestResult[] = [];
  
  // Test API connectivity
  console.log('1. API Connectivity Test');
  console.log('------------------------');
  const connectivityResult = await runTest(
    'Basic API Call',
    '2+2',
    (result) => result.includes('4')
  );
  results.push(connectivityResult);
  console.log(`   ${connectivityResult.passed ? '✓' : '✗'} ${connectivityResult.name} (${connectivityResult.latencyMs}ms)`);
  
  if (!connectivityResult.passed) {
    console.log('\n❌ API connectivity failed. Check WOLFRAM_APP_ID.');
    console.log(`   Error: ${connectivityResult.error}`);
    return;
  }
  
  // Arithmetic tests
  console.log('\n2. Arithmetic Tests');
  console.log('-------------------');
  for (const test of arithmeticTests) {
    const result = await runTest(
      `${test.input} = ${test.expected}`,
      test.input,
      (r) => containsValue(r, test.expected)
    );
    results.push(result);
    console.log(`   ${result.passed ? '✓' : '✗'} ${result.name} (${result.latencyMs}ms)`);
  }
  
  // EVM tests
  console.log('\n3. EVM Calculation Tests');
  console.log('------------------------');
  for (const test of evmTests) {
    const result = await runTest(
      test.description,
      test.input,
      (r) => containsValue(r, test.expectedContains)
    );
    results.push(result);
    console.log(`   ${result.passed ? '✓' : '✗'} ${result.name} (${result.latencyMs}ms)`);
  }
  
  // Compound interest tests
  console.log('\n4. Compound Interest Tests');
  console.log('--------------------------');
  for (const test of compoundInterestTests) {
    const result = await runTest(
      test.description,
      test.input,
      (r) => test.expected 
        ? approximatelyEquals(r, test.expected)
        : containsValue(r, test.expectedContains!)
    );
    results.push(result);
    console.log(`   ${result.passed ? '✓' : '✗'} ${result.name} (${result.latencyMs}ms)`);
  }
  
  // Conversion tests
  console.log('\n5. Unit Conversion Tests');
  console.log('------------------------');
  for (const test of conversionTests) {
    const result = await runTest(
      test.input,
      test.input,
      (r) => containsValue(r, test.expectedContains)
    );
    results.push(result);
    console.log(`   ${result.passed ? '✓' : '✗'} ${result.name} (${result.latencyMs}ms)`);
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;
  
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed}`);
  console.log(`Average Latency: ${avgLatency.toFixed(0)}ms`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.name}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
  }
  
  console.log('\n');
}

// ============================================================================
// Jest-style tests for integration
// ============================================================================

describe('Wolfram Alpha API', () => {
  jest.setTimeout(30000); // 30 second timeout
  
  describe('Connectivity', () => {
    it('should connect to Wolfram API', async () => {
      const response = await queryWolfram('2+2');
      expect(response.success).toBe(true);
      expect(response.result).toContain('4');
    });
  });
  
  describe('Basic Arithmetic', () => {
    it('should calculate division', async () => {
      const response = await queryWolfram('750000 / 680000');
      expect(response.success).toBe(true);
      expect(containsValue(response.result!, '1.103')).toBe(true);
    });
    
    it('should calculate subtraction', async () => {
      const response = await queryWolfram('750000 - 680000');
      expect(response.success).toBe(true);
      expect(containsValue(response.result!, '70000')).toBe(true);
    });
    
    it('should calculate square root', async () => {
      const response = await queryWolfram('sqrt(16)');
      expect(response.success).toBe(true);
      expect(response.result).toContain('4');
    });
  });
  
  describe('EVM Calculations', () => {
    it('should calculate CPI', async () => {
      const response = await queryWolfram('750000 / 680000');
      expect(response.success).toBe(true);
      expect(approximatelyEquals(response.result!, '1.103')).toBe(true);
    });
    
    it('should calculate SPI', async () => {
      const response = await queryWolfram('750000 / 700000');
      expect(response.success).toBe(true);
      expect(approximatelyEquals(response.result!, '1.071')).toBe(true);
    });
  });
  
  describe('Financial Calculations', () => {
    it('should calculate compound interest', async () => {
      const response = await queryWolfram('125000 * (1.075)^5');
      expect(response.success).toBe(true);
      expect(containsValue(response.result!, '179')).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid queries gracefully', async () => {
      const response = await queryWolfram('asdfghjkl');
      // May succeed with "no short answer" or similar
      expect(response.latencyMs).toBeGreaterThan(0);
    });
  });
  
  describe('Performance', () => {
    it('should respond within timeout', async () => {
      const response = await queryWolfram('2+2');
      expect(response.latencyMs).toBeLessThan(WOLFRAM_CONFIG.timeout);
    });
  });
});

// ============================================================================
// Exports
// ============================================================================

export {
  queryWolfram,
  queryWithRetry,
  containsValue,
  approximatelyEquals,
  arithmeticTests,
  evmTests,
  compoundInterestTests,
  conversionTests,
  runAllTests,
  WOLFRAM_CONFIG,
};

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
