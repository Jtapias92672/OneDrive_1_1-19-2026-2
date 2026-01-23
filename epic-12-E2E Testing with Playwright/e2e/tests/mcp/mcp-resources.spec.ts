/**
 * FORGE E2E Tests - MCP Resources
 * @epic 12 - E2E Testing
 */

import { test, expect } from '../../fixtures/test-fixtures';

test.describe('MCP Resources', () => {
  const mcpUrl = process.env.FORGE_MCP_URL || 'http://localhost:3100/mcp';

  test('should list available resources', async ({ request }) => {
    const response = await request.post(`${mcpUrl}`, { data: { jsonrpc: '2.0', method: 'resources/list', id: 1 } });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.result?.resources).toBeDefined();
  });

  test('should read contract resource', async ({ request }) => {
    const response = await request.post(`${mcpUrl}`, {
      data: { jsonrpc: '2.0', method: 'resources/read', params: { uri: 'forge://contracts/test' }, id: 2 }
    });
    expect(response.ok()).toBe(true);
  });
});
