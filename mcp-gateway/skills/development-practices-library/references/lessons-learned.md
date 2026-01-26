---
name: lessons-learned
description: Automated evidence-based lesson extraction from repository artifacts. Scans CI configs, scripts, docs, and code to generate structured lessons. Use when analyzing a repo retrospectively, onboarding to new codebase, conducting periodic project reviews, or extracting institutional knowledge. Works across any tech stack (Node, Python, Go, Rust, etc.). Enforces zero hallucinations - all lessons must cite evidence.
---

# Lessons Learned - Automated Evidence Extraction

## Purpose

Extract verifiable, evidence-based lessons from repository artifacts WITHOUT manual documentation. This skill auto-discovers repo structure, scans existing evidence, and generates structured lessons that capture institutional knowledge.

**Complements** (does not replace) manual lesson documentation like translator-lessons.

---

## When to Use This Skill

✅ **Retrospective Analysis**: "What has this repo taught us over time?"  
✅ **New Repo Onboarding**: "What patterns and pitfalls exist here?"  
✅ **Periodic Reviews**: "Extract lessons from last quarter's work"  
✅ **Post-Mortem Analysis**: "What does the evidence tell us about this failure?"  
✅ **Knowledge Transfer**: "Document what the CI/scripts/docs already know"  

❌ **NOT for real-time documentation**: Use manual templates (like translator-lessons) for that

---

## Core Principle: Evidence-Only

**NEVER invent, assume, or guess.**

Every lesson MUST include:
- **Evidence**: File path + specific excerpt
- **Impact**: Why it matters (from evidence)
- **Recommendation**: Actionable guidance (based on evidence)

If evidence is weak or absent → **Exclude the lesson**

---

## Workflow: 4-Phase Auto-Discovery

### Phase 1: Repo Structure Scan

**Purpose**: Understand what kind of project this is

**Execute**:

```bash
# Detect tech stack
ls -la | grep -E "(package.json|requirements.txt|go.mod|Cargo.toml|pom.xml|pyproject.toml)"

# Identify architecture
ls -la | grep -E "(src|lib|server|services|infra|packages)"

# Find build/test configs
ls -la | grep -E "(Makefile|.github|.gitlab-ci|circle.yml|Jenkinsfile)"

# Locate docs
ls -la | grep -E "(README|docs|CONTRIBUTING|ADR|ARCHITECTURE)"
```

**Document findings**:
```markdown
## Repo Profile
- **Stack**: [Node/Python/Go/Rust/etc.] (evidence: [file])
- **Architecture**: [Monolith/Monorepo/Microservices] (evidence: [structure])
- **Build System**: [npm/make/cargo/gradle] (evidence: [file])
- **CI/CD**: [GitHub Actions/GitLab CI/CircleCI] (evidence: [file])
```

---

### Phase 2: Evidence Source Identification

**Purpose**: Locate files that contain operational knowledge

**Priority evidence sources** (in order):

1. **CI Configuration** (highest value)
   - `.github/workflows/*.yml`
   - `.gitlab-ci.yml`
   - `circle.yml`, `Jenkinsfile`
   - Evidence: Build steps, test commands, deployment patterns

2. **Build/Test Scripts** (second highest)
   - `package.json` (scripts section)
   - `Makefile`
   - `scripts/` directory
   - Evidence: Common operations, verification steps

3. **Documentation** (context)
   - `README.md`
   - `docs/` directory
   - `CONTRIBUTING.md`
   - Evidence: Known issues, setup gotchas, architecture decisions

4. **Configuration Files** (operational constraints)
   - `.eslintrc`, `tsconfig.json`
   - `.pre-commit-config.yaml`
   - `docker-compose.yml`
   - Evidence: Quality gates, environment requirements

**Execution**:

```bash
# Find CI configs
find . -maxdepth 2 -name "*.yml" -o -name "Jenkinsfile" | grep -E "(github|gitlab|circle)"

# Find script directories
find . -maxdepth 2 -type d -name "scripts"

# Find key docs
find . -maxdepth 2 -name "README.md" -o -name "CONTRIBUTING.md"

# Find package configs
find . -maxdepth 1 -name "package.json" -o -name "Makefile" -o -name "pyproject.toml"
```

**Output**:
```markdown
## Evidence Sources Located
- CI: [path(s)]
- Scripts: [path(s)]
- Docs: [path(s)]
- Configs: [path(s)]
```

---

### Phase 3: Pattern Extraction

**Purpose**: Extract specific, evidence-backed lessons

**Pattern Categories**:

#### A. Build/Test Failures (from CI)

**Evidence to scan**:
- Retry logic in CI workflows
- Conditional steps (if X fails, then Y)
- Comments explaining workarounds

**Example extraction**:
```yaml
# From .github/workflows/test.yml
- name: Run tests
  run: npm test
  timeout-minutes: 10  # <-- Evidence of timeout issues
  retry: 3             # <-- Evidence of flakiness
```

