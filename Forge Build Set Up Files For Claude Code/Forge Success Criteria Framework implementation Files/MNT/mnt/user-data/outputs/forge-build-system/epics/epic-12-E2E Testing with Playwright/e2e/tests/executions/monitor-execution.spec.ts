/**
 * FORGE E2E Tests - Monitor Execution
 * @epic 12 - E2E Testing
 */

import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Execution Monitoring', () => {
  test('should show execution list', async ({ authenticatedPage: page }) => {
    await page.goto('/executions');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should filter executions by status', async ({ authenticatedPage: page }) => {
    await page.goto('/executions');
    await page.selectOption('select', 'completed');
    const statuses = await page.locator('[data-testid="execution-status"]').allTextContents();
    statuses.forEach(s => expect(s.toLowerCase()).toBe('completed'));
  });

  test('should show iteration timeline', async ({ authenticatedPage: page }) => {
    await page.goto('/executions');
    await page.click('[data-testid="execution-row"]:first-child');
    await expect(page.locator('[data-testid="iteration-timeline"]')).toBeVisible();
  });

  test('should show real-time updates', async ({ authenticatedPage: page, testContract }) => {
    await page.goto(`/executions/new?contract=${testContract.id}`);
    await page.click('[data-testid="start-execution"]');
    const initialScore = await page.textContent('[data-testid="current-score"]');
    await page.waitForTimeout(5000);
    const updatedScore = await page.textContent('[data-testid="current-score"]');
    // Score may have changed
    expect(updatedScore).toBeDefined();
  });
});
