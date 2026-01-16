# White Room - Code Ingests

**Generated**: Thu Jan 15 17:35 EST 2026

Lean code ingests for all subprojects. Structure + key files only.

## Available Ingests

| Subproject | Ingest File | Purpose |
|-----------|-------------|---------|
| **JUCE Backend** | [juce_backend-ingest.md](juce_backend-ingest.md) | DSP audio engine (C++) |
| **SDK** | [sdk-ingest.md](sdk-ingest.md) | Schillinger System logic (TS) |
| **Swift Frontend** | [swift_frontend-ingest.md](swift_frontend-ingest.md) | UI layer (Swift) |
| **DAW Control** | [daw_control-ingest.md](daw_control-ingest.md) | DAW integration (Python) |
| **Hardware Platform** | [hardware_ingest.md](hardware_ingest.md) | Modular hardware platform (C++/Rust/Python) |
| **Design Spec** | [design_spec-ingest.md](design_spec-ingest.md) | UI/UX design system (YAML) |
| **Infrastructure** | [infrastructure-ingest.md](infrastructure-ingest.md) | Build & CI/CD tooling |
| **Docs** | [docs-ingest.md](docs-ingest.md) | Architecture & guides (MD) |
| **Specs** | [specs-ingest.md](specs-ingest.md) | Feature specifications (MD) |
| **Plans** | [plans-ingest.md](plans-ingest.md) | Implementation plans (MD) |
| **White Room Box** | [white_room_box-ingest.md](white_room_box-ingest.md) | Shared utilities |

## Usage

Each ingest contains:
1. **Full directory structure** - See all files at a glance
2. **Quick stats** - Language, entry point, key components
3. **Key files** - Essential files in full (first 100 lines)

Perfect for:
- AI context for specific subproject work
- Code reviews without full repo access
- Onboarding new team members

## Hardware Platform Integration

The **Hardware Platform** is a separate repository (white-room-hardware) that provides:
- Modular, bus-connected hardware control surfaces
- Four stable contracts (Control Registry, Bus, Manifest, Layout)
- C++ runtime SDK for host implementations
- Rust tooling for compilation and validation
- Python CLI for developer workflow

**Key Integration Points**:
- **JUCE Backend**: Hardware Host connects via `IEngineSink` interface
- **SDK**: Control IDs mirror TypeScript interfaces
- **Swift Frontend**: Same Control Registry for UI controls
- **DAW Control**: Hardware accessible via DAW control

**Repository**: https://github.com/bretbouchard/white-room-hardware (private)
**Status**: Platform SDK v1 - COMPLETE ✅

See [hardware_ingest.md](hardware_ingest.md) for complete details.

## Automation

Regenerate manually: `./scripts/generate-ingests.sh`
