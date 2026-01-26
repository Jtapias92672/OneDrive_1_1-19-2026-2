
# Connector Factory Skill

## Core Principle

> "Any data source should be connectable through agent-generated code, not manual implementation."

The Connector Factory is a multi-agent system that:
1. **Discovers** source type, schema, and auth requirements
2. **Generates** connector code from templates
3. **Deploys** to customer infrastructure
4. **Monitors** for health and drift
5. **Certifies** when stable

---

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTOR ORCHESTRA                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Discovery  │──▶│   Schema   │──▶│   Codegen  │             │
│  │    Agent    │  │    Agent    │  │    Agent    │             │
│  └─────────────┘  └─────────────┘  └──────┬──────┘             │
│                                           │                     │
│                                           ▼                     │
│                   ┌─────────────┐  ┌─────────────┐             │
│                   │   Monitor   │◀─│   Deploy    │             │
│                   │    Agent    │  │    Agent    │             │
│                   └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Connector IR (Intermediate Representation)

Every connector is defined by a manifest that follows this schema:

```typescript
interface ConnectorManifest {
  // Identity
  id: string;                          // connector_salesforce_opportunity_v1
  name: string;                        // Human-readable name
  version: string;                     // semver
  
  // Source Configuration
  source: {
    type: 'rest_api' | 'graphql' | 'jdbc' | 'file' | 'stream' | 'custom';
    provider: string;                  // salesforce, postgres, s3, kafka
    baseUrl?: string;                  // For APIs
    connectionString?: string;         // For databases
    
    auth: {
      method: 'oauth2' | 'api_key' | 'bearer' | 'basic' | 'iam' | 'none';
      config: {
        // OAuth2
        tokenUrl?: string;
        clientIdEnvVar?: string;
        clientSecretEnvVar?: string;
        scopes?: string[];
        
        // API Key
        headerName?: string;
        apiKeyEnvVar?: string;
        
        // IAM
        roleArn?: string;
      };
    };
    
    rateLimit?: {
      requestsPerSecond: number;
      burstLimit: number;
      retryAfterHeader?: string;
    };
  };
  
  // Schema Definition
  schema: {
    entities: Array<{
      name: string;                    // Opportunity
      endpoint?: string;               // /services/data/v58.0/sobjects/Opportunity
      query?: string;                  // SELECT * FROM opportunities
      fields: Array<{
        name: string;
        type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json';
        nullable: boolean;
        pii?: boolean;
      }>;
    }>;
    
    relationships?: Array<{
      from: { entity: string; field: string };
      to: { entity: string; field: string };
      type: 'one_to_one' | 'one_to_many' | 'many_to_many';
    }>;
    
    updateStrategy: 'full_refresh' | 'incremental' | 'cdc';
    incrementalKey?: string;           // updated_at
    cdcConfig?: {
      cursorField: string;
      cursorType: 'timestamp' | 'sequence' | 'log_position';
    };
  };
  
  // Destination Configuration
  destination: {
    lakePath: string;                  // s3://lake/landing/salesforce/opportunity/
    format: 'parquet' | 'json' | 'avro' | 'delta';
    compression?: 'snappy' | 'gzip' | 'zstd';
    partitionBy: string[];             // ['dt', 'region']
    
    writeMode: 'append' | 'overwrite' | 'merge';
    mergeKeys?: string[];              // For upsert operations
  };
  
  // Schedule
  schedule: {
    type: 'cron' | 'interval' | 'event' | 'continuous';
    expression?: string;               // "0 */15 * * * *" (every 15 min)
    intervalSeconds?: number;
    eventSource?: string;              // SNS topic, webhook
  };
  
  // Governance
  governance: {
    owner: string;                     // team or individual
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    retentionDays: number;
    piiHandling: 'mask' | 'hash' | 'encrypt' | 'exclude';
    
    contract: {
      version: string;
      slo: {
        freshnessMinutes: number;      // Data should be no older than X
        availabilityPercent: number;   // 99.9%
        errorRatePercent: number;      // < 0.1%
      };
    };
  };
}
```

