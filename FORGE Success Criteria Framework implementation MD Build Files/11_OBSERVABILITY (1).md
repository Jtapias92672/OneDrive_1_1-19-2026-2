# FORGE Success Criteria Framework - Observability

**Version:** 2.0  
**Last Updated:** 2026-01-19  
**Epic:** 11 - observability  
**Status:** ✅ Complete (22 files, ~3,600 lines)

---

## Overview

The Observability layer provides comprehensive monitoring, tracing, and logging capabilities across the FORGE platform. It enables real-time visibility into system health, performance, and behavior, supporting both operational monitoring and audit requirements.

---

## Observability Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OBSERVABILITY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DATA COLLECTION                               │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │   │
│  │  │   LOGS     │  │  METRICS   │  │   TRACES   │  │   EVENTS    │   │   │
│  │  │ COLLECTOR  │  │ COLLECTOR  │  │ COLLECTOR  │  │  COLLECTOR  │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PROCESSING LAYER                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │   │
│  │  │ LOG        │  │  METRIC    │  │   TRACE    │  │   EVENT     │   │   │
│  │  │ PROCESSOR  │  │ AGGREGATOR │  │  CORRELATOR│  │  ENRICHER   │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          STORAGE                                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │  LOKI    │  │PROMETHEUS│  │  JAEGER  │  │ OPENSEARCH│            │   │
│  │  │  (Logs)  │  │ (Metrics)│  │ (Traces) │  │ (Search) │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       VISUALIZATION                                  │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                        GRAFANA                                  │ │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │   │
│  │  │  │DASHBOARDS│  │  ALERTS  │  │ EXPLORE  │  │ REPORTS  │       │ │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Logging

### Structured Logging

```typescript
interface Logger {
  // Log levels
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  
  // Contextual logging
  child(context: LogContext): Logger;
  
  // Audit logging
  audit(event: AuditEvent): void;
}

interface LogContext {
  // Request context
  requestId?: string;
  traceId?: string;
  spanId?: string;
  
  // User context
  userId?: string;
  tenantId?: string;
  
  // Operation context
  operation?: string;
  component?: string;
  
  // Custom fields
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;       // ISO 8601
  level: LogLevel;
  message: string;
  
  // Context
  service: string;
  environment: string;
  version: string;
  
  // Correlation
  requestId?: string;
  traceId?: string;
  spanId?: string;
  
  // Classification
  category: LogCategory;
  component: string;
  
  // Error details
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  
  // Additional context
  context?: Record<string, unknown>;
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

type LogCategory = 
  | 'REQUEST'
  | 'GENERATION'
  | 'VALIDATION'
  | 'CONVERGENCE'
  | 'SECURITY'
  | 'AUDIT'
  | 'SYSTEM';
```

### Log Configuration

```typescript
interface LogConfig {
  // Output
  level: LogLevel;
  format: 'json' | 'text';
  output: 'stdout' | 'file' | 'both';
  
  // File options
  file?: {
    path: string;
    maxSize: string;      // e.g., '100mb'
    maxFiles: number;
    compress: boolean;
  };
  
  // Filtering
  filters?: LogFilter[];
  
  // Sampling
  sampling?: {
    enabled: boolean;
    rate: number;         // 0.0 - 1.0
    excludeLevels: LogLevel[];
  };
  
  // Sensitive data
  redaction?: {
    enabled: boolean;
    fields: string[];
    replacement: string;
  };
}

// Implementation using Pino
import pino from 'pino';

const logger = pino({
  level: config.level,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({
      service: 'forge',
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION
    })
  },
  redact: {
    paths: ['context.apiKey', 'context.password', 'context.token'],
    censor: '[REDACTED]'
  },
  transport: {
    target: 'pino-loki',
    options: {
      host: process.env.LOKI_HOST,
      labels: { app: 'forge' }
    }
  }
});
```

### Audit Logging

