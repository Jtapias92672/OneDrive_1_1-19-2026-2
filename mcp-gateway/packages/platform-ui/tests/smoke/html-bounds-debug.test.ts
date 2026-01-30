/**
 * Debug test: Verify HTML parser sets bounds property
 */

import { HTMLParser } from '@/lib/poc/html-parser';

describe('Debug: HTML Parser Bounds', () => {
  it('should set bounds property on parsed components', () => {
    const parser = new HTMLParser();

    const html = `
      <div style="width: 200px; height: 200px;">
        <div style="width: 100px; height: 100px;">
          <span>Nested Text</span>
        </div>
      </div>
    `;

    const result = parser.parse(html);

    console.log('[Debug] Parse result:', JSON.stringify(result, null, 2));
    console.log('[Debug] Component count:', result.components.length);

    if (result.components.length > 0) {
      console.log('[Debug] First component:', JSON.stringify(result.components[0], null, 2));
      console.log('[Debug] Has bounds?', !!result.components[0].bounds);
      console.log('[Debug] Bounds value:', result.components[0].bounds);
    }

    expect(result.components.length).toBeGreaterThan(0);
    expect(result.components[0].bounds).toBeDefined();
    expect(result.components[0].bounds.width).toBeGreaterThan(0);
  });
});
