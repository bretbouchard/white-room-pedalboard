# Service Down Runbook

## Alert
**Alert Name**: ServiceDown
**Severity**: Critical (P0)
**Priority**: 1

## Symptoms
- Service `{{ $labels.service }}` is down on `{{ $labels.instance }}`
- Prometheus shows `up == 0` for the service
- Users may experience service unavailability

## Impact
- High impact on user experience
- Potential data loss if service is critical
- SLA breach if not resolved quickly

## Diagnosis Steps

### 1. Verify Service Status
```bash
# Check if service is running
docker ps | grep <service-name>
systemctl status <service-name>

# Check service logs
docker logs <container-name> --tail 100
journalctl -u <service-name> -n 100 --no-pager
```

### 2. Check System Resources
```bash
# Check CPU, memory, disk
top
htop
df -h

# Check if OOM killed
dmesg | grep -i oom
```

### 3. Check Network Connectivity
```bash
# Test network connectivity
ping <service-host>
curl http://<service-host>:<port>/health

# Check firewall rules
iptables -L -n
```

### 4. Check Service Dependencies
```bash
# Check database connectivity
psql -h <db-host> -U <user> -d <database> -c "SELECT 1"

# Check external APIs
curl -X GET <external-api-url>
```

## Resolution Steps

### Phase 1: Immediate Recovery (Minutes 0-5)

#### If Service Crashed
```bash
# Restart service
docker restart <container-name>
systemctl restart <service-name>

# If persistent crash, check logs and fix issue
docker logs <container-name> --tail 500 > /tmp/service-crash.log
```

#### If Out of Memory
```bash
# Identify memory-hungry process
ps aux --sort=-%mem | head -20

# Kill non-critical processes if needed
kill -9 <pid>

# Restart with increased memory limits
docker update <container-name> --memory 2g
```

#### If Disk Full
```bash
# Clean up old logs
find /var/log -type f -name "*.log" -mtime +7 -delete

# Clean up Docker images
docker image prune -a -f

# Clean up temp files
rm -rf /tmp/*
```

### Phase 2: Root Cause Analysis (Minutes 5-15)

#### Common Causes
1. **Code Bug**: Recent deployment introduced crash
   - Check recent deployments
   - Review recent commits
   - Rollback if needed

2. **Resource Exhaustion**: Memory, CPU, disk full
   - Scale resources
   - Optimize application
   - Add more capacity

3. **Dependency Failure**: Database, Redis, external API down
   - Check dependencies
   - Restart dependencies
   - Add circuit breakers

4. **Configuration Error**: Wrong config deployed
   - Review configuration changes
   - Revert to previous config
   - Update configuration management

### Phase 3: Prevention (Post-Incident)

1. **Add Auto-Restart**
   ```yaml
   # Docker Compose
   restart: unless-stopped

   # Systemd
   Restart=always
   RestartSec=10s
   ```

2. **Add Health Checks**
   ```yaml
   # Docker Compose
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

3. **Add Resource Limits**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 2G
       reservations:
         memory: 1G
   ```

4. **Set Up Monitoring**
   - Enable alerting for resource usage
   - Add pre-warning alerts (80% CPU, memory)
   - Set up log aggregation

5. **Improve Deployment Process**
   - Add blue-green deployment
   - Implement canary releases
   - Add automated rollback

## Escalation

### If Not Resolved in 5 Minutes
- Page: On-call Engineering Lead
- Slack: #engineering-incidents
- Create incident ticket

### If Not Resolved in 15 Minutes
- Page: Engineering Manager
- Email: engineering-leads@white-room.ai
- Update incident status page

### If Not Resolved in 30 Minutes
- Page: CTO
- Escalate to executive team
- Consider public communication

## Verification

### After Resolution
```bash
# Verify service is up
curl http://<service-host>:<port>/health

# Check metrics
curl http://<service-host>:<port>/metrics

# Run smoke tests
./scripts/smoke-test.sh
```

### Monitor for Recurrence
- Watch logs for errors
- Monitor resource usage
- Check alerting system
- Review metrics dashboard

## Related Runbooks
- [High CPU Usage](./HIGH_CPU.md)
- [High Memory Usage](./HIGH_MEMORY.md)
- [Database Connection Issues](./DATABASE_CONNECTIONS.md)

## Contacts
- **On-Call**: on-call@white-room.ai
- **Engineering Lead**: engineering-lead@white-room.ai
- **CTO**: cto@white-room.ai

## Last Updated
2026-01-15 12:00:00 UTC

## Change History
| Date | Changed By | Description |
|------|-----------|-------------|
| 2026-01-15 | DevOps Team | Initial runbook creation |
