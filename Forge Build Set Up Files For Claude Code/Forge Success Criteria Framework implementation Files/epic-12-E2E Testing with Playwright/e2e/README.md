# FORGE Platform - E2E Testing

Comprehensive end-to-end, load, and security testing for the FORGE platform.

## Overview

This package provides:
- **Playwright E2E Tests** - UI and API integration tests
- **k6 Load Tests** - Performance and stress testing
- **Security Tests** - OWASP Top 10 vulnerability testing

## Prerequisites

- Node.js >= 18.0.0
- Docker (for security tests)
- k6 (for load tests)

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm test

# Run with UI mode
npm run test:ui
```

## Test Types

### E2E Tests (Playwright)

Browser-based end-to-end tests for the FORGE UI.

```bash
# All E2E tests
npm test

# Specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Mobile tests
npm run test:mobile

# Debug mode
npm run test:debug

# Interactive UI mode
npm run test:ui
```

### API Tests

REST API integration tests.

```bash
npm run test:api
```

### Security Tests

OWASP-based security vulnerability tests.

```bash
# Playwright security tests
npm run test:security

# OWASP ZAP baseline scan
npm run security:zap
```

### Load Tests (k6)

Performance and stress testing.

```bash
# Full load test suite
npm run load

# Smoke test (quick sanity check)
npm run load:smoke

# Stress test (find breaking point)
npm run load:stress

# Soak test (extended duration)
npm run load:soak
```

## Configuration

### Environment Variables

```bash
# Test environment
TEST_ENV=staging          # local | staging | production

# Authentication
TEST_USER_EMAIL=test@forge.dev
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=admin@forge.dev
TEST_ADMIN_PASSWORD=AdminPassword123!

# API
API_URL=https://api.staging.forge.dev
TEST_API_TOKEN=your-api-token
```

### Playwright Config

Configuration in `playwright.config.ts`:

- **Projects**: chromium, firefox, webkit, mobile-chrome, mobile-safari, api, security
- **Reporters**: HTML, JSON, JUnit
- **Retries**: 2 in CI, 0 locally
- **Workers**: 4 in CI

### k6 Config

Load test scenarios in `load/k6-load-test.js`:

| Scenario | Description | Duration |
|----------|-------------|----------|
| smoke | Quick sanity check | 1 min |
| load | Normal traffic simulation | 16 min |
| stress | Find breaking point | 32 min |
| spike | Sudden traffic surge | 5 min |
| soak | Extended duration | 2 hours |

## Directory Structure

```
e2e/
├── tests/
│   ├── ui/                    # UI E2E tests
│   │   ├── dashboard.spec.ts
│   │   ├── contracts.spec.ts
│   │   └── executions.spec.ts
│   └── api/                   # API integration tests
│       └── contracts.api.spec.ts
├── security/                  # Security tests
│   ├── owasp.spec.ts         # OWASP Top 10 tests
│   └── xss-csrf.spec.ts      # XSS and CSRF tests
├── load/                      # Load tests
│   └── k6-load-test.js       # k6 load test scenarios
├── fixtures/                  # Test data
│   └── contracts.ts
├── setup/                     # Test setup/teardown
│   ├── auth.setup.ts
│   ├── global-setup.ts
│   └── global-teardown.ts
├── reports/                   # Test reports (generated)
├── playwright.config.ts       # Playwright configuration
└── package.json
```

## Test Coverage

### UI Tests

| Feature | Tests |
|---------|-------|
| Dashboard | Overview, activity feed, quick actions |
| Contracts | CRUD, search, filter, versions |
| Executions | Start, monitor, pause/resume/cancel |
| Results | View, export, evidence packs |

### API Tests

| Endpoint | Tests |
|----------|-------|
| `/api/v1/contracts` | CRUD, pagination, filtering, validation |
| `/api/v1/executions` | Start, status, iterations, metrics |
| `/api/v1/validate` | Synchronous validation |
| `/api/v1/evidence` | Evidence packs, verification |

### Security Tests

| Category | Tests |
|----------|-------|
| A01 | Broken Access Control |
| A02 | Cryptographic Failures |
| A03 | Injection (SQL, NoSQL, Command, LDAP) |
| A04 | Insecure Design |
| A05 | Security Misconfiguration |
| A06 | Vulnerable Components |
| A07 | Authentication Failures |
| A08 | Software and Data Integrity |
| A09 | Security Logging and Monitoring |
| A10 | Server-Side Request Forgery |
| XSS | Reflected, Stored, DOM-based |
| CSRF | Token validation, SameSite cookies |

### Load Tests

| Metric | Threshold |
|--------|-----------|
| p95 Response Time | < 500ms |
| p99 Response Time | < 1000ms |
| Error Rate | < 1% |
| Contract Creation | < 2s |
| Validation | < 1s |

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/e2e-tests.yml`) runs:

1. **Smoke Tests** - Every push (5 min)
2. **E2E Tests** - PRs and main (30 min)
3. **API Tests** - Every push (15 min)
4. **Security Tests** - PRs and main (30 min)
5. **Load Tests** - Nightly schedule (60 min)

### Running in CI

```yaml
- name: Run E2E Tests
  run: npm test
  env:
    TEST_ENV: staging
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

## Reports

### HTML Report

```bash
npm run test:report
```

Opens interactive HTML report with screenshots, traces, and videos.

### JUnit Report

Generated at `reports/junit.xml` for CI integration.

### Load Test Report

Generated at `reports/load-test-summary.html` and `reports/load-test-summary.json`.

## Writing Tests

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/feature');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
```

### API Test Example

```typescript
import { test, expect } from '@playwright/test';

test('GET /api/v1/contracts', async ({ request }) => {
  const response = await request.get('/api/v1/contracts');
  expect(response.ok()).toBeTruthy();
});
```

### Load Test Example

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  const response = http.get('http://api.forge.dev/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
```

## Best Practices

1. **Use Page Object Model** for UI tests
2. **Tag tests** with `@smoke`, `@regression`, etc.
3. **Isolate test data** - each test creates its own data
4. **Clean up** after tests
5. **Use fixtures** for reusable test data
6. **Run security tests** on every PR
7. **Monitor load test trends** over time

## Troubleshooting

### Tests fail with timeout

```bash
# Increase timeout
npx playwright test --timeout 60000
```

### Browser not found

```bash
# Reinstall browsers
npx playwright install --with-deps
```

### Authentication issues

```bash
# Clear auth state
npm run clean

# Re-run setup
npx playwright test --project=setup
```

### Load tests fail with rate limiting

```bash
# Use lower VUs
k6 run --vus 10 load/k6-load-test.js
```

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