---

## Agent Specifications

### 1. Discovery Agent

**Purpose:** Identify source type, auth requirements, and API structure.

**Inputs:**
- Natural language description: "Connect to Salesforce Opportunity data"
- Optional: API docs URL, sample credentials

**Outputs:**
- `SourceManifest`: Type, auth method, base URL, rate limits

**CARS Level:** LOW (read-only discovery)

**Implementation:**
```typescript
async function discoverSource(description: string): Promise<SourceManifest> {
  // 1. Parse description to identify provider
  const provider = await identifyProvider(description);
  
  // 2. Fetch provider metadata from registry
  const providerMeta = await getProviderMetadata(provider);
  
  // 3. Determine auth method
  const authMethod = providerMeta.defaultAuth;
  
  // 4. Identify entities mentioned
  const entities = extractEntities(description);
  
  return {
    type: providerMeta.type,
    provider: provider,
    baseUrl: providerMeta.baseUrl,
    auth: { method: authMethod, config: {} },
    rateLimit: providerMeta.rateLimit,
    suggestedEntities: entities
  };
}
```

---

### 2. Schema Agent

**Purpose:** Extract schema from source and map to Connector IR.

**Inputs:**
- `SourceManifest` from Discovery Agent
- Credentials (from secrets manager)

**Outputs:**
- `SchemaDefinition`: Entities, fields, relationships

**CARS Level:** LOW (read-only metadata access)

**Implementation:**
```typescript
async function extractSchema(
  source: SourceManifest,
  credentials: Credentials
): Promise<SchemaDefinition> {
  const client = await createSourceClient(source, credentials);
  
  // 1. List available entities
  const entities = await client.listEntities();
  
  // 2. For each entity, get field definitions
  const schemas = await Promise.all(
    entities.map(async (entity) => {
      const fields = await client.describeEntity(entity);
      return { name: entity, fields: mapToConnectorIR(fields) };
    })
  );
  
  // 3. Discover relationships
  const relationships = await client.discoverRelationships(entities);
  
  return {
    entities: schemas,
    relationships: relationships,
    updateStrategy: inferUpdateStrategy(schemas)
  };
}
```

---

### 3. Codegen Agent

**Purpose:** Generate connector code from manifest.

**Inputs:**
- Complete `ConnectorManifest`

**Outputs:**
- `ConnectorPackage`: Source code, tests, Dockerfile, Kubernetes manifests

**CARS Level:** MEDIUM (code generation requires audit)

**Templates Available:**

| Template | Use Case |
|----------|----------|
| `rest-api-connector` | REST APIs with pagination |
| `graphql-connector` | GraphQL APIs |
| `jdbc-connector` | SQL databases |
| `file-connector` | S3, GCS, local files |
| `kafka-connector` | Kafka streams |
| `webhook-connector` | Incoming webhooks |

**Generated Structure:**
```
connector-{source}-{entity}/
├── src/
│   ├── index.ts           # Entry point
│   ├── client.ts          # Source client
│   ├── extractor.ts       # Data extraction logic
│   ├── transformer.ts     # Schema transformation
│   ├── loader.ts          # Lake writer
│   └── config.ts          # Configuration
├── tests/
│   ├── client.test.ts
│   ├── extractor.test.ts
│   └── integration.test.ts
├── Dockerfile
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── cronjob.yaml
├── manifest.json          # Connector IR
└── README.md
```

---

### 4. Deploy Agent

**Purpose:** Build, test, and deploy connector to EKS.

**Inputs:**
- `ConnectorPackage` from Codegen Agent
- Target environment (dev/staging/prod)

**Outputs:**
- `DeploymentReceipt`: Pod ID, endpoint, health URL

**CARS Level:** HIGH (production deployment requires approval)