```typescript
interface AuditEvent {
  // Identity
  eventId: string;
  eventType: AuditEventType;
  timestamp: Date;
  
  // Actor
  actor: {
    type: 'USER' | 'SYSTEM' | 'API_KEY';
    id: string;
    name?: string;
    ip?: string;
  };
  
  // Action
  action: string;
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  
  // Result
  outcome: 'SUCCESS' | 'FAILURE' | 'ERROR';
  errorCode?: string;
  errorMessage?: string;
  
  // Context
  requestId?: string;
  sessionId?: string;
  
  // Before/After state
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  
  // Classification
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  compliance?: string[];  // e.g., ['DCMA', 'SOC2']
}

type AuditEventType = 
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'DATA_ACCESS'
  | 'DATA_MODIFICATION'
  | 'CONFIGURATION_CHANGE'
  | 'EXPORT'
  | 'ADMIN_ACTION';

class AuditLogger {
  constructor(
    private store: AuditStore,
    private eventEmitter: EventEmitter
  ) {}
  
  async log(event: AuditEvent): Promise<void> {
    // Validate event
    this.validateEvent(event);
    
    // Persist to audit store (immutable)
    await this.store.append(event);
    
    // Emit for real-time processing
    this.eventEmitter.emit('audit', event);
    
    // High-sensitivity events trigger alerts
    if (event.sensitivity === 'CRITICAL') {
      await this.alertSecurityTeam(event);
    }
  }
}
```

---

## Metrics

### Metric Types

```typescript
import { Counter, Gauge, Histogram, Summary } from 'prom-client';

// Request metrics
const requestMetrics = {
  total: new Counter({
    name: 'forge_requests_total',
    help: 'Total number of requests',
    labelNames: ['method', 'endpoint', 'status', 'tenant']
  }),
  
  duration: new Histogram({
    name: 'forge_request_duration_seconds',
    help: 'Request duration in seconds',
    labelNames: ['method', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
  }),
  
  inProgress: new Gauge({
    name: 'forge_requests_in_progress',
    help: 'Number of requests currently in progress',
    labelNames: ['method', 'endpoint']
  })
};

// Generation metrics
const generationMetrics = {
  total: new Counter({
    name: 'forge_generations_total',
    help: 'Total generation requests',
    labelNames: ['contract_type', 'agent', 'status']
  }),
  
  duration: new Histogram({
    name: 'forge_generation_duration_seconds',
    help: 'Generation duration in seconds',
    labelNames: ['contract_type', 'agent'],
    buckets: [1, 5, 10, 30, 60, 120, 300]
  }),
  
  tokens: new Counter({
    name: 'forge_generation_tokens_total',
    help: 'Total tokens used in generation',
    labelNames: ['model', 'direction']  // direction: input/output
  }),
  
  cost: new Counter({
    name: 'forge_generation_cost_dollars',
    help: 'Total cost of generation in dollars',
    labelNames: ['model', 'tenant']
  })
};

// Validation metrics
const validationMetrics = {
  total: new Counter({
    name: 'forge_validations_total',
    help: 'Total validations performed',
    labelNames: ['validator', 'result']  // result: pass/fail
  }),
  
  score: new Histogram({
    name: 'forge_validation_score',
    help: 'Validation score distribution',
    labelNames: ['validator'],
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  }),
  
  duration: new Histogram({
    name: 'forge_validation_duration_seconds',
    help: 'Validation duration',
    labelNames: ['validator'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
  })
};

// Convergence metrics
const convergenceMetrics = {
  iterations: new Histogram({
    name: 'forge_convergence_iterations',
    help: 'Number of iterations to convergence',
    labelNames: ['contract_type', 'outcome'],
    buckets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }),
  
  duration: new Histogram({
    name: 'forge_convergence_duration_seconds',
    help: 'Total convergence duration',
    labelNames: ['contract_type'],
    buckets: [10, 30, 60, 120, 300, 600]
  }),
  
  scoreImprovement: new Histogram({
    name: 'forge_convergence_score_improvement',
    help: 'Score improvement per iteration',
    labelNames: ['contract_type'],
    buckets: [0.01, 0.02, 0.05, 0.1, 0.2]
  })
};

// System metrics
const systemMetrics = {
  cpuUsage: new Gauge({
    name: 'forge_cpu_usage_percent',
    help: 'CPU usage percentage',
    labelNames: ['pod']
  }),
  
  memoryUsage: new Gauge({
    name: 'forge_memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['pod', 'type']  // type: heap/rss
  }),
  
  connectionPool: new Gauge({
    name: 'forge_connection_pool_size',
    help: 'Connection pool size',
    labelNames: ['pool', 'state']  // state: active/idle/waiting
  })
};
```

