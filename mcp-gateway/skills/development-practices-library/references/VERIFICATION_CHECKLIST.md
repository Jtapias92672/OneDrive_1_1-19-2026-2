# Evidence Verification Checklist

Use this checklist to validate that extracted lessons meet evidence-only standards.

---

## Pre-Extraction Checklist

Before starting lesson extraction:

- [ ] Repository scan completed
- [ ] Tech stack identified with file evidence
- [ ] Evidence sources located and accessible
- [ ] Existing lesson template detected (if present)
- [ ] Output format determined

---

## Per-Lesson Validation

For EACH lesson extracted, verify:

### Evidence Citation Requirements

- [ ] **File path provided**: Exact path from repo root
- [ ] **Location specified**: Line numbers OR section heading
- [ ] **Excerpt included**: Verbatim text (5-30 words) OR accurate description
- [ ] **Verifiable**: Can locate by opening file and finding line/section

**Test**: Another person should be able to:
1. Open the cited file
2. Navigate to the cited location
3. See the cited excerpt or pattern

### Content Quality Standards

- [ ] **Pattern is factual**: States what IS, not what "might be" or "probably is"
- [ ] **Impact is evidence-based**: Derived from observable evidence, not speculation
- [ ] **Recommendation is actionable**: Specific steps, not vague suggestions
- [ ] **No assumptions**: Every claim can be traced to evidence

### Forbidden Content

Reject the lesson if it contains:

- [ ] ❌ "Probably" / "Likely" / "Maybe" / "Possibly"
- [ ] ❌ "The team thinks" / "It's known that" / "Developers say"
- [ ] ❌ Claims without file citations
- [ ] ❌ Speculation about causes without evidence
- [ ] ❌ Recommendations not grounded in evidence
- [ ] ❌ External sources (blogs, articles) instead of repo artifacts

### Required Content

Ensure the lesson includes:

- [ ] ✅ Category tag (BUILD/TEST/DEPLOY/etc.)
- [ ] ✅ Severity level (Critical/High/Medium/Low)
- [ ] ✅ Component identification (what part of system)
- [ ] ✅ Date of extraction
- [ ] ✅ Evidence section with file path + excerpt
- [ ] ✅ Pattern description (factual observation)
- [ ] ✅ Impact explanation (why it matters)
- [ ] ✅ Actionable recommendation

---

## Evidence Source Validation

### Acceptable Evidence Sources

✅ **CI Configuration**:
- `.github/workflows/*.yml`
- `.gitlab-ci.yml`
- `Jenkinsfile`
- Circle CI configs

✅ **Build/Test Scripts**:
- `package.json` scripts section
- `Makefile` targets
- Shell scripts in `scripts/` directory
- Build configuration files

✅ **Documentation**:
- `README.md`
- Files in `docs/` directory
- `CONTRIBUTING.md`
- Architecture Decision Records (ADRs)

✅ **Configuration Files**:
- Linting configs (`.eslintrc`, `pyproject.toml`)
- Type configs (`tsconfig.json`, `mypy.ini`)
- Docker configs (`Dockerfile`, `docker-compose.yml`)
- Environment configs (`.env.example`)

✅ **Code Structure**:
- Directory organization
- Module boundaries
- Import patterns (if documented)

✅ **Inline Comments** (if substantive):
- Workaround explanations
- Constraint documentation
- Known issue notes

### Unacceptable Evidence Sources

❌ **External to Repository**:
- Team Slack messages
- Email discussions
- External blog posts
- Stack Overflow answers
- Third-party documentation

❌ **Unverifiable Claims**:
- "It's common knowledge that..."
- "The team knows..."
- "This usually happens when..."
- "Based on my experience..."

❌ **Speculation**:
- "This probably causes..."
- "It seems like..."
- "This might be because..."

---

## Evidence Excerpt Standards

### Good Excerpts

✅ **Verbatim from file** (preferred):
```markdown
**Evidence**: `package.json:10-12`
```json
"scripts": {
  "test": "jest --maxWorkers=2",
  "test:ci": "jest --ci --coverage"
}
```
```

✅ **Accurate paraphrase** (when verbatim is too long):
```markdown
**Evidence**: `README.md:Known Issues` - Stage 5 Mendix SDK requires LayoutCall for every page
```

✅ **Structure pattern** (for directory evidence):
```markdown
**Evidence**: Repository structure shows monorepo pattern with `packages/` containing 5 independent modules
```

### Bad Excerpts

❌ **Too vague**:
```markdown
**Evidence**: The CI config has some retry logic
```

