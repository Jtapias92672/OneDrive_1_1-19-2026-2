# Epic 7: Test Generation Engine

**Duration:** 4 days  
**Token Budget:** 50K tokens  
**Status:** Not Started  
**Dependencies:** Epic 2 (Answer Contract), Epic 3 (FORGE C Core)

---

## Epic Goal

Build an automated test generation engine that creates unit tests, integration tests, and E2E tests for generated code. Tests validate that code meets contract requirements.

---

## User Stories

### US-7.1: Unit Test Generation
**As a** developer  
**I want** unit tests auto-generated for components  
**So that** I have immediate test coverage

**Acceptance Criteria:**
- [ ] Generate Vitest/Jest unit tests
- [ ] Test component rendering
- [ ] Test props and variants
- [ ] Test event handlers
- [ ] Mock external dependencies

**Unit Test Generator:**
```typescript
// packages/test-generator/src/generators/unit.ts
export class UnitTestGenerator {
  generate(component: GeneratedComponent): GeneratedTest {
    const testCases = this.analyzeComponent(component);
    
    return {
      filename: `${component.name}.test.tsx`,
      imports: this.generateImports(component),
      testSuite: this.generateTestSuite(component, testCases),
    };
  }
  
  private analyzeComponent(component: GeneratedComponent): TestCase[] {
    const cases: TestCase[] = [];
    
    // Basic render test
    cases.push({
      name: 'renders without crashing',
      type: 'render',
      assertions: ['toBeInTheDocument'],
    });
    
    // Prop tests
    for (const prop of component.props) {
      if (prop.type === 'boolean') {
        cases.push({
          name: `renders correctly with ${prop.name}=true`,
          type: 'prop',
          setup: { [prop.name]: true },
        });
        cases.push({
          name: `renders correctly with ${prop.name}=false`,
          type: 'prop',
          setup: { [prop.name]: false },
        });
      }
      
      if (prop.variants) {
        for (const variant of prop.variants) {
          cases.push({
            name: `renders ${prop.name}="${variant}" variant`,
            type: 'variant',
            setup: { [prop.name]: variant },
          });
        }
      }
    }
    
    // Accessibility tests
    cases.push({
      name: 'has no accessibility violations',
      type: 'a11y',
      assertions: ['toHaveNoViolations'],
    });
    
    return cases;
  }
  
  private generateTestSuite(component: GeneratedComponent, cases: TestCase[]): string {
    return `
describe('${component.name}', () => {
  ${cases.map(tc => this.generateTestCase(component, tc)).join('\n\n  ')}
});
    `.trim();
  }
  
  private generateTestCase(component: GeneratedComponent, testCase: TestCase): string {
    const setup = testCase.setup ? JSON.stringify(testCase.setup) : '{}';
    
    switch (testCase.type) {
      case 'render':
        return `
  it('${testCase.name}', () => {
    render(<${component.name} />);
    expect(screen.getByRole('${component.role || 'generic'}')).toBeInTheDocument();
  });`;
      
      case 'prop':
      case 'variant':
        return `
  it('${testCase.name}', () => {
    render(<${component.name} {...${setup}} />);
    // Verify component renders with expected state
    expect(screen.getByRole('${component.role || 'generic'}')).toBeInTheDocument();
  });`;
      
      case 'a11y':
        return `
  it('${testCase.name}', async () => {
    const { container } = render(<${component.name} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });`;
      
      default:
        return '';
    }
  }
}
```

---

### US-7.2: Integration Test Generation
**As a** developer  
**I want** integration tests for component interactions  
**So that** component composition is verified

**Acceptance Criteria:**
- [ ] Test parent-child component interactions
- [ ] Test state flow between components
- [ ] Test form submissions
- [ ] Test navigation flows

**Integration Test Generator:**
```typescript
// packages/test-generator/src/generators/integration.ts
export class IntegrationTestGenerator {
  generate(page: GeneratedPage): GeneratedTest {
    const interactions = this.analyzeInteractions(page);
    
    return {
      filename: `${page.name}.integration.test.tsx`,
      imports: this.generateImports(page),
      testSuite: this.generateTestSuite(page, interactions),
    };
  }
  
  private analyzeInteractions(page: GeneratedPage): Interaction[] {
    const interactions: Interaction[] = [];
    
    // Find forms and their submissions
    const forms = this.findForms(page.components);
    for (const form of forms) {
      interactions.push({
        type: 'form-submit',
        source: form,
        target: form.action,
        steps: this.buildFormSteps(form),
      });
    }
    
    // Find buttons with actions
    const buttons = this.findButtons(page.components);
    for (const button of buttons) {
      if (button.onClick) {
        interactions.push({
          type: 'click-action',
          source: button,
          target: button.onClick,
          steps: [{ action: 'click', element: button }],
        });
      }
    }
    
    return interactions;
  }
}
```

---

### US-7.3: E2E Test Generation
**As a** developer  
**I want** Playwright E2E tests generated  
**So that** full user flows are tested

**Acceptance Criteria:**
- [ ] Generate Playwright test files
- [ ] Test critical user journeys
- [ ] Visual regression setup
- [ ] Network request mocking
- [ ] Cross-browser testing config

**E2E Test Generator:**
```typescript
// packages/test-generator/src/generators/e2e.ts
export class E2ETestGenerator {
  generate(app: GeneratedApp, journeys: UserJourney[]): GeneratedE2ETest {
    return {
      filename: `app.e2e.spec.ts`,
      config: this.generatePlaywrightConfig(),
      tests: journeys.map(j => this.generateJourneyTest(j)),
      fixtures: this.generateFixtures(app),
    };
  }
  
  private generateJourneyTest(journey: UserJourney): string {
    return `
test.describe('${journey.name}', () => {
  test('completes ${journey.name} flow', async ({ page }) => {
    ${journey.steps.map(step => this.generateStep(step)).join('\n    ')}
  });
});
    `.trim();
  }
  
  private generateStep(step: JourneyStep): string {
    switch (step.action) {
      case 'navigate':
        return `await page.goto('${step.url}');`;
      case 'click':
        return `await page.click('${step.selector}');`;
      case 'fill':
        return `await page.fill('${step.selector}', '${step.value}');`;
      case 'assert':
        return `await expect(page.locator('${step.selector}')).${step.assertion};`;
      case 'screenshot':
        return `await expect(page).toHaveScreenshot('${step.name}.png');`;
      default:
        return '';
    }
  }
  
  private generatePlaywrightConfig(): string {
    return `
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
};

