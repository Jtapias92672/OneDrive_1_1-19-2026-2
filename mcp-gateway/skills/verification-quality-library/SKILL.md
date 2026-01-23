---
name: verification-quality-library
description: Verification and quality assurance patterns including expected output protocols, human review gates, slop tests, and validation protocols. Use when completing tasks involving code execution, file operations, API calls, or any work that requires objective verification.
---

# Verification & Quality Library

Patterns for ensuring AI-generated work is correct, complete, and verified.

## When to Use
- Preventing incomplete or hallucinatory work
- Implementing human checkpoints in AI workflows
- Catching common AI hallucinations before code review
- Enforcing proof-of-functionality requirements

## References

### expected-output-protocol.md
Requires declaring expected outputs BEFORE implementation, then comparing actual results. Creates immediate feedback loops.

### human-review-gates.md
Mandatory human checkpoints in AI-assisted workflows. Prevents agent-validates-agent anti-patterns. Based on Capital One's "Writing is Reviewing" principle.

## Usage
```
Load specific references as needed:
view /mnt/skills/user/verification-quality-library/references/expected-output-protocol.md
```