**Extracted lesson**:
```markdown
### Lesson: Tests exhibit timeout/flakiness
**Evidence**: `.github/workflows/test.yml:15-17` - timeout set to 10min with 3 retries
**Impact**: CI pipeline reliability reduced, feedback loop delayed
**Recommendation**: Investigate root cause of test flakiness, consider test isolation
```

#### B. Operational Guardrails (from scripts/configs)

**Evidence to scan**:
- Pre-commit hooks
- Linting/formatting enforcement
- Type checking requirements
- Protected file paths

**Example extraction**:
```json
// From package.json
"scripts": {
  "precommit": "npm run lint && npm run typecheck",  // <-- Evidence of quality gates
  "lint": "eslint --max-warnings 0"                   // <-- Evidence of zero-warning policy
}
```

**Extracted lesson**:
```markdown
### Lesson: Zero-warning policy enforced at commit time
**Evidence**: `package.json:scripts.precommit` - eslint with --max-warnings 0
**Impact**: Code quality enforced before merge, prevents warning accumulation
**Recommendation**: Maintain precommit hooks, ensure all contributors have them installed
```

#### C. Architecture Constraints (from docs/code structure)

**Evidence to scan**:
- README sections on "Gotchas" or "Known Issues"
- CONTRIBUTING.md requirements
- Code organization patterns

**Example extraction**:
```markdown
<!-- From README.md -->
## Known Issues
- Stage 5 Mendix SDK has layout resolution requirements  // <-- Evidence
- All output files must be in /home/claude, not /mnt/  // <-- Evidence
```

**Extracted lesson**:
```markdown
### Lesson: File operation path constraints
**Evidence**: `README.md:Known Issues` - output must be in /home/claude
**Impact**: File operations fail if using /mnt paths
**Recommendation**: Always verify output directory before file operations
```

#### D. Deployment Patterns (from CI/scripts)

**Evidence to scan**:
- Deployment steps in CI
- Environment variable requirements
- Service dependencies

**Example extraction**:
```yaml
# From .github/workflows/deploy.yml
- name: Deploy to staging
  if: github.ref == 'refs/heads/main'  // <-- Evidence of branch strategy
  env:
    AWS_REGION: us-east-1              // <-- Evidence of deployment target
```

**Extracted lesson**:
```markdown
### Lesson: Main branch deploys to staging automatically
**Evidence**: `.github/workflows/deploy.yml:10-12` - deploys on main push
**Impact**: Every merge to main triggers staging deployment
**Recommendation**: Ensure main branch protection requires PR approval
```

---

### Phase 4: Lesson Formatting

**Purpose**: Structure extracted patterns into standardized format

**Required Lesson Template**:

```markdown
## [CATEGORY] [Brief Title]

**Evidence**: `[file:line]` - [brief excerpt or description]

**Pattern**: [What the evidence shows]

**Impact**: [Why it matters - from evidence, not assumption]

**Recommendation**: [Actionable guidance based on evidence]

**Tags**: `#[category]` `#[component]`
```

**Categories** (auto-detected from evidence source):
- `BUILD` - From CI build steps
- `TEST` - From test configurations/scripts
- `DEPLOY` - From deployment workflows
- `QUALITY` - From linting/formatting configs
- `ARCHITECTURE` - From code structure/docs
- `OPERATIONS` - From scripts/runtime configs

---

## Adaptation: Using Existing Lesson Structure

**If the repo has an existing lesson template** (like translator-lessons):

### Step 1: Detect Existing Template

```bash
# Search for existing lesson structures
find . -path "*/.claude/skills/*/SKILL.md" -exec grep -l "lessons" {} \;
find . -name "*lessons*" -o -name "LESSONS.md"
```

### Step 2: Extract Template Structure

Read the existing template and extract:
- Section headings
- Required fields
- Ordering/hierarchy

**Example**:
```markdown
# Found: translator-lessons/SKILL.md

Structure detected:
## [STAGE-X] [Title]
**Date**:
**Severity**:
**Component**:

### The Problem
### What We Tried (That Failed)
### The Solution
### Prevention Pattern
```

### Step 3: Adapt Extraction to Match

Map evidence-based findings to the existing structure:

```markdown
## [STAGE-3] Build timeout issues detected
**Date**: 2025-12-20 (extracted from .github/workflows/test.yml)
**Severity**: Medium
**Component**: CI/CD

### The Problem
Tests timeout after 10 minutes in CI (evidence: .github/workflows/test.yml:15)

### What We Tried (That Failed)
[Extract from git history if available, otherwise note "Evidence not in repo"]

### The Solution
Implemented 3 retries with 10min timeout (evidence: .github/workflows/test.yml:16-17)

### Prevention Pattern
Monitor test execution times, investigate tests taking >5 minutes
```

---

## Anti-Hallucination Rules

### Mandatory Evidence Citation

Every claim must include:
- File path (absolute or relative from repo root)
- Line number(s) OR section heading
- Brief excerpt (5-20 words) OR description

**Format**:
```markdown
**Evidence**: `path/to/file.ext:lines` - [excerpt]
```

**Examples**:
```markdown
✅ GOOD: **Evidence**: `.github/workflows/test.yml:15` - timeout-minutes: 10
✅ GOOD: **Evidence**: `README.md:Known Issues` - Stage 5 has layout constraints
✅ GOOD: **Evidence**: `package.json:scripts.test` - jest --maxWorkers=2

