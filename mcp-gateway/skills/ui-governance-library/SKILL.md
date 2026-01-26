---
name: ui-governance-library
description: UI governance patterns including component-level access control, AI consumer interfaces, and composability systems. Use for compliance-critical UIs in finance, healthcare, defense, or when building interfaces for AI agent consumption.
---

# UI Governance Library

Patterns for building governed, accessible, and AI-consumable user interfaces.

## When to Use
- Implementing Fine-Grained Access Control (FGAC) at UI component level
- Building interfaces for AI agent consumption
- Compliance-critical UIs (finance, healthcare, defense)
- Multi-tenant SaaS with component-level permissions

## References

### ai-consumer-interface.md
Design interfaces for AI agent consumption. Implements semantic HTML and ARIA as AI navigation maps, agent-specific APIs, computer-use readiness hints.

### component-level-governance.md
Fine-Grained Access Control (FGAC) at the UI component level. Every UI primitive knows its own permissions and can refuse to render sensitive data.

## Usage
```
Load specific references as needed:
view /mnt/skills/user/ui-governance-library/references/component-level-governance.md
```
