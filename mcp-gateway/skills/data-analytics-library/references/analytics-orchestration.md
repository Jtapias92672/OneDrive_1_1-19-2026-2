
# Analytics Orchestration Skill

## Core Principle

> "Every insight is backed by evidence. Every query is governed by trust tiers."

The Analytics Orchestra transforms natural language questions into governed, evidence-bound dashboards through a multi-agent pipeline.

---

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ANALYTICS ORCHESTRA                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │  USER QUESTION  │                                                        │
│  │  "Show vulns    │                                                        │
│  │   by severity"  │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐    Trust Tier    ┌─────────────────┐                  │
│  │  QUERY ROUTER   │────Validation────│   TRUST TIER    │                  │
│  │     Agent       │◀─────────────────│    ENGINE       │                  │
│  └────────┬────────┘                  └─────────────────┘                  │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐    Certified     ┌─────────────────┐                  │
│  │    ANALYSIS     │◀────Seeds────────│   CERTIFIED     │                  │
│  │     Agent       │                  │  ASSET REGISTRY │                  │
│  └────────┬────────┘                  └─────────────────┘                  │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │ VISUALIZATION   │                                                        │
│  │     Agent       │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                  ┌─────────────────┐                  │
│  │   DASHBOARD     │                  │    INSIGHT      │                  │
│  │     Agent       │─────────────────▶│     Agent       │                  │
│  └────────┬────────┘                  └────────┬────────┘                  │
│           │                                    │                            │
│           ▼                                    ▼                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DASHBOARD OUTPUT                             │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────────────────┐   │   │
│  │  │ Chart  │ │ Chart  │ │  KPI   │ │        Insights Panel      │   │   │
│  │  │  1     │ │  2     │ │ Cards  │ │  • Key finding 1 [evidence]│   │   │
│  │  └────────┘ └────────┘ └────────┘ │  • Key finding 2 [evidence]│   │   │
│  │                                    └────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Specifications

### 1. Query Router Agent

**Purpose:** Parse user intent, route to appropriate data sources, enforce trust tiers.

**Inputs:**
- Natural language question
- User context (trust tier, permissions)

**Outputs:**
- `QueryPlan`: Data sources, metrics, dimensions, filters

**CARS Level:** LOW

```typescript
interface QueryPlan {
  intent: {
    type: 'time_series' | 'breakdown' | 'comparison' | 'ranking' | 'detail';
    aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  };
  
  dataSources: Array<{
    zone: 'raw' | 'curated' | 'semantic';
    entity: string;
    path: string;
  }>;
  
  metrics: Array<{
    name: string;
    expression: string;
    aggregation: string;
  }>;
  
  dimensions: Array<{
    name: string;
    field: string;
    type: 'categorical' | 'temporal' | 'numerical';
  }>;
  
  filters: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'between';
    value: unknown;
  }>;
  
  accessDecision: {
    tier: 'crawl' | 'walk' | 'run';
    allowed: boolean;
    restrictions: string[];
  };
}
```

**Implementation:**
```typescript
async function routeQuery(
  question: string,
  user: User
): Promise<QueryPlan> {
  // 1. Parse intent
  const intent = await parseIntent(question);
  
  // 2. Identify required data
  const entities = await identifyEntities(question);
  
  // 3. Determine zone access
  const zone = determineRequiredZone(entities, intent);
  
  // 4. Check trust tier
  const accessDecision = checkTrustTier(user, zone);
  if (!accessDecision.allowed) {
    throw new AccessDeniedError(accessDecision.reason);
  }
  
  // 5. Find certified seeds (if semantic layer)
  if (zone === 'semantic') {
    const seeds = await findCertifiedSeeds(entities, intent);
    if (seeds.length === 0) {
      throw new CertificationError('No certified seed found for query');
    }
  }
  
  // 6. Build query plan
  return {
    intent,
    dataSources: mapToDataSources(entities, zone),
    metrics: extractMetrics(question, intent),
    dimensions: extractDimensions(question, intent),
    filters: extractFilters(question),
    accessDecision
  };
}
```

---

### 2. Analysis Agent

**Purpose:** Execute queries, apply statistical analysis, identify patterns.

**Inputs:**
- `QueryPlan` from Query Router

**Outputs:**
- `AnalysisResult`: Raw data, derived metrics, patterns, anomalies

**CARS Level:** MEDIUM (analysis requires audit trail)

```typescript
interface AnalysisResult {
  rawData: {
    columns: Column[];
    rows: Row[];
    rowCount: number;
    executionMs: number;
  };
  
  derivedMetrics: Array<{
    name: string;
    value: number;
    change?: {
      absolute: number;
      percent: number;
      period: string;
    };
  }>;
  
  patterns: Array<{
    type: 'trend' | 'anomaly' | 'correlation' | 'seasonality';
    description: string;
    confidence: number;
    significance: number;
  }>;
  
  rankings: Array<{
    dimension: string;
    value: string;
    metric: number;
    rank: number;
  }>;
  
  evidence: {
    queryHash: string;
    seedVersion?: string;
    dataFreshness: Date;
    lineageHash: string;
  };
}
```

