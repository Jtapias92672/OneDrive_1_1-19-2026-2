/**
 * FORGE Platform - Visual Regression Tests
 * @epic 12 - E2E Testing
 * 
 * Screenshot-based visual regression tests
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Dashboard', () => {
  test('dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for charts to render
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });

  test('dashboard mobile view matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Contracts', () => {
  test('contract list matches snapshot', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('contracts-list.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });

  test('contract editor matches snapshot', async ({ page }) => {
    await page.goto('/contracts/new');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('contract-editor.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Executions', () => {
  test('execution list matches snapshot', async ({ page }) => {
    await page.goto('/runs');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('execution-list.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });

  test('execution detail matches snapshot', async ({ page }) => {
    await page.goto('/runs');
    
    const firstRun = page.getByTestId('run-row').first();
    if (await firstRun.isVisible()) {
      await firstRun.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('execution-detail.png', {
        maxDiffPixels: 150,
        animations: 'disabled',
      });
    }
  });
});

test.describe('Visual Regression - Components', () => {
  test('convergence chart matches snapshot', async ({ page }) => {
    await page.goto('/runs');
    
    const firstRun = page.getByTestId('run-row').first();
    if (await firstRun.isVisible()) {
      await firstRun.click();
      await page.waitForLoadState('networkidle');
      
      const chart = page.getByTestId('convergence-chart');
      await chart.waitFor({ state: 'visible' });
      await page.waitForTimeout(500);
      
      await expect(chart).toHaveScreenshot('convergence-chart.png', {
        maxDiffPixels: 50,
        animations: 'disabled',
      });
    }
  });

  test('validation breakdown matches snapshot', async ({ page }) => {
    await page.goto('/runs');
    
    const completedRun = page.getByTestId('run-row').filter({ hasText: /completed/i }).first();
    if (await completedRun.isVisible()) {
      await completedRun.click();
      await page.getByRole('tab', { name: /validation/i }).click();
      
      const breakdown = page.getByTestId('validator-breakdown');
      await breakdown.waitFor({ state: 'visible' });
      
      await expect(breakdown).toHaveScreenshot('validation-breakdown.png', {
        maxDiffPixels: 50,
        animations: 'disabled',
      });
    }
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('dashboard dark mode matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });

  test('contract editor dark mode matches snapshot', async ({ page }) => {
    await page.goto('/contracts/new');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('contract-editor-dark.png', {
      maxDiffPixels: 100,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Error States', () => {
  test('404 page matches snapshot', async ({ page }) => {
    await page.goto('/nonexistent-page');
    
    await expect(page).toHaveScreenshot('404-page.png', {
      maxDiffPixels: 50,
      animations: 'disabled',
    });
  });

  test('error boundary matches snapshot', async ({ page }) => {
    // Navigate to a page that might trigger error boundary
    await page.goto('/contracts/invalid-id-format!!!');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of error state if present
    const errorBoundary = page.getByTestId('error-boundary');
    if (await errorBoundary.isVisible()) {
      await expect(errorBoundary).toHaveScreenshot('error-boundary.png', {
        maxDiffPixels: 50,
      });
    }
  });
});

test.describe('Visual Regression - Empty States', () => {
  test('empty contracts list matches snapshot', async ({ page }) => {
    // Use a filter that returns no results
    await page.goto('/contracts?search=zzzznonexistentzzzz');
    await page.waitForLoadState('networkidle');
    
    const emptyState = page.getByTestId('empty-state');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toHaveScreenshot('empty-contracts.png', {
        maxDiffPixels: 50,
      });
    }
  });
});

test.describe('Visual Regression - Loading States', () => {
  test('loading skeleton matches snapshot', async ({ page }) => {
    // Slow down network to capture loading state
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });
    
    await page.goto('/dashboard');
    
    const skeleton = page.getByTestId('loading-skeleton');
    if (await skeleton.isVisible({ timeout: 2000 })) {
      await expect(skeleton).toHaveScreenshot('loading-skeleton.png', {
        maxDiffPixels: 50,
      });
    }
  });
});
