
# AI Research Scanner Skill

## Purpose

Systematically monitor AI provider's publications for insights that could improve
the skill framework. New research often reveals better patterns for:
- Agent orchestration
- Tool usage
- Context management
- Safety and alignment

---

## Sources to Monitor

```yaml
sources:
  primary:
    - url: https://www.anthropic.com/research
      frequency: weekly
      type: research_papers
      
    - url: https://www.anthropic.com/engineering  
      frequency: weekly
      type: engineering_blog
      
    - url: https://docs.anthropic.com
      frequency: weekly
      type: documentation
      
    - url: https://www.anthropic.com/news
      frequency: weekly
      type: announcements
      
  secondary:
    - url: https://github.com/anthropics
      frequency: weekly
      type: open_source
```

---

## Scan Procedure

### Weekly Scan

```bash
# Run every Monday
1. Check each source for updates since last scan
2. Identify articles/changes related to:
   - Claude capabilities
   - Agent patterns
   - Tool usage
   - Best practices
   - Safety/alignment
3. Summarize findings
4. Map to affected skills
5. Propose updates
```

---

## Finding Categories

| Category | Impact | Action |
|----------|--------|--------|
| New capability | HIGH | Create new skill or update existing |
| Best practice change | MEDIUM | Update affected skills |
| Deprecation | HIGH | Remove deprecated patterns |
| Performance improvement | LOW | Optimize affected skills |
| Bug fix | MEDIUM | Apply workarounds |

---

## Scan Report Template

```markdown
# Anthropic Research Scan Report
**Date**: [scan date]
**Period**: [last week]

## Findings

### 1. [Finding Title]
**Source**: [URL]
**Category**: [capability|practice|deprecation|performance|bug]
**Impact**: [HIGH|MEDIUM|LOW]

**Summary**: [What was announced/changed]

**Affected Skills**:
- skill-name-1: [how it's affected]
- skill-name-2: [how it's affected]

**Recommended Action**: [what to do]

### 2. [Next Finding]
...

## Summary
- Total findings: X
- High impact: Y
- Skills to update: Z

## Recommended Actions
1. [ ] Update skill-X with new pattern
2. [ ] Create new skill for capability-Y
3. [ ] Deprecate pattern-Z
```

---

## Skill Update Workflow

When scan identifies needed updates:

```
1. Document finding in scan report
2. Review with user (human-review-gates)
3. Draft skill update
4. User approves update
5. Apply update to skill
6. Verify update in persistent storage
```

---

## Integration Points

```yaml
integrates_with:
  - skill-installation-protocol: "Updates follow installation protocol"
  - human-review-gates: "User approves all changes"
```

---

*This skill ensures the framework stays current with AI provider's latest guidance.*
