# FORGE B-D Platform Bootstrap Package

> Drop-in configuration files to achieve 100% skills compliance

## Quick Start

### 1. Copy Bootstrap Files

Copy all files from this package to your FORGE repository root:

```bash
# From your FORGE repo root
cp -r /path/to/forge-bootstrap/* .
cp -r /path/to/forge-bootstrap/.* . 2>/dev/null || true
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Initialize Git Hooks

```bash
npx husky install
chmod +x .husky/pre-commit .husky/pre-push
```

### 4. Run Initial Verification

```bash
npm run verify
```

## What's Included

| File/Directory | Purpose |
|----------------|---------|
| `tsconfig.json` | TypeScript strict configuration |
| `package.json` | Dependencies & npm scripts |
| `.eslintrc.json` | ESLint with security rules |
| `.prettierrc` | Code formatting |
| `jest.config.js` | Test configuration (80% coverage) |
| `agents.md` | AI agent coding standards |
| `ARCH.md` | Architecture documentation |
| `.github/workflows/ci.yml` | CI/CD pipeline |
| `.husky/` | Git hooks |
| `scripts/` | Verification scripts |
| `tests/__templates__/` | Test setup files |
| `docs/` | Documentation |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run typecheck` | TypeScript type checking |
| `npm run verify` | Full verification suite |
| `npm run verify:quick` | Fast pre-commit checks |
| `npm run slop:check` | Detect AI slop patterns |
| `npm run compliance:check` | DCMA/DFARS/CMMC verification |
| `npm run contracts:validate` | Validate Answer Contracts |

## Verification Workflow

### Pre-Commit (Automatic)
```
typecheck → lint → format
```

### Pre-Push (Automatic)
```
typecheck → lint → tests → coverage → slop detection
```

### CI Pipeline (On Push/PR)
```
Static Analysis → Unit Tests → Security Audit → Build → Contracts → Compliance
```

## Skills Compliance Matrix

| Skill | Compliance |
|-------|------------|
| verification-pillars | ✅ 10/10 pillars |
| tdd-enforcement | ✅ Jest + 80% coverage |
| slop-tests | ✅ Automated detection |
| api-contracts | ✅ Contract validation |
| cars-framework | ✅ Risk assessment |
| ai-attribution | ✅ Markers required |
| security-compliance | ✅ ESLint security |
| project-standards | ✅ agents.md |
| deployment-readiness | ✅ CI/CD |

## Troubleshooting

### ESLint Import Errors

If you see import resolution errors:
```bash
npm install eslint-import-resolver-typescript
```

### TypeScript Path Aliases

Ensure `baseUrl` and `paths` in tsconfig.json match your directory structure.

### Jest ESM Issues

The config uses ESM mode. If issues persist:
```bash
NODE_OPTIONS='--experimental-vm-modules' npm test
```

## Next Steps

1. Move existing source files to `src/`
2. Update imports to use path aliases
3. Write tests for existing code
4. Run `npm run verify` to check compliance
5. Fix any reported issues

## Support

For questions about ArcFoundry skills: Review `/mnt/skills/user/`
