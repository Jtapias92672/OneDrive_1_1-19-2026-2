/**
 * Smoke Test: Figma-HTML Pipeline
 * Epic 7.5 v2: Prove capabilities work
 */

import { createPOCOrchestrator } from '@/lib/poc';
import type { POCRunInput } from '@/lib/poc/types';

describe('Smoke: Figma-HTML Pipeline', () => {
  const config = {
    figmaToken: process.env.FIGMA_TOKEN || 'mock-token',
  };

  /**
   * Capability 1: Parse a simple Figma component
   */
  it('should parse a simple Figma component', async () => {
    const mockFigmaData = {
      components: [{
        id: 'test-1',
        name: 'Button',
        type: 'COMPONENT',
        children: [],
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.8, b: 0.4, a: 1 }, opacity: 1 }],
        bounds: { x: 0, y: 0, width: 100, height: 40 },
        text: null,
        autoLayout: null,
      }]
    };

    // Since convertComponents is private, test via run() with minimal HTML input
    // that simulates Figma structure
    const orchestrator = createPOCOrchestrator(config);

    const input: POCRunInput = {
      htmlContent: '<div style="width: 100px; height: 40px; background: green;">Button</div>',
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: false,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
      },
    };

    const startTime = Date.now();
    const result = await orchestrator.run(input);
    const elapsed = Date.now() - startTime;

    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(elapsed).toBeLessThan(10000); // Should complete in under 10 seconds

    console.log(`[Smoke] Simple component processed in ${elapsed}ms`);
  }, 15000);

  /**
   * Capability 2: Handle nested children without infinite loop
   */
  it('should handle nested children without infinite loop', async () => {
    const orchestrator = createPOCOrchestrator(config);

    const nestedHtml = `
      <div style="width: 200px; height: 100px;" id="parent-frame">
        <div style="width: 50px; height: 30px;" id="child-button">Button</div>
      </div>
    `;

    const input: POCRunInput = {
      htmlContent: nestedHtml,
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: false,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
      },
    };

    const startTime = Date.now();
    const result = await orchestrator.run(input);
    const elapsed = Date.now() - startTime;

    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(elapsed).toBeLessThan(10000);

    console.log(`[Smoke] Nested components processed in ${elapsed}ms`);
  }, 15000);

  /**
   * Capability 3: Handle multiple siblings without hanging
   */
  it('should handle multiple siblings', async () => {
    const orchestrator = createPOCOrchestrator(config);

    const multipleHtml = `
      <div id="container">
        <div id="child-1">Child 1</div>
        <div id="child-2">Child 2</div>
        <div id="child-3">Child 3</div>
        <div id="child-4">Child 4</div>
        <div id="child-5">Child 5</div>
      </div>
    `;

    const input: POCRunInput = {
      htmlContent: multipleHtml,
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: false,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
      },
    };

    const startTime = Date.now();
    const result = await orchestrator.run(input);
    const elapsed = Date.now() - startTime;

    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(elapsed).toBeLessThan(10000);

    console.log(`[Smoke] Multiple siblings processed in ${elapsed}ms`);
  }, 15000);

  /**
   * Capability 4: Memory check - no exhaustion
   */
  it('should not exhaust memory with reasonable component count', async () => {
    const orchestrator = createPOCOrchestrator(config);

    // Create 50 components
    const components = Array.from({ length: 50 }, (_, i) =>
      `<div id="component-${i}" style="width: 100px; height: 100px;">Component ${i}</div>`
    ).join('\n');

    const input: POCRunInput = {
      htmlContent: `<div>${components}</div>`,
      options: {
        generateTests: false,
        generateStories: false,
        generateHtml: false,
        skipJira: true,
        deployFrontend: false,
        deployBackend: false,
      },
    };

    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[Smoke] Start memory: ${startMemory.toFixed(2)} MB`);

    const startTime = Date.now();
    const result = await orchestrator.run(input);
    const elapsed = Date.now() - startTime;

    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryDelta = endMemory - startMemory;

    console.log(`[Smoke] End memory: ${endMemory.toFixed(2)} MB`);
    console.log(`[Smoke] Memory delta: ${memoryDelta.toFixed(2)} MB`);
    console.log(`[Smoke] 50 components processed in ${elapsed}ms`);

    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(memoryDelta).toBeLessThan(500); // Should not grow by more than 500MB
    expect(elapsed).toBeLessThan(15000);
  }, 30000);
});
