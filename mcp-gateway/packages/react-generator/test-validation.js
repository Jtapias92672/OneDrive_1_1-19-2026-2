#!/usr/bin/env node
/**
 * Input Validation Test
 * Verifies all error cases are handled properly
 */

const { ReactGenerator } = require('./dist/index.js');

async function testValidation() {
  console.log('=== INPUT VALIDATION TESTS ===\n');

  const generator = new ReactGenerator();
  let passed = 0;
  let failed = 0;

  // Test 1: null input
  console.log('1. null → error message (not crash)');
  try {
    await generator.generate(null);
    console.log('   ❌ FAIL: Should have thrown error');
    failed++;
  } catch (err) {
    if (err.message === 'Design input required') {
      console.log('   ✅ PASS: "Design input required"');
      passed++;
    } else {
      console.log(`   ❌ FAIL: Wrong error - ${err.message}`);
      failed++;
    }
  }

  // Test 2: undefined input
  console.log('2. undefined → error message (not crash)');
  try {
    await generator.generate(undefined);
    console.log('   ❌ FAIL: Should have thrown error');
    failed++;
  } catch (err) {
    if (err.message === 'Design input required') {
      console.log('   ✅ PASS: "Design input required"');
      passed++;
    } else {
      console.log(`   ❌ FAIL: Wrong error - ${err.message}`);
      failed++;
    }
  }

  // Test 3: empty object
  console.log('3. empty object → error message (not crash)');
  try {
    await generator.generate({});
    console.log('   ❌ FAIL: Should have thrown error');
    failed++;
  } catch (err) {
    if (err.message === 'Design must have pages') {
      console.log('   ✅ PASS: "Design must have pages"');
      passed++;
    } else {
      console.log(`   ❌ FAIL: Wrong error - ${err.message}`);
      failed++;
    }
  }

  // Test 4: missing pages
  console.log('4. missing pages → error message (not crash)');
  try {
    await generator.generate({ version: '1.0.0', metadata: {} });
    console.log('   ❌ FAIL: Should have thrown error');
    failed++;
  } catch (err) {
    if (err.message === 'Design must have pages') {
      console.log('   ✅ PASS: "Design must have pages"');
      passed++;
    } else {
      console.log(`   ❌ FAIL: Wrong error - ${err.message}`);
      failed++;
    }
  }

  // Test 5: empty pages array → graceful empty result
  console.log('5. empty pages → graceful empty result');
  try {
    const result = await generator.generate({
      version: '1.0.0',
      metadata: {},
      pages: [],
      components: [],
      componentSets: [],
      tokens: { colors: {}, typography: {}, spacing: {}, radii: {}, shadows: {} },
      assets: [],
      stats: {},
    });

    if (result &&
        Array.isArray(result.components) &&
        result.components.length === 0 &&
        result.stats &&
        result.stats.totalComponents === 0) {
      console.log('   ✅ PASS: Returned empty result gracefully');
      console.log(`      - components: [] (length: ${result.components.length})`);
      console.log(`      - totalComponents: ${result.stats.totalComponents}`);
      console.log(`      - durationMs: ${result.stats.durationMs}`);
      passed++;
    } else {
      console.log('   ❌ FAIL: Did not return proper empty result');
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ FAIL: Should not throw - ${err.message}`);
    failed++;
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${passed}/5`);
  console.log(`Failed: ${failed}/5`);

  if (failed === 0) {
    console.log('\n✅ ALL VALIDATION TESTS PASS');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

testValidation().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
