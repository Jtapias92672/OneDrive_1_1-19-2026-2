# 11_OBSERVABILITY

> **Version:** 1.1.0 | **Status:** Active | **Last Updated:** 2026-01-18

---

## 1. Component Summary

**What it is:** Metrics collection, dashboards, and alerting infrastructure for monitoring FORGE performance, quality, and reliability. Provides visibility into convergence rates, latency, costs, and failure modes.

**Why it exists:** Production systems require observability. FORGE generates artifacts at scale; operators need to know pass rates, identify failure patterns, track costs, and detect regressions quickly.

**Boundaries:**
- IN SCOPE: Metric collection, aggregation, dashboards, alerting, failure analysis, cost tracking
- OUT OF SCOPE: Metric generation (components produce metrics), storage infrastructure (pluggable)

**Non-Goals:**
- Does not define what metrics to collect (components define their own)
- Does not replace logging (observability complements logs)
- Does not provide root cause analysis (provides data for analysis)

---

## 2. Success Criteria

| ID | Criterion | Testable By |
|----|-----------|-------------|
| OB-01 | System MUST collect all metrics defined in components 01-10 | Metric presence check |
| OB-02 | System MUST support real-time metric streaming (< 5s delay) | Latency test |
| OB-03 | System MUST provide pre-built dashboards for key metrics | Dashboard check |
| OB-04 | System MUST support configurable alerting thresholds | Alert config test |
| OB-05 | System MUST track per-contract performance metrics | Contract breakdown test |
| OB-06 | System MUST provide failure mode analysis (top failures) | Analysis test |
| OB-07 | System MUST track cost metrics (tokens, LLM spend) | Cost tracking test |
| OB-08 | System MUST support metric export (Prometheus, DataDog, etc.) | Export test |
| OB-09 | System MUST retain metrics for ≥30 days | Retention test |
| OB-10 | Dashboard queries MUST complete in <2s | Performance test |
| OB-11 | System MUST track reflection effectiveness metrics | Reflection metrics test |

---

## 3. Acceptance Tests / Completion Checks

### OB-01: All component metrics collected

| Aspect | Detail |
|--------|--------|
| **How to verify** | Query metric store for all metrics defined in 01-10 |
| **Automated** | Yes - metric presence scan |
| **Evidence** | All defined metrics present in store |
| **Pass/Fail** | PASS if all present; FAIL if any missing |

### OB-02: Real-time streaming <5s delay

| Aspect | Detail |
|--------|--------|
| **How to verify** | Emit metric, measure time to appear in dashboard |
| **Automated** | Yes - latency measurement |
| **Evidence** | P95 delay < 5 seconds |
| **Pass/Fail** | PASS if P95 < 5s; FAIL otherwise |

### OB-03: Pre-built dashboards available

| Aspect | Detail |
|--------|--------|
| **How to verify** | Verify dashboards exist for: Overview, Convergence, Quality, Cost |
| **Automated** | Yes - dashboard enumeration |
| **Evidence** | All 4 core dashboards present |
| **Pass/Fail** | PASS if all present; FAIL if any missing |

### OB-04: Configurable alerting

| Aspect | Detail |
|--------|--------|
| **How to verify** | Configure alert threshold, trigger condition, verify alert fires |
| **Automated** | Yes - alert trigger test |
| **Evidence** | Alert received when threshold breached |
| **Pass/Fail** | PASS if alert fires; FAIL if silent |

### OB-05: Per-contract metrics

| Aspect | Detail |
|--------|--------|
| **How to verify** | Query metrics filtered by contract_id, verify data present |
| **Automated** | Yes - filtered query test |
| **Evidence** | Metrics broken down by contract |
| **Pass/Fail** | PASS if per-contract data available; FAIL if aggregated only |

### OB-06: Failure mode analysis

| Aspect | Detail |
|--------|--------|
| **How to verify** | Query top 5 failure modes, verify ranked list with counts |
| **Automated** | Yes - analysis query test |
| **Evidence** | Ranked failure list with frequency |
| **Pass/Fail** | PASS if analysis available; FAIL if no breakdown |

