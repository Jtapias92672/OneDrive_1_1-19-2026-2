# FORGE Skills Index

This document catalogs the 10 ArcFoundry skill libraries integrated into FORGE.

## Skills Overview

| Skill | Category | Risk Level | Description |
|-------|----------|------------|-------------|
| agent-patterns-library | Agent | L2_LOW | Agent orchestration and coordination |
| arcfoundry-skill-library | Architecture | L1_MINIMAL | Three Truths, CARS framework |
| compliance-security-library | Compliance | L1_MINIMAL | Audit and regulatory compliance |
| data-analytics-library | Data | L3_MEDIUM | Data lake and analytics |
| development-practices-library | Development | L2_LOW | ARCH.md and coding standards |
| genbi-governance-library | Governance | L2_LOW | Trust tiers and certification |
| infrastructure-library | Infrastructure | L3_MEDIUM | Mendix SDK and MCP server |
| memory-architecture-library | Memory | L2_LOW | 4-layer memory architecture |
| ui-governance-library | UI | L2_LOW | Component access control |
| verification-quality-library | Verification | L1_MINIMAL | Output verification and quality |

## Detailed Skill Descriptions

### 1. Agent Patterns Library
**Category:** Agent | **Risk Level:** L2_LOW

Agent orchestration, context chaining, multi-agent coordination patterns.

**Use Cases:**
- Multi-agent orchestration
- Context chaining between agents
- Agent coordination workflows
- Task delegation patterns
- Workflow automation

**Related Skills:** memory-architecture-library, infrastructure-library

---

### 2. ArcFoundry Skill Library
**Category:** Architecture | **Risk Level:** L1_MINIMAL

Three Truths, CARS framework, architecture hub, drift tracking.

**Use Cases:**
- Architecture validation
- CARS risk assessment integration
- Drift detection
- Truth maintenance
- System design validation

**Related Skills:** verification-quality-library, compliance-security-library

---

### 3. Compliance & Security Library
**Category:** Compliance | **Risk Level:** L1_MINIMAL

Audit prompts, AI attribution, DCMA/DFARS/SOC2/CMMC compliance.

**Use Cases:**
- Compliance auditing
- Security assessment
- AI attribution tracking
- Regulatory compliance (DFARS, SOC2, CMMC)
- Audit trail generation

**Related Skills:** verification-quality-library, genbi-governance-library

---

### 4. Data Analytics Library
**Category:** Data | **Risk Level:** L3_MEDIUM

Data lake governance, connector factory, analytics orchestration.

**Use Cases:**
- Data lake design
- Analytics pipeline development
- Connector development
- Data governance
- ETL orchestration

**Related Skills:** infrastructure-library, genbi-governance-library

---

### 5. Development Practices Library
**Category:** Development | **Risk Level:** L2_LOW

ARCH.md standard, coding patterns, AI tool usage best practices.

**Use Cases:**
- Code generation guidance
- Architecture documentation (ARCH.md)
- Coding standards enforcement
- AI-assisted development
- Best practices reference

**Related Skills:** arcfoundry-skill-library, verification-quality-library

---

### 6. GenBI Governance Library
**Category:** Governance | **Risk Level:** L2_LOW

Trust tiers (Crawl/Walk/Run), asset certification, evidence binding.

**Use Cases:**
- Trust tier management
- Asset certification workflows
- Evidence binding
- Governance workflow automation
- Maturity assessment

**Related Skills:** compliance-security-library, verification-quality-library

---

### 7. Infrastructure Library
**Category:** Infrastructure | **Risk Level:** L3_MEDIUM

Mendix SDK, MCP server, long-running agent harness.

**Use Cases:**
- Mendix platform integration
- MCP server setup and configuration
- Agent harness deployment
- Infrastructure automation
- Platform engineering

**Related Skills:** agent-patterns-library, data-analytics-library

---

### 8. Memory Architecture Library
**Category:** Memory | **Risk Level:** L2_LOW

4-layer memory (A/B/C/D), context compaction, active retrieval.

**Use Cases:**
- Context management
- Memory optimization
- Retrieval augmentation (RAG)
- Knowledge persistence
- Context compaction strategies

**Related Skills:** agent-patterns-library, ui-governance-library

---

### 9. UI Governance Library
**Category:** UI | **Risk Level:** L2_LOW

Component-level access control, AI consumer interfaces.

**Use Cases:**
- UI access control
- Component governance
- AI interface design
- Consumer experience optimization
- Permission management

**Related Skills:** genbi-governance-library, memory-architecture-library

---

### 10. Verification & Quality Library
**Category:** Verification | **Risk Level:** L1_MINIMAL

Expected output protocol, human review gates, slop tests.

**Use Cases:**
- Output verification
- Quality assurance
- Human review workflows
- Slop detection
- Expected output testing

**Related Skills:** compliance-security-library, arcfoundry-skill-library

---

## Cross-Reference Matrix

| Skill | Works Well With |
|-------|-----------------|
| agent-patterns | memory-architecture, infrastructure |
| arcfoundry | verification-quality, compliance-security |
| compliance-security | verification-quality, genbi-governance |
| data-analytics | infrastructure, genbi-governance |
| development-practices | arcfoundry, verification-quality |
| genbi-governance | compliance-security, verification-quality |
| infrastructure | agent-patterns, data-analytics |
| memory-architecture | agent-patterns, ui-governance |
| ui-governance | genbi-governance, memory-architecture |
| verification-quality | compliance-security, arcfoundry |

## API Endpoints

```
GET  /api/v1/skills                    - List all skills
GET  /api/v1/skills/:name              - Get skill details
GET  /api/v1/skills/:name/references   - Get skill references
GET  /api/v1/skills/stats              - Get skills statistics
POST /api/v1/skills/recommend          - Recommend skill for task
```

## Integration with CARS

Skills are integrated with the CARS risk assessment framework:

- **L1_MINIMAL (enhances safety):** verification-quality, compliance-security, arcfoundry
- **L2_LOW (orchestration patterns):** agent-patterns, memory-architecture, development-practices, genbi-governance, ui-governance
- **L3_MEDIUM (infrastructure changes):** data-analytics, infrastructure

When an agent uses a skill, the skill context is included in the CARS audit trail.
