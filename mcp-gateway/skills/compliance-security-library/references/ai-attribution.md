---
name: ai-attribution
description: Provides clear audit trails distinguishing AI-generated content from human content. Implements git commit attribution, file markers, and audit logging for compliance with DCMA, DFARS, SOC2, CMMC. Essential for enterprise environments requiring provenance tracking.
---

# AI Attribution

## When to Use
Use when generating code, files, or artifacts that need audit trails. Provides clear distinction between AI-generated and human content for compliance.

## Core Principle

> "Every AI-generated artifact must carry its provenance."

## Three Pillars

### 1. Git Commit Attribution

```
[AI-GENERATED] <type>: <subject>

<body>

AI-Agent: <agent-name>
AI-Session: <session-id>
AI-Trust-Tier: <CRAWL|WALK|RUN>
Human-Reviewed: <yes|no|pending>
Lineage-Hash: <sha256-hash>
---
Files-Modified: <count>
Files-Created: <count>
```

Commit types: feat, fix, refactor, docs, test, chore

### 2. File Markers

Header:
```
# ===========================================================================
# AI-GENERATED FILE - Review Required Before Production Use
# ===========================================================================
# Generator:     <agent-name>
# Session:       <session-id>
# Created:       <timestamp>
# Trust-Tier:    <tier>
# Review-Status: pending
# ===========================================================================
```

Footer:
```
# ===========================================================================
# AI Generation Complete
# Lineage-Hash: <sha256-hash>
# ===========================================================================
```

### 3. Audit Logging

Directory structure:
```
.ai-audit/
├── changes.jsonl      # All AI changes
├── commits.jsonl      # AI commit log
├── reviews/           # Human review records
└── sessions/          # Session summaries
```

Change log entry:
```json
{
  "change_id": "CHG-20251228-001",
  "timestamp": "2025-12-28T14:30:22Z",
  "agent": "claude-sonnet-4",
  "session_id": "ses_20251228_143022",
  "trust_tier": "WALK",
  "action": "file_create",
  "target": "src/memory/retrieval.py",
  "lineage_hash": "sha256:a3f2b8c9...",
  "review_status": "pending"
}
```

## Review Status Values

| Status | Meaning |
|--------|---------|
| pending | Awaiting human review |
| approved | Human approved for production |
| rejected | Human rejected, revision required |
| deferred | Review postponed |

## Compliance Mapping

| Requirement | Feature | Evidence |
|-------------|---------|----------|
| DCMA | Change tracking | .ai-audit/changes.jsonl |
| DFARS | Source ID | File markers + commits |
| SOC2 | Access control | AI-Trust-Tier field |
| CMMC | Audit trails | .ai-audit/sessions/ |

## Checklist

Before committing AI-generated code:
- [ ] File has AI-GENERATED header
- [ ] File has lineage hash footer
- [ ] Commit message follows format
- [ ] Change logged to .ai-audit/
- [ ] Trust tier correctly set
- [ ] Review status marked pending

## Usage
Load when generating code or files requiring audit trails, compliance tracking, or human review workflows.
