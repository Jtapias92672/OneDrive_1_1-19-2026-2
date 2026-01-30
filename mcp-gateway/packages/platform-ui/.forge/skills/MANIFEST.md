# FORGE Skills Manifest

**Last Updated:** 2026-01-30
**Total Skills:** 4 (1 external, 3 custom)

---

## Purpose

This manifest catalogs all skills available to the FORGE generation pipeline. Skills are machine-readable rule sets that encode expert knowledge, transforming AI from "general-purpose oracle" to "specialized expert."

---

## External Skills (Vercel Agent Skills)

### 1. React Best Practices
**File:** `react-best-practices.md`
**Source:** https://github.com/vercel-labs/agent-skills
**Version:** Latest (cloned 2026-01-30)
**Size:** 81KB

**Purpose:** Performance optimization and best practices for React/Next.js applications

**Key Rules:**
- Eliminate waterfalls (parallel API calls)
- Bundle size optimization (avoid barrel files)
- Re-render optimization (functional setState, lazy initialization)
- Caching systems (React.cache, LRU)
- Server-side performance (minimize RSC serialization)

**When to Apply:**
- Phase 2: React Generator (guide component structure)
- Phase 3: Test Generator (performance testing)
- Phase 6: RenderEngine (validate generated code)

**Measurable Impact:**
- Bundle size reduction: 20%+ expected
- Render count reduction: 30%+ expected
- Lighthouse score improvement: +10 points

---

## Custom FORGE Skills

### 2. Vector Container Pattern
**File:** `forge-vector-containers.md`
**Version:** 1.0
**Date:** 2026-01-30
**Evidence:** User-validated fix (2026-01-29)

**Purpose:** Prevent logo fragmentation by detecting vector containers and rendering as single image

**Key Rules:**
- Detect FRAME/GROUP containing only vector children
- Render parent as single image (not 50+ fragments)
- Skip children traversal to save API calls

**When to Apply:**
- Phase 1: ImageResolver (detection logic)
- Phase 2-5: All Generators (rendering logic)

**Measurable Impact:**
- API calls reduced: 50x per logo
- Rendering success: 38% → 100%
- User validation: "Logo issue fixed!"

---

### 3. Hierarchy Preservation
**File:** `forge-hierarchy-preservation.md`
**Version:** 1.0
**Date:** 2026-01-30
**Evidence:** Epic 7.5 root cause (flattenComponents broke rendering)

**Purpose:** Maintain Figma's hierarchical structure throughout generation pipeline

**Key Rules:**
- Use recursive conversion (not flattening)
- Calculate relative bounds (childX - parentX)
- Propagate data down tree (imageUrl, styles)
- Render hierarchy recursively

**When to Apply:**
- Phase 1: LayoutCalculator (relative positioning)
- Phase 2-5: All Generators (recursive rendering)

**Measurable Impact:**
- Layout correctness: 100% (vs broken with flattening)
- Image propagation: All images present
- Nested structure: Matches Figma design

---

### 4. Architectural Entropy Detection
**File:** `forge-architectural-entropy.md`
**Version:** 1.0
**Date:** 2026-01-30
**Source:** Vercel analysis + FORGE empirical evidence

**Purpose:** Detect and prevent gradual degradation through accumulating small decisions

**Key Rules:**
- Detect logic duplication (multiple implementations)
- Enforce interface consistency (compatible signatures)
- Prevent hidden state (explicit dependencies)
- Limit configuration explosion (< 10 feature flags)

**When to Apply:**
- Phase 1: Validate extractors don't duplicate logic
- Phase 2-6: Validate generators use shared extractors
- Pre-commit: Block commits introducing entropy

**Measurable Impact:**
- Code duplication: 67% reduction (15 → 5 implementations)
- Consistency: 100% (all generators use same extraction)
- Centralized fixes: 1 fix applies everywhere

---

## Skill Application Matrix

| Phase | React Best Practices | Vector Containers | Hierarchy Preservation | Architectural Entropy |
|-------|---------------------|-------------------|----------------------|----------------------|
| **Phase 0: Skills Setup** | Load | Define | Define | Define |
| **Phase 1: Extractors** | - | ImageResolver | LayoutCalculator | Validate no duplication |
| **Phase 2: React** | Guide generation | Render logic | Recursive rendering | Use shared extractors |
| **Phase 3: Tests** | Performance tests | - | - | Use shared extractors |
| **Phase 4: Storybook** | - | - | - | Use shared extractors |
| **Phase 5: HTML** | - | Preserve fix | Preserve fix | Validate no regression |
| **Phase 6: RenderEngine** | System validation | All generators | All generators | Pre-commit hook |

---

## Skill Integration Guidelines

### Loading Skills

