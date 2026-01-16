# RFP: FastAPI + PostgreSQL API Key Management System

## Overview

We seek a secure, maintainable, and developer-friendly API key management system built with FastAPI and PostgreSQL. The system will support the Schillinger SDK and backend, enabling secure programmatic access for SDK users and integrations.

## Requirements

### Core Features

- Secure API key generation (cryptographically strong, unique, non-guessable)
- Store API keys hashed in PostgreSQL with metadata (user, scopes, created, last used, revoked, etc.)
- RESTful endpoints for:
  - Creating new API keys (admin/user self-service)
  - Listing and managing existing keys
  - Revoking/rotating keys
  - Validating keys (middleware/dependency for FastAPI)
- Permission scopes per key (e.g., read, write, admin)
- Audit logging for key creation, usage, and revocation
- Rate limiting and brute-force protection

### Security

- Keys never retrievable in plaintext after creation
- All operations logged for auditability
- Protection against brute-force and replay attacks

### Developer Experience

- Pythonic API for FastAPI integration (dependency or middleware)
- Clear documentation and example code for integration
- Easy deployment (Docker, Compose, or Helm)

### Operational

- PostgreSQL as backend storage
- Minimal dependencies, easy upgrades
- No external SaaS or cloud lock-in

## Evaluation Criteria

- Security best practices
- Ease of integration with FastAPI and Python
- Open source license preferred
- Community support and documentation

## Timeline

- Proposals due: [Insert Date]
- Selection: [Insert Date]
- Implementation start: [Insert Date]
- Target go-live: [Insert Date]