**Implementation:**
```typescript
async function analyzeData(
  plan: QueryPlan,
  user: User
): Promise<AnalysisResult> {
  const audit = new EvidenceBinder('analysis');
  
  // 1. Execute query via MCP
  const rawData = await executeQuery(plan);
  audit.bind('query', { plan, rowCount: rawData.rowCount });
  
  // 2. Calculate derived metrics
  const derivedMetrics = calculateDerivedMetrics(rawData, plan);
  
  // 3. Detect patterns
  const patterns = await detectPatterns(rawData, {
    trendDetection: true,
    anomalyDetection: true,
    correlationAnalysis: plan.metrics.length > 1
  });
  
  // 4. Generate rankings
  const rankings = generateRankings(rawData, plan.dimensions);
  
  // 5. Build evidence
  const evidence = audit.seal();
  
  return {
    rawData,
    derivedMetrics,
    patterns,
    rankings,
    evidence
  };
}
```

---

### 3. Visualization Agent

**Purpose:** Generate chart specifications from analysis results.

**Inputs:**
- `AnalysisResult` from Analysis Agent
- `QueryPlan` for context

**Outputs:**
- `ChartSpec[]`: Vega-Lite / ECharts specifications

**CARS Level:** LOW

```typescript
interface ChartSpec {
  id: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'heatmap' | 'table';
  title: string;
  
  data: {
    source: 'analysis_result';
    transform?: Transform[];
  };
  
  encoding: {
    x?: { field: string; type: string; title?: string };
    y?: { field: string; type: string; title?: string };
    color?: { field: string; scale?: Scale };
    size?: { field: string };
    tooltip?: string[];
  };
  
  interactivity: {
    drillDown?: { dimension: string; action: 'filter' | 'navigate' };
    zoom?: boolean;
    pan?: boolean;
    tooltip?: boolean;
  };
  
  style: {
    theme: 'light' | 'dark' | 'brand';
    colorScheme: string;
    responsive: boolean;
  };
}
```

**Chart Selection Logic:**
```typescript
function selectChartType(plan: QueryPlan, analysis: AnalysisResult): ChartType {
  const { intent, dimensions, metrics } = plan;
  
  // Time series → Line chart
  if (intent.type === 'time_series') {
    return metrics.length > 1 ? 'area' : 'line';
  }
  
  // Breakdown with few categories → Bar chart
  if (intent.type === 'breakdown' && analysis.rankings.length <= 10) {
    return 'bar';
  }
  
  // Breakdown with many categories → Horizontal bar
  if (intent.type === 'breakdown' && analysis.rankings.length > 10) {
    return 'horizontal_bar';
  }
  
  // Comparison → Grouped bar
  if (intent.type === 'comparison') {
    return 'grouped_bar';
  }
  
  // Ranking → Table or bar
  if (intent.type === 'ranking') {
    return analysis.rankings.length > 20 ? 'table' : 'bar';
  }
  
  // Two metrics → Scatter
  if (metrics.length === 2 && intent.type !== 'time_series') {
    return 'scatter';
  }
  
  return 'table';
}
```

---

### 4. Dashboard Agent

**Purpose:** Compose charts into responsive dashboard layouts.

**Inputs:**
- `ChartSpec[]` from Visualization Agent
- `AnalysisResult` for KPIs

**Outputs:**
- `DashboardSpec`: Complete dashboard definition

**CARS Level:** MEDIUM (dashboard generation requires audit)

```typescript
interface DashboardSpec {
  id: string;
  title: string;
  description: string;
  
  layout: {
    type: 'grid' | 'flow' | 'fixed';
    columns: number;
    breakpoints: {
      mobile: LayoutConfig;
      tablet: LayoutConfig;
      desktop: LayoutConfig;
    };
  };
  
  components: Array<{
    id: string;
    type: 'chart' | 'kpi' | 'filter' | 'text' | 'insight';
    position: { row: number; col: number; rowSpan: number; colSpan: number };
    config: ChartSpec | KPISpec | FilterSpec | TextSpec | InsightSpec;
  }>;
  
  filters: Array<{
    id: string;
    type: 'date_range' | 'select' | 'multi_select' | 'search';
    field: string;
    default?: unknown;
    affects: string[];  // Component IDs
  }>;
  
  actions: Array<{
    id: string;
    type: 'refresh' | 'export' | 'share' | 'drill_down';
    config: Record<string, unknown>;
  }>;
  
  certification: {
    generated: Date;
    seeds: string[];
    evidenceHash: string;
  };
}
```

