# V&V Framework Proposal Archive

**Source:** Tom (VP Software Engineering)
**Date:** 2026-01-26
**Status:** IMPLEMENTED as Epic 7.5

## Original Documents
- Toms_process_synthesized_v1.docx - Synthesized notes on Testing, Communication, and Complexity
- Toms_Process_Claude_Code_Task_Pack.docx - Implementation templates and schemas

Note: Original .docx files were uploaded to Claude.ai, not the CC filesystem.
If archival is needed, manually copy them to this directory.

## Implementation
See: docs/epics/epic-07.5-vnv-framework.md

## Key Concepts Adopted
1. **Verification vs Validation separation** (ISTQB) - V-checks for technical correctness, B-checks for business correctness
2. **Test pyramid with time-boxed suites** (Fowler, Google) - smoke ≤30min, sanity ≤3hr, regression full
3. **Gate-based quality enforcement** - PR, pre-merge, release-candidate, release, pre-dispatch
4. **Complexity reduction via decomposition** (Brooks) - Story points threshold triggers decomposition requirement
5. **Context window awareness** (Anthropic research) - Token budgets for agent work items

## Implementation Mapping

| Tom's Concept | FORGE Implementation |
|---------------|---------------------|
| CheckerSpec | .forge/checker/checker_spec.schema.json |
| Test Suites | .forge/suites/suite_registry.yaml |
| Gate Rules | .forge/governance/gate_rules.yaml |
| V&V Engine | .forge/lib/vnv.ts |
| Receipt Extensions | TestEvidence, VnVSummary in types.ts |

All concepts were adapted to FORGE's .forge/ structure and integrated with Epic 07 infrastructure (ledger, hooks, convoy).