export default config;
    `.trim();
  }
}
```

---

### US-7.4: Contract-Based Test Generation
**As a** platform user  
**I want** tests generated from Answer Contracts  
**So that** tests verify contract compliance

**Acceptance Criteria:**
- [ ] Parse contract validators into test assertions
- [ ] Generate property-based tests
- [ ] Test boundary conditions from schema
- [ ] Test required fields
- [ ] Test enum constraints

**Contract Test Generator:**
```typescript
// packages/test-generator/src/generators/contract.ts
export class ContractTestGenerator {
  generate(contract: CompiledContract): GeneratedTest {
    const testCases = this.buildTestCases(contract);
    
    return {
      filename: `${contract.id}.contract.test.ts`,
      imports: ['describe', 'it', 'expect'],
      testSuite: this.generateTestSuite(contract, testCases),
    };
  }
  
  private buildTestCases(contract: CompiledContract): ContractTestCase[] {
    const cases: ContractTestCase[] = [];
    
    // Required field tests
    for (const field of contract.schema.required || []) {
      cases.push({
        name: `rejects missing required field: ${field}`,
        type: 'required',
        field,
        expectation: 'invalid',
      });
    }
    
    // Type tests
    for (const [field, schema] of Object.entries(contract.schema.properties || {})) {
      cases.push({
        name: `validates ${field} type`,
        type: 'type',
        field,
        schema,
        expectation: 'typecheck',
      });
      
      // Boundary tests
      if (schema.minLength !== undefined) {
        cases.push({
          name: `rejects ${field} below minLength`,
          type: 'boundary',
          field,
          value: 'x'.repeat(schema.minLength - 1),
          expectation: 'invalid',
        });
      }
      
      if (schema.enum) {
        cases.push({
          name: `validates ${field} enum values`,
          type: 'enum',
          field,
          validValues: schema.enum,
          expectation: 'valid-enum',
        });
        
        cases.push({
          name: `rejects invalid ${field} enum value`,
          type: 'enum',
          field,
          value: 'INVALID_VALUE',
          expectation: 'invalid',
        });
      }
    }
    
    return cases;
  }
}
```

---

### US-7.5: Test Coverage Analysis
**As a** developer  
**I want** coverage analysis for generated tests  
**So that** I know what's tested

**Acceptance Criteria:**
- [ ] Calculate code coverage
- [ ] Calculate contract coverage
- [ ] Identify untested scenarios
- [ ] Generate coverage report
- [ ] Set coverage thresholds

**Coverage Analyzer:**
```typescript
// packages/test-generator/src/analysis/coverage.ts
export class CoverageAnalyzer {
  analyze(tests: GeneratedTest[], code: GeneratedCode): CoverageReport {
    return {
      codeCoverage: this.calculateCodeCoverage(tests, code),
      contractCoverage: this.calculateContractCoverage(tests),
      untested: this.findUntestedScenarios(tests, code),
      recommendations: this.generateRecommendations(tests, code),
    };
  }
  
  private calculateContractCoverage(tests: GeneratedTest[]): ContractCoverage {
    const contractTests = tests.filter(t => t.type === 'contract');
    
    return {
      validatorsTestedPercent: this.countValidatorsCovered(contractTests),
      requiredFieldsTestedPercent: this.countRequiredFieldsCovered(contractTests),
      boundariesTestedPercent: this.countBoundariesCovered(contractTests),
    };
  }
}
```

---

## Key Deliverables

```
packages/test-generator/
├── src/
│   ├── index.ts
│   ├── generators/
│   │   ├── unit.ts
│   │   ├── integration.ts
│   │   ├── e2e.ts
│   │   └── contract.ts
│   ├── analysis/
│   │   └── coverage.ts
│   ├── templates/
│   │   ├── unit.hbs
│   │   ├── integration.hbs
│   │   └── e2e.hbs
│   └── types/
├── __tests__/
└── package.json
```

---

## Completion Criteria

- [ ] Unit test generation for React components
- [ ] Integration test generation
- [ ] E2E test generation with Playwright
- [ ] Contract-based test generation
- [ ] Coverage analysis functional
- [ ] Generated tests pass ESLint
- [ ] 85%+ of generated tests pass when run

---

## Handoff Context for Epic 8

**What Epic 8 needs:**
- Test execution results for evidence packs
- Coverage reports for compliance documentation
- Test artifacts (screenshots, logs)

---

## Verification Script

```bash
#!/bin/bash
echo "🔍 Verifying Epic 7: Test Generator"
cd packages/test-generator

[ -f "src/generators/unit.ts" ] || { echo "❌ unit generator missing"; exit 1; }
[ -f "src/generators/e2e.ts" ] || { echo "❌ e2e generator missing"; exit 1; }
[ -f "src/generators/contract.ts" ] || { echo "❌ contract generator missing"; exit 1; }

pnpm test || { echo "❌ Tests failed"; exit 1; }
pnpm build || { echo "❌ Build failed"; exit 1; }

echo "✅ Epic 7 verification complete"
```
