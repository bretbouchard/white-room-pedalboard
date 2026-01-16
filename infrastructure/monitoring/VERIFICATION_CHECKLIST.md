# Production Monitoring Verification Checklist

## Pre-Deployment Checklist

### Day 1: Initial Setup
- [ ] Docker and Docker Compose installed
- [ ] Monitoring directory created at `/infrastructure/monitoring/`
- [ ] All configuration files in place
- [ ] Environment variables configured (`.env` file)
- [ ] Network connectivity verified
- [ ] Sufficient disk space available (50GB+ recommended)

### Day 2: Prometheus Setup
- [ ] Prometheus container running (`docker ps | grep prometheus`)
- [ ] Prometheus accessible at http://localhost:9090
- [ ] All scrape targets are "UP" in Prometheus UI
- [ ] Recording rules loaded (check `/api/v1/rules`)
- [ ] Alert rules loaded (check `/api/v1/rules`)
- [ ] Data retention configured (15 days, 10GB)
- [ ] Metrics are being collected (query `up` in Prometheus)

### Day 3-4: Grafana Dashboards
- [ ] Grafana container running (`docker ps | grep grafana`)
- [ ] Grafana accessible at http://localhost:3000
- [ ] Default password changed
- [ ] Prometheus datasource configured
- [ ] Loki datasource configured
- [ ] Alertmanager datasource configured
- [ ] System Health dashboard loaded and working
- [ ] Application Performance dashboard loaded and working
- [ ] Business Metrics dashboard loaded and working
- [ ] Alerts dashboard loaded and working
- [ ] All dashboards show data (not empty)
- [ ] Dashboard panels rendering correctly
- [ ] Time range selector working

### Day 5: Alerting
- [ ] Alertmanager container running (`docker ps | grep alertmanager`)
- [ ] Alertmanager accessible at http://localhost:9093
- [ ] Alertmanager configuration validated
- [ ] PagerDuty service keys configured
- [ ] Slack webhook URL configured
- [ ] SMTP settings configured
- [ ] Test alert fires successfully
- [ ] PagerDuty notification received
- [ ] Slack notification received
- [ ] Email notification received
- [ ] Alert grouping working correctly
- [ ] Alert inhibition rules working
- [ ] Alert silence functionality tested

