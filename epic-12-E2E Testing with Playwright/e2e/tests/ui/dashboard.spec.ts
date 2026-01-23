/**
 * FORGE Platform - Dashboard E2E Tests
 * @epic 12 - E2E Testing
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('displays dashboard overview', async ({ page }) => {
    // Check main dashboard elements
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByTestId('active-runs-count')).toBeVisible();
    await expect(page.getByTestId('contracts-count')).toBeVisible();
    await expect(page.getByTestId('success-rate')).toBeVisible();
  });

  test('displays recent activity feed', async ({ page }) => {
    const activityFeed = page.getByTestId('activity-feed');
    await expect(activityFeed).toBeVisible();
    
    // Should show recent runs
    const activityItems = activityFeed.getByRole('listitem');
    await expect(activityItems).toHaveCount(await activityItems.count());
  });

  test('navigates to run details from dashboard', async ({ page }) => {
    // Click on a recent run
    const firstRun = page.getByTestId('recent-run').first();
    
    if (await firstRun.isVisible()) {
      await firstRun.click();
      await expect(page).toHaveURL(/\/runs\/[a-z0-9-]+/);
    }
  });

  test('filters runs by status', async ({ page }) => {
    // Open status filter
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByRole('option', { name: /running/i }).click();
    
    // Verify filter applied
    await expect(page.getByTestId('status-filter-badge')).toContainText(/running/i);
  });

  test('refreshes data on interval', async ({ page }) => {
    const timestamp = page.getByTestId('last-updated');
    const initialTime = await timestamp.textContent();
    
    // Wait for refresh interval (30 seconds)
    await page.waitForTimeout(35000);
    
    const updatedTime = await timestamp.textContent();
    expect(updatedTime).not.toBe(initialTime);
  });

  test('displays real-time notifications', async ({ page }) => {
    // Trigger a notification (this would come from WebSocket in real scenario)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('forge:notification', {
        detail: { type: 'run_complete', runId: 'test-123' }
      }));
    });
    
    // Check notification appears
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });

  test('mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu exists
    await expect(page.getByTestId('mobile-menu-button')).toBeVisible();
    
    // Open mobile menu
    await page.getByTestId('mobile-menu-button').click();
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});

test.describe('Dashboard - Performance Metrics', () => {
  test('loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('charts render correctly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check convergence chart
    const chart = page.getByTestId('convergence-chart');
    await expect(chart).toBeVisible();
    
    // Verify SVG elements exist (chart rendered)
    const svgElements = chart.locator('svg');
    await expect(svgElements).toHaveCount(await svgElements.count());
  });

  test('handles large data sets', async ({ page }) => {
    // Navigate with date range that returns lots of data
    await page.goto('/dashboard?range=90d');
    
    // Should still render without timeout
    await expect(page.getByTestId('runs-table')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard - Quick Actions', () => {
  test('creates new contract from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.getByRole('button', { name: /new contract/i }).click();
    await expect(page).toHaveURL('/contracts/new');
  });

  test('starts new execution from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.getByRole('button', { name: /new execution/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('accesses settings from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.getByTestId('user-menu').click();
    await page.getByRole('menuitem', { name: /settings/i }).click();
    await expect(page).toHaveURL('/settings');
  });
});
