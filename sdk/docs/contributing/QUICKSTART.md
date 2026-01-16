# Contributing to White Room - Quick Start

## Getting Started

```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/white_room.git
cd white_room/sdk

# Install dependencies
npm install

# Run tests
npm test

# Build all components
npm run build:all
```

## Development Workflow

1. **Track work in Beads (bd)**
   ```bash
   bd create "Fix performance switching glitch"
   bd start <issue-id>
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/white_room-123-description
   ```

3. **Make changes and test**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

4. **Commit with conventional commits**
   ```
   feat(sdk): Add performance switching API
   fix(juce): Prevent audio glitch during switch
   ```

5. **Create pull request**
   - Include tests and documentation
   - Ensure CI/CD checks pass
   - Request review from maintainers

## Code Standards

- **TypeScript**: Strict mode, functional programming
- **Swift**: SwiftUI best practices, guard statements
- **C++**: C++ Core Guidelines, RAII
- **Tests**: 90% coverage (SDK), 80% (Swift), 70% (C++)

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## Getting Help

- **Architecture**: `docs/architecture/architecture-overview.md`
- **API Reference**: `docs/user-guides/api-reference.md`
- **Troubleshooting**: `docs/user-guides/troubleshooting.md`
- **Confucius**: Check memory system for past solutions

---

**Last Updated**: 2025-01-15
