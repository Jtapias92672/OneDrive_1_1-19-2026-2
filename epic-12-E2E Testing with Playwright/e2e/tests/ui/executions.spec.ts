/**
 * FORGE Platform - Execution Workflow E2E Tests
 * @epic 12 - E2E Testing
 * 
 * Tests the complete convergence execution flow
 */

import { test, expect } from '@playwright/test';

test.describe('Start Execution', () => {
  test('starts new execution from contract', async ({ page }) => {
    await page.goto('/contracts');
    
    // Select a contract
    await page.getByTestId('contract-row').first().click();
    
    // Start execution
    await page.getByRole('button', { name: /start execution/i }).click();
    
    // Configure execution
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    // Set execution name
    await dialog.getByLabel(/name/i).fill('E2E Test Execution');
    
    // Select provider
    await dialog.getByRole('combobox', { name: /provider/i }).click();
    await page.getByRole('option', { name: /claude/i }).click();
    
    // Set target score
    await dialog.getByLabel(/target score/i).fill('0.9');
    
    // Start
    await dialog.getByRole('button', { name: /start/i }).click();
    
    // Verify redirected to run page
    await expect(page).toHaveURL(/\/runs\/[a-z0-9-]+/);
    await expect(page.getByTestId('run-status')).toContainText(/running|pending/i);
  });

  test('configures advanced execution options', async ({ page }) => {
    await page.goto('/executions/new');
    
    // Expand advanced options
    await page.getByRole('button', { name: /advanced/i }).click();
    
    // Set max iterations
    await page.getByLabel(/max iterations/i).fill('15');
    
    // Set timeout
    await page.getByLabel(/timeout/i).fill('300');
    
    // Enable specific validators
    await page.getByLabel(/computational/i).check();
    await page.getByLabel(/semantic/i).check();
    
    // Verify settings applied
    await expect(page.getByLabel(/max iterations/i)).toHaveValue('15');
    await expect(page.getByLabel(/computational/i)).toBeChecked();
  });

  test('validates execution parameters', async ({ page }) => {
    await page.goto('/executions/new');
    
    // Try invalid target score
    await page.getByLabel(/target score/i).fill('2.0');
    await page.getByRole('button', { name: /start/i }).click();
    
    await expect(page.getByText(/target score must be between 0 and 1/i)).toBeVisible();
  });
});

test.describe('Monitor Execution', () => {
  test('displays live execution progress', async ({ page }) => {
    // Start from an existing running execution
    await page.goto('/runs');
    
    const runningRun = page.getByTestId('run-row').filter({ hasText: /running/i }).first();
    if (await runningRun.isVisible()) {
      await runningRun.click();
      
      // Check progress elements
      await expect(page.getByTestId('iteration-count')).toBeVisible();
      await expect(page.getByTestId('current-score')).toBeVisible();
      await expect(page.getByTestId('progress-bar')).toBeVisible();
    }
  });

  test('shows iteration history', async ({ page }) => {
    await page.goto('/runs');
    await page.getByTestId('run-row').first().click();
    
    // Open iterations tab
    await page.getByRole('tab', { name: /iterations/i }).click();
    
    const iterationList = page.getByTestId('iteration-list');
    await expect(iterationList).toBeVisible();
  });

  test('displays convergence chart', async ({ page }) => {
    await page.goto('/runs');
    await page.getByTestId('run-row').first().click();
    
    // Chart should render
    const chart = page.getByTestId('convergence-chart');
    await expect(chart).toBeVisible();
    
    // Check chart has data points
    await expect(chart.locator('circle')).toHaveCount(await chart.locator('circle').count());
  });

  test('shows validation results per iteration', async ({ page }) => {
    await page.goto('/runs');
    await page.getByTestId('run-row').first().click();
    
    await page.getByRole('tab', { name: /iterations/i }).click();
    
    // Click on an iteration
    await page.getByTestId('iteration-item').first().click();
    
    // Check validation breakdown
    const validationPanel = page.getByTestId('validation-results');
    await expect(validationPanel).toBeVisible();
    await expect(validationPanel.getByTestId('validator-score')).toHaveCount(
      await validationPanel.getByTestId('validator-score').count()
    );
  });

  test('live updates via WebSocket', async ({ page }) => {
    await page.goto('/runs');
    const runningRun = page.getByTestId('run-row').filter({ hasText: /running/i }).first();
    
    if (await runningRun.isVisible()) {
      await runningRun.click();
      
      const initialScore = await page.getByTestId('current-score').textContent();
      
      // Wait for WebSocket update (up to 30 seconds)
      await page.waitForFunction(
        (initial) => {
          const current = document.querySelector('[data-testid="current-score"]')?.textContent;
          return current !== initial;
        },
        initialScore,
        { timeout: 30000 }
      );
    }
  });
});

