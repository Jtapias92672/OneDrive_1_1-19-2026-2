/**
 * FORGE Platform - Global Test Setup
 * @epic 12 - E2E Testing
 * 
 * Runs once before all tests
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Starting FORGE E2E Test Suite\n');
  
  // Environment info
  const env = process.env.TEST_ENV || 'local';
  const baseUrl = process.env.FORGE_URL || 'http://localhost:3000';
  const apiUrl = process.env.FORGE_API_URL || process.env.API_URL || 'http://localhost:8080';
  
  console.log(`Environment: ${env}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`API URL: ${apiUrl}`);
  
  // Create required directories
  const dirs = [
    'reports',
    'reports/html',
    'test-results',
    'playwright/.auth',
  ];
  
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
  
  // Verify services are accessible
  try {
    const uiResponse = await fetch(baseUrl);
    if (uiResponse.ok) {
      console.log('✅ UI service is running');
    } else {
      console.warn(`⚠️ UI health check returned ${uiResponse.status}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not reach UI at ${baseUrl}`);
    if (env !== 'local') {
      console.log('   (Continuing anyway for CI environments)');
    }
  }
  
  try {
    const apiResponse = await fetch(`${apiUrl}/health`);
    if (apiResponse.ok) {
      console.log('✅ API service is running');
    } else {
      console.warn(`⚠️ API health check returned ${apiResponse.status}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not reach API at ${apiUrl}`);
  }
  
  // Create auth sessions
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    
    // Try to create user session
    const userEmail = process.env.TEST_USER_EMAIL || 'test@forge.dev';
    const userPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    
    try {
      await page.goto(`${baseUrl}/login`, { timeout: 30000 });
      await page.fill('input[type="email"]', userEmail);
      await page.fill('input[type="password"]', userPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      const authPath = path.join(__dirname, '../playwright/.auth/user.json');
      await page.context().storageState({ path: authPath });
      console.log('✅ User session created');
    } catch (error) {
      console.log('⚠️ Could not create user session (login page may not be available)');
    }
    
    // Try to create admin session
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@forge.dev';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';
    
    try {
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      const adminAuthPath = path.join(__dirname, '../playwright/.auth/admin.json');
      await page.context().storageState({ path: adminAuthPath });
      console.log('✅ Admin session created');
    } catch (error) {
      console.log('⚠️ Could not create admin session');
    }
  } finally {
    await browser.close();
  }
  
  // Store test metadata
  const metadata = {
    environment: env,
    startTime: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    baseUrl,
    apiUrl,
  };
  
  const metadataPath = path.join(__dirname, '../reports/test-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  console.log('\n📋 Test setup complete\n');
}

export default globalSetup;
