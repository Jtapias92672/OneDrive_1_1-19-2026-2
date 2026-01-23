/**
 * FORGE E2E Tests - Authentication Security Tests
 * @epic 12 - E2E Testing
 */

import { test, expect } from '../fixtures/test-fixtures';

test.describe('Authentication Security', () => {
  test('should reject invalid credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: { email: 'invalid@test.com', password: 'wrong' } });
    expect(response.status()).toBe(401);
  });

  test('should reject expired tokens', async ({ request }) => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjF9.expired';
    const response = await request.get('/api/contracts', { headers: { Authorization: `Bearer ${expiredToken}` } });
    expect(response.status()).toBe(401);
  });

  test('should enforce rate limiting', async ({ request }) => {
    const requests = Array(100).fill(null).map(() => request.post('/api/auth/login', { data: { email: 'test@test.com', password: 'wrong' } }));
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status() === 429);
    expect(rateLimited).toBe(true);
  });

  test('should require authentication for protected routes', async ({ request }) => {
    const response = await request.get('/api/contracts');
    expect(response.status()).toBe(401);
  });

  test('should enforce RBAC permissions', async ({ request }) => {
    // Login as viewer
    const login = await request.post('/api/auth/login', { data: { email: 'viewer@test.com', password: 'viewer123' } });
    const token = (await login.json()).token;
    
    // Try to create contract (should fail)
    const response = await request.post('/api/contracts', { headers: { Authorization: `Bearer ${token}` }, data: { name: 'test' } });
    expect(response.status()).toBe(403);
  });
});