```typescript
import { promises as fs } from 'fs';
import path from 'path';

async function loadSkills(): Promise<Map<string, string>> {
  const skillsDir = path.join(__dirname, '.forge/skills');
  const files = await fs.readdir(skillsDir);

  const skills = new Map<string, string>();

  for (const file of files) {
    if (file.endsWith('.md') && file !== 'MANIFEST.md') {
      const content = await fs.readFile(
        path.join(skillsDir, file),
        'utf-8'
      );
      const skillName = file.replace('.md', '');
      skills.set(skillName, content);
    }
  }

  return skills;
}
```

### Validating Against Skills

```typescript
class SkillValidator {
  constructor(private skills: Map<string, string>) {}

  validate(code: string, skillName: string): ValidationResult {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill ${skillName} not found`);
    }

    // Parse skill rules from markdown
    const rules = this.extractRules(skill);

    // Validate code against rules
    const violations = rules
      .map(rule => rule.validate(code))
      .filter(v => v !== null);

    return {
      passed: violations.length === 0,
      violations
    };
  }
}
```

### Test-Driven Skill Validation

```typescript
describe('Skill Validation', () => {
  it('generates code compliant with all skills', async () => {
    const skills = await loadSkills();
    const validator = new SkillValidator(skills);

    // Generate React component
    const component = generateReactComponent(figmaDesign);

    // Validate against all applicable skills
    const results = [
      validator.validate(component, 'react-best-practices'),
      validator.validate(component, 'forge-vector-containers'),
      validator.validate(component, 'forge-hierarchy-preservation')
    ];

    results.forEach(result => {
      expect(result.passed).toBe(true);
      if (!result.passed) {
        console.error('Violations:', result.violations);
      }
    });
  });
});
```

---

## Adding New Skills

### External Skills
1. Clone repository: `git clone https://github.com/vercel-labs/agent-skills.git /tmp/agent-skills`
2. Copy skill: `cp /tmp/agent-skills/skills/{skill-name}/AGENTS.md .forge/skills/{skill-name}.md`
3. Update this MANIFEST.md
4. Add to Skill Application Matrix

### Custom Skills
1. Create `.forge/skills/forge-{skill-name}.md`
2. Follow template structure:
   - Purpose
   - Problem Statement
   - Solution Pattern
   - Critical Rules
   - Common Anti-Patterns
   - Validation Checklist
   - Test Validation
   - Measurable Impact
3. Update this MANIFEST.md
4. Add to Skill Application Matrix

### Skill Template

```markdown
# FORGE Skill: {Skill Name}

**Version:** 1.0
**Date:** YYYY-MM-DD
**Source:** {Evidence/Research}

## Purpose
{What problem does this skill solve?}

## Problem Statement
{Detailed description of the problem}

## Solution Pattern
{Code examples showing correct approach}

## Critical Rules
{Specific rules to follow}

## Common Anti-Patterns
{Examples of what NOT to do}

## Validation Checklist
{Checklist to verify compliance}

## Test Validation
{Test code proving skill works}

## Measurable Impact
{Quantifiable improvements}

## Integration Points
{Where this skill applies in the pipeline}
```

---

## Skill Lifecycle

### Active Skills
All 4 skills currently active in FORGE pipeline.

### Deprecated Skills
None yet.

### Planned Skills
- **Impeccable Style** (Vercel) - UI polish and micro-interactions
- **Tailwind Design System** (Vercel) - Utility-first CSS best practices
- **UI/UX Vocabulary** (Vercel) - Design terminology for precise prompting
- **FORGE Graceful Degradation** (Custom) - Partial image fetch handling
- **FORGE MCP Security** (Custom) - Gateway routing and audit patterns

---

## Success Metrics

Track skill effectiveness over time:

| Metric | Baseline (Before Skills) | Current (With Skills) | Target |
|--------|-------------------------|----------------------|--------|
| Bundle Size | Unknown | TBD | -20% |
| Render Count | Unknown | TBD | -30% |
| API Calls (per logo) | 50+ | 1 | 1 |
| Logo Rendering Success | 62% | 100% | 100% |
| Code Duplication | 15 implementations | 5 implementations | <5 |
| Test Coverage (REAL) | Unknown | TBD | >90% |
| Lighthouse Score | Unknown | TBD | >90 |

---

## References

- Vercel Agent Skills: https://github.com/vercel-labs/agent-skills
- FORGE Plan Document: `/Users/jtapiasme.com/.claude/plans/noble-toasting-boole.md`
- FORGE TICKET.md: `/Users/jtapiasme.com/Documents/forge-app/mcp-gateway/TICKET.md`

---

**Maintained by:** FORGE Development Team
**Next Review:** 2026-02-15 (after Phase 6 complete)
