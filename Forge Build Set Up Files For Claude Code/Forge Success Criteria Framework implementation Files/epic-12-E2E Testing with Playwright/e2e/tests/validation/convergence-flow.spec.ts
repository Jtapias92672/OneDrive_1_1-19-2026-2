/**
 * FORGE E2E Tests - Convergence Flow
 * @epic 12 - E2E Testing
 */

import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Convergence', () => {
  test('should show score progression chart', async ({ authenticatedPage: page }) => {
    await page.goto('/executions');
    await page.click('[data-testid="execution-row"]:first-child');
    await expect(page.locator('[data-testid="score-chart"]')).toBeVisible();
  });

  test('should reach target score', async ({ authenticatedPage: page, testContract }) => {
    await page.goto(`/executions/new?contract=${testContract.id}`);
    await page.click('[data-testid="start-execution"]');
    await page.waitForSelector('[data-testid="execution-status"]:has-text("completed")', { timeout: 120000 });
    const score = await page.textContent('[data-testid="final-score"]');
    expect(parseFloat(score!)).toBeGreaterThanOrEqual(0.95);
  });
});
