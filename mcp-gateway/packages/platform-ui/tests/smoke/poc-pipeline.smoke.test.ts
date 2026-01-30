/**
 * Smoke Test: POC Pipeline Critical Paths
 *
 * Purpose: Verify basic POC orchestrator capabilities work
 * Approach: Test with MINIMAL inputs first, then scale up
 */

import { createPOCOrchestrator } from '@/lib/poc';
import type { POCRunInput } from '@/lib/poc/types';

describe('Smoke: POC Pipeline Critical Paths', () => {
  const mockFigmaToken = process.env.FIGMA_TOKEN || 'mock-token';

  /**
   * Capability 1: Can create orchestrator instance
   */
  it('should create POC orchestrator instance', () => {
    const orchestrator = createPOCOrchestrator({
      figmaToken: mockFigmaToken,
    });

    expect(orchestrator).toBeDefined();
    expect(typeof orchestrator.run).toBe('function');
  });

  /**
   * Capability 2: Can handle minimal HTML input (not Figma)
   * This tests the pipeline WITHOUT Figma API dependency
   */
  it('should process minimal HTML content', async () => {
    const orchestrator = createPOCOrchestrator({
      figmaToken: mockFigmaToken,
    });

    const minimalHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <div style="width: 100px; height: 100px; background: red;">
            <span>Hello World</span>
          </div>
        </body>
      </html>
    `;

    const input: POCRunInput = {
      htmlContent: minimalHtml,
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: true,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
      },
    };

    // This should NOT freeze - if it does, the problem is in the orchestrator
    const startTime = Date.now();
    const result = await orchestrator.run(input);
    const elapsed = Date.now() - startTime;

    // Smoke test assertions - prove capabilities work
    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(result.htmlFiles).toBeDefined();
    expect(result.htmlFiles!.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(30000); // Should complete in under 30 seconds

    console.log(`[Smoke Test] Minimal HTML processed in ${elapsed}ms`);
    console.log(`[Smoke Test] Generated ${result.htmlFiles!.length} HTML files`);
  }, 60000); // 60 second timeout

  /**
   * Capability 3: Can render component tree without freezing
   * Tests the new renderComponentTree() method directly
   */
  it('should render component tree from parsed components', async () => {
    const orchestrator = createPOCOrchestrator({
      figmaToken: mockFigmaToken,
    });

    const minimalHtml = `
      <!DOCTYPE html>
      <html><body>
        <div style="width: 200px; height: 200px;">
          <div style="width: 100px; height: 100px;">
            <span>Nested Text</span>
          </div>
        </div>
      </body></html>
    `;

    const result = await orchestrator.run({
      htmlContent: minimalHtml,
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: true,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
      },
    });

    // Verify hierarchy is preserved in output
    const designHtml = result.htmlFiles?.find(f => f.name === 'design.html');
    expect(designHtml).toBeDefined();
    expect(designHtml!.content).toContain('figma-component');

    // Verify nested structure is present (not flattened)
    const nestedDivCount = (designHtml!.content.match(/<div/g) || []).length;
    expect(nestedDivCount).toBeGreaterThan(1); // Should have multiple divs for hierarchy

    console.log('[Smoke Test] Component tree rendered successfully');
  }, 60000);
});
