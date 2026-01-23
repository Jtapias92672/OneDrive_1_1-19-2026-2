/**
 * FORGE E2E Tests - Contracts API
 * @epic 12 - E2E Testing
 */

import { test, expect, testContracts } from '../../fixtures/test-fixtures';

test.describe('Contracts API', () => {
  test('GET /api/contracts - list contracts', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    const response = await apiClient['request']('GET', '/api/contracts');
    expect(Array.isArray(response.data || response)).toBe(true);
  });

  test('POST /api/contracts - create contract', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    const response = await apiClient.createContract({ name: 'API Test Contract', yaml: testContracts.simple.yaml });
    expect(response.id).toBeDefined();
  });

  test('GET /api/contracts/:id - get contract', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    const response = await apiClient['request']('GET', `/api/contracts/${testContracts.simple.id}`);
    expect(response.name).toBeDefined();
  });
});
