# FilterGate

Dual-Phase • Multi-Filter • Filter-Gate • ADSR / ADR

JUCE DSP Core + Swift FFI

---

## Overview

FilterGate is a modular DSP block combining dual phaser, multi-model filter, filter gate, and ADSR/ADR envelopes, designed as a single controllable "instrument articulation processor" rather than a traditional pedal.

---

## Architecture

```
[ Swift UI / Control Layer ]
          ↓  (C ABI / FFI)
[ FilterGate C Interface ]
          ↓
[ JUCE DSP Core ]
          ↓
[ Audio Engine / Host ]
```

---

## Key Features

- **Dual Phaser Engines**: Cascade all-pass filters with LFO modulation
- **Multi-Model Filter**: SVF, Ladder, OTA, MS-20, Comb, Morph
- **Filter Gate**: Envelope follower with threshold detection
- **ADSR/ADR Envelopes**: Multi-stage envelopes with looping
- **Modulation Matrix**: Complex routing of LFOs, envelopes, and more
- **Swift FFI**: Clean C ABI for tvOS-safe integration

---

## Development Status

**Phase**: Planning
**Strategy**: TDD-Driven Development with Autonomous Agents

See [TDD_AUTONOMOUS_AGENT_PLAN.md](TDD_AUTONOMOUS_AGENT_PLAN.md) for complete development strategy.

---

## Documentation

- [HANDOFF_SPEC.md](HANDOFF_SPEC.md) - Complete technical specification
- [TDD_AUTONOMOUS_AGENT_PLAN.md](TDD_AUTONOMOUS_AGENT_PLAN.md) - Development roadmap
- [README.md](README.md) - This file

---

## Quick Start

### Building

```bash
# Clone repository
git clone https://github.com/bretbouchard/FilterGate.git
cd FilterGate

# Create build directory
mkdir build && cd build

# Configure with CMake
cmake ..

# Build
cmake --build .
```

### Running Tests

```bash
# Run all tests
cd build
ctest --verbose
```

---

## Project Structure

```
FilterGate/
├── build/              # Build output
├── docs/               # Documentation
├── include/            # Public headers
│   ├── dsp/            # DSP module headers
│   ├── ffi/            # C ABI headers
│   └── presets/        # Preset system headers
├── src/                # Source files
│   ├── dsp/            # DSP implementations
│   ├── ffi/            # FFI implementations
│   └── presets/        # Preset implementations
├── tests/              # Test suite
│   ├── dsp/            # DSP unit tests
│   ├── integration/    # Integration tests
│   └── ffi/            # FFI tests
├── presets/            # Factory presets
│   └── factory/        # Factory preset JSON files
├── CMakeLists.txt      # Build configuration
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

---

## Contributing

This project uses **Test-Driven Development (TDD)**. All contributions must:

1. Include passing tests (Red-Green-Refactor)
2. Maintain > 80% code coverage
3. Pass all CI/CD checks
4. Follow JUCE coding standards
5. Document public APIs

See [TDD_AUTONOMOUS_AGENT_PLAN.md](TDD_AUTONOMOUS_AGENT_PLAN.md) for development workflow.

---

## License

[To be determined]

---

## Repository

https://github.com/bretbouchard/FilterGate.git

---

*FilterGate v1.0 - JUCE DSP + Swift FFI*
*Generated: 2025-12-30*

## Plugin Formats

This plugin is available in the following formats:

- **VST3**: Cross-platform plugin format (Windows, macOS, Linux)
- **Audio Unit (AU)**: macOS-only format (macOS 10.15+)
- **CLAP**: Modern cross-platform format (CLAP 1.1+)
- **LV2**: Linux plugin format (LV2 1.18+)
- **AUv3**: iOS format (iOS 13+)
- **Standalone**: Desktop application (Windows, macOS, Linux)

### Build Status

See docs/BUILD.md for build instructions and current status.

### Installation

Each format installs to its standard system location. See docs/BUILD.md for details.
