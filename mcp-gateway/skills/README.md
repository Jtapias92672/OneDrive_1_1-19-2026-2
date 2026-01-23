# ArcFoundry Skills Library

Consolidated skill libraries for Claude.ai. These libraries reduce 30+ individual skills into 10 consolidated library skills, staying well under Claude's 50-skill limit.

## Library Structure

| Library | Description | Reference Count |
|---------|-------------|-----------------|
| **arcfoundry-skill-library** | Core ArcFoundry methodology, Three Truths, CARS, JT1 recovery | 15 |
| **agent-patterns-library** | Agent orchestration, context chaining, memory management | 9 |
| **development-practices-library** | ARCH.md standard, coding patterns, AI tool best practices | 11 |
| **compliance-security-library** | Security, audit trails, API contracts, deployment readiness | 5 |
| **memory-architecture-library** | Multi-layer memory, context compaction, active retrieval | 5 |
| **data-analytics-library** | Data lake governance, connectors, analytics orchestration | 3 |
| **genbi-governance-library** | Trust tiers, certification, evidence binding | 5 |
| **infrastructure-library** | Mendix SDK, long-running agents, MCP patterns | 2 |
| **ui-governance-library** | Component-level access control, AI consumer interfaces | 2 |
| **verification-quality-library** | Expected output protocols, human review gates | 2 |

## Installation

1. Download the `.skill` files from the `skills/` folder
2. In Claude.ai, go to Settings → Skills
3. Upload each `.skill` file

## Folder Structure

```
library-name/
├── SKILL.md              # Main entry point (required)
└── references/           # Sub-skill reference files
    ├── pattern-a.md
    ├── pattern-b.md
    └── ...
```

## Usage

When Claude loads a library skill, it reads the `SKILL.md` which indexes all available references. You can then load specific references as needed:

```
view /mnt/skills/user/arcfoundry-skill-library/references/cars-framework.md
```

## Contributing

1. Add new patterns to the appropriate library's `references/` folder
2. Update the library's `SKILL.md` to index the new reference
3. Re-package as a `.skill` file (ZIP archive)