### OB-07: Cost tracking

| Aspect | Detail |
|--------|--------|
| **How to verify** | Query token usage and LLM cost metrics |
| **Automated** | Yes - cost metric query |
| **Evidence** | Token counts and cost estimates present |
| **Pass/Fail** | PASS if costs tracked; FAIL if missing |

### OB-08: Metric export support

| Aspect | Detail |
|--------|--------|
| **How to verify** | Configure Prometheus endpoint, verify metrics exportable |
| **Automated** | Yes - export test |
| **Evidence** | Metrics available at /metrics endpoint |
| **Pass/Fail** | PASS if exportable; FAIL if proprietary only |

### OB-09: 30-day retention

| Aspect | Detail |
|--------|--------|
| **How to verify** | Query metrics from 30 days ago, verify data present |
| **Automated** | Yes - historical query test |
| **Evidence** | 30-day-old metrics returned |
| **Pass/Fail** | PASS if retained; FAIL if expired |

### OB-10: Dashboard query <2s

| Aspect | Detail |
|--------|--------|
| **How to verify** | Load each dashboard, measure query times |
| **Automated** | Yes - performance test |
| **Evidence** | All queries complete in <2s |
| **Pass/Fail** | PASS if all <2s; FAIL if any slower |

### OB-11: Reflection effectiveness metrics

| Aspect | Detail |
|--------|--------|
| **How to verify** | Query for `reflection_improvement_rate` and `thrashing_rate` metrics |
| **Automated** | Yes - metric presence and calculation check |
| **Evidence** | Both metrics present with values matching formula |
| **Pass/Fail** | PASS if both metrics available and calculated correctly; FAIL if missing |

---

## 4. Telemetry & Metrics

*This component defines the metrics framework itself. Key meta-metrics:*

| Metric | Type | Target | Collection Method |
|--------|------|--------|-------------------|
| `observability.metric_lag_ms` | Gauge | < 5000ms | Measure emit → query latency |
| `observability.query_time_ms` | Histogram | P95 < 2000ms | Timer around queries |
| `observability.storage_size_gb` | Gauge | Track | Storage used for metrics |
| `observability.alert_count` | Counter | Track | Alerts fired |

---

## 5. Security / Compliance Notes

| Control | Implementation |
|---------|----------------|
| **Access control** | Dashboards require authentication |
| **No PII in metrics** | Metrics contain aggregates, never raw data |
| **Audit logging** | Dashboard access logged |
| **Encryption in transit** | HTTPS for all metric endpoints |
| **SOC 2** | Metric retention supports audit requirements |

---

## 6. Dependencies & Interfaces

### Depends On

| Component | Dependency Type | Interface |
|-----------|-----------------|-----------|
| All components (01-10) | Data source | Metric emission |
| Time-series DB | Infrastructure | Metric storage (InfluxDB, Prometheus, etc.) |
| Visualization | Infrastructure | Dashboard rendering (Grafana, etc.) |

### Produces

| Output | Consumer | Format |
|--------|----------|--------|
| Dashboards | Operators | Visual dashboards |
| Alerts | On-call | PagerDuty/Slack notifications |
| Reports | Management | Periodic summaries |

### Metric Schema

```yaml
# Standard metric format
metric_name: string (required, dot-notation: "forge.convergence.success_rate")
metric_type: enum (counter | gauge | histogram)
value: number
timestamp: ISO8601
labels:
  contract_id: string (optional)
  environment: string (required: prod/staging/dev)
  component: string (required: which component)
  agent: string (optional: which agent)
```

---

## 7. Implementation Notes

### Build Order

1. Define metric schema and naming conventions
2. Implement metric collector (aggregates from components)
3. Set up time-series storage (recommend Prometheus)
4. Build core dashboards in Grafana
5. Implement alerting rules
6. Add cost tracking
7. Add failure mode analysis queries
8. Add metric export endpoints

### Recommended Modules

