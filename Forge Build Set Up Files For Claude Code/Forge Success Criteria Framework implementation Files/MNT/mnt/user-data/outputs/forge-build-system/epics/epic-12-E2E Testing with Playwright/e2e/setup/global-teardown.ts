/**
 * FORGE E2E Tests - Global Teardown
 * @epic 12 - E2E Testing
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Starting FORGE E2E Test Teardown...');
  const apiUrl = process.env.FORGE_API_URL || 'http://localhost:3100';
  try { await fetch(`${apiUrl}/api/test/cleanup`, { method: 'POST' }); console.log('✓ Test data cleaned up'); }
  catch { console.log('⚠ Could not cleanup test data'); }
  console.log('✅ E2E Teardown Complete\n');
}

export default globalTeardown;
