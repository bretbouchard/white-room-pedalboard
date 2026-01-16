# White Room Developer Documentation

Welcome to the White Room developer documentation. This comprehensive guide will help you understand, build, and contribute to the White Room audio plugin development environment.

## Quick Start

**New to White Room?** Start with the [Getting Started Guide](./getting-started.md)

**Looking for architecture?** See the [Architecture Overview](./architecture/overview.md)

**Need API references?** Check out the [API Documentation](./api/)

## Documentation Structure

### Getting Started
- [Getting Started Guide](./getting-started.md) - Project overview, setup, and first build
- [Development Environment](./getting-started.md#development-environment) - Required tools and dependencies
- [Building the Project](./getting-started.md#building-the-project) - Compilation instructions
- [Running Tests](./getting-started.md#running-tests) - Test suite overview
- [Common Workflows](./getting-started.md#common-workflows) - Day-to-day development tasks

### Architecture
- [Architecture Overview](./architecture/overview.md) - System architecture and design principles
- [Component Architecture](./architecture/components.md) - Detailed component descriptions
- [Data Flow](./architecture/data-flow.md) - How data moves through the system
- [Design Patterns](./architecture/design-patterns.md) - Patterns and best practices

### API Documentation
- [JUCE Backend API](./api/juce-backend.md) - C++ audio engine API
- [Swift Frontend API](./api/swift-frontend.md) - SwiftUI interface API
- [TypeScript SDK API](./api/typescript-sdk.md) - Shared type definitions
- [FFI Bridge API](./api/ffi-bridge.md) - Foreign Function Interface
- [Error Handling API](./api/error-handling.md) - Error management system

### Integration Guides
- [Adding New Instruments](./integration/new-instruments.md) - Create new synthesizers
- [Adding New Effects](./integration/new-effects.md) - Create new audio effects
- [Extending Schillinger Systems](./integration/schillinger-extension.md) - Music theory extensions
- [UI Components](./integration/ui-components.md) - SwiftUI components
- [New Features](./integration/new-features.md) - Feature development workflow

### Troubleshooting
- [Build Issues](./troubleshooting/build-issues.md) - Compilation errors and fixes
- [Runtime Issues](./troubleshooting/runtime-issues.md) - Runtime errors and debugging
- [Debugging Techniques](./troubleshooting/debugging.md) - Debugging strategies
- [Performance Optimization](./troubleshooting/performance.md) - Performance tuning
- [Memory Leaks](./troubleshooting/memory-leaks.md) - Memory management

### Contributing
- [Contributing Guide](./contributing.md) - Contribution guidelines
- [Code Style](./contributing.md#code-style-guidelines) - Coding standards
- [Pull Request Process](./contributing.md#pull-request-process) - PR workflow
- [Code Review Standards](./contributing.md#code-review-standards) - Review criteria
- [Testing Requirements](./contributing.md#testing-requirements) - Test coverage
- [Documentation Standards](./contributing.md#documentation-standards) - Docs guidelines

## Project Overview

White Room is a next-generation audio plugin development environment that integrates:

- **JUCE C++ Backend** - Real-time audio processing engine
- **Swift Frontend** - Modern SwiftUI user interface
- **TypeScript SDK** - Shared type definitions and tooling
- **FFI Bridge** - Seamless Swift/C++ interop
- **Schillinger Systems** - Algorithmic music theory
- **Python Tooling** - Development utilities and scripts

### Supported Platforms

- **macOS** 12+ (Intel & Apple Silicon)
- **iOS** 15+ (iPhone & iPad)
- **tvOS** 15+ (Apple TV)
- **Linux** (Ubuntu 20.04+)
- **Windows** 10+ (Build only, runtime support in progress)

### Supported Plugin Formats

- **VST3** - Cross-platform plugin format
- **AU** - macOS Audio Unit format
- **CLAP** - Modern plugin format with advanced features

## Key Technologies

- **C++17/20** - JUCE audio engine
- **Swift 5.9+** - SwiftUI frontend
- **TypeScript 5.0+** - SDK and tooling
- **CMake** - Build system
- **Swift Package Manager** - Swift dependencies
- **Python 3.10+** - Development utilities

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Swift Frontend (UI)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SwiftUI Views                                        │  │
│  │  - Performance Blend Interface                       │  │
│  │  - Schillinger System Controls                       │  │
│  │  - Audio Parameter Controls                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ FFI Bridge (C)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    JUCE C++ Backend                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Audio Engine                                        │  │
│  │  - Real-time Audio Processing                        │  │
│  │  - Plugin Host Integration                           │  │
│  │  - MIDI/OSC Support                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Schillinger Systems                                 │  │
│  │  - Rhythm Generators                                 │  │
│  │  - Pitch/Scale Systems                               │  │
│  │  - Harmonic Progressions                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ TypeScript Types
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TypeScript SDK                           │
│  - Shared Type Definitions                                 │
│  - API Interfaces                                          │
│  - Error Types                                             │
│  - Serialization Utilities                                 │
└─────────────────────────────────────────────────────────────┘
```

## Development Workflow

1. **Setup** - Follow the [Getting Started Guide](./getting-started.md)
2. **Explore** - Read the [Architecture Overview](./architecture/overview.md)
3. **Develop** - Use [Integration Guides](./integration/) for specific tasks
4. **Test** - Follow [Testing Requirements](./contributing.md#testing-requirements)
5. **Contribute** - Submit PR using [Contributing Guide](./contributing.md)

## Getting Help

- **Documentation** - Start with these docs
- **Issue Tracker** - Search GitHub issues for similar problems
- **Discussions** - Ask questions in GitHub Discussions
- **Confucius** - Check the hierarchical memory system for past patterns
- **Team** - Contact maintainers for critical issues

## Quick Reference

### Essential Commands

```bash
# Build all components
./scripts/build_all.sh

# Run tests
./scripts/test_all.sh

# Format code
./scripts/format_code.sh

# Lint code
./scripts/lint_code.sh

# Clean build artifacts
./scripts/clean.sh
```

### Key Files

- `/docs/developer/` - This documentation
- `/sdk/` - TypeScript definitions
- `/juce_backend/` - C++ audio engine
- `/swift_frontend/` - Swift UI code
- `/specs/` - Feature specifications
- `/plans/` - Implementation plans

## Documentation Standards

This documentation follows these principles:

- **Clear** - Written for developers, concise and precise
- **Complete** - Covers all aspects, no gaps
- **Current** - Kept up-to-date with code changes
- **Practical** - Includes real examples and code snippets
- **Accessible** - Easy to navigate and find information

## Contributing to Documentation

Found a documentation issue? Please:

1. Fix typos and small errors directly
2. Add missing information
3. Improve clarity and examples
4. Update outdated content
5. Submit PR with clear description

See [Contributing Guide](./contributing.md) for details.

---

**Next Steps:**

- [Getting Started Guide](./getting-started.md) - Start here!
- [Architecture Overview](./architecture/overview.md) - Understand the system
- [API Documentation](./api/) - Explore the APIs

**Last Updated:** 2026-01-15
**Documentation Version:** 1.0.0
