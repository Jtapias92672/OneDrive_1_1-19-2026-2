/**
 * FORGE Platform - Test Fixtures
 * @epic 12 - E2E Testing
 * 
 * Reusable test data and fixtures
 */

export const ContractFixtures = {
  validContract: {
    name: 'Test Validation Contract',
    type: 'validation',
    description: 'A contract for E2E testing',
    sections: [
      {
        name: 'Requirements',
        content: `# Requirements
        
- Must validate user input
- Must return structured response
- Must handle edge cases`,
      },
      {
        name: 'Expected Output',
        content: `# Expected Output Format

\`\`\`json
{
  "status": "success",
  "data": {...}
}
\`\`\``,
      },
    ],
  },

  minimalContract: {
    name: 'Minimal Contract',
    type: 'validation',
  },

  computationalContract: {
    name: 'Computational Accuracy Contract',
    type: 'validation',
    description: 'Tests mathematical accuracy',
    sections: [
      {
        name: 'Mathematical Requirements',
        content: `# Mathematical Validation

The answer must include:
- Correct calculation of π to 5 decimal places
- Square root calculations
- Basic arithmetic operations`,
      },
    ],
    validators: ['computational', 'semantic'],
  },

  largeContract: {
    name: 'Large Contract',
    type: 'validation',
    description: 'A contract with many sections',
    sections: Array(20).fill(null).map((_, i) => ({
      name: `Section ${i + 1}`,
      content: `Content for section ${i + 1}\n${'Lorem ipsum '.repeat(100)}`,
    })),
  },
};

export const ExecutionFixtures = {
  defaultConfig: {
    provider: 'claude',
    model: 'claude-3-5-sonnet',
    targetScore: 0.9,
    maxIterations: 10,
    timeout: 300,
  },

  fastConfig: {
    provider: 'claude',
    model: 'claude-3-5-haiku',
    targetScore: 0.8,
    maxIterations: 5,
    timeout: 60,
  },

  thoroughConfig: {
    provider: 'claude',
    model: 'claude-3-opus',
    targetScore: 0.95,
    maxIterations: 20,
    timeout: 600,
    validators: ['semantic', 'structural', 'computational', 'domain'],
  },
};

export const UserFixtures = {
  testUser: {
    email: 'test@forge.dev',
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'user',
  },

  adminUser: {
    email: 'admin@forge.dev',
    password: 'AdminPassword123!',
    name: 'Admin User',
    role: 'admin',
  },

  readOnlyUser: {
    email: 'readonly@forge.dev',
    password: 'ReadOnlyPassword123!',
    name: 'Read Only User',
    role: 'readonly',
  },
};

export const ValidationFixtures = {
  correctMathAnswer: {
    answer: 'The square root of 16 is 4, and π ≈ 3.14159.',
    expectedScore: 0.95,
  },

  incorrectMathAnswer: {
    answer: 'The square root of 16 is 5, and π ≈ 3.2.',
    expectedScore: 0.3,
  },

  semanticallyCorrectAnswer: {
    answer: `Based on the requirements, I have validated the user input
and the response is structured correctly with proper error handling.`,
    expectedScore: 0.85,
  },

  vaguAnswer: {
    answer: 'The answer is yes.',
    expectedScore: 0.4,
  },

  emptyAnswer: {
    answer: '',
    expectedScore: 0,
  },
};

export const MCPFixtures = {
  fileReadTool: {
    name: 'read_file',
    server: 'filesystem',
    params: {
      path: '/test/file.txt',
    },
  },

  githubTool: {
    name: 'get_file_contents',
    server: 'github',
    params: {
      owner: 'test-org',
      repo: 'test-repo',
      path: 'README.md',
    },
  },

  invalidTool: {
    name: 'nonexistent_tool',
    server: 'unknown',
    params: {},
  },
};

export const EvidenceFixtures = {
  validEvidencePack: {
    runId: 'run-123',
    iterations: [
      {
        number: 1,
        score: 0.6,
        answer: 'First attempt...',
        feedback: 'Needs improvement',
      },
      {
        number: 2,
        score: 0.8,
        answer: 'Second attempt...',
        feedback: 'Better, but not complete',
      },
      {
        number: 3,
        score: 0.92,
        answer: 'Third attempt...',
        feedback: 'Excellent',
      },
    ],
    finalScore: 0.92,
    status: 'completed',
  },
};

export const APIPayloads = {
  createContract: (overrides = {}) => ({
    name: `Test Contract ${Date.now()}`,
    type: 'validation',
    description: 'Auto-generated test contract',
    sections: [
      { name: 'Test', content: 'Test content' },
    ],
    ...overrides,
  }),

  startExecution: (contractId: string, overrides = {}) => ({
    contractId,
    name: `Test Execution ${Date.now()}`,
    config: {
      ...ExecutionFixtures.defaultConfig,
      ...overrides,
    },
  }),

  validateAnswer: (overrides = {}) => ({
    answer: 'Test answer for validation',
    validators: ['semantic', 'structural'],
    ...overrides,
  }),
};

export const TestHelpers = {
  /**
   * Wait for a condition with polling
   */
  async waitFor(
    condition: () => Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    const { timeout = 30000, interval = 1000 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Generate random string
   */
  randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  },

  /**
   * Generate random email
   */
  randomEmail(): string {
    return `test_${this.randomString(8)}@forge.dev`;
  },

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry a function with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; baseDelay?: number } = {}
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000 } = options;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        await this.sleep(baseDelay * Math.pow(2, attempt));
      }
    }
    
    throw new Error('Retry failed');
  },
};

export default {
  ContractFixtures,
  ExecutionFixtures,
  UserFixtures,
  ValidationFixtures,
  MCPFixtures,
  EvidenceFixtures,
  APIPayloads,
  TestHelpers,
};
