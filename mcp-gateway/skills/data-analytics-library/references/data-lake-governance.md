
# Data Lake Governance Skill

## Core Principle

> "Data flows through trust zones. Each zone has rules. Rules are enforced, not suggested."

---

## Four-Zone Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAKE ZONES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  CONNECTORS                                                      ANALYTICS
      │                                                               ▲
      ▼                                                               │
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    │
│  LANDING  │───▶│    RAW    │───▶│  CURATED  │───▶│ SEMANTIC  │────┘
│   ZONE    │    │   ZONE    │    │   ZONE    │    │   LAYER   │
└───────────┘    └───────────┘    └───────────┘    └───────────┘
     │                │                │                │
     ▼                ▼                ▼                ▼
  Trust: NONE      Trust: LOW     Trust: MEDIUM    Trust: HIGH
  Access: SYSTEM   Access: CRAWL  Access: WALK     Access: RUN
  Format: RAW      Format: VALID  Format: ENRICHED Format: SEMANTIC
```

---

## Zone Definitions

### Zone 1: Landing

| Attribute | Value |
|-----------|-------|
| **Purpose** | Raw ingestion buffer |
| **Trust Level** | NONE |
| **Access** | System only (connectors) |
| **Format** | As-received (JSON, CSV, Parquet) |
| **Retention** | 7 days |
| **Operations** | Write only |

**Rules:**
- No human access
- No transformations
- Append-only writes
- Partitioned by `dt` (ingestion date)
- Source metadata preserved

**Path Convention:**
```
s3://lake/landing/{source}/{entity}/dt={YYYY-MM-DD}/
```

---

### Zone 2: Raw

| Attribute | Value |
|-----------|-------|
| **Purpose** | Deduplicated, schema-enforced |
| **Trust Level** | LOW |
| **Access** | CRAWL tier (explore) |
| **Format** | Parquet with schema |
| **Retention** | 90 days |
| **Operations** | Read, explore |

**Rules:**
- Schema validation enforced
- Duplicates removed
- Null handling applied
- Type coercion complete
- PII fields tagged

**Quality Gates (Landing → Raw):**
```typescript
interface LandingToRawGate {
  schemaValidation: {
    required: true;
    strictMode: boolean;      // false allows new fields
    nullThreshold: number;    // max % null per field
  };
  deduplication: {
    enabled: true;
    keys: string[];           // natural keys for dedup
    strategy: 'keep_first' | 'keep_last' | 'keep_max';
  };
  typeCoercion: {
    enabled: true;
    failOnError: boolean;
    defaultValues: Record<string, unknown>;
  };
}
```

**Path Convention:**
```
s3://lake/raw/{domain}/{entity}/v{schema_version}/dt={YYYY-MM-DD}/
```

---

### Zone 3: Curated

| Attribute | Value |
|-----------|-------|
| **Purpose** | Transformed, enriched, joined |
| **Trust Level** | MEDIUM |
| **Access** | WALK tier (pivot, filter) |
| **Format** | Delta Lake / Iceberg |
| **Retention** | 2 years |
| **Operations** | Read, pivot, aggregate |

**Rules:**
- Business logic applied
- Dimensions joined
- Aggregations pre-computed
- SCD (slowly changing dimensions) handled
- Certified by data owner

**Quality Gates (Raw → Curated):**
```typescript
interface RawToCuratedGate {
  transformations: {
    validated: boolean;        // transforms reviewed
    tested: boolean;           // unit tests pass
    documented: boolean;       // logic documented
  };
  joins: {
    validated: boolean;        // join keys verified
    orphanHandling: 'drop' | 'default' | 'fail';
  };
  certification: {
    owner: string;
    approvedDate: Date;
    contractVersion: string;
  };
}
```

**Path Convention:**
```
s3://lake/curated/{domain}/{entity}/v{schema_version}/
```

---

### Zone 4: Semantic Layer

| Attribute | Value |
|-----------|-------|
| **Purpose** | Business metrics, KPIs |
| **Trust Level** | HIGH |
| **Access** | RUN tier (full query) |
| **Format** | Views, materialized queries |
| **Retention** | N/A (computed) |
| **Operations** | Query via certified seeds |

**Rules:**
- Only certified seeds allowed
- Evidence binding required
- All queries audited
- Human approval for new seeds

**Semantic Objects:**
```typescript
interface SemanticMetric {
  id: string;                  // metric_monthly_revenue
  name: string;                // "Monthly Revenue"
  description: string;
  
  definition: {
    sql: string;               // SUM(amount) WHERE status = 'closed'
    dimensions: string[];      // ['region', 'product']
    filters: Filter[];
  };
  
