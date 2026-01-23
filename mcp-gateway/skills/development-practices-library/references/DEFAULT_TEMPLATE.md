# Default Lessons Learned Template

This template is used when no project-specific lesson template is found in the repository.

---

## Lesson Entry Format

```markdown
## [CATEGORY] [Brief Descriptive Title]

**Date**: YYYY-MM-DD (date of extraction)  
**Severity**: Critical | High | Medium | Low  
**Component**: [CI/CD | Build | Test | Deploy | Architecture | Config]

### Evidence

**Source**: `path/to/file:line-numbers`

**Excerpt**:
```
[Verbatim excerpt from the file, 5-30 lines max]
```

**Additional Context** (if needed):
- Related file: `path/to/related/file`
- Reference: [section or heading in docs]

### Pattern Observed

[Describe what the evidence shows - be specific and factual]

Example:
"The CI configuration retries tests 3 times with a 10-minute timeout per attempt."

NOT:
"Tests are flaky and unreliable." (This is interpretation without evidence)

### Impact

[Explain why this pattern matters - based on evidence, not speculation]

Example:
"The 3-retry policy and 10-minute timeout mean CI feedback can take up to 30 minutes on failure, delaying merge cycles."

NOT:
"This probably causes developers to be frustrated." (Speculation)

### Recommendation

[Provide actionable guidance based on the evidence]

Example:
"Investigate tests taking >5 minutes, consider test isolation to reduce interdependencies, monitor retry rate as health metric."

NOT:
"Fix the flaky tests." (Too vague, not actionable)

### Prevention Pattern

[What should be checked/monitored going forward - evidence-based]

Example:
"Before adding new tests, verify they complete in <2 minutes locally. Add test duration monitoring to CI metrics."

### Tags

`#[category]` `#[component]` `#[tech-stack]`

Example:
`#ci-cd` `#testing` `#github-actions` `#nodejs`

---
```

## Categories

Use these standard categories:

- **BUILD** - Build system, compilation, bundling, packaging
- **TEST** - Test execution, coverage, flakiness, parallelization
- **DEPLOY** - Deployment workflows, environment management, rollout strategies
- **QUALITY** - Linting, formatting, type checking, code standards
- **ARCHITECTURE** - Code organization, module boundaries, dependencies
- **OPERATIONS** - Runtime config, monitoring, logging, debugging
- **SECURITY** - Authentication, authorization, secrets management, scanning
- **PERFORMANCE** - Optimization, caching, resource usage

## Severity Levels

**Critical**: Blocks production deployment or causes data loss
**High**: Significantly impacts development velocity or user experience  
**Medium**: Impacts specific workflows or requires workarounds
**Low**: Minor inconvenience or optimization opportunity

## Evidence Quality Standards

### Required Evidence Strength

Every lesson MUST have:

✅ **File path**: Exact location in repo  
✅ **Line numbers OR section heading**: Precise location  
✅ **Excerpt**: Verbatim text or accurate paraphrase  
✅ **Verifiable**: Another person can locate and confirm  

### Acceptable Evidence Sources

- CI configuration files (.github/workflows/, .gitlab-ci.yml, etc.)
- Build scripts (package.json, Makefile, build.sh, etc.)
- Documentation (README.md, docs/, CONTRIBUTING.md, etc.)
- Configuration files (tsconfig.json, .eslintrc, docker-compose.yml, etc.)
- Code structure (directory organization, module patterns)
- Comments in code (if they explain constraints or workarounds)

### Unacceptable Evidence

❌ "Team discussions" (not in repo)  
❌ "It's known that..." (no citation)  
❌ "Probably because..." (speculation)  
❌ "The docs say..." (but no file path)  
❌ External blogs/articles (not repo artifacts)  

## Example Lesson (Complete)

```markdown
## TEST - Flaky test retry strategy in CI

**Date**: 2025-12-20  
**Severity**: Medium  
**Component**: CI/CD

### Evidence

**Source**: `.github/workflows/test.yml:15-20`

**Excerpt**:
```yaml
- name: Run tests
  run: npm test
  timeout-minutes: 10
  continue-on-error: true
  retry:
    max_attempts: 3
```

**Additional Context**:
- Test script: `package.json:scripts.test` - "jest --maxWorkers=2"

### Pattern Observed

CI configuration implements 3-attempt retry for test failures with 10-minute timeout per attempt. Tests run with 2 parallel workers (from package.json).

### Impact

- Maximum test feedback time: 30 minutes (10min × 3 retries)
- Retry policy indicates test reliability issues
- Parallel execution (2 workers) suggests resource constraints or test isolation concerns
- "continue-on-error: true" means test failures don't block workflow

### Recommendation

1. **Immediate**: Monitor retry rate - if >30%, investigate test isolation
2. **Short-term**: Identify tests taking >5min, consider splitting or optimizing
3. **Long-term**: Add test duration metrics to CI dashboard, set budget of 2min per test suite

### Prevention Pattern

- Before adding tests: Verify <2min local execution
- During PR review: Flag tests using timeouts or retries
- Quarterly: Review test suite health metrics (duration, retry rate, flakiness)

### Tags

`#ci-cd` `#testing` `#github-actions` `#jest` `#nodejs`
```

---

## Multi-Lesson Document Structure

When generating multiple lessons:

```markdown
# Lessons Learned - [Project Name]
**Extracted**: [Date]  
**Repository**: [Repo URL or path]  
**Tech Stack**: [Node.js, Python, etc.]

---

## Summary

Total lessons extracted: [N]

**By Category**:
- BUILD: [N]
- TEST: [N]
- DEPLOY: [N]
- QUALITY: [N]
- ARCHITECTURE: [N]
- OPERATIONS: [N]

**By Severity**:
- Critical: [N]
- High: [N]
- Medium: [N]
- Low: [N]

---

## Lessons

### BUILD Lessons

#### Lesson 1: [Title]
[Full lesson using template above]

#### Lesson 2: [Title]
[Full lesson using template above]

### TEST Lessons

#### Lesson 3: [Title]
[Full lesson using template above]

[etc.]

---

## Evidence Sources

Files analyzed:
- `.github/workflows/test.yml`
- `package.json`
- `README.md`
- `scripts/deploy.sh`
- [etc.]

---

## Excluded Findings

Findings excluded due to insufficient evidence:

- [Finding description] - Reason: No file path available
- [Finding description] - Reason: Speculation without evidence
- [Finding description] - Reason: Cannot verify claim

---

## Next Steps

Based on extracted lessons, consider:

1. [Actionable recommendation from lessons]
2. [Actionable recommendation from lessons]
3. [Actionable recommendation from lessons]
```

---

## Adaptation Instructions

If a project-specific template exists (like translator-lessons):

1. **Detect** the template structure by reading its SKILL.md or example files
2. **Map** the default template fields to the project template fields:
   - Evidence → may map to "The Problem" or separate Evidence section
   - Pattern Observed → may map to "What We Found"
   - Impact → may map to "Why It Matters"
   - Recommendation → may map to "The Solution" or "Prevention Pattern"
3. **Preserve** project-specific fields even if not in default template
4. **Maintain** evidence citation requirements regardless of template

---

**This template ensures consistency while remaining flexible enough to adapt to project-specific needs.**
