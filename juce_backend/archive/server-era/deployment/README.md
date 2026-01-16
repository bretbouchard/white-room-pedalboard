# Server-Era Deployment Configuration (Archived)

**Archive Date:** December 31, 2025
**Reason:** Deployment configs not applicable to tvOS local-only builds
**Status:** ARCHIVED - Not for use in production

---

## Why This Directory Was Archived

This directory contains server-era deployment configurations that are **not applicable** to the tvOS local-only JUCE execution engine. The deployment infrastructure was designed for:

1. **Backend server deployment** - Running JUCE as a networked server
2. **WebSocket collaboration** - Real-time multi-user editing
3. **REST API endpoints** - HTTP-based control interfaces
4. **Cloud hosting** - Docker containers on Fly.io

The tvOS local-only architecture has **no server components** and therefore has no need for:
- Docker containers
- Kubernetes deployments
- nginx reverse proxies
- Fly.io cloud deployments
- Prometheus monitoring

---

## Architecture Migration

### Before (Server-Era Architecture)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Flutter   │──────│  JUCE Server │──────│   Plugins   │
│   Frontend  │ WS   │  (Backend)   │ REST  │   (VST3)    │
└─────────────┘      └──────────────┘      └─────────────┘
                             │
                             ├── Docker Container
                             ├── Fly.io Deployment
                             ├── nginx Reverse Proxy
                             └── Prometheus Monitoring
```

### After (tvOS Local-Only Architecture)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  tvOS Swift │──────│  JUCE Audio  │──────│   Plugins   │
│   App UI    │ JS   │  Execution   │ FFI   │   (VST3)    │
└─────────────┘      │    Engine    │      └─────────────┘
                     └──────────────┘
                            │
                            ├── No server components
                            ├── No network dependencies
                            ├── Lock-free plan cache
                            └── Deterministic execution
```

---

## Directory Contents

### Container Orchestration

| File | Purpose | Why Archived |
|------|---------|-------------|
| `Dockerfile` | Container image for JUCE server | tvOS has no containerization |
| `docker-compose.yml` | Local development orchestration | Not applicable to tvOS |
| `docker-compose.prod.yml` | Production container orchestration | Not applicable to tvOS |

### Cloud Deployment

| File | Purpose | Why Archived |
|------|---------|-------------|
| `fly.toml` | Fly.io cloud deployment config | tvOS doesn't deploy to cloud |
| `rest_security_deployment.yaml` | Kubernetes security config | No Kubernetes on tvOS |
| `deploy_rest_security.sh` | Automated deployment script | No deployment needed for tvOS |

### Monitoring & Infrastructure

| File | Purpose | Why Archived |
|------|---------|-------------|
| `nginx.conf` | Reverse proxy configuration | No proxy needed for local-only |
| `prometheus.yml` | Monitoring configuration | No monitoring service for tvOS |
| `supervisor.conf` | Process supervision | tvOS app lifecycle managed by OS |

### Deployment Scripts

| File | Purpose | Why Archived |
|------|---------|-------------|
| `deploy/setup.sh` | Server environment setup | No server environment on tvOS |
| `deploy/verify.py` | Deployment verification | No deployment to verify |
| `deploy_rest_security.sh` | Security deployment automation | No security deployment needed |

### Python Dependencies

| File | Purpose | Why Archived |
|------|---------|-------------|
| `requirements-dev.txt` | Development dependencies | Server dev dependencies not needed |
| `requirements-prod.txt` | Production dependencies | No production server environment |
| `requirements-dev-minimal.txt` | Minimal dev dependencies | Server dependencies not needed |

### Test Scripts

| File | Purpose | Why Archived |
|------|---------|-------------|
| `scripts/test_standalone_client.py` | WebSocket client tests | No WebSocket client testing needed |

---

## Migration Timeline

| Date | Milestone | Description |
|------|----------|-------------|
| 2025-12-31 | Archive | Deployment configs moved to archive/ |
| 2026-06-30 | Deletion | Planned deletion after 6-month grace period |

---

## Alternative: Desktop Plugin Deployment

For desktop builds (not tvOS), JUCE can be deployed as:

1. **VST3 Plugin** - Standard audio plugin format
2. **AU Plugin** - macOS Audio Units format
3. **Standalone App** - Desktop application with JUCE GUI
4. **CLT Tool** - Command-line audio processing tool

These deployment methods use **standard plugin installers**, not Docker containers or cloud deployment.

---

## Reconstruction (If Needed)

If server deployment is ever needed in the future:

1. **Restore from git history:**
   ```bash
   git checkout <commit-before-archive> -- deployment/
   ```

2. **Update CMakeLists.txt:**
   ```cmake
   if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
       add_subdirectory(deployment)
   endif()
   ```

3. **Re-enable server components:**
   - BackendServer target
   - WebSocket API endpoints
   - REST API handlers

4. **Update deployment configs:**
   - Modernize Dockerfile if needed
   - Update cloud provider configs
   - Verify security settings

**Note:** This would **reintroduce server dependencies** and break tvOS local-only builds. Only do this if creating a separate server product.

---

## Related Documentation

- `ServerEraDeprecationPlan.md` - Overall deprecation strategy
- `ServerInfrastructureInventory.md` - Complete infrastructure audit
- `Phase5DeploymentCleanupReport.md` - This cleanup phase report
- `TvOSBuildChecklist.md` - tvOS build validation

---

## Questions?

If you find this directory and wonder why it exists:

1. **Read the deprecation plan** - `docs/ServerEraDeprecationPlan.md`
2. **Check the architecture** - JUCE is now an execution engine, not a server
3. **See tvOS guidelines** - `docs/TvosBuildChecklist.md`

The tvOS local-only architecture is **simpler, more reliable, and more appropriate** for embedded audio applications.

---

**Status:** 🗄️ **ARCHIVED**
**Last Updated:** December 31, 2025
**Archive Location:** `archive/server-era/deployment/`