  certification: {
    owner: string;
    version: string;
    validatedDate: Date;
    slo: {
      freshnessHours: number;
      accuracyPercent: number;
    };
  };
}
```

---

## Lineage Tracking

Every data movement is tracked:

```typescript
interface LineageRecord {
  id: string;
  timestamp: Date;
  
  source: {
    zone: 'landing' | 'raw' | 'curated' | 'semantic';
    path: string;
    version: string;
    rowCount: number;
    hash: string;              // Content hash
  };
  
  destination: {
    zone: 'raw' | 'curated' | 'semantic';
    path: string;
    version: string;
    rowCount: number;
    hash: string;
  };
  
  transformation: {
    pipelineId: string;
    pipelineVersion: string;
    operationType: 'copy' | 'transform' | 'aggregate' | 'join';
    durationMs: number;
  };
  
  quality: {
    inputRecords: number;
    outputRecords: number;
    droppedRecords: number;
    dropReason?: string;
    qualityScore: number;      // 0-100
  };
  
  governance: {
    classification: string;
    piiHandled: boolean;
    retentionApplied: boolean;
  };
}
```

---

## Trust Tier Enforcement

| Tier | Zones Accessible | Allowed Operations |
|------|------------------|-------------------|
| **CRAWL** | Raw | Browse, sample, explore metadata |
| **WALK** | Raw, Curated | Filter, pivot, aggregate (pre-approved) |
| **RUN** | Raw, Curated, Semantic | Full query via certified seeds |

**Enforcement:**
```typescript
function enforceAccess(
  user: User,
  zone: Zone,
  operation: Operation
): AccessDecision {
  const tier = user.trustTier;
  
  // Zone access
  const zoneAllowed = TIER_ZONE_MAP[tier].includes(zone);
  if (!zoneAllowed) {
    return { allowed: false, reason: `${tier} cannot access ${zone}` };
  }
  
  // Operation access
  const opAllowed = ZONE_OPERATIONS[zone].includes(operation);
  if (!opAllowed) {
    return { allowed: false, reason: `${operation} not allowed in ${zone}` };
  }
  
  // For semantic layer, must use certified seed
  if (zone === 'semantic' && operation === 'query') {
    if (!isCertifiedSeed(query)) {
      return { 
        allowed: false, 
        reason: 'Only certified seeds allowed in semantic layer' 
      };
    }
  }
  
  return { allowed: true };
}
```

---

## Quality Gates

### Gate Configuration

```yaml
# quality-gates.yaml

landing_to_raw:
  schema_validation:
    enabled: true
    strict: false
    null_threshold: 0.10        # 10% nulls max
    type_mismatch_action: coerce
    
  deduplication:
    enabled: true
    strategy: keep_last
    
  profiling:
    enabled: true
    sample_rate: 0.01           # 1% sample

raw_to_curated:
  transformation_tests:
    enabled: true
    coverage_threshold: 0.80    # 80% test coverage
    
  data_quality:
    uniqueness_checks: true
    referential_integrity: true
    business_rules: true
    
  certification:
    required: true
    approvers: ["data-owner", "data-steward"]

curated_to_semantic:
  seed_certification:
    required: true
    review_period_days: 90
    
  slo_validation:
    freshness_check: true
    accuracy_check: true
    
  evidence_binding:
    required: true
    include_lineage: true
