/**
 * FORGE Platform - Playwright E2E Configuration
 * @epic 12 - E2E Testing
 * 
 * Comprehensive testing across browsers, devices, and test types
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Environment configuration
const env = process.env.TEST_ENV || 'local';

const envConfig: Record<string, { baseURL: string; apiURL: string }> = {
  local: {
    baseURL: 'http://localhost:3000',
    apiURL: 'http://localhost:8080',
  },
  staging: {
    baseURL: 'https://staging.forge.dev',
    apiURL: 'https://api.staging.forge.dev',
  },
  production: {
    baseURL: 'https://forge.dev',
    apiURL: 'https://api.forge.dev',
  },
};

const config = envConfig[env] || envConfig.local;

export default defineConfig({
  testDir: './tests',
  
  // Execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  
  // Reporting
  reporter: [
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  
  // Global settings
  use: {
    baseURL: config.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  
  // Timeouts
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  
  // Setup/teardown
  globalSetup: path.join(__dirname, 'setup/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'setup/global-teardown.ts'),
  
  // Projects
  projects: [
    // Auth setup
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // Mobile
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // API tests (headless)
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: config.apiURL,
      },
    },
    
    // Security tests
    {
      name: 'security',
      testDir: './security',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  
  // Web servers for local
  webServer: env === 'local' ? [
    {
      command: 'cd ../platform-ui && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ] : undefined,
  
  // Output
  outputDir: 'test-results',
});

export { config as testConfig };
