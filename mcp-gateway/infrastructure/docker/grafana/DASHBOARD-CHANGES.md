# FORGE Grafana Dashboard Changes

## What Changed

### Panels Removed
- **Agents Created (Total)** - Always showed 0, agent metrics not yet implemented
- **Agents Running** - Always showed 0, agent metrics not yet implemented
- **Agent Tasks by Type** - Always showed "No data", agent metrics not yet implemented
- **Agent Duration (p50, p95)** - Always showed "No data", agent metrics not yet implemented

### Panels Added
- **CARS Pending Approvals** - Shows queue backlog for human approval workflow
- **Tool Executions (24h)** - Shows total tool usage for capacity planning

### Time Windows Changed
| Panel | Before | After |
|-------|--------|-------|
| Security Alerts | 1h | 24h |
| CARS Assessments | 1h | 24h |
| Auth Attempts | 1h | 24h |
| CARS Risk Trend | 5m | 24h |
| Security Alerts Trend | 5m | 24h |
| Default time range | 1h | 24h |

### Thresholds Added
- **Response Time (p50, p95, p99)**: Yellow line at 50ms (P95 SLO)
- **Security Alerts Trend**: Red line at 5 alerts/hour (SLO threshold)

### Descriptions Added
Every panel now has a description with:
- Normal operating range
- Threshold that triggers investigation
- Specific log command to run for debugging

---

## Why These Changes

**Before**: Stakeholder dashboard showing vanity metrics and unused panels.

**After**: Engineer monitoring dashboard for incident response and debugging.

Key principles:
1. **Remove noise** - Panels showing 0/empty waste screen space and attention
2. **24h trends** - 1h windows miss patterns; 24h shows daily cycles and anomalies
3. **Actionable thresholds** - Visual indicators when values need attention
4. **Runbook in descriptions** - Engineers can copy-paste commands to investigate

---

## Panel Reference

### Row 1: Traffic Overview
| Panel | What it shows | Alert threshold |
|-------|--------------|-----------------|
| Request Rate | HTTP requests per second by method/path | Investigate if sustained >500 req/s |
| Response Time | p50, p95, p99 latency with 50ms SLO line | P95 crossing yellow line = SLO breach |

### Row 2: Quick Stats (24h)
| Panel | What it shows | Alert threshold |
|-------|--------------|-----------------|
| Error Rate | 5xx responses / total requests | >1% yellow, >5% red |
| Active Sessions | Current session count | >100 check for leaks |
| Security Alerts | Total alerts in 24h | >50 orange, >100 red |
| CARS Assessments | Total assessments in 24h | Watch for L4/L5 spikes |
| Auth Attempts | Total auth attempts in 24h | >50 yellow, >100 red |
| Total Requests/sec | Aggregate throughput | >100 check scaling |

### Row 3: Trend Charts
| Panel | What it shows | Alert threshold |
|-------|--------------|-----------------|
| CARS Risk (24h Trend) | Assessments by risk level over time | L4_HIGH/L5_CRITICAL spikes |
| Security Alerts (24h Trend) | Alerts by severity over time | Red line at 5/hour |

### Row 4: Operations
| Panel | What it shows | Alert threshold |
|-------|--------------|-----------------|
| Service Health | UP/DOWN status for FORGE API and Prometheus | Any DOWN = immediate |
| CARS Pending Approvals | Queue of approvals waiting for humans | >10 yellow, >20 red |
| Tool Executions (24h) | Total tool calls | High failure rate |

---

## Debugging Commands

Copy-paste these from panel descriptions:

```bash
# General errors
docker logs forge-api 2>&1 | grep -E 'error|5[0-9]{2}'

# Slow requests
docker logs forge-api 2>&1 | grep -i slow

# Security alerts
docker logs forge-api 2>&1 | grep -i 'security\|alert'

# CARS issues
docker logs forge-api 2>&1 | grep -i 'cars\|risk'
docker logs forge-api 2>&1 | grep -E 'L4_HIGH|L5_CRITICAL'

# Auth failures
docker logs forge-api 2>&1 | grep -i 'auth\|401\|403'

# Service health
docker ps && docker logs forge-api --tail 50

# Session leaks
docker logs forge-api 2>&1 | grep session

# Approval backlog
docker logs forge-api 2>&1 | grep -i approval

# Tool errors
docker logs forge-api 2>&1 | grep -i 'tool.*error'
```

---

## Prometheus Queries Reference

```promql
# Request rate by endpoint
rate(forge_http_requests_total[1m])

# P95 latency in ms
histogram_quantile(0.95, rate(forge_http_request_duration_seconds_bucket[5m])) * 1000

# Error rate percentage
sum(rate(forge_http_requests_total{status=~"5.."}[5m])) / sum(rate(forge_http_requests_total[5m])) * 100

# Security alerts by severity (24h)
sum by (severity) (increase(forge_security_alerts_total[24h]))

# CARS assessments by risk level (24h)
sum by (risk_level) (increase(forge_cars_assessments_total[24h]))

# Auth attempts (24h)
sum(increase(forge_auth_attempts_total[24h]))
```
