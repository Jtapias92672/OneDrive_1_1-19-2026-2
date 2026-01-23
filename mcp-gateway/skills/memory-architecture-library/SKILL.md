---
name: memory-architecture-library
description: Comprehensive multi-layer memory system treating memory as an owned architectural requirement. Implements 4-layer architecture (A/B/C/D), compression-as-curation, two-stage retrieval with verification. Use for any project requiring persistent, verifiable, auditable agent memory beyond session scope.
---

# Memory Architecture Library

Comprehensive patterns for AI agent memory management, context engineering, and session persistence.

## When to Use
- Managing context windows critically
- Building agents that run across multiple sessions
- Implementing tiered memory systems
- Preventing context rot in long conversations
- Active retrieval patterns for large codebases

## References

### memory-architecture-core.md
Core 4-layer memory architecture (A/B/C/D) with compression-as-curation and verification.

### context-compaction.md
Combat Context Rot by enforcing automatic compaction after extended conversations. Forces periodic context refresh.

### context-compiler.md
Dedicated Context Compiler session to curate context packages for Worker agents, preventing bias from failed attempts.

### active-retrieval.md
Progressive disclosure by actively retrieving only needed context. Grep for specific patterns instead of reading full files.

### domain-memory-pattern.md
Two-agent system (Initializer/Worker) for multi-session projects with features.json and progress.md tracking.

## Usage
```
Load specific references as needed:
view /mnt/skills/user/memory-architecture-library/references/context-compaction.md
```
