/**
 * ESLint Configuration - Gateway Routing Enforcement
 *
 * SKILL: Architectural Entropy Detector
 * Prevents accumulation of direct FigmaClient usages by blocking imports.
 *
 * The "100x Test": If 100 developers each add one direct FigmaClient call:
 * - 100 unaudited API calls (compliance failure)
 * - 100 security bypass vectors
 * - 100 potential tenant isolation leaks
 * Result: UNACCEPTABLE. Enforce single gateway path.
 *
 * See: .forge/adr/ADR-001-gateway-routing.md for rationale
 *
 * NOTE: This is a standalone config for testing the restricted imports rule.
 * In production, integrate with main ESLint config.
 */

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@/lib/integrations/figma/figma-client',
            importNames: ['FigmaClient'],
            message:
              'Direct FigmaClient usage bypasses security controls (OAuth, audit logging, tenant isolation). ' +
              'Use gateway routing via setupMCPGateway() instead. ' +
              'See ADR-001 (.forge/adr/ADR-001-gateway-routing.md) for rationale. ' +
              'Exception: Unit tests with mocks are allowed.',
          },
          {
            name: 'lib/integrations/figma/figma-client',
            importNames: ['FigmaClient'],
            message:
              'Direct FigmaClient usage bypasses security controls. ' +
              'Use gateway routing via setupMCPGateway() instead. ' +
              'See ADR-001 for rationale.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Allow direct FigmaClient in unit tests with mocks
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
