#!/usr/bin/env node
/**
 * FORGE Slop Detector
 * Catches common AI hallucinations and bad patterns before code review
 * Based on ArcFoundry slop-tests skill
 *
 * @ai-generated Claude (Anthropic)
 * @ai-assisted 2025-01-19
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

interface SlopViolation {
  file: string;
  line: number;
  pattern: string;
  severity: 'error' | 'warning';
  message: string;
}

// Slop patterns to detect
const SLOP_PATTERNS = [
  // TODO/FIXME comments (incomplete work)
  {
    pattern: /\/\/\s*(TODO|FIXME|XXX|HACK|BUG):/i,
    severity: 'error' as const,
    message: 'TODO/FIXME comment found - incomplete work',
  },
  // Placeholder implementations
  {
    pattern: /throw new Error\(['"]Not implemented['"]\)/,
    severity: 'error' as const,
    message: 'Placeholder "Not implemented" error found',
  },
  // Console.log (debugging artifacts)
  {
    pattern: /console\.log\(/,
    severity: 'warning' as const,
    message: 'console.log found - remove debugging artifact',
  },
  // Hardcoded credentials
  {
    pattern: /(password|secret|api_key|apikey|token)\s*[:=]\s*['"][^'"]+['"]/i,
    severity: 'error' as const,
    message: 'Potential hardcoded credential detected',
  },
  // Empty catch blocks
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: 'error' as const,
    message: 'Empty catch block - errors swallowed',
  },
  // Magic numbers (excluding 0, 1, common values)
  {
    pattern: /(?<![\w.])(?!0|1|-1|2|10|100|1000|60|24|365)\d{2,}(?![\w])/,
    severity: 'warning' as const,
    message: 'Magic number detected - use named constant',
  },
  // Any type usage
  {
    pattern: /:\s*any\b/,
    severity: 'warning' as const,
    message: 'Explicit "any" type found - use proper typing',
  },
  // Alignment faking patterns (AI deception)
  {
    pattern: /I'll pretend|I'll act as if|I'll simulate|fake compliance/i,
    severity: 'error' as const,
    message: 'CRITICAL: Alignment faking language detected',
  },
  // Reward hacking patterns
  {
    pattern: /skip.*test|bypass.*validation|ignore.*check/i,
    severity: 'error' as const,
    message: 'CRITICAL: Potential reward hacking pattern',
  },
  // Missing imports (common AI hallucination)
  {
    pattern: /from ['"]\.\/(?!.*\.js['"])/,
    severity: 'warning' as const,
    message: 'Import may be missing .js extension for ESM',
  },
  // Unsafe type assertions
  {
    pattern: /as\s+(?!const\b)[A-Z]\w+(?!\s*\|)/,
    severity: 'warning' as const,
    message: 'Unsafe type assertion - consider type guard',
  },
];

// Files to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /dist/,
  /coverage/,
  /\.git/,
  /\.d\.ts$/,
  /slop-detector\.js$/, // Don't check self
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function getFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);

      if (shouldIgnore(fullPath)) continue;

      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (extensions.includes(extname(fullPath))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function checkFile(filePath: string): SlopViolation[] {
  const violations: SlopViolation[] = [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { pattern, severity, message } of SLOP_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: i + 1,
          pattern: pattern.toString(),
          severity,
          message,
        });
      }
    }
  }

  return violations;
}

function main(): void {
  console.log('\n🔍 FORGE Slop Detector v1.0.0\n');

  const srcDir = process.cwd();
  const files = getFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);

  console.log(`Scanning ${files.length} files...\n`);

  let errorCount = 0;
  let warningCount = 0;
  const allViolations: SlopViolation[] = [];

  for (const file of files) {
    const violations = checkFile(file);
    allViolations.push(...violations);

    for (const v of violations) {
      if (v.severity === 'error') errorCount++;
      else warningCount++;
    }
  }

  // Group by file
  const byFile = new Map<string, SlopViolation[]>();
  for (const v of allViolations) {
    const existing = byFile.get(v.file) || [];
    existing.push(v);
    byFile.set(v.file, existing);
  }

  // Output results
  for (const [file, violations] of byFile) {
    console.log(`${file}:`);
    for (const v of violations) {
      const color = v.severity === 'error' ? RED : YELLOW;
      console.log(`  ${color}${v.severity.toUpperCase()}${RESET} Line ${v.line}: ${v.message}`);
    }
    console.log('');
  }

  // Summary
  console.log('─'.repeat(50));
  console.log(`\nSummary: ${errorCount} errors, ${warningCount} warnings\n`);

  if (errorCount > 0) {
    console.log(`${RED}✖ Slop detected! Fix errors before committing.${RESET}\n`);
    process.exit(1);
  } else if (warningCount > 0) {
    console.log(`${YELLOW}⚠ Warnings found. Consider addressing them.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${GREEN}✔ No slop detected. Code is clean!${RESET}\n`);
    process.exit(0);
  }
}

main();
