/**
 * Smoke Test: Figma API Integration (Real API Calls)
 * Epic 7.5 v2: Integration Test Tier
 *
 * Purpose: Verify Figma API integration works with REAL API calls
 * Why: Unit tests with HTML mocks missed the depth parameter bug
 *
 * CRITICAL: This test makes REAL Figma API calls
 * Requires: FIGMA_TOKEN environment variable
 * Requires: TEST_FIGMA_URL environment variable (or uses default)
 */

import { createPOCOrchestrator } from '@/lib/poc';

describe('Smoke: Figma API Integration (Real API)', () => {
  // Skip if no real token available (CI without secrets)
  const hasRealToken = process.env.FIGMA_TOKEN &&
    process.env.FIGMA_TOKEN !== 'mock-token' &&
    process.env.FIGMA_TOKEN !== 'your-figma-token-here';

  // Use environment variable or default test file
  const TEST_FIGMA_URL = process.env.TEST_FIGMA_URL ||
    'https://www.figma.com/design/6GefaVgI8xnuDIHhSbfzsJ/POC_Test_Design?node-id=0-1';

  beforeAll(() => {
    if (!hasRealToken) {
      console.warn('⚠️  Skipping Figma integration tests - no real FIGMA_TOKEN');
      console.warn('    Set FIGMA_TOKEN environment variable to enable these tests');
    }
  });

  /**
   * INTEGRATION TEST 1: Verify depth parameter is included
   * This test would have caught the depth bug immediately
   */
  (hasRealToken ? it : it.skip)('should fetch Figma file with nested children', async () => {
    const orchestrator = createPOCOrchestrator({
      figmaToken: process.env.FIGMA_TOKEN!,
    });

    const result = await orchestrator.run({
      figmaUrl: TEST_FIGMA_URL,
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: false,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
        outputDir: '/tmp/smoke-integration-test',
      },
    });

    // CRITICAL ASSERTION: Components must be generated
    // This would have FAILED with the depth bug
    console.log('[Integration] Result:', JSON.stringify(result, null, 2).substring(0, 500));
    if (result.status === 'failed') {
      console.error(`[Integration] Generation failed with error`);
    }
    expect(result.status).toBe('completed');
    expect(result.frontendComponents).toBeDefined();
    expect(result.frontendComponents.length).toBeGreaterThan(0);

    console.log(`[Integration] Fetched ${result.frontendComponents.length} components from Figma`);
  }, 30000);

  /**
   * INTEGRATION TEST 2: Verify nested children are present
   * Depth parameter bug caused all children to be empty
   */
  (hasRealToken ? it : it.skip)('should fetch nested component children', async () => {
    const orchestrator = createPOCOrchestrator({
      figmaToken: process.env.FIGMA_TOKEN!,
    });

    const result = await orchestrator.run({
      figmaUrl: TEST_FIGMA_URL,
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: false,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
        outputDir: '/tmp/smoke-integration-test',
      },
    });

    // Count total nodes (including nested children)
    const countNodes = (components: any[]): number => {
      let count = components.length;
      for (const comp of components) {
        if (comp.children && comp.children.length > 0) {
          count += countNodes(comp.children);
        }
      }
      return count;
    };

    const totalNodes = countNodes(result.frontendComponents);

    // CRITICAL: If depth parameter is missing, totalNodes === frontendComponents.length
    // With depth parameter, totalNodes > frontendComponents.length (nested children exist)
    expect(totalNodes).toBeGreaterThan(result.frontendComponents.length);

    console.log(`[Integration] Total nodes (including nested): ${totalNodes}`);
    console.log(`[Integration] Top-level components: ${result.frontendComponents.length}`);
    console.log(`[Integration] Nested children found: ${totalNodes - result.frontendComponents.length}`);
  }, 30000);

  /**
   * INTEGRATION TEST 3: Verify API parameters are correct
   * Regression test for depth parameter specifically
   */
  (hasRealToken ? it : it.skip)('should include depth parameter in API call', async () => {
    // This test verifies the fix stays in place
    const orchestrator = createPOCOrchestrator({
      figmaToken: process.env.FIGMA_TOKEN!,
    });

    const result = await orchestrator.run({
      figmaUrl: TEST_FIGMA_URL,
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: false,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
        outputDir: '/tmp/smoke-integration-test',
      },
    });

    // If depth parameter is working, we should get components with properties
    // that only exist at deeper nesting levels (buttons, text, images)
    const hasTextComponents = result.frontendComponents.some((c: any) =>
      c.type === 'TEXT' ||
      (c.children && c.children.some((child: any) => child.type === 'TEXT'))
    );

    const hasButtonComponents = result.frontendComponents.some((c: any) =>
      c.type === 'INSTANCE' ||
      (c.children && c.children.some((child: any) => child.type === 'INSTANCE'))
    );

    // CRITICAL: These component types only appear with depth > 2
    expect(hasTextComponents || hasButtonComponents).toBe(true);

    console.log(`[Integration] Found text components: ${hasTextComponents}`);
    console.log(`[Integration] Found button instances: ${hasButtonComponents}`);
  }, 30000);

  /**
   * INTEGRATION TEST 4: Smoke test against known file structure
   * Uses the actual test file to verify expected output
   */
  (hasRealToken ? it : it.skip)('should generate expected component count for test file', async () => {
    const orchestrator = createPOCOrchestrator({
      figmaToken: process.env.FIGMA_TOKEN!,
    });

    const result = await orchestrator.run({
      figmaUrl: TEST_FIGMA_URL,
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: false,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
        outputDir: '/tmp/smoke-integration-test',
      },
    });

    // Known structure of POC_Test_Design:
    // - 7 frames with 100+ total components
    // This assertion would catch depth issues immediately
    expect(result.frontendComponents.length).toBeGreaterThan(7);

    console.log(`[Integration] Component count: ${result.frontendComponents.length} (expected > 7)`);
  }, 30000);
});
