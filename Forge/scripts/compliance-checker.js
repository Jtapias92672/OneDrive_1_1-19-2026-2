#!/usr/bin/env node
/**
 * FORGE Compliance Checker
 * Verifies DCMA, DFARS, and CMMC compliance requirements
 *
 * @ai-generated Claude (Anthropic)
 * @ai-assisted 2025-01-19
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

interface ComplianceCheck {
  id: string;
  category: string;
  description: string;
  check: () => boolean;
  remediation: string;
}

const COMPLIANCE_CHECKS: ComplianceCheck[] = [
  // Access Control (CMMC AC.L1-3.1.1)
  {
    id: 'AC-001',
    category: 'Access Control',
    description: 'No hardcoded credentials in source code',
    check: () => {
      const files = getSourceFiles('.');
      const patterns = [
        /password\s*[:=]\s*['"][^'"]+['"]/gi,
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
        /secret\s*[:=]\s*['"][^'"]+['"]/gi,
      ];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        for (const pattern of patterns) {
          if (pattern.test(content)) return false;
        }
      }
      return true;
    },
    remediation: 'Move credentials to environment variables or secrets manager',
  },
  // Audit & Accountability (CMMC AU.L2-3.3.1)
  {
    id: 'AU-001',
    category: 'Audit & Accountability',
    description: 'AI attribution markers present in generated code',
    check: () => {
      const files = getSourceFiles('./src');
      let hasAttribution = false;
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (content.includes('@ai-generated') || content.includes('@ai-assisted')) {
          hasAttribution = true;
          break;
        }
      }
      return hasAttribution;
    },
    remediation: 'Add @ai-generated and @ai-assisted markers to AI-written code',
  },
  // Configuration Management (CMMC CM.L2-3.4.1)
  {
    id: 'CM-001',
    category: 'Configuration Management',
    description: 'Package-lock.json exists for reproducible builds',
    check: () => existsSync('./package-lock.json'),
    remediation: 'Run npm install to generate package-lock.json',
  },
  {
    id: 'CM-002',
    category: 'Configuration Management',
    description: 'TypeScript strict mode enabled',
    check: () => {
      if (!existsSync('./tsconfig.json')) return false;
      const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8'));
      return tsconfig.compilerOptions?.strict === true;
    },
    remediation: 'Enable "strict": true in tsconfig.json compilerOptions',
  },
  // Identification & Authentication (CMMC IA.L1-3.5.1)
  {
    id: 'IA-001',
    category: 'Identification & Authentication',
    description: 'No eval() or new Function() usage',
    check: () => {
      const files = getSourceFiles('.');
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (/\beval\s*\(/.test(content) || /new\s+Function\s*\(/.test(content)) {
          return false;
        }
      }
      return true;
    },
    remediation: 'Remove all eval() and new Function() calls - use safe alternatives',
  },
  // Risk Assessment (CMMC RA.L2-3.11.1)
  {
    id: 'RA-001',
    category: 'Risk Assessment',
    description: 'Security-focused ESLint plugin configured',
    check: () => {
      if (!existsSync('./.eslintrc.json')) return false;
      const eslint = JSON.parse(readFileSync('./.eslintrc.json', 'utf-8'));
      return eslint.plugins?.includes('security');
    },
    remediation: 'Add eslint-plugin-security to ESLint configuration',
  },
  // System & Communications Protection (CMMC SC.L1-3.13.1)
  {
    id: 'SC-001',
    category: 'System & Communications Protection',
    description: 'Input validation library (Zod) in dependencies',
    check: () => {
      if (!existsSync('./package.json')) return false;
      const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
      return 'zod' in (pkg.dependencies || {});
    },
    remediation: 'Add Zod for runtime input validation: npm install zod',
  },
  // System & Information Integrity (CMMC SI.L1-3.14.1)
  {
    id: 'SI-001',
    category: 'System & Information Integrity',
    description: 'Test coverage configuration present',
    check: () => {
      if (!existsSync('./jest.config.js')) return false;
      const config = readFileSync('./jest.config.js', 'utf-8');
      return config.includes('coverageThreshold');
    },
    remediation: 'Add coverage thresholds to Jest configuration',
  },
  {
    id: 'SI-002',
    category: 'System & Information Integrity',
    description: 'CI/CD pipeline configured',
    check: () => existsSync('./.github/workflows/ci.yml'),
    remediation: 'Add GitHub Actions CI workflow for automated testing',
  },
  // Documentation Requirements
  {
    id: 'DOC-001',
    category: 'Documentation',
    description: 'agents.md project standards file exists',
    check: () => existsSync('./agents.md'),
    remediation: 'Create agents.md with project coding standards',
  },
];

function getSourceFiles(dir: string, extensions = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    if (!existsSync(currentDir)) return;

    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function main(): void {
  console.log('\n📋 FORGE Compliance Checker v1.0.0');
  console.log('   DCMA | DFARS | CMMC Verification\n');
  console.log('─'.repeat(60));

  let passed = 0;
  let failed = 0;
  const failures: ComplianceCheck[] = [];

  for (const check of COMPLIANCE_CHECKS) {
    const result = check.check();

    if (result) {
      console.log(`${GREEN}✔${RESET} [${check.id}] ${check.description}`);
      passed++;
    } else {
      console.log(`${RED}✖${RESET} [${check.id}] ${check.description}`);
      failures.push(check);
      failed++;
    }
  }

  console.log('─'.repeat(60));
  console.log(`\nResults: ${GREEN}${passed} passed${RESET}, ${RED}${failed} failed${RESET}`);
  console.log(`Compliance Score: ${((passed / COMPLIANCE_CHECKS.length) * 100).toFixed(1)}%\n`);

  if (failures.length > 0) {
    console.log(`${YELLOW}Remediation Required:${RESET}\n`);
    for (const f of failures) {
      console.log(`  [${f.id}] ${f.category}`);
      console.log(`    → ${f.remediation}\n`);
    }
    process.exit(1);
  }

  console.log(`${GREEN}✔ All compliance checks passed!${RESET}\n`);
  process.exit(0);
}

main();
