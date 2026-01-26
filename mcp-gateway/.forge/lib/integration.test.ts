/**
 * Integration Test: FORGE Orchestration Infrastructure
 * Demonstrates: Hook lifecycle (pending → active → complete)
 */

import * as path from 'path';
import * as fs from 'fs/promises';

// Import all modules
import { ledger, generateId, hashContent, initLedger } from './ledger.js';
import { hooks, initHooks, createHook, activateHook, completeHook } from './hook.js';
import { convoy, createConvoyFromFigma, sling, getConvoyDisplay } from './convoy.js';
import type {
  Task,
  Hook,
  Convoy,
  FigmaComponent,
  MinimumViableContext,
  HookResult,
  Evidence,
} from './types.js';

// =============================================================================
// Test Utilities
// =============================================================================

const FORGE_ROOT = path.join(process.cwd(), '.forge');

async function cleanup(): Promise<void> {
  // Clean up test artifacts
  const dirs = [
    path.join(FORGE_ROOT, 'hooks', 'pending'),
    path.join(FORGE_ROOT, 'hooks', 'active'),
    path.join(FORGE_ROOT, 'hooks', 'complete'),
    path.join(FORGE_ROOT, 'ledger'),
  ];

  for (const dir of dirs) {
    try {
      const entries = await fs.readdir(dir);
      for (const entry of entries) {
        if (entry !== '.gitkeep') {
          await fs.rm(path.join(dir, entry), { recursive: true });
        }
      }
    } catch {
      // Ignore if directory doesn't exist
    }
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

// =============================================================================
// Test: Complete Hook Lifecycle
// =============================================================================

async function testHookLifecycle(): Promise<void> {
  console.log('\n=== Test: Hook Lifecycle ===\n');

  // Initialize
  await initLedger();
  await initHooks();

  // 1. Create a task
  console.log('1. Creating task in ledger...');
  const task = await ledger.createTask({
    type: 'translate',
    input: { componentId: 'figma:node:test123' },
  });
  assert(task.id.startsWith('task-'), 'Task ID has correct prefix');
  assert(task.status === 'PENDING', 'Task status is PENDING');

  // 2. Create hook (Mayor dispatches)
  console.log('\n2. Creating hook (Mayor dispatches work)...');
  const context: MinimumViableContext = {
    task: {
      id: task.id,
      type: 'translate',
      componentId: 'figma:node:test123',
    },
    component: {
      id: 'figma:node:test123',
      name: 'TestButton',
      type: 'COMPONENT',
    },
    outputPath: '.forge/output/TestButton.mpk',
    tools: ['figma-api', 'target-sdk', 'file-system'],
  };

  const hook = await createHook(task, context, 'translator');
  assert(hook.id.startsWith('translator-'), 'Hook ID has role prefix');
  assert(hook.status === 'PENDING', 'Hook starts in PENDING');

  // Verify hook file exists in pending/
  const pendingDir = path.join(FORGE_ROOT, 'hooks', 'pending', hook.id);
  const pendingExists = await fs.stat(pendingDir).then(() => true).catch(() => false);
  assert(pendingExists, 'Hook directory exists in pending/');

  // 3. Activate hook (Worker starts)
  console.log('\n3. Activating hook (Worker starts executing)...');
  const activated = await activateHook(hook.id);
  assert(activated, 'Hook activation succeeded');

  // Verify moved to active/
  const activeDir = path.join(FORGE_ROOT, 'hooks', 'active', hook.id);
  const activeExists = await fs.stat(activeDir).then(() => true).catch(() => false);
  assert(activeExists, 'Hook directory moved to active/');

  // 4. Complete hook (Worker finishes)
  console.log('\n4. Completing hook (Worker finishes)...');
  const result: HookResult = {
    taskId: task.id,
    hookId: hook.id,
    status: 'COMPLETE',
    output: {
      mpkPath: '.forge/output/TestButton.mpk',
    },
    evidence: {
      inputHash: hashContent(JSON.stringify(context)),
      outputHash: hashContent('test-output-content'),
      timestamp: new Date().toISOString(),
    },
  };

  const completed = await completeHook(hook.id, result);
  assert(completed, 'Hook completion succeeded');

  // Verify moved to complete/
  const completeDir = path.join(FORGE_ROOT, 'hooks', 'complete', hook.id);
  const completeExists = await fs.stat(completeDir).then(() => true).catch(() => false);
  assert(completeExists, 'Hook directory moved to complete/');

  // Verify result.json exists
  const resultPath = path.join(completeDir, 'result.json');
  const resultExists = await fs.stat(resultPath).then(() => true).catch(() => false);
  assert(resultExists, 'Result file written');

  console.log('\n✅ Hook lifecycle test PASSED\n');
}

// =============================================================================
// Test: Convoy Creation and Progress
// =============================================================================

async function testConvoyWorkflow(): Promise<void> {
  console.log('\n=== Test: Convoy Workflow ===\n');

  // Initialize
  await initLedger();
  await initHooks();

  // 1. Create convoy from Figma components
  console.log('1. Creating convoy from Figma components...');
  const components: FigmaComponent[] = [
    { id: 'comp-1', name: 'LoginButton', type: 'COMPONENT' },
    { id: 'comp-2', name: 'SignupForm', type: 'COMPONENT' },
    { id: 'comp-3', name: 'AuthModal', type: 'COMPONENT' },
  ];

  const convoyResult = await createConvoyFromFigma({
    name: 'Auth System Components',
    figmaFileKey: 'figma-file-abc123',
    components,
    dependencies: [
      { from: 'comp-3', to: 'comp-1' },  // AuthModal depends on LoginButton
      { from: 'comp-3', to: 'comp-2' },  // AuthModal depends on SignupForm
    ],
  });

  assert(convoyResult.id.startsWith('convoy-'), 'Convoy ID has correct prefix');
  assert(convoyResult.tasks.length === 3, 'Convoy has 3 tasks');

  // 2. Check convoy progress
  console.log('\n2. Checking convoy progress...');
  const progress = await ledger.getConvoyProgress(convoyResult.id);
  assert(progress !== null, 'Progress retrieved');
  assert(progress!.total === 3, 'Total tasks = 3');
  // Note: Some tasks may be BLOCKED due to dependencies

  // 3. Display convoy status
  console.log('\n3. Displaying convoy status...');
  const display = await getConvoyDisplay(convoyResult.id);
  console.log(display);

  console.log('\n✅ Convoy workflow test PASSED\n');
}

// =============================================================================
// Test: Hash ID Generation
// =============================================================================

async function testHashIds(): Promise<void> {
  console.log('\n=== Test: Hash ID Generation ===\n');

  const id1 = generateId('task', 'input-data-1');
  const id2 = generateId('task', 'input-data-2');
  const id3 = generateId('task', 'input-data-1');  // Same input as id1

  assert(id1.startsWith('task-'), 'ID has correct prefix');
  assert(id1.length === 13, 'ID has correct length (prefix + 8 chars)');
  assert(id1 !== id2, 'Different inputs produce different IDs');
  assert(id1 === id3, 'Same input produces same ID');

  const hash = hashContent('test content');
  assert(hash.length === 64, 'SHA-256 hash is 64 chars');

  console.log('\n✅ Hash ID generation test PASSED\n');
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  FORGE Orchestration Infrastructure - Integration Tests   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await cleanup();

    await testHashIds();
    await testHookLifecycle();
    await testConvoyWorkflow();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  All integration tests PASSED ✅');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Run if executed directly
main();