### Custom Metrics Registry

```typescript
interface MetricsRegistry {
  // Registration
  register<T extends Metric>(metric: T): T;
  unregister(name: string): void;
  
  // Retrieval
  get(name: string): Metric | undefined;
  getAll(): Metric[];
  
  // Export
  metrics(): Promise<string>;  // Prometheus format
  metricsJson(): Promise<object>;
}

class ForgeMetricsRegistry implements MetricsRegistry {
  private registry = new Map<string, Metric>();
  
  register<T extends Metric>(metric: T): T {
    this.registry.set(metric.name, metric);
    return metric;
  }
  
  async metrics(): Promise<string> {
    const lines: string[] = [];
    
    for (const metric of this.registry.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      lines.push(await metric.format());
    }
    
    return lines.join('\n');
  }
}
```

---

## Distributed Tracing

### Trace Context

```typescript
interface TraceContext {
  traceId: string;      // 32 hex chars
  spanId: string;       // 16 hex chars
  parentSpanId?: string;
  
  // Sampling
  sampled: boolean;
  sampleRate?: number;
  
  // Baggage (propagated context)
  baggage: Map<string, string>;
}

interface Span {
  // Identity
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  
  // Timing
  startTime: number;
  duration?: number;
  
  // Status
  status: SpanStatus;
  
  // Attributes
  attributes: Map<string, SpanAttributeValue>;
  
  // Events
  events: SpanEvent[];
  
  // Links to other spans
  links: SpanLink[];
  
  // Operations
  setStatus(status: SpanStatus): void;
  setAttribute(key: string, value: SpanAttributeValue): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
  end(endTime?: number): void;
}

type SpanStatus = 
  | { code: 'UNSET' }
  | { code: 'OK' }
  | { code: 'ERROR'; message: string };

type SpanAttributeValue = string | number | boolean | string[] | number[] | boolean[];

interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}
```

### Tracer Implementation

```typescript
import { trace, context, SpanKind } from '@opentelemetry/api';

class ForgeTracer {
  private tracer = trace.getTracer('forge', '1.0.0');
  
  // Start a new span
  startSpan(name: string, options?: SpanOptions): Span {
    return this.tracer.startSpan(name, {
      kind: options?.kind ?? SpanKind.INTERNAL,
      attributes: options?.attributes
    });
  }
  
  // Trace an async function
  async traceAsync<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.startSpan(name, options);
    
    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span)
      );
      span.setStatus({ code: 'OK' });
      return result;
    } catch (error) {
      span.setStatus({
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
  
  // Decorator for tracing methods
  trace(options?: SpanOptions) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const original = descriptor.value;
      const tracer = this;
      
      descriptor.value = async function(...args: any[]) {
        return tracer.traceAsync(
          `${target.constructor.name}.${propertyKey}`,
          async (span) => {
            span.setAttribute('args.count', args.length);
            return original.apply(this, args);
          },
          options
        );
      };
      
      return descriptor;
    };
  }
}
```

### Trace Propagation

```typescript
import { propagation, context } from '@opentelemetry/api';

// Extract trace context from incoming request
function extractTraceContext(headers: Record<string, string>): Context {
  return propagation.extract(context.active(), headers);
}

// Inject trace context into outgoing request
function injectTraceContext(headers: Record<string, string>): void {
  propagation.inject(context.active(), headers);
}

// HTTP middleware for trace propagation
function tracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const ctx = extractTraceContext(req.headers);
  
  context.with(ctx, () => {
    const span = tracer.startSpan(`${req.method} ${req.path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.user_agent': req.headers['user-agent']
      }
    });
    
    // Add trace ID to response headers
    res.setHeader('X-Trace-ID', span.spanContext().traceId);
    
    res.on('finish', () => {
      span.setAttribute('http.status_code', res.statusCode);
      span.setStatus(res.statusCode >= 400 ? { code: 'ERROR' } : { code: 'OK' });
      span.end();
    });
    
    next();
  });
}
```

---

## Alerting

### Alert Rules

```typescript
interface AlertRule {
  id: string;
  name: string;
  description: string;
  
