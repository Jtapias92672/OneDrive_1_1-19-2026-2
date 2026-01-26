/**
 * FORGE E2E Tests - Edit Contract
 * @epic 12 - E2E Testing
 */

import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Contract Editing', () => {
  test('should edit existing contract', async ({ authenticatedPage: page, testContract }) => {
    await page.goto(`/contracts/${testContract.id}`);
    await page.fill('[data-testid="contract-name"]', 'Updated Contract');
    await page.click('[data-testid="save-contract"]');
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should duplicate contract', async ({ authenticatedPage: page, testContract }) => {
    await page.goto(`/contracts/${testContract.id}`);
    await page.click('[data-testid="duplicate-contract"]');
    await expect(page).toHaveURL(/\/contracts\/[^/]+-copy$/);
  });

  test('should delete contract', async ({ authenticatedPage: page, testContract }) => {
    await page.goto(`/contracts/${testContract.id}`);
    await page.click('[data-testid="delete-contract"]');
    await page.click('[data-testid="confirm-delete"]');
    await expect(page).toHaveURL('/contracts');
  });
});
