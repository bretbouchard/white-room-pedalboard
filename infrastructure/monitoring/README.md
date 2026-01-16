# White Room Production Monitoring Infrastructure

## Overview

Comprehensive production monitoring system for White Room audio plugin platform, including metrics collection, visualization, alerting, log aggregation, and incident response.

## Quick Start

```bash
# Run the setup script
./infrastructure/monitoring/start.sh

# Access dashboards
open http://localhost:3000
```

## Components

### 1. Metrics Collection (Prometheus)
- **Port**: 9090
- **Purpose**: Collects and stores time-series metrics
- **Retention**: 15 days, 10GB max
- **Scrape Interval**: 15s default, 10s for audio metrics

### 2. Visualization (Grafana)
- **Port**: 3000
- **Credentials**: admin/admin (change on first login)
- **Dashboards**: 4 pre-configured dashboards
- **Auto-Provisioning**: Enabled

### 3. Alert Routing (Alertmanager)
- **Port**: 9093
- **Integrations**: PagerDuty, Slack, Email
- **Severity Levels**: P0 (critical), P1 (high), P2 (medium), P3 (low)

### 4. Log Aggregation (Loki + Promtail)
- **Port**: 3100 (Loki), 9080 (Promtail)
- **Retention**: 7 days
- **Storage**: Filesystem
- **Parsing**: JSON and regex patterns

### 5. Exporters
- **Node Exporter** (9100): System metrics
- **cAdvisor** (8080): Container metrics
- **PostgreSQL Exporter** (9187): Database metrics
- **Redis Exporter** (9121): Cache metrics
- **Nginx Exporter** (9113): Web server metrics

## Dashboards

### 1. System Health Dashboard
- CPU, memory, disk usage
- Network traffic
- Container counts
- System load averages

### 2. Application Performance Dashboard
- Request rate and error rate
- P95/P99 latency
- Audio engine render time
- FFI call latency and error rate

### 3. Business Metrics Dashboard
- Daily/Monthly active users (DAU/MAU)
- Songs created and performances switched
- Session duration
- Feature usage statistics

### 4. Alerts Dashboard
- Active incidents
- Alert firing rates
- Response times
- Escalation status

## Alerting

### Severity Levels

**P0 - Critical** (<5 minute response)
- Service down
- High CPU/memory (>90% for 5min)
- Low disk space (<10%)
- Security breach

**P1 - High** (<30 minute response)
- High error rate (>5% for 5min)
- High latency (P95 >1s for 5min)
- Audio overload (render time >25ms)
- FFI latency high (P99 >100ms)

**P2 - Medium** (<2 hour response)
- Low active users
- Song creation rate dropped
- Slow database queries

**P3 - Low** (<1 day response)
- New user signups
- Deployment completed
- Milestones reached

### Integrations

**PagerDuty**: Critical and high priority alerts
**Slack**: #alerts, #ops, #notifications
**Email**: Service-specific teams

## Metrics

### System Metrics
- `up` - Service availability
- `node_cpu_seconds_total` - CPU usage
- `node_memory_MemAvailable_bytes` - Memory available
- `node_filesystem_avail_bytes` - Disk space
- `node_load1` - Load average

### Application Metrics
- `http_requests_total` - HTTP request count
- `http_request_duration_seconds` - Request latency
- `audio_engine_render_time_seconds` - Audio render time
- `audio_engine_xruns_total` - Buffer underruns
- `ffi_call_duration_seconds` - FFI latency

### Business Metrics
- `active_users_total` - Active users
- `user_signups_total` - User signups
- `songs_created_total` - Songs created
- `performances_switched_total` - Performances switched
- `session_duration_seconds` - Session duration

## Runbooks

Comprehensive runbooks for common incidents:
- `SERVICE_DOWN.md` - Service recovery procedures
- `HIGH_CPU.md` - CPU troubleshooting
- `HIGH_MEMORY.md` - Memory management
- `AUDIO_OVERLOAD.md` - Audio performance issues
- `FFI_LATENCY.md` - FFI performance problems

## Documentation

- **Setup Guide**: `docs/MONITORING_SETUP_GUIDE.md`
- **Incident Response**: `docs/INCIDENT_RESPONSE_GUIDE.md`
- **Runbooks**: `runbooks/`

## Commands

```bash
# Start monitoring stack
./infrastructure/monitoring/start.sh

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service]

# Restart service
docker-compose restart [service]

# Check status
docker-compose ps

# Update configuration
docker-compose up -d --force-recreate
```

## Configuration

### Environment Variables

Create `.env` file in monitoring directory:

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=secure_password

# PagerDuty
PAGERDUTY_SERVICE_KEY_CRITICAL=your_key
PAGERDUTY_SERVICE_KEY_HIGH=your_key

# SMTP
SMTP_PASSWORD=your_smtp_password

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Alert Rules

Edit `prometheus/alert_rules.yml` to customize alert thresholds.

### Dashboard Customization

Add/modify dashboards in `grafana/dashboards/` directory.

## Maintenance

### Daily
- Check Grafana dashboards for anomalies
- Review alert history
- Monitor disk space

### Weekly
- Review alert effectiveness
- Update dashboards
- Test on-call rotation

### Monthly
- Review and update alert rules
- Archive old Prometheus data
- Update runbooks

## Security

### Access Control

**Grafana**: Update default password
```bash
docker-compose exec grafana grafana-cli admin reset-admin-password newpassword
```

**Network Security**: Use internal networks and firewalls

### Secrets Management

Use environment variables for sensitive data. Never commit secrets to Git.

## Troubleshooting

### Prometheus Not Starting
```bash
docker-compose logs prometheus
docker-compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
```

### Grafana Not Loading Dashboards
```bash
docker-compose logs grafana
docker-compose exec grafana ls -la /etc/grafana/provisioning/
```

### Alerts Not Firing
```bash
curl http://localhost:9090/api/v1/rules
curl http://localhost:9093/api/v1/status
```

## Scaling

### Vertical Scaling
- Increase Prometheus memory/retention
- Add Grafana resources
- Increase Loki retention

### Horizontal Scaling
- Use Prometheus federation
- Deploy Thanos for long-term storage
- Use Cortex for high availability
- Add Loki ingestors

## Best Practices

1. **Start with critical metrics**: Don't monitor everything
2. **Make dashboards actionable**: Focus on insights, not pretty graphs
3. **Test alerting**: Verify alerts fire and notify correctly
4. **Document runbooks**: Don't guess during incidents
5. **Review regularly**: Update metrics and alerts based on needs
6. **Train on-call**: Ensure team knows procedures
7. **Learn from incidents**: Improve based on post-mortems

## Support

**Documentation**: `infrastructure/monitoring/docs/`
**Runbooks**: `infrastructure/monitoring/runbooks/`
**Slack**: #monitoring
**Email**: monitoring-team@white-room.ai

## Success Criteria

✅ Prometheus collecting metrics
✅ 4+ Grafana dashboards created
✅ PagerDuty alerting configured
✅ Incident response documented
✅ Log aggregation working
✅ On-call team trained
✅ Documentation complete

---

**Last Updated**: 2026-01-15
**Version**: 1.0.0
**Maintained By**: DevOps Team
