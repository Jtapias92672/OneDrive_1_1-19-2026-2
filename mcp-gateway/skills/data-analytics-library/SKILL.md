---
name: data-analytics-library
description: >
  Data platform and analytics library. Contains four-zone data lake governance,
  multi-agent connector factory, and analytics orchestration patterns. Use for
  data lake architecture, building data connectors, query routing, dashboard
  generation, or analytics agent coordination.
---

# Data Analytics Library

Data platform patterns for lakes, connectors, and analytics.

## Quick Reference

| I need to... | Load this reference |
|--------------|---------------------|
| Design data lake zones (Landing→Raw→Curated→Semantic) | `references/data-lake-governance.md` |
| Generate data connectors to APIs/databases/files | `references/connector-factory.md` |
| Build query routing and dashboard generation | `references/analytics-orchestration.md` |

## Library Contents

### Data Lake
- **data-lake-governance.md** - Four-zone architecture, zone boundaries, lineage tracking, quality gates, trust tier access by zone

### Connectors
- **connector-factory.md** - Multi-agent connector generation (Discovery→Schema→Codegen→Deploy→Monitor), streaming patterns, contract integration

### Analytics
- **analytics-orchestration.md** - Query router, analysis agents, visualization agents, dashboard composition, insight generation

## Trigger Keywords

Data lake, connector, analytics, query, dashboard, Landing zone, Raw zone, Curated zone, Semantic zone, data pipeline