  // Condition
  condition: AlertCondition;
  
  // Timing
  duration: string;        // e.g., '5m'
  evaluationInterval: string;
  
  // Severity
  severity: AlertSeverity;
  
  // Actions
  notifications: NotificationChannel[];
  runbook?: string;
  
  // Labels
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  labels?: Record<string, string>;
}

type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'PAGE';

// Example alert rules
const alertRules: AlertRule[] = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    description: 'Error rate exceeds 5% of requests',
    condition: {
      metric: 'rate(forge_requests_total{status="error"}[5m]) / rate(forge_requests_total[5m])',
      operator: 'gt',
      threshold: 0.05
    },
    duration: '5m',
    evaluationInterval: '30s',
    severity: 'CRITICAL',
    notifications: ['pagerduty', 'slack-alerts'],
    runbook: 'https://runbooks.forge.internal/high-error-rate',
    labels: { team: 'platform' },
    annotations: {
      summary: 'Error rate is {{ $value | humanizePercentage }}'
    }
  },
  {
    id: 'slow-convergence',
    name: 'Slow Convergence',
    description: 'Convergence taking longer than expected',
    condition: {
      metric: 'histogram_quantile(0.95, forge_convergence_duration_seconds)',
      operator: 'gt',
      threshold: 300
    },
    duration: '10m',
    evaluationInterval: '1m',
    severity: 'WARNING',
    notifications: ['slack-engineering'],
    labels: { team: 'ml' },
    annotations: {
      summary: 'P95 convergence duration is {{ $value }}s'
    }
  },
  {
    id: 'validation-degradation',
    name: 'Validation Quality Degradation',
    description: 'Average validation scores dropping',
    condition: {
      metric: 'avg(forge_validation_score)',
      operator: 'lt',
      threshold: 0.7
    },
    duration: '15m',
    evaluationInterval: '1m',
    severity: 'WARNING',
    notifications: ['slack-quality'],
    labels: { team: 'quality' },
    annotations: {
      summary: 'Average validation score is {{ $value }}'
    }
  },
  {
    id: 'quota-exhaustion',
    name: 'API Quota Near Exhaustion',
    description: 'Wolfram Alpha API quota nearly exhausted',
    condition: {
      metric: 'forge_wolfram_quota_remaining / forge_wolfram_quota_total',
      operator: 'lt',
      threshold: 0.1
    },
    duration: '1m',
    evaluationInterval: '1m',
    severity: 'WARNING',
    notifications: ['slack-engineering', 'email-ops'],
    labels: { team: 'platform' },
    annotations: {
      summary: 'Only {{ $value | humanizePercentage }} quota remaining'
    }
  }
];
```

### Notification Channels

```typescript
interface NotificationChannel {
  type: NotificationType;
  config: NotificationConfig;
}

type NotificationType = 'slack' | 'pagerduty' | 'email' | 'webhook' | 'opsgenie';

interface SlackNotificationConfig {
  webhookUrl: string;
  channel: string;
  username?: string;
  iconEmoji?: string;
  mentionUsers?: string[];
  mentionGroups?: string[];
}

interface PagerDutyConfig {
  routingKey: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  dedupKey?: string;
}

class AlertManager {
  constructor(private channels: Map<string, NotificationChannel>) {}
  
