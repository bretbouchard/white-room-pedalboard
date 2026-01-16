# White Room Production Monitoring Setup Guide

## Overview

This guide covers the complete setup and operation of White Room's production monitoring infrastructure, including metrics collection, alerting, dashboards, and incident response.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     White Room Monitoring                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ Prometheus   │──────│ Grafana      │                    │
│  │ :9090        │      │ :3000        │                    │
│  └──────────────┘      └──────────────┘                    │
│         │                                                    │
│         ├─────────────┬─────────────┬─────────────┐        │
│         │             │             │             │        │
│  ┌──────▼──────┐ ┌───▼────┐ ┌─────▼─────┐ ┌───▼────┐   │
│  │ JUCE        │ │ Swift  │ │ Node      │ │ cAdvisor│   │
│  │ Backend     │ │ Front  │ │ Exporter  │ │         │   │
│  │ :8000       │ │ :8001  │ │ :9100     │ │ :8080   │   │
│  └─────────────┘ └────────┘ └───────────┘ └────────┘   │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ Alertmanager │──────│ PagerDuty    │                    │
│  │ :9093        │      │              │                    │
│  └──────────────┘      └──────────────┘                    │
│         │                                                    │
│         └─────────────┬─────────────┐                      │
│                       │             │                      │
│                ┌──────▼────┐  ┌────▼─────┐                │
│                │ Slack     │  │ Email    │                │
│                └───────────┘  └──────────┘                │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ Loki         │──────│ Grafana      │                    │
│  │ :3100        │      │ Logs         │                    │
│  └──────────────┘      └──────────────┘                    │
│         △                                                    │
│         │                                                    │
│  ┌──────┴──────┐                                            │
│  │ Promtail    │                                            │
│  │ :9080       │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Prometheus (Metrics Collection)
- **Port**: 9090
- **Purpose**: Scrapes and stores metrics
- **Retention**: 15 days, 10GB max
- **Scrape Interval**: 15 seconds (default), 10s for audio metrics

### 2. Grafana (Visualization)
- **Port**: 3000
- **Credentials**: admin/admin (change on first login)
- **Dashboards**: 4 pre-configured dashboards
- **Auto-Provisioning**: Enabled

### 3. Alertmanager (Alert Routing)
- **Port**: 9093
- **Integrations**: PagerDuty, Slack, Email
- **Grouping**: By alertname, cluster, service

### 4. Loki (Log Aggregation)
- **Port**: 3100
- **Retention**: 7 days
- **Index**: Boltdb-shipper
- **Storage**: Filesystem

### 5. Exporters
- **Node Exporter**: 9100 - System metrics
- **cAdvisor**: 8080 - Container metrics
- **PostgreSQL Exporter**: 9187 - Database metrics
- **Redis Exporter**: 9121 - Cache metrics
- **Nginx Exporter**: 9113 - Web server metrics

## Quick Start

### 1. Start Monitoring Stack

```bash
cd /Users/bretbouchard/apps/schill/white_room/infrastructure/monitoring

# Set environment variables
export GRAFANA_ADMIN_PASSWORD=your_secure_password
export PAGERDUTY_SERVICE_KEY_CRITICAL=your_key
export PAGERDUTY_SERVICE_KEY_HIGH=your_key
export SMTP_PASSWORD=your_smtp_password

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3000
  - System Health: http://localhost:3000/d/system-health
  - Application Performance: http://localhost:3000/d/application-performance
  - Business Metrics: http://localhost:3000/d/business-metrics
  - Alerts: http://localhost:3000/d/alerts

- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### 3. Verify Metrics Collection

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq

# Query metrics
curl http://localhost:9090/api/v1/query?query=up

# Check recording rules
curl http://localhost:9090/api/v1/rules | jq
```

## Configuration

### Prometheus Configuration

**File**: `prometheus/prometheus.yml`

Key settings:
- Global scrape interval: 15s
- Global evaluation interval: 15s
- Data retention: 15 days
- Max storage size: 10GB

### Alert Rules