❌ **No file path**:
```markdown
**Evidence**: Tests timeout frequently
```

❌ **Interpretation instead of excerpt**:
```markdown
**Evidence**: The build process is complicated
```

❌ **External reference**:
```markdown
**Evidence**: According to the team's Slack discussion...
```

---

## Impact Validation

### Evidence-Based Impact

✅ **Derived from observable effects**:
```markdown
**Impact**: 3-retry policy with 10min timeout means maximum 30min feedback time for failing tests (evidence: timeout-minutes: 10, retry: 3)
```

✅ **Quantifiable when possible**:
```markdown
**Impact**: Zero-warning policy blocks merge for any ESLint warning (evidence: --max-warnings 0 in pre-commit hook)
```

### Speculative Impact (Reject)

❌ **Assumed effects**:
```markdown
**Impact**: This probably frustrates developers
```

❌ **Unverifiable claims**:
```markdown
**Impact**: This causes production issues
```
(Unless there's evidence of production issues in docs/issues)

---

## Recommendation Validation

### Actionable Recommendations

✅ **Specific steps**:
```markdown
**Recommendation**: 
1. Identify tests taking >5min using `npm run test -- --verbose`
2. Split long tests into smaller suites
3. Add test duration budget to CI: fail if any test >2min
```

✅ **Measurable outcomes**:
```markdown
**Recommendation**: Monitor retry rate in CI metrics. If >20%, investigate test isolation. Target <5% retry rate.
```

### Vague Recommendations (Reject)

❌ **Too general**:
```markdown
**Recommendation**: Fix the flaky tests
```

❌ **No clear action**:
```markdown
**Recommendation**: Tests should be better
```

---

## Multi-Lesson Validation

When generating multiple lessons:

- [ ] No duplicate lessons (same evidence, different wording)
- [ ] Lessons are independent (each stands alone)
- [ ] Categories are used consistently
- [ ] Severity levels are calibrated consistently
- [ ] Summary statistics match actual lesson count

---

## Final Output Validation

Before delivering lessons to user:

### Completeness

- [ ] All required files present (if using templates)
- [ ] Summary section included
- [ ] Evidence sources list included
- [ ] Excluded findings documented (transparency)

### Quality

- [ ] Every lesson passed per-lesson validation
- [ ] No hallucinated facts or claims
- [ ] All file paths verified to exist
- [ ] All excerpts verified as accurate

### Usability

- [ ] Lessons organized by category
- [ ] Navigation aids provided (TOC, summary)
- [ ] Actionable recommendations clear
- [ ] Tags consistent and useful

### Transparency

- [ ] Extraction date documented
- [ ] Evidence sources listed
- [ ] Excluded findings explained
- [ ] Methodology described (if template used)

---

## Red Flags - Immediate Rejection

If you see ANY of these in a lesson draft, reject immediately:

🚩 **"I think..."** or **"In my experience..."**  
🚩 **No file path** for evidence claim  
🚩 **"According to the team..."** (unless in documented meeting notes in repo)  
🚩 **"This is a common problem..."** (without repo evidence)  
🚩 **Recommendations not tied to evidence**  
🚩 **Speculation about future issues**  
🚩 **Claims that cannot be verified by reading files**  

---

## Self-Check Questions

Before finalizing each lesson, ask:

1. **Can I prove this?**
   - Would another person find the same evidence?
   - Is the file path correct?
   - Is the excerpt accurate?

2. **Am I inferring too much?**
   - Is my impact statement speculation or observation?
   - Are my recommendations based on evidence or assumptions?

3. **Is this actionable?**
   - Could someone follow my recommendation?
   - Are the steps specific enough?

4. **Is this necessary?**
   - Does this lesson add value?
   - Is it different from other lessons?
   - Does it meet minimum evidence standards?

If the answer to ANY question is "no" or "uncertain" → Exclude the lesson

---

## Post-Extraction Review

After generating all lessons:

### Quality Metrics

- **Evidence strength**: What % of lessons have file path + line numbers?  
  Target: 100%

- **Rejection rate**: What % of initial findings were excluded?  
  Normal: 20-40% (shows proper filtering)

- **Category distribution**: Are lessons evenly distributed or concentrated?  
  Note: Concentration is fine if evidence supports it

### Continuous Improvement

- [ ] Note which evidence sources were most valuable
- [ ] Document which patterns were easiest to extract
- [ ] Identify gaps (areas with no evidence but likely issues)
- [ ] Update template if new patterns emerge

---

**Remember: It's better to have 5 high-quality, evidence-based lessons than 20 speculative ones.**

**When in doubt, exclude it.**
