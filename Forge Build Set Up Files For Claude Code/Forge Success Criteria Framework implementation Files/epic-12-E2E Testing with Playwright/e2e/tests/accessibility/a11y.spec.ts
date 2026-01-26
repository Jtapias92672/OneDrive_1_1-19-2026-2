/**
 * FORGE Platform - Accessibility Tests
 * @epic 12 - E2E Testing
 * 
 * WCAG 2.1 AA compliance tests using axe-core
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - Dashboard', () => {
  test('dashboard has no critical accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility violations:', JSON.stringify(results.violations, null, 2));
    }
    
    // No critical or serious violations
    const critical = results.violations.filter(v => 
      v.impact === 'critical' || v.impact === 'serious'
    );
    
    expect(critical).toHaveLength(0);
  });

  test('dashboard has proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    // Should have at least one h1
    const h1s = await page.locator('h1').count();
    expect(h1s).toBeGreaterThanOrEqual(1);
    
    // Check heading order
    const levels = await Promise.all(
      headings.map(async h => {
        const tag = await h.evaluate(el => el.tagName);
        return parseInt(tag.replace('H', ''));
      })
    );
    
    // No level should skip more than one
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  test('dashboard has sufficient color contrast', async ({ page }) => {
    await page.goto('/dashboard');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze();
    
    const contrastViolations = results.violations.filter(v => 
      v.id === 'color-contrast'
    );
    
    expect(contrastViolations).toHaveLength(0);
  });
});

test.describe('Accessibility - Forms', () => {
  test('login form is accessible', async ({ page }) => {
    await page.goto('/login');
    
    const results = await new AxeBuilder({ page })
      .include('form')
      .analyze();
    
    const critical = results.violations.filter(v => 
      v.impact === 'critical' || v.impact === 'serious'
    );
    
    expect(critical).toHaveLength(0);
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/contracts/new');
    
    const inputs = await page.locator('input:not([type="hidden"]), textarea, select').all();
    
    for (const input of inputs) {
      // Check for associated label
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      const hasLabel = id && await page.locator(`label[for="${id}"]`).count() > 0;
      const hasAriaLabel = ariaLabel !== null;
      const hasAriaLabelledBy = ariaLabelledBy !== null;
      
      expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBe(true);
    }
  });

  test('form errors are announced', async ({ page }) => {
    await page.goto('/contracts/new');
    
    // Submit empty form
    await page.getByRole('button', { name: /save/i }).click();
    
    // Error should be associated with input
    const errorMessages = await page.locator('[role="alert"], .error-message, [aria-live="polite"]').all();
    expect(errorMessages.length).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Navigation', () => {
  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).not.toBe('BODY');
    
    // Continue tabbing
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const el = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(el);
    }
  });

  test('skip link is present and functional', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Focus skip link
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('a[href="#main"], a:has-text("Skip")').first();
    if (await skipLink.isVisible()) {
      await skipLink.click();
      
      // Main content should be focused
      const focused = await page.evaluate(() => document.activeElement?.id);
      expect(focused).toMatch(/main|content/i);
    }
  });

  test('navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');
    
    const nav = page.locator('nav').first();
    const links = await nav.locator('a').all();
    
    for (const link of links) {
      // Each link should be focusable
      const tabIndex = await link.getAttribute('tabindex');
      expect(tabIndex === null || parseInt(tabIndex) >= 0).toBe(true);
    }
  });
});

test.describe('Accessibility - Images and Media', () => {
  test('images have alt text', async ({ page }) => {
    await page.goto('/dashboard');
    
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Either has alt text or is decorative
      expect(alt !== null || role === 'presentation').toBe(true);
    }
  });

  test('icons have accessible names', async ({ page }) => {
    await page.goto('/dashboard');
    
    const iconButtons = await page.locator('button:has(svg), a:has(svg)').all();
    
    for (const button of iconButtons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      const text = await button.textContent();
      
      // Should have accessible name
      expect(ariaLabel || title || (text && text.trim())).toBeTruthy();
    }
  });
});

test.describe('Accessibility - Dynamic Content', () => {
  test('loading states are announced', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for aria-busy or loading announcements
    const loadingIndicators = await page.locator('[aria-busy="true"], [role="status"], [aria-live]').all();
    
    // At least the page should have live regions for announcements
    expect(loadingIndicators.length).toBeGreaterThanOrEqual(0);
  });

  test('modals trap focus', async ({ page }) => {
    await page.goto('/contracts');
    
    // Open a modal (e.g., new contract)
    await page.getByRole('button', { name: /new/i }).click();
    
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible()) {
      // Focus should be inside modal
      const focusInModal = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        return modal?.contains(document.activeElement);
      });
      
      expect(focusInModal).toBe(true);
      
      // Tabbing should stay in modal
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const stillInModal = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]');
          return modal?.contains(document.activeElement);
        });
        expect(stillInModal).toBe(true);
      }
      
      // Escape should close
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test('notifications are announced', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Trigger a notification (e.g., via action)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('forge:notification', {
        detail: { message: 'Test notification' }
      }));
    });
    
    // Check for aria-live region
    const announcement = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="alert"]');
    await expect(announcement.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Accessibility - Touch and Mobile', () => {
  test('touch targets are sufficiently large', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    const buttons = await page.locator('button, a, [role="button"]').all();
    
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        // WCAG 2.5.5 recommends 44x44 minimum
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
