---
name: infrastructure-library
description: Infrastructure patterns including Mendix SDK integration, MCP server implementation, long-running agent harnesses, and deployment patterns. Use for Mendix deployments, MCP server development, or multi-session agent infrastructure.
---

# Infrastructure Library

Patterns for platform integration, long-running agents, and deployment infrastructure.

## When to Use
- Building tools that generate Mendix pages programmatically
- Creating Figma-to-Mendix or design-to-code converters
- Implementing long-running agent workflows
- Multi-session agent projects spanning hours or days

## References

### mendix-sdk-integration.md
Comprehensive patterns for Mendix Platform SDK development. Covers layout resolution, widget configuration, and file operations for Mendix 11.5+.

### long-running-agent-harness.md
Effective harnesses for agents working across multiple context windows. Provides Initializer/Coding agent pattern with feature lists and progress tracking.

## Scripts
- `scripts/feature-manager.py` - Feature tracking for long-running projects
- `scripts/verify-session-end.sh` - Session verification
- `scripts/setup-long-running-project.sh` - Project setup

## Usage
```
Load specific references as needed:
view /mnt/skills/user/infrastructure-library/references/mendix-sdk-integration.md
```