**Workflow:**
```typescript
async function deployConnector(
  pkg: ConnectorPackage,
  environment: 'dev' | 'staging' | 'prod'
): Promise<DeploymentReceipt> {
  // 1. Build container image
  const imageTag = await buildAndPush(pkg);
  
  // 2. Run integration tests in sandbox
  const testResult = await runIntegrationTests(imageTag);
  if (!testResult.passed) {
    throw new DeploymentError('Integration tests failed', testResult);
  }
  
  // 3. If prod, require human approval
  if (environment === 'prod') {
    const approval = await cars.requestApproval({
      action: 'deploy_connector',
      resource: pkg.manifest.id,
      riskLevel: 'high',
      evidence: { testResult, imageTag }
    });
    await cars.waitForApproval(approval.id);
  }
  
  // 4. Deploy via EKS MCP
  const deployment = await eksMcp.callTool('apply_yaml', {
    manifests: pkg.k8sManifests,
    namespace: `connectors-${environment}`
  });
  
  // 5. Wait for healthy
  await waitForHealthy(deployment.podSelector);
  
  return {
    deploymentId: deployment.id,
    podId: deployment.pods[0].id,
    endpoint: deployment.service.endpoint,
    healthUrl: `${deployment.service.endpoint}/health`
  };
}
```

---

### 5. Monitor Agent

**Purpose:** Health checks, alerting, drift detection.

**Inputs:**
- `DeploymentReceipt`
- SLO definitions from manifest

**Outputs:**
- Health metrics
- Alerts on violations
- Drift reports

**CARS Level:** LOW (monitoring is read-only)

**Metrics Collected:**
```typescript
interface ConnectorMetrics {
  // Availability
  healthChecksPassed: number;
  healthChecksFailed: number;
  uptimePercent: number;
  
  // Performance
  extractionDurationMs: number;
  recordsProcessed: number;
  bytesProcessed: number;
  
  // Quality
  nullFieldRate: number;
  schemaViolations: number;
  duplicateRecords: number;
  
  // Freshness
  lastSuccessfulRun: Date;
  dataLatencyMinutes: number;
  
  // Errors
  errorCount: number;
  errorRate: number;
  lastError?: string;
}
```

---

## Certification Workflow

After 24 hours of healthy operation, a connector can be certified:

```
┌─────────────────────────────────────────────────────────────────┐
│                 CERTIFICATION WORKFLOW                           │
└─────────────────────────────────────────────────────────────────┘

      PENDING          MONITORING         REVIEW          CERTIFIED
         │                 │                │                 │
         ▼                 ▼                ▼                 ▼
    ┌─────────┐       ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ Deploy  │──────▶│ 24h Run │─────▶│ Admin   │─────▶│   CAR   │
    │ Success │       │ No SLO  │      │ Reviews │      │ Entry   │
    │         │       │ Breach  │      │ Metrics │      │         │
    └─────────┘       └─────────┘      └─────────┘      └─────────┘
                           │
                           │ SLO Breach
                           ▼
                      ┌─────────┐
                      │  FAILED │
                      │ Fix and │
                      │ Retry   │
                      └─────────┘
```

---

## Provider Registry

Pre-configured provider metadata for common sources:

```yaml
# providers/salesforce.yaml
provider: salesforce
displayName: Salesforce
type: rest_api
baseUrl: https://{instance}.salesforce.com
auth:
  defaultMethod: oauth2
  oauth2:
    tokenUrl: https://login.salesforce.com/services/oauth2/token
    scopes: ['api', 'refresh_token']
rateLimit:
  requestsPerSecond: 25
  burstLimit: 100
entities:
  common:
    - Account
    - Contact
    - Opportunity
    - Lead
    - Case
documentation: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta

---
# providers/postgres.yaml
provider: postgres
displayName: PostgreSQL
type: jdbc
connectionString: postgresql://{host}:{port}/{database}
auth:
  defaultMethod: basic
  basic:
    usernameEnvVar: POSTGRES_USER
    passwordEnvVar: POSTGRES_PASSWORD
features:
  - cdc (logical replication)
  - incremental (updated_at)
  - full_refresh
documentation: https://www.postgresql.org/docs/current/

---
# providers/kafka.yaml
provider: kafka
displayName: Apache Kafka
type: stream
connectionString: bootstrap.servers={brokers}
auth:
  defaultMethod: sasl_ssl
  sasl_ssl:
    mechanism: SCRAM-SHA-256
    usernameEnvVar: KAFKA_USERNAME
    passwordEnvVar: KAFKA_PASSWORD
features:
  - continuous
  - exactly_once
  - consumer_groups
documentation: https://kafka.apache.org/documentation/
```

