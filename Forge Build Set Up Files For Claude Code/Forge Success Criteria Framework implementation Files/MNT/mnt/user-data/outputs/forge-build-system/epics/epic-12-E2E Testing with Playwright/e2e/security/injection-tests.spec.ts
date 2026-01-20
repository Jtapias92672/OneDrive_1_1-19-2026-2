/**
 * FORGE E2E Tests - Injection Security Tests
 * @epic 12 - E2E Testing
 */

import { test, expect } from '../fixtures/test-fixtures';

test.describe('Injection Security', () => {
  test('should sanitize SQL injection attempts', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    const response = await apiClient.createContract({ name: "'; DROP TABLE contracts; --", yaml: 'test: true' });
    // Should not cause error and name should be sanitized
    expect(response.error).toBeUndefined();
  });

  test('should sanitize XSS in contract names', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    const response = await apiClient.createContract({ name: '<script>alert("xss")</script>', yaml: 'test: true' });
    expect(response.name).not.toContain('<script>');
  });

  test('should reject malicious YAML', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    // YAML bomb attempt
    const maliciousYaml = 'a: &a [*a, *a, *a, *a, *a]';
    const response = await apiClient.createContract({ name: 'test', yaml: maliciousYaml });
    expect(response.error).toBeDefined();
  });

  test('should prevent path traversal', async ({ request }) => {
    const response = await request.get('/api/contracts/../../../etc/passwd');
    expect(response.status()).toBe(404);
  });

  test('should validate input lengths', async ({ apiClient }) => {
    await apiClient.login('admin@test.com', 'admin123');
    const longName = 'a'.repeat(10000);
    const response = await apiClient.createContract({ name: longName, yaml: 'test: true' });
    expect(response.error).toBeDefined();
  });

  test('should reject prototype pollution', async ({ request }) => {
    const response = await request.post('/api/contracts', {
      data: { '__proto__': { 'admin': true }, 'name': 'test' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).not.toBe(500);
  });
});
