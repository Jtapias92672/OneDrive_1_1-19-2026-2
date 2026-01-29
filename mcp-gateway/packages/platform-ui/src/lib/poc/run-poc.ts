/**
 * POC Orchestrator Test Script
 * Run with: npx ts-node --esm src/lib/poc/run-poc.ts
 */

import { createPOCOrchestrator } from './index';

async function main() {
  const figmaUrl = process.argv[2] || 'https://www.figma.com/proto/6GefaVgI8xnuDIHhSbfzsJ/POC_Test_Design?node-id=0-1&t=ThANUdbdt1SmOYRG-1';

  console.log('='.repeat(60));
  console.log('FORGE POC Orchestrator - Test Run');
  console.log('='.repeat(60));
  console.log('\nFigma URL:', figmaUrl);
  console.log('\nInitializing orchestrator...\n');

  // Create orchestrator with Figma token from environment
  const orchestrator = createPOCOrchestrator({
    figmaToken: process.env.FIGMA_TOKEN || '',
  });

  // Set up progress callback
  orchestrator.onProgress((event) => {
    const progressBar = '█'.repeat(Math.floor(event.progress / 5)) + '░'.repeat(20 - Math.floor(event.progress / 5));
    console.log(`[${progressBar}] ${event.progress}% - ${event.message}`);
  });

  try {
    console.log('Starting POC run...\n');

    const result = await orchestrator.run({
      figmaUrl,
      options: {
        generateTests: true,
        generateStories: true,
        skipJira: true, // Skip Jira for this test
        deployFrontend: false,
        deployBackend: false,
        outputDir: './generated', // Write files to ./generated directory
      },
    });

    console.log('\n' + '='.repeat(60));
    console.log('POC RUN COMPLETE');
    console.log('='.repeat(60));

    console.log('\n📊 RESULTS:');
    console.log('  Run ID:', result.runId);
    console.log('  Status:', result.status);

    if (result.figmaMetadata) {
      console.log('\n📐 FIGMA METADATA:');
      console.log('  File Key:', result.figmaMetadata.fileKey);
      console.log('  File Name:', result.figmaMetadata.fileName);
      console.log('  Last Modified:', result.figmaMetadata.lastModified);
    }

    console.log('\n🧩 FRONTEND COMPONENTS:', result.frontendComponents.length);
    for (const comp of result.frontendComponents) {
      console.log(`  - ${comp.name} (${comp.filePath})`);
      if (comp.testCode) console.log(`    ✓ Has tests`);
      if (comp.storyCode) console.log(`    ✓ Has Storybook story`);
    }

    console.log('\n📦 INFERRED DATA MODELS:', result.inferredModels.length);
    for (const model of result.inferredModels) {
      console.log(`  - ${model.name} (from: ${model.source})`);
      console.log(`    Fields: ${model.fields.map(f => f.name).join(', ')}`);
      console.log(`    Endpoints: ${model.endpoints.map(e => `${e.method} ${e.path}`).join(', ')}`);
    }

    console.log('\n🔧 BACKEND FILES:');
    console.log(`  Controllers: ${result.backendFiles.controllers.length}`);
    console.log(`  Services: ${result.backendFiles.services.length}`);
    console.log(`  Models: ${result.backendFiles.models.length}`);
    console.log(`  Routes: ${result.backendFiles.routes.length}`);
    console.log(`  Tests: ${result.backendFiles.tests.length}`);

    if (result.outputPath) {
      console.log('\n📁 OUTPUT PATH:', result.outputPath);
    }

    if (result.error) {
      console.log('\n⚠️ ERROR:', result.error);
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ POC Run Failed:', error);
    process.exit(1);
  }
}

main();
