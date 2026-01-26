/**
 * FORGE E2E Tests - Run Execution
 * @epic 12 - E2E Testing
 */

import { test, expect } from '../../fixtures/test-fixtures';
import { waitForExecution } from '../../utils/helpers';

test.describe('Execution', () => {
  test('should start new execution', async ({ authenticatedPage: page, testContract }) => {
    await page.goto(`/executions/new?contract=${testContract.id}`);
    await page.click('[data-testid="start-execution"]');
    await expect(page).toHaveURL(/\/executions\/[^/]+$/);
    await expect(page.locator('[data-testid="execution-status"]')).toContainText(/running|pending/i);
  });

  test('should complete execution successfully', async ({ authenticatedPage: page, testContract }) => {
    await page.goto(`/executions/new?contract=${testContract.id}`);
    await page.click('[data-testid="start-execution"]');
    await waitForExecution(page, 120000);
    const status = await page.textContent('[data-testid="execution-status"]');
    expect(['completed', 'failed']).toContain(status);
  });

  test('should abort running execution', async ({ authenticatedPage: page, testContract }) => {
    await page.goto(`/executions/new?contract=${testContract.id}`);
    await page.click('[data-testid="start-execution"]');
    await page.click('[data-testid="abort-execution"]');
    await expect(page.locator('[data-testid="execution-status"]')).toContainText(/aborted/i);
  });
});
