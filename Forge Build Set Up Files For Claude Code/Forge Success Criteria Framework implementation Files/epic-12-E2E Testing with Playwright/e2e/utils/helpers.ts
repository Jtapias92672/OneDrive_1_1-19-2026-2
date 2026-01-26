/**
 * FORGE E2E Tests - Helper Utilities
 * @epic 12 - E2E Testing
 */

import { Page, expect } from '@playwright/test';

export async function waitForExecution(page: Page, timeout = 60000): Promise<void> {
  await page.waitForSelector('[data-testid="execution-status"]', { state: 'visible' });
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const status = await page.textContent('[data-testid="execution-status"]');
    if (status === 'completed' || status === 'failed') return;
    await page.waitForTimeout(1000);
  }
  throw new Error('Execution timed out');
}

export async function createContract(page: Page, name: string, yaml: string): Promise<void> {
  await page.goto('/contracts/new');
  await page.fill('[data-testid="contract-name"]', name);
  await page.fill('[data-testid="yaml-editor"]', yaml);
  await page.click('[data-testid="save-contract"]');
  await expect(page).toHaveURL(/\/contracts\/[^/]+$/);
}

export async function startExecution(page: Page, contractId: string): Promise<string> {
  await page.goto(`/executions/new?contract=${contractId}`);
  await page.click('[data-testid="start-execution"]');
  await page.waitForURL(/\/executions\/[^/]+$/);
  return page.url().split('/').pop()!;
}

export function generateTestData(type: 'contract' | 'execution'): any {
  const id = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (type === 'contract') return { id, name: `Test Contract ${id}`, version: '1.0.0', yaml: `name: ${id}` };
  return { id, contractId: 'test-contract', status: 'pending', input: { test: true } };
}