**File**: `prometheus/alert_rules.yml`

Severity levels:
- **Critical (P0)**: Service down, high CPU/memory, security breach
- **High (P1)**: High error rate, high latency, audio overload
- **Warning (P2)**: Low active users, slow queries
- **Info (P3)**: New user signups, deployments

### Alertmanager Configuration

**File**: `alertmanager/alertmanager.yml`

Key integrations:
- **PagerDuty**: Critical and high priority alerts
- **Slack**: #alerts, #ops, #notifications
- **Email**: Service-specific teams

### Grafana Dashboards

**Directory**: `grafana/dashboards/`

Available dashboards:
1. `system-dashboard.json` - Server health, resource usage
2. `application-dashboard.json` - Error rates, latency, performance
3. `business-dashboard.json` - DAU, MAU, feature usage
4. `alerts-dashboard.json` - Active incidents, response times

## Metrics Reference

### System Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `up` | gauge | job, instance | Service availability (1=up, 0=down) |
| `node_cpu_seconds_total` | counter | mode, instance | CPU time by mode (idle, user, system) |
| `node_memory_MemAvailable_bytes` | gauge | instance | Available memory in bytes |
| `node_filesystem_avail_bytes` | gauge | mountpoint, instance | Available disk space |
| `node_load1` | gauge | instance | 1-minute load average |

### Application Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | counter | service, status | Total HTTP requests |
| `http_request_duration_seconds` | histogram | service, le | Request latency |
| `http_active_connections` | gauge | service | Active HTTP connections |
| `audio_engine_render_time_seconds` | gauge | instance | Audio render time in seconds |
| `audio_engine_xruns_total` | counter | instance | Audio buffer underruns |
| `ffi_call_duration_seconds` | histogram | function, le | FFI call latency |
| `ffi_calls_total` | counter | function | Total FFI calls |

### Business Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `active_users_total` | gauge | environment | Currently active users |
| `user_signups_total` | counter | environment | Total user signups |
| `songs_created_total` | counter | environment | Total songs created |
| `performances_switched_total` | counter | environment | Total performance switches |
| `session_duration_seconds` | histogram | environment | Session duration |
| `feature_usage_total` | counter | feature | Feature usage count |

## Alerting Guide

### Alert Severity Levels

**P0 - Critical** (Response time: <5 minutes)
- Service down
- High CPU (>90% for 5min)
- High memory (>90% for 5min)
- Low disk space (<10%)
- Security breach

**P1 - High** (Response time: <30 minutes)
- High error rate (>5% for 5min)
- High latency (P95 >1s for 5min)
- Audio overload (render time >25ms)
- FFI latency high (P99 >100ms)
- Database connection pool exhausted

**P2 - Medium** (Response time: <2 hours)
- Low active users (<10 for 15min)
- Song creation rate dropped
- Slow database queries
- Database cache hit ratio low

**P3 - Low** (Response time: <1 day)
- New user signups
- Deployment completed
- Milestones reached

### On-Call Procedures

**When Alert Fires:**
1. Acknowledge alert in PagerDuty
2. Check Grafana dashboard for context
3. Follow relevant runbook
4. Update incident status
5. Resolve or escalate

**After Resolving:**
1. Write post-mortem if critical
2. Update runbook if needed
3. Track metrics for recurrence
4. Share learnings with team

## Runbooks

**Location**: `runbooks/`

Available runbooks:
- `SERVICE_DOWN.md` - Service recovery procedures
- `HIGH_CPU.md` - CPU troubleshooting
- `HIGH_MEMORY.md` - Memory management
- `AUDIO_OVERLOAD.md` - Audio performance issues
- `FFI_LATENCY.md` - FFI performance problems
- `DATABASE_CONNECTIONS.md` - Database connectivity
- `HIGH_ERROR_RATE.md` - Error rate investigation

## Maintenance

### Daily Tasks
- Check Grafana dashboards for anomalies
- Review alert history in Alertmanager
- Monitor disk space on Prometheus

