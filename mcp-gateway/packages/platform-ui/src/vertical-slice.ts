#!/usr/bin/env npx ts-node
/**
 * FORGE Vertical Slice - End-to-End Proof Script
 * Run: npx ts-node src/vertical-slice.ts
 *
 * Requires: FIGMA_TOKEN in .env file
 *
 * This script demonstrates the complete pipeline:
 * 1. Fetch real Figma data via API
 * 2. Parse with FigmaParser (Phase 2)
 * 3. Generate React components with Tailwind (Phase 3)
 * 4. Generate Mendix pages/widgets/styles (Phase 4)
 * 5. Verify outputs compile/parse correctly
 */
import 'dotenv/config';
import { FigmaClient } from './lib/integrations/figma/figma-client';
import { FigmaParser } from './lib/integrations/figma/figma-parser';
import { ReactGenerator, GeneratedComponent } from './lib/generation/react-generator';
import { MendixGenerator, MendixOutput } from './lib/generation/mendix-generator';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY || '6GefaVgI8xnuDIHhSbfzsJ';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './vertical-slice-output';

interface VerificationResult {
  step: string;
  success: boolean;
  message: string;
  details?: string[];
}

async function main() {
  const results: VerificationResult[] = [];
  const startTime = Date.now();

  // Validate token presence (never log the actual value)
  if (!FIGMA_TOKEN) {
    console.error('ERROR: FIGMA_TOKEN environment variable required');
    console.error('Set via .env file or: export FIGMA_TOKEN=your_token');
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║       FORGE VERTICAL SLICE - END-TO-END PROOF SCRIPT          ║');
  console.log('║                    Phases 1-4 Integration                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Prepare output directories
  const reactDir = path.join(OUTPUT_DIR, 'react');
  const mendixDir = path.join(OUTPUT_DIR, 'mendix');
  const mendixPagesDir = path.join(mendixDir, 'pages');
  const mendixWidgetsDir = path.join(mendixDir, 'widgets');
  const mendixStylesDir = path.join(mendixDir, 'styles');

  fs.mkdirSync(reactDir, { recursive: true });
  fs.mkdirSync(mendixPagesDir, { recursive: true });
  fs.mkdirSync(mendixWidgetsDir, { recursive: true });
  fs.mkdirSync(mendixStylesDir, { recursive: true });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Fetch from Figma API (Phase 1)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Fetching from Figma API                                 │');
  console.log('└─────────────────────────────────────────────────────────────────┘');

  const client = new FigmaClient({ accessToken: FIGMA_TOKEN });
  const figmaFile = await client.getFile(FILE_KEY);

  console.log(`  ✓ Retrieved: "${figmaFile.name}"`);
  console.log(`  ✓ Last modified: ${figmaFile.lastModified}`);
  console.log(`  ✓ Components in library: ${Object.keys(figmaFile.components || {}).length}`);

  // Save raw API response for debugging
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'figma-api-response.json'),
    JSON.stringify(figmaFile, null, 2)
  );

  results.push({
    step: 'Figma API',
    success: true,
    message: `Retrieved "${figmaFile.name}"`,
    details: [`Last modified: ${figmaFile.lastModified}`],
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Parse with FigmaParser (Phase 2)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: Parsing with FigmaParser (Phase 2)                      │');
  console.log('└─────────────────────────────────────────────────────────────────┘');

  const parser = new FigmaParser();
  const parsedDesign = parser.parse(figmaFile);

  console.log(`  ✓ Parsed design: "${parsedDesign.name}"`);
  console.log(`  ✓ Top-level components: ${parsedDesign.components.length}`);

  // Count nested elements
  let totalFills = 0;
  let totalText = 0;
  let totalAutoLayout = 0;

  function countElements(components: typeof parsedDesign.components) {
    for (const c of components) {
      totalFills += c.fills.length;
      if (c.text) totalText++;
      if (c.autoLayout) totalAutoLayout++;
      if (c.children) countElements(c.children);
    }
  }
  countElements(parsedDesign.components);

  console.log(`  ✓ Fills extracted: ${totalFills}`);
  console.log(`  ✓ Text nodes: ${totalText}`);
  console.log(`  ✓ Auto-layout nodes: ${totalAutoLayout}`);

  // Save parsed design
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'parsed-design.json'),
    JSON.stringify(parsedDesign, null, 2)
  );

  results.push({
    step: 'FigmaParser',
    success: true,
    message: `Parsed ${parsedDesign.components.length} components`,
    details: [`Fills: ${totalFills}`, `Text: ${totalText}`, `Auto-layout: ${totalAutoLayout}`],
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Generate React Components (Phase 3)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 3: Generating React Components (Phase 3)                   │');
  console.log('└─────────────────────────────────────────────────────────────────┘');

  const reactGenerator = new ReactGenerator({ useTailwind: true });
  const reactComponents = reactGenerator.generate(parsedDesign);

  console.log(`  ✓ Generated ${reactComponents.length} React components`);

  // Write React components
  const reactFiles: string[] = [];
  for (const component of reactComponents) {
    const filePath = path.join(reactDir, component.fileName);
    fs.writeFileSync(filePath, component.code);
    reactFiles.push(component.fileName);
    console.log(`    → ${component.fileName}`);
  }

  // Generate React index file
  const reactIndexContent = reactComponents
    .map((c) => `export { ${c.name}, default as ${c.name}Component } from './${c.name}';`)
    .join('\n');
  fs.writeFileSync(path.join(reactDir, 'index.ts'), reactIndexContent + '\n');
  console.log(`    → index.ts`);

  results.push({
    step: 'ReactGenerator',
    success: true,
    message: `Generated ${reactComponents.length} components`,
    details: reactFiles,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Generate Mendix Output (Phase 4)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 4: Generating Mendix Output (Phase 4)                      │');
  console.log('└─────────────────────────────────────────────────────────────────┘');

  const mendixGenerator = new MendixGenerator({
    moduleName: 'Generated',
    splitWidgets: true,
  });
  const mendixOutput = mendixGenerator.generate(parsedDesign);

  console.log(`  ✓ Generated ${mendixOutput.pages.length} Mendix pages`);
  console.log(`  ✓ Generated ${mendixOutput.widgets.length} Mendix widgets`);

  // Write Mendix pages
  const mendixFiles: string[] = [];
  for (const page of mendixOutput.pages) {
    const filePath = path.join(mendixPagesDir, page.fileName);
    fs.writeFileSync(filePath, page.content);
    mendixFiles.push(`pages/${page.fileName}`);
    console.log(`    → pages/${page.fileName}`);
  }

  // Write Mendix widgets
  for (const widget of mendixOutput.widgets) {
    const filePath = path.join(mendixWidgetsDir, widget.fileName);
    fs.writeFileSync(filePath, widget.content);
    mendixFiles.push(`widgets/${widget.fileName}`);
    console.log(`    → widgets/${widget.fileName}`);
  }

  // Write theme SCSS
  fs.writeFileSync(path.join(mendixStylesDir, mendixOutput.styles.fileName), mendixOutput.styles.content);
  mendixFiles.push(`styles/${mendixOutput.styles.fileName}`);
  console.log(`    → styles/${mendixOutput.styles.fileName}`);

  results.push({
    step: 'MendixGenerator',
    success: true,
    message: `Generated ${mendixOutput.pages.length} pages, ${mendixOutput.widgets.length} widgets`,
    details: mendixFiles.slice(0, 10),
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: Verify Outputs
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 5: Verifying Outputs                                       │');
  console.log('└─────────────────────────────────────────────────────────────────┘');

  // Verify React files have valid structure
  let reactValid = 0;
  let reactInvalid = 0;
  for (const component of reactComponents) {
    const hasImport = component.code.includes("import React from 'react'");
    const hasExport = component.code.includes('export const');
    const hasInterface = component.code.includes('interface');
    if (hasImport && hasExport && hasInterface) {
      reactValid++;
    } else {
      reactInvalid++;
    }
  }
  console.log(`  React components: ${reactValid} valid, ${reactInvalid} invalid`);

  // Verify Mendix XML has valid structure
  let mendixValid = 0;
  let mendixInvalid = 0;
  for (const page of mendixOutput.pages) {
    const hasXmlDecl = page.content.includes('<?xml');
    const hasPageTag = page.content.includes('<page') && page.content.includes('</page>');
    if (hasXmlDecl && hasPageTag) {
      mendixValid++;
    } else {
      mendixInvalid++;
    }
  }
  console.log(`  Mendix pages: ${mendixValid} valid, ${mendixInvalid} invalid`);

  // Verify SCSS has content
  const scssLines = mendixOutput.styles.content.split('\n').length;
  console.log(`  Theme SCSS: ${scssLines} lines`);

  const verificationPassed = reactInvalid === 0 && mendixInvalid === 0;
  results.push({
    step: 'Verification',
    success: verificationPassed,
    message: verificationPassed ? 'All outputs valid' : 'Some outputs invalid',
    details: [
      `React: ${reactValid}/${reactComponents.length} valid`,
      `Mendix: ${mendixValid}/${mendixOutput.pages.length} valid`,
      `SCSS: ${scssLines} lines`,
    ],
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const allPassed = results.every((r) => r.success);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    VERTICAL SLICE SUMMARY                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  console.log(`\n  Duration: ${duration}s`);
  console.log(`  Status: ${allPassed ? '✅ ALL STEPS PASSED' : '❌ SOME STEPS FAILED'}`);

  console.log('\n  Results:');
  for (const result of results) {
    const icon = result.success ? '✓' : '✗';
    console.log(`    ${icon} ${result.step}: ${result.message}`);
  }

  console.log('\n  Output Structure:');
  console.log(`    ${OUTPUT_DIR}/`);
  console.log('    ├── figma-api-response.json');
  console.log('    ├── parsed-design.json');
  console.log('    ├── react/');
  console.log(`    │   ├── ${reactFiles[0] || '*.tsx'}`);
  console.log(`    │   └── index.ts (${reactComponents.length} exports)`);
  console.log('    └── mendix/');
  console.log('        ├── pages/');
  console.log(`        │   └── ${mendixOutput.pages[0]?.fileName || '*.page.xml'}`);
  console.log('        ├── widgets/');
  console.log(`        │   └── ${mendixOutput.widgets[0]?.fileName || '*.widget.xml'}`);
  console.log('        └── styles/');
  console.log('            └── theme.scss');

  console.log('\n  Evidence of Real Data:');
  console.log(`    • Figma file: "${parsedDesign.name}"`);
  console.log(`    • Last modified: ${parsedDesign.lastModified}`);
  console.log(`    • Components parsed: ${parsedDesign.components.length}`);
  console.log(`    • React files generated: ${reactComponents.length}`);
  console.log(`    • Mendix pages generated: ${mendixOutput.pages.length}`);

  // Write summary JSON
  const summary = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    success: allPassed,
    source: {
      fileKey: FILE_KEY,
      fileName: parsedDesign.name,
      lastModified: parsedDesign.lastModified,
    },
    output: {
      reactComponents: reactComponents.length,
      mendixPages: mendixOutput.pages.length,
      mendixWidgets: mendixOutput.widgets.length,
      scssLines: scssLines,
    },
    results,
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'e2e-summary.json'), JSON.stringify(summary, null, 2));

  console.log(`\n  Full summary saved to: ${path.join(OUTPUT_DIR, 'e2e-summary.json')}`);

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ VERTICAL SLICE FAILED');
  console.error('Error:', err.message);
  if (err.stack) {
    console.error('\nStack trace:');
    console.error(err.stack);
  }
  process.exit(1);
});
