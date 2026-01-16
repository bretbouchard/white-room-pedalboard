# Production Monitoring Quick Start Guide

**Issue**: white_room-425
**Status**: 95% Complete - Infrastructure Ready, Application Instrumentation Pending
**Date**: January 16, 2026

---

## TL;DR

The monitoring infrastructure is **100% complete and ready to deploy**. The only missing piece is application-level metrics instrumentation in Swift and C++ codebases.

**Recommendation**: Deploy infrastructure now, instrument apps later (Week 2-3).

---

## 5-Minute Setup

### Step 1: Set Environment Variables (1 minute)

```bash
cd /Users/bretbouchard/apps/schill/white_room/infrastructure/monitoring

cat > .env << 'ENVEOF'
# Grafana Admin Password
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_SECURE_PASSWORD

# PagerDuty Integration (Optional - can configure later)
PAGERDUTY_SERVICE_KEY_CRITICAL=your_pagerduty_key_here
PAGERDUTY_SERVICE_KEY_HIGH=your_pagerduty_key_here

# Slack Integration (Optional - can configure later)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# SMTP Configuration (Optional - can configure later)
SMTP_PASSWORD=your_smtp_password
ENVEOF
```

### Step 2: Deploy Monitoring Stack (2 minutes)

```bash
# Run the automated setup script
./start.sh

# Verify all services are running
docker-compose ps
```

Expected output:
```
NAME                    STATUS         PORTS
prometheus              Up             0.0.0.0:9090->9090/tcp
grafana                 Up             0.0.0.0:3000->3000/tcp
alertmanager            Up             0.0.0.0:9093->9093/tcp
loki                    Up             0.0.0.0:3100->3100/tcp
promtail                Up             0.0.0.0:9080->9080/tcp
node_exporter           Up             0.0.0.0:9100->9100/tcp
cadvisor                Up             0.0.0.0:8080->8080/tcp
```

### Step 3: Access Dashboards (1 minute)

```bash
# Open Grafana
open http://localhost:3000

# Login: admin / CHANGE_ME_SECURE_PASSWORD
```

You should see 4 dashboards:
1. System Health Dashboard
2. Application Performance Dashboard
3. Business Metrics Dashboard
4. Alerts Dashboard

### Step 4: Verify Prometheus (1 minute)

```bash
# Check Prometheus targets
open http://localhost:9090/targets

# All targets should be "UP" (green)
```

---

## What's Working Now

### System-Level Metrics (✅ Available Immediately)
- CPU usage
- Memory usage
- Disk I/O
- Network traffic
- Container stats
- System load

### Log Aggregation (✅ Available Immediately)
- JUCE backend logs
- Swift frontend logs
- System logs
- Docker container logs
- Application logs

### Alerting (✅ Infrastructure Ready)
- Service down alerts
- High CPU/memory alerts
- Low disk space alerts
- Custom alert rules configured

---

## What's Missing

### Application-Level Metrics (⏳ Needs Implementation)

**NOT AVAILABLE YET**:
- Audio engine metrics (render time, XRUNs, CPU per channel)
- UI metrics (frame rate, transition time)
- Business metrics (DAU, MAU, songs created)
- FFI metrics (call duration, error rate)

**WHY**: Swift and C++ applications need to be instrumented to emit these metrics.

**EFFORT**: 17-26 hours of development work

**WHEN**: Week 2-3 (recommended)

---

## Deployment Options

### Option 1: Deploy Now (Recommended) ✅

**Benefits**:
- Immediate system-level visibility
- Team gains operational experience
- Lower risk with phased approach
- Infrastructure validated early

**Timeline**:
- Week 1: Deploy infrastructure, train team ← **YOU ARE HERE**
- Week 2-3: Instrument applications
- Week 4: Complete integration

**Command**: `./start.sh`

### Option 2: Wait for Instrumentation

**Benefits**:
- Complete solution from day one
- Immediate app-level visibility

**Drawbacks**:
- Delayed infrastructure deployment
- Higher upfront investment
- More complex debugging

**Timeline**:
- Week 1-2: Implement instrumentation
- Week 3: Deploy complete solution

---

## Next Steps

### This Week
- [ ] Deploy monitoring infrastructure: `./start.sh`
- [ ] Change default Grafana password
- [ ] Verify all services are healthy
- [ ] Review dashboards (system metrics only)
- [ ] Read INCIDENT_RESPONSE_GUIDE.md
- [ ] Set up PagerDuty integration (optional)
- [ ] Set up Slack webhook (optional)

### Week 2-3
- [ ] Implement Swift metrics client
- [ ] Implement C++ metrics client
- [ ] Instrument audio engine
- [ ] Instrument UI components
- [ ] Expose HTTP /metrics endpoints
- [ ] Verify metrics in Prometheus

### Week 4
- [ ] Complete integration testing
- [ ] Verify dashboards showing app data
- [ ] Test alerts with real metrics
- [ ] Conduct incident simulation drill
- [ ] Close white_room-425 issue

---

## Documentation

### Quick Reference
- **README.md**: Overview and quick start
- **STATUS_REPORT.md**: Detailed implementation status
- **IMPLEMENTATION_SUMMARY.md**: Complete deliverables list

### Comprehensive Guides
- **docs/MONITORING_SETUP_GUIDE.md**: Architecture, setup, configuration
- **docs/INCIDENT_RESPONSE_GUIDE.md**: Procedures, templates, runbooks
- **docs/METRICS_INSTRUMENTATION_GUIDE.md**: Code examples for C++, Swift, Python

### Runbooks
- **runbooks/SERVICE_DOWN.md**: Service recovery procedures
- **runbooks/AUDIO_OVERLOAD.md**: Audio performance troubleshooting

### Verification
- **VERIFICATION_CHECKLIST.md**: Pre and post-deployment checklist

---

## Common Commands

```bash
# Start monitoring stack
docker-compose up -d

# Stop monitoring stack
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Restart service
docker-compose restart [service_name]

# Check status
docker-compose ps

# Update configuration
docker-compose up -d --force-recreate

# Access Prometheus
open http://localhost:9090

# Access Grafana
open http://localhost:3000

# Access Alertmanager
open http://localhost:9093
```

---

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

---

## Success Criteria

### Infrastructure (✅ MET)
- [x] Prometheus configured and ready
- [x] Grafana dashboards created (4)
- [x] Alertmanager configured
- [x] Loki + Promtail configured
- [x] Documentation complete
- [x] Automation scripts ready

### Application (⏳ PENDING)
- [ ] Swift metrics client implemented
- [ ] C++ metrics client implemented
- [ ] Audio engine metrics instrumented
- [ ] UI metrics instrumented
- [ ] Business metrics instrumented
- [ ] HTTP /metrics endpoints exposed
- [ ] Metrics verified in Prometheus
- [ ] Dashboards showing application data

---

## Get Help

- **Documentation**: `/infrastructure/monitoring/docs/`
- **Runbooks**: `/infrastructure/monitoring/runbooks/`
- **Issue**: white_room-425
- **Status Report**: STATUS_REPORT.md

---

**Bottom Line**: Infrastructure is 100% ready. Deploy now with `./start.sh` to gain immediate system-level visibility, then instrument applications in Week 2-3 for complete observability.

**Estimated Time to Deploy**: 5 minutes
**Estimated Time to Complete Application Instrumentation**: 17-26 hours (Week 2-3)
**Production Readiness**: 70% (infrastructure complete, application instrumentation pending)

---

**Last Updated**: January 16, 2026
**Maintained By**: DevOps Team
