/**
 * FORGE E2E Tests - Test Fixtures
 * @epic 12 - E2E Testing
 */

import { test as base, expect } from '@playwright/test';

export interface TestUser { email: string; password: string; role: 'admin' | 'developer' | 'viewer'; }
export interface TestContract { id: string; name: string; yaml: string; }

export const testUsers: Record<string, TestUser> = {
  admin: { email: 'admin@test.com', password: 'admin123', role: 'admin' },
  developer: { email: 'dev@test.com', password: 'dev123', role: 'developer' },
  viewer: { email: 'viewer@test.com', password: 'viewer123', role: 'viewer' },
};

export const testContracts: Record<string, TestContract> = {
  simple: { id: 'test-simple', name: 'Simple Test Contract', yaml: `name: test-simple\nversion: 1.0.0\nschema:\n  type: object` },
  complex: { id: 'test-complex', name: 'Complex Test Contract', yaml: `name: test-complex\nversion: 1.0.0\nvalidators:\n  - id: schema\n    type: schema` },
};

class ForgeApiClient {
  constructor(private baseUrl: string, private token?: string) {}
  async login(email: string, password: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    this.token = data.token;
    return this.token;
  }
  async createContract(contract: Partial<TestContract>): Promise<any> { return this.request('POST', '/api/contracts', contract); }
  async startExecution(contractId: string, input: any = {}): Promise<any> { return this.request('POST', '/api/executions', { contractId, input }); }
  async getExecution(id: string): Promise<any> { return this.request('GET', `/api/executions/${id}`); }
  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, { method, headers: { 'Content-Type': 'application/json', ...(this.token && { Authorization: `Bearer ${this.token}` }) }, body: body ? JSON.stringify(body) : undefined });
    return res.json();
  }
}

interface ForgeFixtures { authenticatedPage: any; testContract: TestContract; apiClient: ForgeApiClient; }

export const test = base.extend<ForgeFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await use(page);
  },
  testContract: async ({}, use) => { await use(testContracts.simple); },
  apiClient: async ({}, use) => { await use(new ForgeApiClient(process.env.FORGE_API_URL || 'http://localhost:3100')); },
});

export { expect };
