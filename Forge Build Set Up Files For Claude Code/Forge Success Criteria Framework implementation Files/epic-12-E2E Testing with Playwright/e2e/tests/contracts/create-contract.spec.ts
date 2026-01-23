/**
 * FORGE E2E Tests - Create Contract
 * @epic 12 - E2E Testing
 */

import { test, expect, testContracts } from '../../fixtures/test-fixtures';

test.describe('Contract Creation', () => {
  test('should create a new contract', async ({ authenticatedPage: page }) => {
    await page.goto('/contracts/new');
    await page.fill('[data-testid="contract-name"]', 'Test Contract');
    await page.fill('textarea', testContracts.simple.yaml);
    await page.click('[data-testid="save-contract"]');
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should validate contract YAML', async ({ authenticatedPage: page }) => {
    await page.goto('/contracts/new');
    await page.fill('textarea', 'invalid: yaml: content');
    await expect(page.locator('.validation-error')).toBeVisible();
  });

  test('should show contract list', async ({ authenticatedPage: page }) => {
    await page.goto('/contracts');
    await expect(page.locator('[data-testid="contract-card"]')).toHaveCount.greaterThan(0);
  });
});
