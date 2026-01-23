/**
 * FORGE E2E Tests - MCP Tools
 * @epic 12 - E2E Testing
 */

import { test, expect } from '../../fixtures/test-fixtures';

test.describe('MCP Tools', () => {
  const mcpUrl = process.env.FORGE_MCP_URL || 'http://localhost:3100/mcp';

  test('should list available tools', async ({ request }) => {
    const response = await request.post(`${mcpUrl}`, { data: { jsonrpc: '2.0', method: 'tools/list', id: 1 } });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.result?.tools).toBeDefined();
  });

  test('should call forge_run tool', async ({ request }) => {
    const response = await request.post(`${mcpUrl}`, {
      data: { jsonrpc: '2.0', method: 'tools/call', params: { name: 'forge_run', arguments: { contractId: 'test', input: {} } }, id: 2 }
    });
    expect(response.ok()).toBe(true);
  });

  test('should call forge_validate tool', async ({ request }) => {
    const response = await request.post(`${mcpUrl}`, {
      data: { jsonrpc: '2.0', method: 'tools/call', params: { name: 'forge_validate', arguments: { output: 'test', contract: 'test' } }, id: 3 }
    });
    expect(response.ok()).toBe(true);
  });
});