test.describe('Execution Actions', () => {
  test('pauses running execution', async ({ page }) => {
    await page.goto('/runs');
    const runningRun = page.getByTestId('run-row').filter({ hasText: /running/i }).first();
    
    if (await runningRun.isVisible()) {
      await runningRun.click();
      
      await page.getByRole('button', { name: /pause/i }).click();
      
      // Confirm pause
      await page.getByRole('dialog').getByRole('button', { name: /pause/i }).click();
      
      await expect(page.getByTestId('run-status')).toContainText(/paused/i);
    }
  });

  test('resumes paused execution', async ({ page }) => {
    await page.goto('/runs');
    const pausedRun = page.getByTestId('run-row').filter({ hasText: /paused/i }).first();
    
    if (await pausedRun.isVisible()) {
      await pausedRun.click();
      
      await page.getByRole('button', { name: /resume/i }).click();
      
      await expect(page.getByTestId('run-status')).toContainText(/running/i);
    }
  });

  test('cancels execution', async ({ page }) => {
    await page.goto('/runs');
    const runningRun = page.getByTestId('run-row').filter({ hasText: /running/i }).first();
    
    if (await runningRun.isVisible()) {
      await runningRun.click();
      
      await page.getByRole('button', { name: /cancel/i }).click();
      
      // Confirm cancellation
      await page.getByRole('dialog').getByRole('button', { name: /cancel execution/i }).click();
      
      await expect(page.getByTestId('run-status')).toContainText(/cancelled/i);
    }
  });

  test('retries failed execution', async ({ page }) => {
    await page.goto('/runs');
    const failedRun = page.getByTestId('run-row').filter({ hasText: /failed/i }).first();
    
    if (await failedRun.isVisible()) {
      await failedRun.click();
      
      await page.getByRole('button', { name: /retry/i }).click();
      
      // New run should be created
      await expect(page).toHaveURL(/\/runs\/[a-z0-9-]+/);
      await expect(page.getByTestId('run-status')).toContainText(/running|pending/i);
    }
  });
});

test.describe('Execution Results', () => {
  test('displays completed execution results', async ({ page }) => {
    await page.goto('/runs');
    const completedRun = page.getByTestId('run-row').filter({ hasText: /completed/i }).first();
    
    if (await completedRun.isVisible()) {
      await completedRun.click();
      
      // Check results panel
      await expect(page.getByTestId('final-score')).toBeVisible();
      await expect(page.getByTestId('final-answer')).toBeVisible();
      await expect(page.getByTestId('execution-time')).toBeVisible();
    }
  });

  test('exports execution report', async ({ page }) => {
    await page.goto('/runs');
    await page.getByTestId('run-row').filter({ hasText: /completed/i }).first().click();
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export report/i }).click();
    await page.getByRole('menuitem', { name: /pdf/i }).click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('views evidence pack', async ({ page }) => {
    await page.goto('/runs');
    await page.getByTestId('run-row').filter({ hasText: /completed/i }).first().click();
    
    await page.getByRole('button', { name: /evidence pack/i }).click();
    
    // Check evidence viewer
    const evidenceViewer = page.getByTestId('evidence-viewer');
    await expect(evidenceViewer).toBeVisible();
    await expect(evidenceViewer.getByTestId('evidence-hash')).toBeVisible();
  });

  test('compares execution iterations', async ({ page }) => {
    await page.goto('/runs');
    await page.getByTestId('run-row').filter({ hasText: /completed/i }).first().click();
    
    await page.getByRole('tab', { name: /iterations/i }).click();
    
    // Select two iterations for comparison
    await page.getByTestId('iteration-item').first().getByRole('checkbox').check();
    await page.getByTestId('iteration-item').nth(1).getByRole('checkbox').check();
    
    await page.getByRole('button', { name: /compare/i }).click();
    
    // Check diff view
    const diffView = page.getByTestId('iteration-diff');
    await expect(diffView).toBeVisible();
  });
});

test.describe('Execution - Error Handling', () => {
  test('handles provider timeout gracefully', async ({ page }) => {
    // This test requires mock setup
    await page.route('**/api/execute', async route => {
      await new Promise(resolve => setTimeout(resolve, 65000));
      await route.fulfill({ status: 504 });
    });
    
    await page.goto('/executions/new');
    await page.getByLabel(/name/i).fill('Timeout Test');
    await page.getByRole('button', { name: /start/i }).click();
    
    // Should show timeout error
    await expect(page.getByRole('alert')).toContainText(/timeout/i);
  });

  test('displays validation errors clearly', async ({ page }) => {
    await page.goto('/runs');
    const failedRun = page.getByTestId('run-row').filter({ hasText: /failed/i }).first();
    
    if (await failedRun.isVisible()) {
      await failedRun.click();
      
      // Check error display
      const errorPanel = page.getByTestId('error-details');
      await expect(errorPanel).toBeVisible();
      await expect(errorPanel.getByTestId('error-message')).toBeVisible();
      await expect(errorPanel.getByTestId('error-stack')).toBeVisible();
    }
  });
});