---

## Usage Examples

### Example 1: Connect to Salesforce

```typescript
// User prompt: "Connect to Salesforce and stream Opportunity data"

// Discovery Agent
const source = await discoveryAgent.discover(
  "Connect to Salesforce and stream Opportunity data"
);
// Result: { type: 'rest_api', provider: 'salesforce', ... }

// Schema Agent
const schema = await schemaAgent.extract(source, credentials);
// Result: { entities: [{ name: 'Opportunity', fields: [...] }] }

// Codegen Agent
const manifest: ConnectorManifest = {
  id: 'connector_salesforce_opportunity_v1',
  source: source,
  schema: schema,
  destination: {
    lakePath: 's3://lake/landing/salesforce/opportunity/',
    format: 'parquet',
    partitionBy: ['dt']
  },
  schedule: { type: 'cron', expression: '0 */15 * * * *' }
};

const pkg = await codegenAgent.generate(manifest);

// Deploy Agent
const deployment = await deployAgent.deploy(pkg, 'prod');

// Monitor Agent
await monitorAgent.startMonitoring(deployment);
```

### Example 2: Connect to PostgreSQL with CDC

```typescript
// User prompt: "Stream changes from orders table in Postgres"

const manifest: ConnectorManifest = {
  id: 'connector_postgres_orders_v1',
  source: {
    type: 'jdbc',
    provider: 'postgres',
    connectionString: '${POSTGRES_CONNECTION_STRING}',
    auth: { method: 'basic', config: {} }
  },
  schema: {
    entities: [{
      name: 'orders',
      query: 'SELECT * FROM orders',
      fields: [
        { name: 'id', type: 'number', nullable: false },
        { name: 'customer_id', type: 'number', nullable: false },
        { name: 'total', type: 'number', nullable: false },
        { name: 'created_at', type: 'datetime', nullable: false }
      ]
    }],
    updateStrategy: 'cdc',
    cdcConfig: {
      cursorField: 'xmin',
      cursorType: 'log_position'
    }
  },
  destination: {
    lakePath: 's3://lake/landing/postgres/orders/',
    format: 'delta',
    writeMode: 'merge',
    mergeKeys: ['id']
  },
  schedule: { type: 'continuous' }
};
```

---

## Error Handling

| Error Type | Agent | Recovery |
|------------|-------|----------|
| Auth failure | Discovery | Prompt for credentials refresh |
| Schema mismatch | Schema | Trigger drift detection workflow |
| Build failure | Codegen | Log error, suggest template fix |
| Deploy failure | Deploy | Rollback, alert admin |
| SLO breach | Monitor | Alert, pause if critical |

---

## Security Considerations

1. **Credentials:** Never stored in manifest; always referenced via env vars pointing to secrets manager
2. **Network:** Connectors run in dedicated namespace with network policies
3. **PII:** Handled according to governance.piiHandling setting
4. **Audit:** Every agent action produces evidence receipt
5. **Approval:** Production deployments require human approval via CARS

---

## Integration with mcp-production-runtime

The Connector Factory uses mcp-production-runtime for:

1. **Code-First Execution:** Connector code is generated as executable scripts
2. **Sandbox Execution:** Integration tests run in sandboxed environment
3. **CARS Risk Gating:** Deploy actions require approval
4. **Audit Logging:** All agent actions produce audit receipts
5. **Multi-Server Routing:** Coordinates between GitHub MCP (code), EKS MCP (deploy)

---

*Skill Version: 1.0.0*
*Author: ArcFoundry*
*Last Updated: December 2025*
