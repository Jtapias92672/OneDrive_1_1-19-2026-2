/**
 * FORGE E2E Tests - Validation Flow
 * @epic 12 - E2E Testing
 */

import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Validation', () => {
  test('should show validation results', async ({ authenticatedPage: page }) => {
    await page.goto('/executions');
    await page.click('[data-testid="execution-row"]:first-child');
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
  });

  test('should display validator scores', async ({ authenticatedPage: page }) => {
    await page.goto('/executions');
    await page.click('[data-testid="execution-row"]:first-child');
    const scores = await page.locator('[data-testid="validator-score"]').allTextContents();
    scores.forEach(s => {
      const score = parseFloat(s.replace('%', ''));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
