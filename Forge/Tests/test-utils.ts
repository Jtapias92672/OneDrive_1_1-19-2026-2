/**
 * FORGE B-D Platform - Test Utilities
 * 
 * Shared test utilities across all packages.
 * Import this in all test files.
 */

import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';

// ============================================================
// TYPE-SAFE MOCKING
// ============================================================

/**
 * Create a type-safe mock function
 */
export function createMock<T extends (...args: any[]) => any>(): T & ReturnType<typeof vi.fn> {
  return vi.fn() as T & ReturnType<typeof vi.fn>;
}

/**
 * Create a mock object with all methods mocked
 */
export function createMockObject<T extends object>(partial: Partial<T> = {}): T {
  return partial as T;
}

// ============================================================
// ASYNC HELPERS
// ============================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
}

// ============================================================
// RESULT TYPE HELPERS
// ============================================================

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

export function expectSuccess<T, E>(result: Result<T, E>): asserts result is { success: true; data: T } {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error(`Expected success but got error: ${result.error}`);
  }
}

export function expectError<T, E>(result: Result<T, E>): asserts result is { success: false; error: E } {
  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error(`Expected error but got success: ${JSON.stringify(result.data)}`);
  }
}

// ============================================================
// CONTRACT FIXTURES
// ============================================================

export const FIXTURES = {
  contract: {
    minimal: {
      id: 'contract-001',
      name: 'Minimal Contract',
      version: '1.0.0',
      schema: {
        sections: [
          { id: 'content', type: 'text' as const, required: true }
        ],
        validationRules: []
      },
      status: 'active' as const,
      createdAt: new Date('2025-01-01').toISOString()
    },
    
    withValidation: {
      id: 'contract-002',
      name: 'Validated Contract',
      version: '1.0.0',
      schema: {
        sections: [
          { id: 'title', type: 'text' as const, required: true },
          { id: 'code', type: 'code' as const, required: true }
        ],
        validationRules: [
          { id: 'rule-001', type: 'regex' as const, expression: '^[A-Z]', errorMessage: 'Must start with uppercase' }
        ]
      },
      status: 'active' as const,
      createdAt: new Date('2025-01-01').toISOString()
    },
    
    compliance: {
      id: 'contract-003',
      name: 'CMMC Compliance Contract',
      version: '1.0.0',
      schema: {
        sections: [
          { id: 'audit_trail', type: 'data' as const, required: true },
          { id: 'evidence', type: 'data' as const, required: true }
        ],
        validationRules: [
          { id: 'rule-cmmc', type: 'custom' as const, expression: 'cmmc_level_2', errorMessage: 'CMMC Level 2 required' }
        ]
      },
      status: 'active' as const,
      tags: ['CMMC', 'DFARS', 'compliance'],
      createdAt: new Date('2025-01-01').toISOString()
    }
  },
  
  figma: {
    simpleFrame: {
      id: 'frame-001',
      type: 'FRAME' as const,
      name: 'Header',
      bounds: { x: 0, y: 0, width: 1200, height: 80 },
      children: [],
      styles: {}
    },
    
    textNode: {
      id: 'text-001',
      type: 'TEXT' as const,
      name: 'Title',
      bounds: { x: 20, y: 20, width: 200, height: 40 },
      children: [],
      styles: { fontSize: 24, fontFamily: 'Inter', fontWeight: 600 }
    },
    
    nestedFrame: {
      id: 'frame-002',
      type: 'FRAME' as const,
      name: 'Card',
      bounds: { x: 0, y: 0, width: 300, height: 200 },
      children: [
        {
          id: 'text-002',
          type: 'TEXT' as const,
          name: 'Card Title',
          bounds: { x: 16, y: 16, width: 268, height: 24 },
          children: [],
          styles: {}
        }
      ],
      styles: {}
    }
  },
  
  convergence: {
    session: {
      id: 'session-001',
      contractId: 'contract-001',
      status: 'running' as const,
      currentIteration: 0,
      maxIterations: 10,
      convergenceThreshold: 0.95,
      currentScore: 0,
      createdAt: new Date('2025-01-01').toISOString()
    }
  }
};

// ============================================================
// VALIDATION MATCHERS
// ============================================================

expect.extend({
  toBeValidContract(received: unknown) {
    const contract = received as any;
    const pass = 
      typeof contract === 'object' &&
      typeof contract.id === 'string' &&
      typeof contract.name === 'string' &&
      typeof contract.version === 'string' &&
      /^\d+\.\d+\.\d+$/.test(contract.version) &&
      typeof contract.schema === 'object' &&
      Array.isArray(contract.schema.sections);
    
    return {
      pass,
      message: () => pass
        ? `expected ${JSON.stringify(received)} not to be a valid contract`
        : `expected ${JSON.stringify(received)} to be a valid contract`
    };
  },
  
  toHaveConverged(received: unknown) {
    const session = received as any;
    const pass = session.status === 'converged' && session.currentScore >= session.convergenceThreshold;
    
    return {
      pass,
      message: () => pass
        ? `expected session not to have converged`
        : `expected session to have converged (score: ${session.currentScore}, threshold: ${session.convergenceThreshold})`
    };
  }
});

// ============================================================
// ENVIRONMENT SETUP
// ============================================================

export function setupTestEnv() {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
}

// ============================================================
// TYPE DECLARATIONS
// ============================================================

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidContract(): T;
    toHaveConverged(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeValidContract(): any;
    toHaveConverged(): any;
  }
}
