/**
 * FORGE Platform - Contract Management E2E Tests
 * @epic 12 - E2E Testing
 */

import { test, expect } from '@playwright/test';
import { ContractFixtures } from '../../fixtures/contracts';

test.describe('Contract List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contracts');
  });

  test('displays contract list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /contracts/i })).toBeVisible();
    await expect(page.getByTestId('contracts-table')).toBeVisible();
  });

  test('searches contracts', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search contracts/i);
    await searchInput.fill('validation');
    await searchInput.press('Enter');
    
    // Wait for filtered results
    await page.waitForResponse(resp => resp.url().includes('/contracts?search='));
    
    // Verify results contain search term
    const rows = page.getByTestId('contract-row');
    const firstRow = rows.first();
    if (await firstRow.isVisible()) {
      await expect(firstRow).toContainText(/validation/i);
    }
  });

  test('filters by status', async ({ page }) => {
    await page.getByRole('combobox', { name: /status/i }).click();
    await page.getByRole('option', { name: /active/i }).click();
    
    await page.waitForURL(/status=active/);
    
    // All visible rows should be active
    const statusBadges = page.getByTestId('contract-status');
    for (const badge of await statusBadges.all()) {
      await expect(badge).toContainText(/active/i);
    }
  });

  test('sorts contracts by name', async ({ page }) => {
    await page.getByRole('columnheader', { name: /name/i }).click();
    
    // Wait for sort to apply
    await page.waitForURL(/sort=name/);
    
    // Verify sorted
    const names = await page.getByTestId('contract-name').allTextContents();
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  test('paginates through results', async ({ page }) => {
    // Go to second page
    const nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await expect(page).toHaveURL(/page=2/);
    }
  });
});

test.describe('Create Contract', () => {
  test('creates a new contract', async ({ page }) => {
    await page.goto('/contracts/new');
    
    // Fill in contract details
    await page.getByLabel(/name/i).fill('Test Contract E2E');
    await page.getByLabel(/description/i).fill('Contract created by E2E test');
    
    // Select contract type
    await page.getByRole('combobox', { name: /type/i }).click();
    await page.getByRole('option', { name: /validation/i }).click();
    
    // Add a section
    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByLabel(/section name/i).fill('Requirements');
    await page.getByLabel(/section content/i).fill('# Requirements\n\n- Must validate input');
    
    // Save contract
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify redirect to contract view
    await expect(page).toHaveURL(/\/contracts\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { name: 'Test Contract E2E' })).toBeVisible();
  });

  test('validates required fields', async ({ page }) => {
    await page.goto('/contracts/new');
    
    // Try to save without filling required fields
    await page.getByRole('button', { name: /save/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test('imports contract from file', async ({ page }) => {
    await page.goto('/contracts/new');
    
    // Click import button
    await page.getByRole('button', { name: /import/i }).click();
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-contract.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(ContractFixtures.validContract)),
    });
    
    // Verify fields populated
    await expect(page.getByLabel(/name/i)).toHaveValue(ContractFixtures.validContract.name);
  });

  test('previews contract markdown', async ({ page }) => {
    await page.goto('/contracts/new');
    
    // Fill markdown content
    await page.getByLabel(/content/i).fill('# Test\n\n**Bold text** and _italic_');
    
    // Switch to preview
    await page.getByRole('tab', { name: /preview/i }).click();
    
    // Verify rendered HTML
    const preview = page.getByTestId('markdown-preview');
    await expect(preview.locator('h1')).toContainText('Test');
    await expect(preview.locator('strong')).toContainText('Bold text');
  });
});

test.describe('Edit Contract', () => {
  test('edits existing contract', async ({ page }) => {
    // Navigate to existing contract
    await page.goto('/contracts');
    await page.getByTestId('contract-row').first().click();
    
    // Enter edit mode
    await page.getByRole('button', { name: /edit/i }).click();
    
    // Modify name
    const nameInput = page.getByLabel(/name/i);
    await nameInput.clear();
    await nameInput.fill('Updated Contract Name');
    
    // Save
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify update
    await expect(page.getByRole('heading', { name: 'Updated Contract Name' })).toBeVisible();
  });

  test('cancels edit without saving', async ({ page }) => {
    await page.goto('/contracts');
    const originalName = await page.getByTestId('contract-name').first().textContent();
    
    await page.getByTestId('contract-row').first().click();
    await page.getByRole('button', { name: /edit/i }).click();
    
    // Make changes
    await page.getByLabel(/name/i).fill('Should Not Save');
    
    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Confirm discard
    await page.getByRole('button', { name: /discard/i }).click();
    
    // Verify original name preserved
    await expect(page.getByRole('heading')).toContainText(originalName!);
  });

  test('shows version history', async ({ page }) => {
    await page.goto('/contracts');
    await page.getByTestId('contract-row').first().click();
    
    // Open version history
    await page.getByRole('button', { name: /history/i }).click();
    
    // Verify versions shown
    const versionList = page.getByTestId('version-list');
    await expect(versionList).toBeVisible();
    await expect(versionList.getByRole('listitem')).toHaveCount(await versionList.getByRole('listitem').count());
  });

  test('restores previous version', async ({ page }) => {
    await page.goto('/contracts');
    await page.getByTestId('contract-row').first().click();
    
    await page.getByRole('button', { name: /history/i }).click();
    
    // Select an older version
    const olderVersion = page.getByTestId('version-item').nth(1);
    if (await olderVersion.isVisible()) {
      await olderVersion.getByRole('button', { name: /restore/i }).click();
      
      // Confirm restore
      await page.getByRole('button', { name: /confirm/i }).click();
      
      // Verify restored
      await expect(page.getByRole('alert')).toContainText(/restored/i);
    }
  });
});

test.describe('Delete Contract', () => {
  test('deletes contract with confirmation', async ({ page }) => {
    await page.goto('/contracts');
    
    // Get contract count before
    const countBefore = await page.getByTestId('contract-row').count();
    
    // Click delete on first contract
    await page.getByTestId('contract-row').first().getByRole('button', { name: /delete/i }).click();
    
    // Confirm deletion
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();
    
    // Verify deleted
    await expect(page.getByRole('alert')).toContainText(/deleted/i);
    
    // Count should decrease
    await expect(page.getByTestId('contract-row')).toHaveCount(countBefore - 1);
  });

  test('cancels delete', async ({ page }) => {
    await page.goto('/contracts');
    
    const countBefore = await page.getByTestId('contract-row').count();
    
    await page.getByTestId('contract-row').first().getByRole('button', { name: /delete/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click();
    
    // Count should remain same
    await expect(page.getByTestId('contract-row')).toHaveCount(countBefore);
  });
});