**Layout Algorithm:**
```typescript
function layoutDashboard(
  charts: ChartSpec[],
  analysis: AnalysisResult
): DashboardLayout {
  const components: Component[] = [];
  
  // 1. KPI cards at top (derived metrics)
  const kpis = analysis.derivedMetrics.slice(0, 4);
  kpis.forEach((kpi, i) => {
    components.push({
      type: 'kpi',
      position: { row: 0, col: i * 3, rowSpan: 1, colSpan: 3 },
      config: kpiFromMetric(kpi)
    });
  });
  
  // 2. Primary chart (largest, spans most columns)
  if (charts.length > 0) {
    components.push({
      type: 'chart',
      position: { row: 1, col: 0, rowSpan: 2, colSpan: 8 },
      config: charts[0]
    });
  }
  
  // 3. Secondary charts (smaller, side by side)
  charts.slice(1, 3).forEach((chart, i) => {
    components.push({
      type: 'chart',
      position: { row: 1 + i, col: 8, rowSpan: 1, colSpan: 4 },
      config: chart
    });
  });
  
  // 4. Insights panel (bottom right)
  components.push({
    type: 'insight',
    position: { row: 3, col: 8, rowSpan: 1, colSpan: 4 },
    config: { patterns: analysis.patterns }
  });
  
  return { columns: 12, components };
}
```

---

### 5. Insight Agent

**Purpose:** Generate natural language insights with evidence citations.

**Inputs:**
- `AnalysisResult`
- `DashboardSpec`

**Outputs:**
- `InsightPanel`: Summary, highlights, next questions

**CARS Level:** LOW

```typescript
interface InsightPanel {
  summary: string;  // 2-3 sentence overview
  
  highlights: Array<{
    type: 'trend' | 'anomaly' | 'comparison' | 'achievement';
    text: string;
    importance: 'high' | 'medium' | 'low';
    evidence: {
      dataPoint: string;
      source: string;
      confidence: number;
    };
  }>;
  
  nextQuestions: Array<{
    question: string;
    rationale: string;
    suggestedQuery: QueryPlan;
  }>;
  
  methodology: {
    dataSources: string[];
    analysisApplied: string[];
    limitations: string[];
  };
}
```

**Insight Generation:**
```typescript
async function generateInsights(
  analysis: AnalysisResult,
  plan: QueryPlan
): Promise<InsightPanel> {
  const insights: Highlight[] = [];
  
  // 1. Trend insights
  const trends = analysis.patterns.filter(p => p.type === 'trend');
  for (const trend of trends) {
    insights.push({
      type: 'trend',
      text: describeTrend(trend, plan),
      importance: trend.significance > 0.8 ? 'high' : 'medium',
      evidence: {
        dataPoint: trend.description,
        source: plan.dataSources[0].entity,
        confidence: trend.confidence
      }
    });
  }
  
  // 2. Anomaly insights
  const anomalies = analysis.patterns.filter(p => p.type === 'anomaly');
  for (const anomaly of anomalies) {
    insights.push({
      type: 'anomaly',
      text: describeAnomaly(anomaly),
      importance: 'high',
      evidence: {
        dataPoint: anomaly.description,
        source: plan.dataSources[0].entity,
        confidence: anomaly.confidence
      }
    });
  }
  
  // 3. Generate next questions
  const nextQuestions = suggestNextQuestions(analysis, plan);
  
  // 4. Build summary
  const summary = buildSummary(analysis, insights);
  
  return {
    summary,
    highlights: insights,
    nextQuestions,
    methodology: {
      dataSources: plan.dataSources.map(d => d.entity),
      analysisApplied: ['trend_detection', 'anomaly_detection'],
      limitations: ['Data as of ' + analysis.evidence.dataFreshness]
    }
  };
}
```

---

## Trust Tier Integration

| Tier | Query Router | Analysis | Visualization | Dashboard |
|------|--------------|----------|---------------|-----------|
| **CRAWL** | Explore metadata only | Sample data (100 rows) | Basic charts | Read-only |
| **WALK** | Filter & pivot | Full aggregation | Interactive charts | Create drafts |
| **RUN** | Full semantic access | All analysis types | All chart types | Publish & share |

**Enforcement:**
```typescript
function enforceTierCapabilities(
  tier: TrustTier,
  operation: AnalyticsOperation
): CapabilityDecision {
  const capabilities = TIER_CAPABILITIES[tier];
  
  if (operation.type === 'query') {
    if (!capabilities.zones.includes(operation.zone)) {
      return { allowed: false, reason: `${tier} cannot access ${operation.zone}` };
    }
    if (operation.rowLimit && operation.rowLimit > capabilities.maxRows) {
      operation.rowLimit = capabilities.maxRows;
    }
  }
  
  if (operation.type === 'dashboard') {
    if (operation.action === 'publish' && !capabilities.canPublish) {
      return { allowed: false, reason: `${tier} cannot publish dashboards` };
    }
  }
  
  return { allowed: true };
}
```

