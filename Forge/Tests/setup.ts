/**
 * FORGE B-D Platform - Test Setup
 * 
 * Global test configuration and setup.
 * Runs before all test files.
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// ============================================================
// ENVIRONMENT SETUP
// ============================================================

beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  
  // Mock Wolfram API key (not real)
  process.env.WOLFRAM_APP_ID = 'TEST-XXXXX-XXXXXXXXXX';
  
  // Mock Anthropic API key (not real)
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-xxxxx';
});

afterAll(() => {
  // Cleanup
});

afterEach(() => {
  // Reset all mocks between tests
  vi.clearAllMocks();
});

// ============================================================
// GLOBAL MOCKS
// ============================================================

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200
  })
);

// Mock console methods to reduce noise
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
// Keep warn and error for debugging
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});

// ============================================================
// CUSTOM MATCHERS REGISTRATION
// ============================================================

// Extend expect with custom matchers
// These are registered in test-utils.ts via expect.extend()

// ============================================================
// PERFORMANCE TRACKING
// ============================================================

let testStartTime: number;

beforeAll(() => {
  testStartTime = Date.now();
});

afterAll(() => {
  const duration = Date.now() - testStartTime;
  console.log(`\nTotal test suite duration: ${duration}ms`);
});

// ============================================================
// ERROR HANDLING
// ============================================================

// Catch unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
});