❌ BAD: **Evidence**: Tests sometimes timeout (no file/line)
❌ BAD: **Evidence**: CI config (too vague, no excerpt)
❌ BAD: **Evidence**: The team said... (not from repo artifacts)
```

### Exclusion Rules

**Exclude if**:
- No file path available
- Excerpt is speculation/assumption
- Cannot be verified by reading the file
- Based on "I think" or "probably" reasoning

**Include only if**:
- File exists in repo
- Line/section can be located
- Excerpt is verbatim or accurate paraphrase
- Another person could verify by reading the same file

---

## Execution Steps (When Skill Activates)

**Step 1: State Scope**
```
I will extract lessons from this repository using evidence-only analysis.
Starting repo scan...
```

**Step 2: Scan & Report**
```markdown
## Repo Scan Results
- Stack: Node.js (evidence: package.json)
- Build: npm scripts (evidence: package.json:scripts)
- CI: GitHub Actions (evidence: .github/workflows/)
- Docs: README.md, docs/ directory

Evidence sources located:
- .github/workflows/test.yml
- package.json
- README.md
- scripts/deploy.sh
```

**Step 3: Check for Existing Template**
```markdown
## Template Detection
Searching for existing lesson templates...
[FOUND: translator-lessons structure in .claude/skills/translator-lessons/]
OR
[NOT FOUND: Using default template from references/DEFAULT_TEMPLATE.md]
```

**Step 4: Extract Lessons**
```markdown
## Lessons Extracted (5 found)

### Lesson 1: Build timeout handling
**Evidence**: `.github/workflows/test.yml:15-17`
[Full lesson details]

### Lesson 2: Zero-warning policy
**Evidence**: `package.json:scripts.lint`
[Full lesson details]

[etc.]
```

**Step 5: Generate Output**
```
Writing lessons to: lessons-learned-[DATE].md
Would you like me to create this file? [Yes/No]
```

---

## Usage Examples

### Example 1: Full Repo Analysis

```
User: Extract lessons from this repository

Claude:
[Activates lessons-learned skill]
Scanning repository for evidence sources...

Repo Profile:
- Stack: TypeScript/Node.js (package.json, tsconfig.json)
- Build: npm scripts
- CI: GitHub Actions (.github/workflows/test.yml, deploy.yml)
- Architecture: Monorepo (packages/ directory)

Found 12 evidence sources. Extracting lessons...

[Generates structured lessons with evidence citations]
```

### Example 2: Specific Component

```
User: What lessons can we extract from the CI configuration?

Claude:
[Activates lessons-learned skill]
Focusing on CI evidence sources...

Analyzing:
- .github/workflows/test.yml
- .github/workflows/deploy.yml

Extracted 4 lessons:
1. Flaky test handling (retry: 3)
2. Branch-based deployment (main → staging)
3. Test parallelization (maxWorkers: 2)
4. Timeout constraints (10min limit)

[Detailed lessons with evidence]
```

### Example 3: Adapt to Project Template

```
User: Generate lessons using our project's lesson format

Claude:
[Activates lessons-learned skill]
Searching for existing lesson template...

Found: .claude/skills/translator-lessons/SKILL.md
Structure: [STAGE-X] format with Problem/Tried/Solution/Prevention

Adapting extraction to match...

[Generates lessons in translator-lessons format]
```

---

## Integration with Manual Documentation

**Use lessons-learned (this skill) when**:
- Retrospective analysis (what does history show?)
- New team member onboarding
- Quarterly reviews
- Post-mortem without active debugging session

**Use translator-lessons (manual) when**:
- Actively debugging an issue right now
- Real-time problem solving
- Immediate documentation while solving
- You have context that isn't in repo artifacts

**Together they provide**:
- Automated: What the repo already knows
- Manual: What you just learned solving problems

---

## Quality Checklist

Before outputting lessons, verify:

- [ ] Every lesson has file path + line/section
- [ ] Every excerpt is verbatim or accurate paraphrase  
- [ ] Claims can be verified by reading cited files
- [ ] No assumptions or "probably" statements
- [ ] No invented facts or speculation
- [ ] Recommendations follow from evidence
- [ ] Tags match evidence categories

---

## References

See `references/DEFAULT_TEMPLATE.md` for the fallback lesson structure when no project-specific template exists.

See `references/VERIFICATION_CHECKLIST.md` for detailed evidence validation criteria.

---

## Remember

**This skill extracts knowledge FROM the repo, not ABOUT the repo.**

It doesn't analyze code quality or suggest improvements. It documents **what the existing artifacts already teach us** about how this project works, what constraints exist, and what patterns have emerged.

**Evidence-only. No hallucinations. Provable lessons.**