### Day 6: Incident Response
- [ ] Incident Response Guide reviewed
- [ ] On-call rotation schedule created
- [ ] All team members have PagerDuty access
- [ ] All team members have Grafana access
- [ ] Slack channels created (#incidents, #alerts, #ops)
- [ ] Incident templates tested
- [ ] Escalation paths verified
- [ ] Post-mortem template reviewed
- [ ] Runbooks reviewed and understood
- [ ] Contact information up to date
- [ ] Incident simulation drill completed

### Day 7: Logging & Verification
- [ ] Loki container running (`docker ps | grep loki`)
- [ ] Promtail container running (`docker ps | grep promtail`)
- [ ] Loki accessible at http://localhost:3100
- [ ] Logs are being ingested (query in Loki)
- [ ] Log parsing working (JSON and regex)
- [ ] Log labels correct (level, service, trace_id)
- [ ] Log retention configured (7 days)
- [ ] All exporters running:
  - [ ] Node Exporter (9100)
  - [ ] cAdvisor (8080)
  - [ ] PostgreSQL Exporter (9187)
  - [ ] Redis Exporter (9121)
  - [ ] Nginx Exporter (9113)
- [ ] All exporters scraping successfully
- [ ] Log search working in Grafana
- [ ] Log filters working correctly

## Post-Deployment Verification

### Functionality Tests
- [ ] **Test 1**: Kill a container and verify alert fires
  ```bash
  docker stop prometheus
  # Wait 2 minutes
  # Check PagerDuty/Slack for alert
  docker start prometheus
  ```

- [ ] **Test 2**: Generate high CPU and verify alert
  ```bash
  # Run CPU-intensive process
  # Wait 5 minutes
  # Check for HighCPUUsage alert
  ```

- [ ] **Test 3**: Generate HTTP traffic and verify metrics
  ```bash
  # Make HTTP requests to application
  # Check Prometheus for http_requests_total
  # Check Grafana dashboard
  ```

- [ ] **Test 4**: Generate log entries and verify ingestion
  ```bash
  # Generate application logs
  # Query Loki for logs
  # Verify labels and parsing
  ```

- [ ] **Test 5**: Test alert resolution
  ```bash
  # Resolve alert condition
  # Verify alert clears in Alertmanager
  # Verify resolution notification sent
  ```

### Performance Tests
- [ ] Prometheus query performance <5 seconds
- [ ] Grafana dashboard load <3 seconds
- [ ] Alert evaluation <30 seconds
- [ ] Log query response <10 seconds
- [ ] No memory leaks in containers
- [ ] Disk usage within limits

### Documentation Tests
- [ ] All runbooks accessible and readable
- [ ] All guides contain accurate information
- [ ] Quick start script works end-to-end
- [ ] Environment variables documented
- [ ] Configuration files well-commented
- [ ] Diagrams accurate and helpful

### Integration Tests
- [ ] PagerDuty creates incidents for P0 alerts
- [ ] Slack receives notifications for all severity levels
- [ ] Email alerts delivered correctly
- [ ] Grafana panels auto-refresh
- [ ] Prometheus service discovery works
- [ ] Log aggregation from all sources

### Security Tests
- [ ] Grafana default password changed
- [ ] No exposed admin interfaces to public internet
- [ ] TLS/SSL configured for external access
- [ ] Secrets stored in environment variables
- [ ] No secrets in configuration files
- [ ] Network policies configured

## Ongoing Monitoring

### Daily Checks (5 minutes)
- [ ] Check Grafana for red/alerting panels
- [ ] Review Alertmanager for active alerts
- [ ] Verify all services are "UP"
- [ ] Check disk space on Prometheus
- [ ] Review #alerts Slack channel

### Weekly Checks (30 minutes)
- [ ] Review alert firing patterns
- [ ] Check for false positive alerts
- [ ] Update dashboards based on feedback
- [ ] Review log retention and disk usage
- [ ] Test one runbook procedure
- [ ] Update on-call schedule if needed

### Monthly Reviews (2 hours)
- [ ] Review all alert rules for relevance
- [ ] Update runbooks based on incidents
- [ ] Review and adjust alert thresholds
- [ ] Archive old Prometheus data
- [ ] Performance tuning (Prometheus, Grafana)
- [ ] Review and update documentation
- [ ] Conduct incident simulation drill
- [ ] Review on-call effectiveness

## Success Criteria

### Technical Metrics
- [ ] Prometheus target uptime >99%
- [ ] Alert delivery rate >99%
- [ ] Dashboard load time <5 seconds
- [ ] Log ingestion latency <30 seconds
- [ ] No data loss in metrics or logs

### Operational Metrics
- [ ] Mean time to acknowledge (MTTA) <5 minutes (P0)
- [ ] Mean time to resolve (MTTR) <1 hour (P0)
- [ ] False positive rate <5%
- [ ] Alert effectiveness >90%
- [ ] Documentation completeness >95%

### Team Metrics
- [ ] All team members trained on procedures
- [ ] On-call rotation established
- [ ] Incident response drills conducted
- [ ] Post-mortem completion rate 100% (P0/P1)
- [ ] Runbook accuracy >90%

## Troubleshooting

### Common Issues and Solutions

**Prometheus not scraping targets**
- [ ] Check target is reachable: `curl http://target:port/metrics`
- [ ] Verify Prometheus configuration: `docker exec prometheus promtool check config`
- [ ] Check Prometheus logs: `docker logs prometheus`
- [ ] Verify network connectivity

**Grafana dashboards not loading**
- [ ] Check datasource configuration
- [ ] Verify Prometheus is accessible from Grafana
- [ ] Check Grafana logs: `docker logs grafana`
- [ ] Clear browser cache and reload

**Alerts not firing**
- [ ] Verify alert rules in Prometheus
- [ ] Check Alertmanager configuration
- [ ] Test alert manually: `curl -X POST http://localhost:9093/api/v1/alerts`
- [ ] Verify PagerDuty/Slack integration

**Logs not appearing in Loki**
- [ ] Check Promtail logs: `docker logs promtail`
- [ ] Verify Promtail configuration
- [ ] Test log parsing in Promtail
- [ ] Check Loki logs: `docker logs loki`

**High memory usage**
- [ ] Check metric cardinality: `curl http://localhost:9090/api/v1/label/__name__/values | jq '.length'`
- [ ] Reduce histogram buckets
- [ ] Increase container memory limits
- [ ] Remove unused metrics

## Sign-Off

### Deployment Verified By
- **Name**: ______________________
- **Role**: ______________________
- **Date**: ______________________
- **Signature**: __________________

### Operations Team Lead
- **Name**: ______________________
- **Date**: ______________________
- **Signature**: __________________

### Engineering Manager
- **Name**: ______________________
- **Date**: ______________________
- **Signature**: __________________

---

**Checklist Version**: 1.0.0
**Last Updated**: January 15, 2026
**Next Review**: February 15, 2026