### Weekly Tasks
- Review alert effectiveness
- Update dashboards based on feedback
- Check log retention in Loki
- Test on-call rotation

### Monthly Tasks
- Review and update alert rules
- Archive old Prometheus data
- Update runbooks based on incidents
- Performance tuning

### Backup Strategy
**Prometheus Data**: Not backed up (time-series data, 15-day retention)
**Grafana Dashboards**: Version controlled in Git
**Alertmanager Config**: Version controlled in Git
**Runbooks**: Version controlled in Git

## Troubleshooting

### Prometheus Not Starting

```bash
# Check logs
docker-compose logs prometheus

# Validate config
docker-compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# Check disk space
df -h /var/lib/docker
```

### Grafana Not Loading Dashboards

```bash
# Check provisioning
docker-compose exec grafana ls -la /etc/grafana/provisioning/

# Check dashboard files
docker-compose exec grafana ls -la /var/lib/grafana/dashboards/

# View logs
docker-compose logs grafana
```

### Alerts Not Firing

```bash
# Check Alertmanager config
docker-compose exec alertmanager amtool config check

# Test alert rule
curl http://localhost:9090/api/v1/rules | jq

# Check Alertmanager targets
curl http://localhost:9093/api/v1/status | jq
```

### Loki Not Receiving Logs

```bash
# Check Promtail config
docker-compose logs promtail

# Test log scraping
docker-compose exec promtail promtail --config.file=/etc/promtail/config.yml --dry-run

# Check Loki
curl http://localhost:3100/ready
```

## Security

### Access Control

**Grafana**: Update default password
```bash
docker-compose exec grafana grafana-cli admin reset-admin-password newpassword
```

**Prometheus**: No authentication (use network security)
**Alertmanager**: No authentication (use network security)

### Network Security

```yaml
# Docker network isolation
networks:
  monitoring:
    driver: bridge
    internal: false
    ipam:
      config:
        - subnet: 172.20.0.0/24
```

### Secrets Management

Use environment variables for sensitive data:
```bash
export GRAFANA_ADMIN_PASSWORD=secure_password
export PAGERDUTY_SERVICE_KEY=your_key
export SMTP_PASSWORD=your_smtp_password
```

## Scaling

### Vertical Scaling

**Prometheus**:
- Increase memory: `--storage.tsdb.retention.size=20GB`
- Increase retention: `--storage.tsdb.retention.time=30d`

**Grafana**:
- Increase resources in docker-compose.yml
- Add more renderers for dashboard PDF export

### Horizontal Scaling

**Prometheus**:
- Use federation for multi-cluster
- Deploy Thanos for long-term storage
- Use Cortex for high availability

**Loki**:
- Add ingestors for log distribution
- Use distributed storage (S3, GCS)
- Deploy read replicas for query load

## Best Practices

1. **Start with Critical Metrics**: Don't monitor everything
2. **Make Dashboards Actionable**: Focus on insights, not pretty graphs
3. **Test Alerting**: Verify alerts fire and notify correctly
4. **Document Runbooks**: Don't guess during incidents
5. **Review Regularly**: Update metrics and alerts based on needs
6. **Train On-Call**: Ensure team knows procedures
7. **Learn from Incidents**: Improve based on post-mortems

## Support

**Documentation**: `/Users/bretbouchard/apps/schill/white_room/infrastructure/monitoring/docs/`
**Runbooks**: `/Users/bretbouchard/apps/schill/white_room/infrastructure/monitoring/runbooks/`
**Slack**: #monitoring
**Email**: monitoring-team@white-room.ai

## Related Documentation

- [Performance Profiling Guide](../performance/PROFILING_INSTRUMENTATION_GUIDE.md)
- [Incident Response Guide](./INCIDENT_RESPONSE_GUIDE.md)
- [Alert Tuning Guide](./ALERT_TUNING_GUIDE.md)
- [Grafana Dashboard Guide](./GRAFANA_DASHBOARDS_GUIDE.md)

---

**Last Updated**: 2026-01-15
**Version**: 1.0.0
**Maintained By**: DevOps Team