  async send(alert: Alert, channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Unknown notification channel: ${channelId}`);
    }
    
    switch (channel.type) {
      case 'slack':
        await this.sendSlack(alert, channel.config as SlackNotificationConfig);
        break;
      case 'pagerduty':
        await this.sendPagerDuty(alert, channel.config as PagerDutyConfig);
        break;
      // ... other channels
    }
  }
  
  private async sendSlack(alert: Alert, config: SlackNotificationConfig): Promise<void> {
    const color = this.getSeverityColor(alert.severity);
    
    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: config.channel,
        username: config.username || 'FORGE Alerts',
        attachments: [{
          color,
          title: alert.name,
          text: alert.description,
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Status', value: alert.status, short: true }
          ],
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });
  }
}
```

---

## Dashboards

### Dashboard Configuration

```typescript
interface Dashboard {
  id: string;
  title: string;
  description: string;
  
  // Layout
  rows: DashboardRow[];
  
  // Variables
  variables: DashboardVariable[];
  
  // Settings
  refresh: string;       // e.g., '30s', '1m'
  timeRange: TimeRange;
}

interface DashboardRow {
  title: string;
  height: string;
  panels: Panel[];
}

interface Panel {
  id: string;
  title: string;
  type: PanelType;
  
  // Data
  queries: PanelQuery[];
  
  // Visualization
  visualization: VisualizationConfig;
  
  // Layout
  gridPos: { x: number; y: number; w: number; h: number };
}

type PanelType = 'graph' | 'gauge' | 'stat' | 'table' | 'heatmap' | 'logs';
```

### Pre-built Dashboards

```yaml
# dashboards/forge-overview.yaml
dashboard:
  title: FORGE Platform Overview
  refresh: 30s
  
  variables:
    - name: tenant
      type: query
      query: label_values(forge_requests_total, tenant)
    - name: time_range
      type: interval
      options: ['5m', '15m', '1h', '6h', '24h']
  
  rows:
    - title: Request Overview
      panels:
        - title: Requests/sec
          type: graph
          query: rate(forge_requests_total[$time_range])
          
        - title: Error Rate
          type: gauge
          query: |
            rate(forge_requests_total{status="error"}[$time_range]) 
            / rate(forge_requests_total[$time_range])
          thresholds:
            - value: 0.01
              color: green
            - value: 0.05
              color: yellow
            - value: 0.1
              color: red
              
        - title: P95 Latency
          type: stat
          query: histogram_quantile(0.95, rate(forge_request_duration_seconds_bucket[$time_range]))
          unit: seconds
    
    - title: Generation
      panels:
        - title: Generations/min
          type: graph
          query: rate(forge_generations_total[1m]) * 60
          
        - title: Token Usage
          type: graph
          query: rate(forge_generation_tokens_total[$time_range])
          legend: '{{ model }} - {{ direction }}'
          
        - title: Cost
          type: stat
          query: sum(increase(forge_generation_cost_dollars[24h]))
          unit: dollars
    
    - title: Convergence
      panels:
        - title: Iterations Distribution
          type: heatmap
          query: sum by (le) (rate(forge_convergence_iterations_bucket[$time_range]))
          
        - title: Success Rate
          type: gauge
          query: |
            sum(forge_convergence_iterations_count{outcome="success"})
            / sum(forge_convergence_iterations_count)
          
        - title: Avg Improvement/Iteration
          type: stat
          query: avg(forge_convergence_score_improvement)
    
    - title: Validation
      panels:
        - title: Score Distribution
          type: heatmap
          query: sum by (le) (rate(forge_validation_score_bucket[$time_range]))
          
        - title: Validation by Type
          type: graph
          query: rate(forge_validations_total[$time_range])
          legend: '{{ validator }}'
    
    - title: System Health
      panels:
        - title: CPU Usage
          type: graph
          query: forge_cpu_usage_percent
          
        - title: Memory Usage
          type: graph
          query: forge_memory_usage_bytes
          
        - title: Connection Pools
          type: table
          query: forge_connection_pool_size
```

---

## Health Checks

### Health Endpoint

```typescript
interface HealthCheck {
  name: string;
  check(): Promise<HealthStatus>;
  timeout: number;
  critical: boolean;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, unknown>;
  latency?: number;
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: Record<string, HealthStatus>;
}

class HealthService {
  constructor(private checks: HealthCheck[]) {}
  
  async getHealth(): Promise<HealthReport> {
    const results: Record<string, HealthStatus> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    await Promise.all(
      this.checks.map(async (check) => {
        const start = Date.now();
        try {
          const result = await Promise.race([
            check.check(),
            this.timeout(check.timeout)
          ]);
          results[check.name] = {
            ...result,
            latency: Date.now() - start
          };
          
          if (result.status === 'unhealthy' && check.critical) {
            overallStatus = 'unhealthy';
          } else if (result.status !== 'healthy' && overallStatus !== 'unhealthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          results[check.name] = {
            status: check.critical ? 'unhealthy' : 'degraded',
            message: error instanceof Error ? error.message : 'Check failed',
            latency: Date.now() - start
          };
          if (check.critical) {
            overallStatus = 'unhealthy';
          }
        }
      })
    );
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || 'unknown',
      checks: results
    };
  }
}

// Health check implementations
const healthChecks: HealthCheck[] = [
  {
    name: 'database',
    timeout: 5000,
    critical: true,
    async check() {
      const result = await db.query('SELECT 1');
      return { status: 'healthy' };
    }
  },
  {
    name: 'redis',
    timeout: 2000,
    critical: true,
    async check() {
      await redis.ping();
      return { status: 'healthy' };
    }
  },
  {
    name: 'bedrock',
    timeout: 10000,
    critical: true,
    async check() {
      // Check Bedrock connectivity
      return { status: 'healthy' };
    }
  },
  {
    name: 'wolfram',
    timeout: 5000,
    critical: false,
    async check() {
      const quota = await wolframClient.getQuotaRemaining();
      if (quota < 100) {
        return {
          status: 'degraded',
          message: `Low quota: ${quota} remaining`,
          details: { quotaRemaining: quota }
        };
      }
      return { status: 'healthy', details: { quotaRemaining: quota } };
    }
  }
];
```

---

## Package Structure

```
observability/
├── src/
│   ├── logging/
│   │   ├── logger.ts              # Logger implementation
│   │   ├── audit-logger.ts        # Audit logging
│   │   ├── formatters.ts          # Log formatters
│   │   └── index.ts
│   │
│   ├── metrics/
│   │   ├── registry.ts            # Metrics registry
│   │   ├── collectors/
│   │   │   ├── request.ts         # Request metrics
│   │   │   ├── generation.ts      # Generation metrics
│   │   │   ├── validation.ts      # Validation metrics
│   │   │   ├── convergence.ts     # Convergence metrics
│   │   │   └── system.ts          # System metrics
│   │   └── index.ts
│   │
│   ├── tracing/
│   │   ├── tracer.ts              # Tracer implementation
│   │   ├── propagation.ts         # Context propagation
│   │   ├── middleware.ts          # HTTP middleware
│   │   └── index.ts
│   │
│   ├── alerting/
│   │   ├── alert-manager.ts       # Alert management
│   │   ├── rules.ts               # Alert rules
│   │   ├── channels/
│   │   │   ├── slack.ts
│   │   │   ├── pagerduty.ts
│   │   │   └── email.ts
│   │   └── index.ts
│   │
│   ├── health/
│   │   ├── health-service.ts      # Health check service
│   │   ├── checks/                # Individual checks
│   │   └── index.ts
│   │
│   └── index.ts
│
├── dashboards/
│   ├── forge-overview.json
│   ├── generation-deep-dive.json
│   └── convergence-analysis.json
│
├── alerts/
│   └── forge-alerts.yaml
│
├── package.json
└── tsconfig.json
```

---

## Configuration

```yaml
# observability-config.yaml
observability:
  # Logging
  logging:
    level: INFO
    format: json
    auditEnabled: true
    auditRetention: 2555d  # 7 years for compliance
  
  # Metrics
  metrics:
    enabled: true
    endpoint: /metrics
    defaultLabels:
      environment: production
      region: us-west-2
  
  # Tracing
  tracing:
    enabled: true
    sampleRate: 0.1
    endpoint: http://jaeger-collector:14268/api/traces
    propagators:
      - w3c
      - b3
  
  # Alerting
  alerting:
    enabled: true
    evaluationInterval: 30s
    channels:
      - name: slack-alerts
        type: slack
        webhookUrl: ${SLACK_WEBHOOK_URL}
      - name: pagerduty
        type: pagerduty
        routingKey: ${PAGERDUTY_KEY}
  
  # Health checks
  health:
    endpoint: /health
    interval: 30s
    timeout: 10s
```

---

## Related Documents

- [00_MASTER_ROADMAP.md](./00_MASTER_ROADMAP.md) - Platform overview
- [10_ORCHESTRATION.md](./10_ORCHESTRATION.md) - Orchestration layer
- [06_EVIDENCE_PACK.md](./06_EVIDENCE_PACK.md) - Audit artifacts
- [09_DATA_PROTECTION.md](./09_DATA_PROTECTION.md) - Security monitoring