---

## Full Workflow Example

```typescript
async function generateDashboard(
  question: string,
  user: User
): Promise<Dashboard> {
  // 1. Route query
  const plan = await queryRouter.route(question, user);
  console.log(`Query plan: ${plan.intent.type} on ${plan.dataSources.length} sources`);
  
  // 2. Check access
  if (!plan.accessDecision.allowed) {
    throw new AccessDeniedError(plan.accessDecision.restrictions);
  }
  
  // 3. Analyze data
  const analysis = await analysisAgent.analyze(plan, user);
  console.log(`Analysis: ${analysis.rawData.rowCount} rows, ${analysis.patterns.length} patterns`);
  
  // 4. Generate visualizations
  const charts = await vizAgent.generateCharts(plan, analysis);
  console.log(`Generated ${charts.length} charts`);
  
  // 5. Compose dashboard
  const dashboard = await dashboardAgent.compose(charts, analysis);
  
  // 6. Generate insights
  const insights = await insightAgent.generate(analysis, plan);
  dashboard.components.push({
    type: 'insight',
    config: insights
  });
  
  // 7. Bind evidence
  dashboard.certification = {
    generated: new Date(),
    seeds: plan.dataSources.filter(d => d.zone === 'semantic').map(d => d.entity),
    evidenceHash: analysis.evidence.lineageHash
  };
  
  return dashboard;
}

// Usage
const dashboard = await generateDashboard(
  "Show me security vulnerabilities by severity over the last 30 days, with drill-down by asset type",
  currentUser
);
```

---

## MCP Integration

### Snowflake MCP (Cortex Analyst)
```typescript
async function executeViaSnowflake(plan: QueryPlan): Promise<RawData> {
  // For WALK tier: Use Cortex Analyst for NL→SQL
  if (plan.accessDecision.tier === 'walk') {
    return await snowflakeMcp.callTool('cortex_analyst', {
      question: plan.originalQuestion,
      semanticModel: plan.dataSources[0].entity
    });
  }
  
  // For RUN tier: Execute certified seed directly
  const seed = await getCertifiedSeed(plan);
  return await snowflakeMcp.callTool('execute_sql', {
    sql: seed.sql,
    parameters: plan.filters
  });
}
```

### Databricks MCP
```typescript
async function executeViaDatabricks(plan: QueryPlan): Promise<RawData> {
  return await databricksMcp.callTool('unity_catalog_query', {
    catalog: 'sevco',
    schema: plan.dataSources[0].zone,
    table: plan.dataSources[0].entity,
    filters: plan.filters
  });
}
```

---

## Output Formats

### Dashboard JSON
```json
{
  "id": "dash_vuln_severity_001",
  "title": "Vulnerability Severity Analysis",
  "generated": "2025-12-26T10:30:00Z",
  "layout": {
    "columns": 12,
    "breakpoints": {
      "mobile": { "columns": 1 },
      "tablet": { "columns": 6 },
      "desktop": { "columns": 12 }
    }
  },
  "components": [
    {
      "type": "kpi",
      "position": { "row": 0, "col": 0, "colSpan": 3 },
      "config": {
        "title": "Critical Vulns",
        "value": 142,
        "change": { "percent": -12, "period": "30d" }
      }
    }
  ],
  "certification": {
    "seeds": ["vuln_severity_timeseries_v2"],
    "evidenceHash": "sha256:abc123..."
  }
}
```

### React Component Export
```tsx
export function VulnerabilitySeverityDashboard() {
  const { data, loading } = useDashboardData('dash_vuln_severity_001');
  
  return (
    <DashboardGrid columns={12}>
      <KPICard col={0} colSpan={3} data={data.kpis[0]} />
      <KPICard col={3} colSpan={3} data={data.kpis[1]} />
      <TimeSeriesChart col={0} colSpan={8} data={data.charts[0]} />
      <InsightPanel col={8} colSpan={4} insights={data.insights} />
    </DashboardGrid>
  );
}
```

---

## Error Handling

| Error | Agent | Recovery |
|-------|-------|----------|
| Access denied | Query Router | Return tier upgrade suggestion |
| No certified seed | Query Router | Suggest creating seed (RUN tier) |
| Query timeout | Analysis | Reduce data range, add sampling |
| Chart type mismatch | Visualization | Fallback to table view |
| Layout overflow | Dashboard | Enable scrolling, reduce density |

---

*Skill Version: 1.0.0*
*Author: ArcFoundry*
*Last Updated: December 2025*
