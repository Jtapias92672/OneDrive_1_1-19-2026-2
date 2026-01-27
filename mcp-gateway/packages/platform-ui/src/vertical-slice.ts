#!/usr/bin/env npx ts-node
/**
 * FORGE Vertical Slice - Proof of Real Integration
 * Run: npx ts-node src/vertical-slice.ts
 *
 * Requires: FIGMA_TOKEN in .env file
 */
import 'dotenv/config';
import { FigmaClient } from './lib/integrations/figma/figma-client';
import * as fs from 'fs';
import * as path from 'path';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = '6GefaVgI8xnuDIHhSbfzsJ';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './vertical-slice-output';

async function main() {
  // Validate token presence (never log the actual value)
  if (!FIGMA_TOKEN) {
    console.error('ERROR: FIGMA_TOKEN environment variable required');
    console.error('Set via .env file or: export FIGMA_TOKEN=your_token');
    process.exit(1);
  }
  console.log(`Token configured: ${FIGMA_TOKEN ? 'yes' : 'no'}`);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           FORGE VERTICAL SLICE - REAL DATA TEST            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Step 1: Real API Call
  console.log('STEP 1: Calling Figma API...');
  console.log(`  Target: ${FILE_KEY}`);

  const client = new FigmaClient({ accessToken: FIGMA_TOKEN });

  const figmaFile = await client.getFile(FILE_KEY);
  console.log(`  ✓ Retrieved: "${figmaFile.name}"`);
  console.log(`  ✓ Last modified: ${figmaFile.lastModified}`);
  console.log(`  ✓ Version: ${figmaFile.version}`);
  console.log(`  ✓ Components: ${Object.keys(figmaFile.components || {}).length}`);

  // Save proof - API response
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'figma-api-response.json'),
    JSON.stringify(figmaFile, null, 2)
  );
  console.log('  ✓ Saved: figma-api-response.json\n');

  // Step 2: Parse document structure
  console.log('STEP 2: Parsing document...');
  const frames = findFrames(figmaFile.document);
  console.log(`  ✓ Found ${frames.length} top-level frames/components`);

  if (frames.length > 0) {
    console.log('  Frames found:');
    frames.slice(0, 10).forEach(f => console.log(`    - ${f.name} (${f.type})`));
    if (frames.length > 10) {
      console.log(`    ... and ${frames.length - 10} more`);
    }
  }

  // Step 3: Generate React components
  console.log('\nSTEP 3: Generating React components...');

  const generatedFiles: string[] = [];
  for (const frame of frames.slice(0, 10)) { // Limit to first 10
    const name = sanitizeName(frame.name);
    if (!name) continue;

    const code = generateComponent(frame);
    const filename = `${name}.tsx`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), code);
    generatedFiles.push(filename);
    console.log(`  ✓ Generated: ${filename}`);
  }

  // Generate index file
  if (generatedFiles.length > 0) {
    const indexContent = generatedFiles
      .map(f => f.replace('.tsx', ''))
      .map(name => `export { default as ${name} } from './${name}';`)
      .join('\n');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent + '\n');
    console.log('  ✓ Generated: index.ts');
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  VERTICAL SLICE COMPLETE                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nOutput directory: ${path.resolve(OUTPUT_DIR)}`);
  console.log(`Files generated: ${generatedFiles.length + 2}`); // +2 for JSON and index
  console.log('\nProof of real data:');
  console.log(`  - File name from API: "${figmaFile.name}"`);
  console.log(`  - Last modified: ${figmaFile.lastModified}`);
  console.log(`  - Component count: ${Object.keys(figmaFile.components || {}).length}`);
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number } }>;
  cornerRadius?: number;
}

function findFrames(node: FigmaNode): FigmaNode[] {
  const frames: FigmaNode[] = [];

  function traverse(n: FigmaNode, depth: number = 0) {
    // Only collect top-level frames and components (depth 2 = inside first page)
    if (depth === 2 && (n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'COMPONENT_SET')) {
      frames.push(n);
    } else if (n.children && depth < 2) {
      n.children.forEach(child => traverse(child, depth + 1));
    }
  }

  traverse(node);
  return frames;
}

function sanitizeName(name: string): string {
  // Convert to PascalCase and remove invalid characters
  const cleaned = name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  // Ensure it doesn't start with a number
  if (/^\d/.test(cleaned)) {
    return 'Component' + cleaned;
  }

  return cleaned || 'Component';
}

function generateComponent(frame: FigmaNode): string {
  const name = sanitizeName(frame.name);
  const { width = 400, height = 300 } = frame.absoluteBoundingBox || {};

  // Extract background color if available
  let backgroundColor = '#ffffff';
  if (frame.fills && frame.fills.length > 0) {
    const fill = frame.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      const { r, g, b } = fill.color;
      backgroundColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }
  }

  const borderRadius = frame.cornerRadius || 0;

  return `/**
 * ${name}
 * Generated from Figma: "${frame.name}"
 * Type: ${frame.type}
 */
import React from 'react';

export interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
}

export const ${name}: React.FC<${name}Props> = ({ className, children }) => {
  return (
    <div
      className={className}
      style={{
        width: ${Math.round(width)},
        height: ${Math.round(height)},
        backgroundColor: '${backgroundColor}',
        borderRadius: ${borderRadius},
        boxSizing: 'border-box',
      }}
    >
      {children || <span>${frame.name}</span>}
    </div>
  );
};

export default ${name};
`;
}

main().catch(err => {
  console.error('\n❌ VERTICAL SLICE FAILED');
  console.error('Error:', err.message);
  process.exit(1);
});
