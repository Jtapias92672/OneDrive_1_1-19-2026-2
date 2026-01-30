# FORGE Skill: Architectural Entropy Detection

**Version:** 1.0
**Date:** 2026-01-30
**Source:** Vercel Agent Skills analysis + FORGE empirical evidence
**Principle:** Small reasonable decisions accumulate into systemic failures

---

## Purpose

Detect and prevent "architectural entropy" - the gradual degradation of code quality through many small, locally-reasonable decisions that accumulate into systemic technical debt.

## Problem Statement

Humans have limited working memory (4-7 "chunks"). As codebases grow, the context required to understand global impact exceeds this limit. Result:
- Developers make reasonable local decisions
- Each decision increases global complexity
- No single person sees the accumulation
- System degrades into unmaintainable state

**Key Insight:** AI with 1M+ token context can hold "entire cathedral in memory" while evaluating each "brick."

## Entropy Categories

### Category 1: Logic Duplication
**Definition:** Same logic implemented multiple times in different locations
**Cause:** Each developer solves problem independently (didn't know solution exists)
**Impact:** Bugs fixed in one place, remain in others

**Detection Pattern:**
```typescript
// ENTROPY: Multiple generators extract styles independently
class HTMLGenerator {
  private extractFillColor(component) {
    return component.fills?.[0]?.color;  // Implementation A
  }
}

class ReactGenerator {
  private extractFillColor(component) {
    const fill = component.fills?.find(f => f.visible);  // Implementation B (different!)
    return fill?.color;
  }
}

// VIOLATION: Same concept, different implementations
// FIX: Use shared StyleExtractor
```

### Category 2: Inconsistent Interfaces
**Definition:** Similar functions with incompatible signatures
**Cause:** Each function designed in isolation
**Impact:** Cannot swap implementations, hard to refactor

**Detection Pattern:**
```typescript
// ENTROPY: Inconsistent image resolution APIs
function getImageUrl(nodeId: string): string | null { }
function fetchImage(component: Component): Promise<string> { }
function resolveImagePath(id: string, type: string): string | undefined { }

// VIOLATION: Same purpose, different signatures
// FIX: Single interface (ImageResolver.getImageUrl)
```

### Category 3: Hidden Global State
**Definition:** Functions depend on undocumented global state
**Cause:** Convenience shortcuts accumulate
**Impact:** Unpredictable behavior, hard to test

**Detection Pattern:**
```typescript
// ENTROPY: Functions rely on global ImageUrlMap
function renderComponent(component) {
  const url = globalImageUrlMap.get(component.id);  // Hidden dependency!
  return `<img src="${url}">`;
}

// VIOLATION: Function behavior depends on external state
// FIX: Pass imageUrlMap as parameter
```

### Category 4: Accumulating Configuration
**Definition:** Each feature adds new config flag
**Cause:** Backward compatibility concerns
**Impact:** Exponential combinations to test

**Detection Pattern:**
```typescript
// ENTROPY: Configuration explosion
interface Options {
  useNewReactGenerator?: boolean;
  useNewTestGenerator?: boolean;
  useNewStorybookGenerator?: boolean;
  useRenderEngine?: boolean;
  useOptimizedImages?: boolean;
  useLegacyBounds?: boolean;
  // ... 20 more flags
}

// VIOLATION: 2^26 possible configurations
// FIX: Feature flags with time-based removal plan
```

## Detection Rules

### Rule 1: Duplication Detector
**When:** Adding new generator, extractor, or shared logic
**Action:** Search codebase for similar implementations
**Validation:** No more than 1 implementation of same concept

```typescript
class EntropyDetector {
  detectDuplication(generators: Generator[]): Issue[] {
    const extractionMethods = generators.map(g => ({
      name: g.constructor.name,
      methods: this.findExtractionMethods(g)
    }));

    const duplicates: Issue[] = [];

    // Check if multiple generators implement same extraction
    const methodGroups = this.groupBySignature(extractionMethods);

    for (const [signature, implementations] of methodGroups) {
      if (implementations.length > 1) {
        duplicates.push({
          type: 'duplication',
          severity: 'critical',
          message: `${implementations.length} generators implement '${signature}' - use shared extractor`,
          locations: implementations
        });
      }
    }

    return duplicates;
  }
}
```

### Rule 2: Interface Consistency Checker
**When:** Adding new public method
**Action:** Verify similar methods have compatible signatures
**Validation:** Related functions use consistent parameter order, types, return values

```typescript
class EntropyDetector {
  checkInterfaceConsistency(codebase: AST): Issue[] {
    const imageRelatedFunctions = this.findFunctions(
      codebase,
      name => /image|url|fetch|resolve/.test(name.toLowerCase())
    );

    const issues: Issue[] = [];

    // Group by semantic similarity
    const groups = this.groupBySemantic(imageRelatedFunctions);

    for (const group of groups) {
      if (!this.haveCompatibleSignatures(group)) {
        issues.push({
          type: 'inconsistency',
          severity: 'warning',
          message: `Related functions have incompatible signatures`,
          functions: group.map(f => f.name)
        });
      }
    }

    return issues;
  }
}
```

### Rule 3: Hidden State Detector
**When:** Analyzing function dependencies
**Action:** Detect functions accessing module-level or global variables
**Validation:** All dependencies passed as parameters (explicit, not implicit)

```typescript
class EntropyDetector {
  detectHiddenState(fn: Function): Issue[] {
    const references = this.analyzeReferences(fn);

    const globalRefs = references.filter(ref =>
      !ref.isParameter &&
      !ref.isLocalVariable &&
      ref.scope === 'module'
    );

    if (globalRefs.length > 0) {
      return [{
        type: 'hidden-state',
        severity: 'warning',
        message: `Function ${fn.name} depends on ${globalRefs.length} global variables`,
        globals: globalRefs.map(r => r.name)
      }];
    }

    return [];
  }
}
```

### Rule 4: Configuration Explosion Detector
**When:** Adding new feature flag
**Action:** Count total flags, calculate test combinations
**Validation:** Total flags < 10, OR flags have deprecation timeline

```typescript
class EntropyDetector {
  detectConfigurationExplosion(options: object): Issue[] {
    const flags = Object.keys(options).filter(k => k.startsWith('use') || k.includes('enable'));

    if (flags.length > 10) {
      return [{
        type: 'config-explosion',
        severity: 'warning',
        message: `${flags.length} feature flags = ${2 ** flags.length} test combinations`,
        recommendation: 'Add deprecation timeline for old flags'
      }];
    }

    return [];
  }
}
```

## Prevention Strategies

### Strategy 1: Extraction Layer
**Goal:** Centralize logic before duplication occurs
**Implementation:** Create shared extractors BEFORE building generators

```typescript
// PREVENTION: Single extraction layer
class StyleExtractor {
  extractFillColor(component: ParsedComponent): string | null {
    // Single source of truth
    return component.fills?.[0]?.color || null;
  }
}

// All generators use shared extractor
class HTMLGenerator {
  constructor(private styleExtractor: StyleExtractor) {}
  render(component) {
    const color = this.styleExtractor.extractFillColor(component);
  }
}
```

### Strategy 2: Interface-First Design
**Goal:** Define interfaces before implementations
**Implementation:** Create TypeScript interfaces that enforce consistency

```typescript
// PREVENTION: Consistent interface
interface ImageResolver {
  getImageUrl(component: ParsedComponent): string | null;
  isVectorContainer(component: ParsedComponent): boolean;
  shouldRenderAsImage(component: ParsedComponent): boolean;
}

// All image-related functions implement this interface
```

### Strategy 3: Dependency Injection
**Goal:** Make dependencies explicit
**Implementation:** Pass all dependencies as constructor/function parameters

```typescript
// PREVENTION: Explicit dependencies
class ReactGenerator {
  constructor(
    private styleExtractor: StyleExtractor,
    private layoutCalculator: LayoutCalculator,
    private imageResolver: ImageResolver
  ) {
    // All dependencies explicit, no hidden state
  }
}
```

### Strategy 4: Time-Bounded Flags
**Goal:** Prevent permanent feature flags
**Implementation:** Add deprecation dates to all flags

```typescript
// PREVENTION: Flags with expiration
interface GenerationOptions {
  useNewReactGenerator?: boolean;  // Remove after 2026-03-01
  useNewTestGenerator?: boolean;   // Remove after 2026-03-15
  // Default to true after deprecation date
}
```

## Validation Checklist

When implementing new features, verify:
- [ ] No logic duplication (search codebase for similar implementations)
- [ ] Consistent interfaces (compatible with related functions)
- [ ] Explicit dependencies (no hidden global state)
- [ ] Feature flags have deprecation timeline (if applicable)
- [ ] Shared logic extracted to single location
- [ ] New code doesn't add new extraction logic (uses existing extractors)

## Test Validation

```typescript
describe('Architectural Entropy Detection', () => {
  it('detects duplication across generators', () => {
    const detector = new EntropyDetector();
    const issues = detector.detectDuplication([htmlGen, reactGen, testGen]);

    const duplication = issues.filter(i => i.type === 'duplication');
    expect(duplication).toHaveLength(0);  // No duplication allowed
  });

  it('enforces interface consistency', () => {
    const detector = new EntropyDetector();
    const issues = detector.checkInterfaceConsistency(codebase);

    const inconsistent = issues.filter(i => i.type === 'inconsistency');
    expect(inconsistent).toHaveLength(0);  // All interfaces consistent
  });

  it('prevents hidden state', () => {
    const detector = new EntropyDetector();
    const issues = detector.detectHiddenState(renderComponent);

    expect(issues.filter(i => i.type === 'hidden-state')).toHaveLength(0);
  });

  it('limits configuration explosion', () => {
    const detector = new EntropyDetector();
    const issues = detector.detectConfigurationExplosion(generationOptions);

    const explosion = issues.filter(i => i.type === 'config-explosion');
    expect(explosion).toHaveLength(0);  // < 10 flags
  });
});
```

## Measurable Outcomes

**Without Entropy Detection:**
- 3 generators × 5 extractors each = 15 implementations
- Inconsistent results (HTML vs React generate different CSS)
- Hidden bugs (fix in one generator, not others)

**With Entropy Detection:**
- 1 extraction layer × 5 extractors = 5 implementations
- Consistent results (all generators use same extraction)
- Centralized fixes (fix once, applies everywhere)

**Improvement:** 67% code reduction, 100% consistency

## Integration Points

### Phase 1: Extractors
- Create extraction layer BEFORE generators
- Enforce single implementation per concept
- Validate no duplication in orchestrator.ts

### Phase 2-6: All Generators
- All generators MUST use shared extractors
- No generator may implement extraction logic directly
- Entropy detector runs as pre-commit hook

### Continuous Monitoring
```typescript
// Pre-commit hook
const detector = new ArchitecturalEntropyDetector();
const issues = detector.analyze(changedFiles);

if (issues.some(i => i.severity === 'critical')) {
  console.error('Architectural entropy detected - commit blocked');
  process.exit(1);
}
```

---

## Changelog

### 2026-01-30: Initial Codification
- Based on Vercel Agent Skills analysis
- Validated against FORGE codebase patterns
- Added detection rules and prevention strategies