```
src/forge/observability/
├── __init__.py
├── collector.py         # Metric collection and aggregation
├── exporter.py          # Prometheus/DataDog export
├── alerts.py            # Alert rule definitions
├── dashboards/
│   ├── __init__.py
│   ├── overview.json    # Overview dashboard config
│   ├── convergence.json # Convergence metrics
│   ├── quality.json     # Quality metrics
│   └── cost.json        # Cost tracking
└── analysis/
    ├── __init__.py
    └── failures.py      # Failure mode analysis
```

### Core Dashboards

#### 1. Overview Dashboard

| Panel | Metric | Visualization |
|-------|--------|---------------|
| Success Rate (24h) | `forge.convergence.success_rate` | Single stat |
| Active Tasks | `forge.convergence.active_tasks` | Single stat |
| P50 Latency | `forge.convergence.total_time_ms` | Single stat |
| Success Rate Trend | `forge.convergence.success_rate` | Time series |
| Throughput | `forge.convergence.completions` | Time series |

#### 2. Convergence Dashboard

| Panel | Metric | Visualization |
|-------|--------|---------------|
| First-Pass Rate by Contract | `forge.convergence.first_pass_rate` | Bar chart |
| Iterations Distribution | `forge.convergence.iterations_used` | Histogram |
| Stagnation Rate | `forge.convergence.stagnation_rate` | Time series |
| Budget Utilization | `forge.convergence.tokens_used` | Gauge |
| Reflection Improvement Rate | `forge.convergence.reflection_improvement_rate` | Gauge |
| Thrashing Rate | `forge.convergence.thrashing_rate` | Time series |

#### 3. Quality Dashboard

| Panel | Metric | Visualization |
|-------|--------|---------------|
| Structural Pass Rate | `forge.structural.pass_rate` | Time series |
| Semantic Pass Rate | `forge.semantic.pass_rate` | Time series |
| Qualitative Scores | `forge.qualitative.score_distribution` | Histogram |
| Top Failure Modes | `forge.failures.by_type` | Table |

#### 4. Cost Dashboard

| Panel | Metric | Visualization |
|-------|--------|---------------|
| Daily Token Usage | `forge.cost.tokens_total` | Time series |
| Cost by Contract | `forge.cost.llm_spend` | Pie chart |
| Cost per Successful Output | `forge.cost.per_success` | Single stat |
| Token Efficiency | `forge.cost.tokens_per_iteration` | Time series |

### Alert Rules

```yaml
alerts:
  - name: "low_success_rate"
    condition: "forge.convergence.success_rate < 0.90"
    duration: "5m"
    severity: "warning"
    channels: ["slack-forge-alerts"]
    
  - name: "high_stagnation"
    condition: "forge.convergence.stagnation_rate > 0.10"
    duration: "15m"
    severity: "critical"
    channels: ["pagerduty"]
    
  - name: "high_thrashing"
    condition: "forge.convergence.thrashing_rate > 0.30"
    duration: "15m"
    severity: "warning"
    channels: ["slack-forge-alerts"]
    message: "High thrashing rate - repair prompts may need improvement"
    
  - name: "latency_spike"
    condition: "forge.convergence.total_time_ms:p95 > 180000"
    duration: "5m"
    severity: "warning"
    channels: ["slack-forge-alerts"]
    
  - name: "cost_anomaly"
    condition: "forge.cost.llm_spend:hourly > 2 * forge.cost.llm_spend:hourly:avg_7d"
    duration: "1h"
    severity: "warning"
    channels: ["slack-forge-alerts"]
```

### Pitfalls to Avoid

- **Don't emit high-cardinality labels** - Contract IDs are fine; user IDs are not
- **Don't skip metric naming conventions** - Inconsistent names cause dashboard chaos
- **Don't alert on transient spikes** - Use duration windows
- **Don't forget retention costs** - High-res metrics are expensive to store
- **Don't expose PII in metrics** - Aggregate only

---

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-01-18 | Added OB-11 (reflection metrics), thrashing alert, Convergence Dashboard panels |
| 1.0.0 | 2026-01-17 | Initial specification |

---

*Reference: 00_MASTER_ROADMAP.md for framework context*