```

---

## Pipeline Definitions

### Landing → Raw Pipeline

```typescript
async function landingToRaw(
  sourcePath: string,
  targetPath: string,
  config: LandingToRawConfig
): Promise<PipelineResult> {
  const audit = new AuditLogger('landing_to_raw');
  
  // 1. Read from landing
  const rawData = await readLanding(sourcePath);
  audit.log('read', { path: sourcePath, rows: rawData.length });
  
  // 2. Schema validation
  const validated = await validateSchema(rawData, config.schema);
  if (validated.errors.length > config.errorThreshold) {
    throw new QualityGateError('Schema validation failed', validated.errors);
  }
  audit.log('validate', { valid: validated.valid, errors: validated.errors.length });
  
  // 3. Deduplication
  const deduped = deduplicate(validated.data, config.deduplication);
  audit.log('dedup', { 
    before: validated.data.length, 
    after: deduped.length,
    removed: validated.data.length - deduped.length 
  });
  
  // 4. Type coercion
  const coerced = coerceTypes(deduped, config.typeCoercion);
  
  // 5. Write to raw zone
  await writeToRaw(targetPath, coerced, { format: 'parquet' });
  
  // 6. Record lineage
  await recordLineage({
    source: { zone: 'landing', path: sourcePath },
    destination: { zone: 'raw', path: targetPath },
    transformation: { type: 'landing_to_raw', config }
  });
  
  return audit.getResult();
}
```

### Raw → Curated Pipeline

```typescript
async function rawToCurated(
  pipelineId: string,
  config: RawToCuratedConfig
): Promise<PipelineResult> {
  const pipeline = await loadPipeline(pipelineId);
  const audit = new AuditLogger('raw_to_curated');
  
  // 1. Validate pipeline is certified
  if (!pipeline.certification?.approved) {
    throw new CertificationError('Pipeline not certified');
  }
  
  // 2. Run transformation tests
  const testResults = await runTransformationTests(pipeline);
  if (testResults.coverage < config.coverageThreshold) {
    throw new QualityGateError('Test coverage below threshold');
  }
  
  // 3. Execute transformations
  for (const step of pipeline.steps) {
    const result = await executeStep(step);
    audit.log('step', { step: step.id, ...result });
  }
  
  // 4. Validate output quality
  const qualityResult = await validateQuality(
    pipeline.output,
    config.qualityChecks
  );
  
  // 5. Write to curated zone
  await writeToCurated(pipeline.output.path, { format: 'delta' });
  
  // 6. Record lineage
  await recordLineage({
    source: pipeline.inputs.map(i => ({ zone: 'raw', path: i.path })),
    destination: { zone: 'curated', path: pipeline.output.path },
    transformation: { type: 'raw_to_curated', pipelineId }
  });
  
  return audit.getResult();
}
```

---

## Data Contracts

Each zone transition requires a contract:

```typescript
interface DataContract {
  id: string;
  version: string;
  
  producer: {
    team: string;
    pipeline: string;
    sla: {
      freshnessMinutes: number;
      availabilityPercent: number;
    };
  };
  
  schema: {
    fields: Field[];
    primaryKey: string[];
    partitionKey: string[];
    orderBy?: string[];
  };
  
  quality: {
    nullThresholds: Record<string, number>;
    uniquenessConstraints: string[][];
    customRules: QualityRule[];
  };
  
  consumers: Array<{
    team: string;
    usage: string;
    accessTier: 'crawl' | 'walk' | 'run';
  }>;
  
  changelog: Array<{
    version: string;
    date: Date;
    changes: string[];
    breakingChange: boolean;
  }>;
}
```

---

## Usage Examples

### Example 1: Define a New Data Domain

```typescript
const domain: DataDomain = {
  name: 'security_vulnerabilities',
  owner: 'security-team',
  
  zones: {
    landing: {
      path: 's3://lake/landing/security/',
      retention: '7d'
    },
    raw: {
      path: 's3://lake/raw/security/',
      retention: '90d',
      schema: vulnerabilitySchemaV1
    },
    curated: {
      path: 's3://lake/curated/security/',
      retention: '2y',
      pipelines: ['vuln_enrichment', 'asset_join']
    },
    semantic: {
      metrics: ['vuln_count_by_severity', 'mttr_by_asset_type'],
      kpis: ['security_posture_score']
    }
  }
};

await registerDomain(domain);
```

### Example 2: Query with Trust Tier Enforcement

```typescript
async function executeQuery(
  user: User,
  query: Query
): Promise<QueryResult> {
  // Determine required zone
  const zone = analyzeQueryZone(query);
  
  // Check access
  const access = enforceAccess(user, zone, 'query');
  if (!access.allowed) {
    throw new AccessDeniedError(access.reason);
  }
  
  // For semantic, validate certified seed
  if (zone === 'semantic') {
    const seed = findCertifiedSeed(query);
    if (!seed) {
      throw new CertificationError('Query not backed by certified seed');
    }
    
    // Bind evidence
    const evidence = await bindEvidence({
      seedId: seed.id,
      seedVersion: seed.version,
      queryHash: hashQuery(query),
      user: user.id,
      timestamp: new Date()
    });
    
    const result = await executeSeed(seed, query.parameters);
    return { ...result, evidence };
  }
  
  // For other zones, execute directly
  return await executeDirectQuery(query, zone);
}
```

---

## Integration Points

| Integration | Purpose |
|-------------|---------|
| **Snowflake MCP** | Execute queries, Cortex Analyst for NL→SQL |
| **Databricks MCP** | Execute queries, Unity Catalog for governance |
| **connector-factory** | Receives data in landing zone |
| **analytics-orchestration** | Queries from semantic layer |
| **certified-asset-lifecycle** | Certifies pipelines and seeds |
| **evidence-binding-standard** | Binds evidence to all operations |

---

*Skill Version: 1.0.0*
*Author: ArcFoundry*
*Last Updated: December 2025*
