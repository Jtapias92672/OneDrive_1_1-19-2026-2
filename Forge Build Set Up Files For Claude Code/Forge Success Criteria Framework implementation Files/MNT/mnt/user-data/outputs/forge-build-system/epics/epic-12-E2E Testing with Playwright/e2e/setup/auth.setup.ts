/**
 * FORGE Platform - Authentication Setup
 * @epic 12 - E2E Testing
 * 
 * Authenticates user and saves session state for other tests
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page, request }) => {
  // Get test credentials from environment
  const email = process.env.TEST_USER_EMAIL || 'test@forge.dev';
  const password = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
  
  // Navigate to login page
  await page.goto('/login');
  
  // Wait for login form
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  
  // Fill in credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  
  // Submit login form
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for successful redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 30000 });
  
  // Verify we're authenticated
  await expect(page.getByTestId('user-menu')).toBeVisible();
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
});

setup('authenticate-admin', async ({ page }) => {
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@forge.dev';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';
  
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);
  await page.getByRole('button', { name: /sign in/i }).click();
  
  await page.waitForURL('/dashboard');
  
  // Save admin auth state
  await page.context().storageState({ 
    path: path.join(__dirname, '../playwright/.auth/admin.json') 
  });
});

setup('get-api-token', async ({ request }) => {
  // Get API token for API tests
  const response = await request.post('/api/auth/token', {
    data: {
      email: process.env.TEST_USER_EMAIL || 'test@forge.dev',
      password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    },
  });
  
  expect(response.ok()).toBeTruthy();
  
  const { token } = await response.json();
  
  // Store token for API tests
  process.env.TEST_API_TOKEN = token;
});
