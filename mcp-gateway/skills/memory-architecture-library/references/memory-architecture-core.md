---
name: memory-architecture-library
description: Comprehensive multi-layer memory system treating memory as an owned architectural requirement. Implements 4-layer architecture (A/B/C/D), compression-as-curation, two-stage retrieval with verification. Use for any project requiring persistent, verifiable, auditable agent memory beyond session scope.
---

# Memory Architecture Library v1.1

## When to Use
Use when implementing persistent, verifiable, auditable agent memory. Load this skill for any project requiring multi-layer memory beyond session scope, compression pipelines, two-stage retrieval, or memory recovery.

## Core Principle

> "AI is stateless by design; passive accumulation causes noise, cost, and inaccuracy. We solve this with layered memory, compression-as-curation, mode-aware context, and two-stage retrieval + verification."

## Memory Layers Overview

| Layer | Name | Purpose | Retrieval | Trust | Write Autonomy |
|-------|------|---------|-----------|-------|----------------|
| **A** | Preferences | Permanent core rules | Deterministic | RUN | BLOCKED |
| **B** | Facts | Structured project data | Deterministic | RUN | RESTRICTED |
| **C** | Episodic | Events, decisions, log | Deterministic | WALK | SUPERVISED |
| **D** | Semantic | Candidate recall ONLY | Probabilistic | CRAWL | FULL |

**Critical Rule**: Layer D is for candidate recall ONLY—never ground truth.

## Layer A: Preferences
- Storage: yaml
- Retrieval: deterministic
- Write autonomy: BLOCKED
- Trust level: RUN
- v1.1: Contradiction check triggers JT1 if writes conflict with Layer A rules

## Layer B: Facts
- Storage: sqlite
- Retrieval: deterministic
- Write autonomy: RESTRICTED
- Trust level: RUN
- v1.1: entity_id required, temporal validity (valid_from, valid_to, superseded_by)

## Layer C: Episodic
- Storage: sqlite
- Retrieval: deterministic
- Write autonomy: SUPERVISED
- Trust level: WALK
- v1.1: Weasel filter on write, staleness detection, active voice required

## Layer D: Semantic
- Storage: chromadb
- Retrieval: probabilistic
- Write autonomy: FULL
- Trust level: CRAWL
- v1.1: Timestamp cross-reference against Layer C

## Two-Stage Retrieval

Stage 1 RECALL: Query allowed layers, collect candidates, rank by source priority (A > B > C > D)

Stage 2 VERIFY: Layer A/B pre-verified, Layer C staleness check, Layer D cross-reference against B/C

Output: VERIFIED | UNVERIFIED | FAILED | INSUFFICIENT | STALE

## Trust Tier Access

| Trust Tier | A | B | C | D |
|------------|---|---|---|---|
| RUN (99%+) | ✅ | ✅ | ❌ | ❌ |
| WALK (90-99%) | ✅ | ✅ | ✅ | ❌ |
| CRAWL (80-90%) | ✅ | ✅ | ✅ | ✅ |

## Non-Negotiable Rules

1. Layer D is for candidate recall ONLY - never ground truth
2. All facts MUST link to entity_id
3. Layer C writes MUST pass weasel word filter
4. Use active voice in all memory entries
5. Verify Layer D candidates against Layer C timestamps
6. Two-stage retrieval with evidence receipts

## Usage
Load when designing memory systems, implementing compression, building retrieval with verification, or recovering from memory corruption.
