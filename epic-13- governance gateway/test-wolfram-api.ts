#!/usr/bin/env ts-node
/**
 * FORGE Wolfram API Integration Test
 * 
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * Run: npx ts-node tests/test-wolfram-api.ts
 * Or:  WOLFRAM_APP_ID=2K3K8Q5XGA node --loader ts-node/esm tests/test-wolfram-api.ts
 */

// For standalone testing without full build
const WOLFRAM_APP_ID = process.env.WOLFRAM_APP_ID || '2K3K8Q5XGA';
const WOLFRAM_BASE_URL = 'https://www.wolframalpha.com/api/v1/llm-api';

interface TestCase {
  name: string;
  query: string;
  expectedContains?: string;
  expectedNumeric?: number;
  tolerance?: number;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Basic Arithmetic',
    query: '125000 * 1.075^5',
    expectedNumeric: 179584.54,
    tolerance: 1,
  },
  {
    name: 'Percentage Calculation',
    query: '15% of 50000',
    expectedNumeric: 7500,
    tolerance: 0.01,
  },
  {
    name: 'SPI Calculation (EVM)',
    query: '(750000 - 680000) / 750000',
    expectedNumeric: 0.0933,
    tolerance: 0.01,
  },
  {
    name: 'Unit Conversion (Defense Context)',
    query: '15000 nautical miles to kilometers',
    expectedContains: 'kilometer',
  },
  {
    name: 'Date Math',
    query: 'days between March 15, 2025 and September 30, 2025',
    expectedNumeric: 199,
    tolerance: 1,
  },
  {
    name: 'Financial Compound Interest',
    query: '$100000 at 6% APR compounded monthly for 3 years',
    expectedContains: '119',
  },
];

async function queryWolfram(input: string): Promise<string> {
  const url = new URL(WOLFRAM_BASE_URL);
  url.searchParams.set('appid', WOLFRAM_APP_ID);
  url.searchParams.set('input', input);
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`Wolfram API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.text();
}

function extractNumeric(text: string): number | null {
  const cleaned = text.replace(/,/g, '').replace(/\$/g, '');
  const match = cleaned.match(/-?[\d.]+(?:e[+-]?\d+)?/i);
  return match ? parseFloat(match[0]) : null;
}

async function runTests(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  FORGE Wolfram Alpha LLM API Integration Test');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  App ID: ${WOLFRAM_APP_ID}`);
  console.log(`  API URL: ${WOLFRAM_BASE_URL}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('───────────────────────────────────────────────────────────────\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TEST_CASES) {
    process.stdout.write(`Testing: ${test.name}... `);
    
    try {
      const startTime = Date.now();
      const result = await queryWolfram(test.query);
      const latency = Date.now() - startTime;
      
      let success = false;
      let details = '';
      
      if (test.expectedNumeric !== undefined) {
        const numeric = extractNumeric(result);
        const tolerance = test.tolerance ?? 0.01;
        
        if (numeric !== null) {
          const diff = Math.abs(numeric - test.expectedNumeric);
          success = diff <= tolerance || (diff / Math.abs(test.expectedNumeric)) <= tolerance;
          details = `Got: ${numeric}, Expected: ${test.expectedNumeric}`;
        } else {
          details = `Could not extract numeric from: ${result.slice(0, 100)}`;
        }
      } else if (test.expectedContains) {
        success = result.toLowerCase().includes(test.expectedContains.toLowerCase());
        details = `Looking for "${test.expectedContains}" in result`;
      } else {
        success = result.length > 0;
        details = `Got response: ${result.slice(0, 100)}`;
      }
      
      if (success) {
        console.log(`✓ PASS (${latency}ms)`);
        console.log(`   Query: "${test.query}"`);
        console.log(`   ${details}\n`);
        passed++;
      } else {
        console.log(`✗ FAIL (${latency}ms)`);
        console.log(`   Query: "${test.query}"`);
        console.log(`   ${details}`);
        console.log(`   Raw: ${result.slice(0, 200)}\n`);
        failed++;
      }
      
      // Rate limit protection: small delay between calls
      await new Promise(r => setTimeout(r, 500));
      
    } catch (error) {
      console.log(`✗ ERROR`);
      console.log(`   Query: "${test.query}"`);
      console.log(`   Error: ${(error as Error).message}\n`);
      failed++;
    }
  }
  
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${TEST_CASES.length} total`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (failed === 0) {
    console.log('\n✓ All tests passed! Wolfram API integration is working.\n');
    console.log('Next steps:');
    console.log('  1. Import WolframClient into your FORGE validation pipeline');
    console.log('  2. Configure conditional invocation (only on L1 failures)');
    console.log('  3. Monitor usage via getUsageStats()\n');
  } else {
    console.log('\n⚠ Some tests failed. Check API key and network connectivity.\n');
    process.exit(1);
  }
}

// Run if executed directly
runTests().catch(console.error);
