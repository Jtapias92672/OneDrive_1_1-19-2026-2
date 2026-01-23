import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Global settings
    globals: true,
    environment: 'node',
    
    // Test file patterns
    include: [
      'packages/**/tests/**/*.test.ts',
      'packages/**/__tests__/**/*.test.ts',
      'tests/**/*.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds per package
      thresholds: {
        // Global minimum
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
        
        // Per-file thresholds
        perFile: true,
      },
      
      // Include/exclude patterns
      include: [
        'packages/*/src/**/*.ts',
        '!packages/*/src/**/*.d.ts',
        '!packages/*/src/**/index.ts',
        '!packages/*/src/**/types.ts'
      ],
      exclude: [
        'node_modules',
        'tests',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/dist/**'
      ],
    },
    
    // Reporters
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml'
    },
    
    // Timeout settings
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Parallelization
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Setup files
    setupFiles: ['./tests/setup.ts'],
    
    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    
    // Snapshot settings
    snapshotFormat: {
      printBasicPrototype: false
    },
    
    // Type checking
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json'
    }
  },
  
  // Path aliases (match tsconfig)
  resolve: {
    alias: {
      '@forge/answer-contract': resolve(__dirname, 'packages/answer-contract/src'),
      '@forge/convergence-engine': resolve(__dirname, 'packages/convergence-engine/src'),
      '@forge/figma-parser': resolve(__dirname, 'packages/figma-parser/src'),
      '@forge/react-generator': resolve(__dirname, 'packages/react-generator/src'),
      '@forge/mendix-integration': resolve(__dirname, 'packages/mendix-integration/src'),
      '@forge/evidence-packs': resolve(__dirname, 'packages/evidence-packs/src'),
      '@forge/validators': resolve(__dirname, 'packages/validators/src'),
      '@forge/mcp-gateway': resolve(__dirname, 'packages/mcp-gateway/src'),
      '@forge/forge-c': resolve(__dirname, 'packages/forge-c/src'),
    }
  }
});
