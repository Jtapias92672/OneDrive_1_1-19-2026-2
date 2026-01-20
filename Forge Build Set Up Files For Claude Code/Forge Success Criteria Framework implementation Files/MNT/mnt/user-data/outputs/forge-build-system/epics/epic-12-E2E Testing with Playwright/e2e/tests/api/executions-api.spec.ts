/**
 * FORGE E2E Tests - Executions API
 * @epic 12 - E2E Testing
 */

import { test, expect, testContracts } from '../../fixtures/test-fixtures';

test.describe('Executions API', () => {
  test('POST /api/executions - start execution', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    const response = await apiClient.startExecution(testContracts.simple.id, { input: 'test' });
    expect(response.id).toBeDefined();
    expect(response.status).toBe('pending');
  });

  test('GET /api/executions/:id - get execution', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    const exec = await apiClient.startExecution(testContracts.simple.id, {});
    const response = await apiClient.getExecution(exec.id);
    expect(response.id).toBe(exec.id);
  });

  test('GET /api/executions - list executions', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    const response = await apiClient['request']('GET', '/api/executions');
    expect(Array.isArray(response.data || response)).toBe(true);
  });
});
