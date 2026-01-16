# White Room Hardware Platform - Quick Start

**Status**: Platform SDK v1 - COMPLETE ✅ | Reference Hardware - IN PROGRESS 🚧
**Repository**: https://github.com/bretbouchard/white-room-hardware (private)

---

## What Is This?

**Hardware is just another view with screws instead of pixels.**

The White Room Hardware Platform transforms hardware from "device" to "first-class platform layer" with:
- **Four stable contracts** (Control Registry, Bus, Manifest, Layout)
- **Bus-based modularity** (hot-pluggable modules)
- **Capability-driven composition** (mix-and-match by capability, not brand)
- **Universal flexibility** (any layout, any form factor)

---

## Platform Status

### ✅ Complete (Platform SDK v1)

- [x] Four stable contracts defined (SCH-CTRL/1, SCH-LAYOUT/1, SCH-HW-MANIFEST/1, SCH-BUS/1)
- [x] Control Registry with 22 semantic controls
- [x] Layout binding system (2 example layouts)
- [x] SCH-BUS/1 protocol specification (22KB)
- [x] C++ Host SDK (500 LOC)
- [x] Rust tools (800 LOC) - sch-regc compiler
- [x] Python CLI (300 LOC) - validation workflow
- [x] Reference module examples (control_knobs_8_ref)

### 🚧 In Progress (Reference Hardware - Issue hardware-1)

- [ ] Select core compute module (Teensy 4.1 vs ESP32-S3)
- [ ] Design audio module (DAC/ADC selection, clocking)
- [ ] Design control module v1 (rotary encoders, buttons, LEDs)
- [ ] Define power distribution system
- [ ] Create mechanical reference design (enclosure, mounting)

**Current Phase**: Planning (research complete, ready to execute)

---

## Quick Start Guide

### For Users (Using the Platform)

1. **Explore the Control Registry**
   ```bash
   cd hardware
   cat registry/controls.core.json | jq '.controls[] | {id, description}'
   ```

2. **Check Example Layouts**
   ```bash
   ls registry/layouts/
   # performance_minimal.json - 4 knobs for live performance
   # sound_design.json - 8 knobs for timbral control
   ```

3. **Read the Bus Spec**
   ```bash
   # Complete SCH-BUS/1 protocol specification
   open docs/specifications/sch-bus-1.md
   ```

4. **Understand the Architecture**
   ```bash
   # Three-layer system, four stable contracts
   open platform/README.md
   ```

### For Developers (Building Modules)

1. **Validate Your Manifest**
   ```bash
   cd hardware
   sch-hw validate my_module/manifest.json
   ```

2. **Compile Control Registry**
   ```bash
   # Generate C++ headers
   cargo run --bin sch-regc -- compile \
     registry/controls.core.json \
     runtime_cpp/include/sch_hw/
   ```

3. **Use the C++ SDK**
   ```cpp
   #include <sch_hw/host.hpp>

   auto registry = sch::hw::Registry::load("registry/controls.core.json");
   auto layout = sch::hw::Layout::load("registry/layouts/performance_minimal.json");
   auto transport = sch::hw::create_mock_transport();
   auto engine = std::make_shared<MyEngineSink>();

   sch::hw::Host host(std::move(transport), registry, layout, engine);
   host.start();
   ```

4. **Reference Implementation**
   ```bash
   # Example module: 8 knobs + LEDs
   open examples/modules/control_knobs_8_ref/manifest.json
   ```

### For Contributors (Adding Features)

1. **Read the Implementation Plan**
   ```bash
   open plans/reference-hardware-implementation.md
   ```

2. **Check Foundation Research**
   ```bash
   open docs/architecture/foundational-platforms-research.md
   ```

3. **Understand the SDK Structure**
   ```bash
   # C++ SDK
   ls -la runtime_cpp/
   # Rust tools
   ls -la tools_rust/
   # Python CLI
   ls -la tools_py/
   ```

---

## Project Structure

```
hardware/
├── platform/                    # Platform architecture docs
│   └── README.md
├── plans/                       # Implementation plans
│   └── reference-hardware-implementation.md
├── docs/
│   ├── specifications/          # Protocol specifications
│   │   └── sch-bus-1.md         # Complete bus spec (22KB)
│   └── architecture/            # Research docs
│       └── foundational-platforms-research.md
├── schemas/                     # JSON schemas (source of truth)
│   ├── sch-ctrl-1.schema.json   # Control Registry schema
│   ├── sch-layout-1.schema.json # Layout binding schema
│   └── sch-hw-manifest-1.schema.json
├── registry/                    # Control registries + layouts
│   ├── controls.core.json        # 22 stable semantic controls
│   └── layouts/
│       ├── performance_minimal.json
│       └── sound_design.json
├── runtime_cpp/                 # C++ Host SDK
│   ├── include/sch_hw/
│   │   ├── registry.hpp
│   │   ├── event.hpp
│   │   ├── layout.hpp
│   │   ├── bus_transport.hpp
│   │   └── host.hpp
│   └── src/
│       ├── registry.cpp
│       ├── layout.cpp
│       ├── host.cpp
│       ├── bus_frame.cpp
│       └── mock_transport.cpp
├── tools_rust/                  # Fast compilers/validators
│   ├── crates/
│   │   ├── sch_hash/            # Stable hashing
│   │   ├── sch_schema/          # Schema validation
│   │   └── sch_reg/             # Registry compiler
│   └── bin/
│       └── sch-regc/            # Registry compiler CLI
├── tools_py/                    # Developer workflow
│   └── sch_hw_cli/
│       ├── validate.py
│       └── __main__.py
└── examples/                    # Reference implementations
    ├── modules/
    │   └── control_knobs_8_ref/
    │       ├── manifest.json
    │       └── README.md
    └── virtual_modules/
        └── control_knobs_8_sim.json
```

---

## Key Concepts

### Three-Layer Architecture

```
┌─────────────────────────────────────────────┐
│ Layer 3 — Engine (White Room JUCE Backend)  │
│ • DSP graph, roles, scenes, timing           │
└───────────────────────────▲─────────────────┘
                            │ control events
┌───────────────────────────┴─────────────────┐
│ Layer 2 — Control Plane (C++ Host SDK)      │
│ • Control Registry (22 semantic controls)    │
│ • Layout binding (module control → ID)       │
│ • SCH-BUS/1 protocol                        │
└───────────────────────────▲─────────────────┘
                            │ bus events
┌───────────────────────────┴─────────────────┐
│ Layer 1 — Hardware Modules (Physical)       │
│ • Control modules (knobs, encoders, pads)   │
│ • Audio modules (ADC/DAC, clocking)         │
│ • Compute modules (MCU, transport)          │
└─────────────────────────────────────────────┘
```

**Key Principle**: Engine only sees `ControlEvent` with stable `ControlID`. Everything below can be replaced.

### Four Stable Contracts

1. **Control Registry (SCH-CTRL/1)**: 22 semantic controls with stable IDs
2. **Layout Binding (SCH-LAYOUT/1)**: Bind module endpoints to control IDs
3. **Module Manifest (SCH-HW-MANIFEST/1)**: Capability-based discovery
4. **Hardware Bus (SCH-BUS/1)**: Hot-pluggable protocol with CRC16-CCITT

### Universal Flexibility (5 Tests)

1. ✅ Any new control surface can be added without touching the engine
2. ✅ Any new engine parameter can be exposed without touching module firmware
3. ✅ Any hardware layout can be swapped live without recompiling firmware
4. ✅ A whole hardware performance can be replayed without hardware connected
5. ✅ Modules can be mixed/matched by capability, not by brand

---

## Platform SDK Components

### C++ Host SDK (500 LOC)

**Purpose**: Integrate hardware with White Room engine

**Key Files**:
- `runtime_cpp/include/sch_hw/host.hpp` - Main host class
- `runtime_cpp/include/sch_hw/registry.hpp` - Control registry
- `runtime_cpp/include/sch_hw/layout.hpp` - Layout binding
- `runtime_cpp/include/sch_hw/bus_transport.hpp` - SCH-BUS/1 transport

**Usage Example**:
```cpp
auto registry = sch::hw::Registry::load("registry/controls.core.json");
auto layout = sch::hw::Layout::load("registry/layouts/performance_minimal.json");
auto transport = sch::hw::create_mock_transport();
auto engine = std::make_shared<MyEngineSink>();

sch::hw::Host host(std::move(transport), registry, layout, engine);
host.start();  // Begin enumeration and event processing
```

### Rust Tools (800 LOC)

**Purpose**: Fast compilers and validators

**Key Tools**:
- `sch-regc` - Control Registry compiler (generate C++ headers)
- `sch-hash` - Stable FNV-1a 64-bit hashing
- `sch-schema` - JSON schema validation

**Usage Example**:
```bash
# Compile control registry to C++ header
cargo run --bin sch-regc -- compile \
  registry/controls.core.json \
  runtime_cpp/include/sch_hw/

# Output:
# ✓ Generated C++ header: registry.gen.hpp
# ✓ Generated hash table: registry_hashes.json
```

### Python CLI (300 LOC)

**Purpose**: Developer workflow and validation

**Key Commands**:
- `sch-hw validate` - Validate all schemas/registries/layouts
- `sch-hw record` - Record hardware session
- `sch-hw replay` - Replay recorded session
- `sch-hw sim` - Run virtual module simulation

**Usage Example**:
```bash
# Validate everything
sch-hw validate

# Validate specific file
sch-hw validate registry/controls.core.json

# Record session
sch-hw record session.json

# Replay session
sch-hw replay session.json
```

---

## Reference Hardware (Issue hardware-1)

### Current Status: Planning Complete ✅

**Phase**: Ready to execute (research done, BOM defined, firmware planned)

### Module 1: Control Surface (8 knobs + LEDs)

**Target**: `control_knobs_8_ref` from platform SDK

**Compute**: Teensy 4.1 (development) → ESP32-S3 (production)
- 600 MHz ARM Cortex-M7 (Teensy)
- Native USB (SCH-BUS/1 transport)
- 34x digital I/O, 18x ADC channels

**Controls**: 8x Rotary Encoders
- Part: Bournes PEC11R-4215F-S0024
- Quadrature outputs (A/B phase)
- Push button (detent switch)
- 24 PPR (pulses per revolution)

**Feedback**: 8x RGB LEDs (I2C)
- Part: Adafruit 4x8-LED Backpack (ISK29FRSH4)
- I2C interface (saves pins)
- 16-bit PWM per channel

**Power**: Class P2 (150mA max)
- MCU: ~100mA
- LEDs: ~40mA (8x 5mA @ 50% duty)
- Encoders: ~10mA

**BOM Cost**: ~$60 USD

**Documentation**:
- [Implementation Plan](plans/reference-hardware-implementation.md)
- [Foundational Research](docs/architecture/foundational-platforms-research.md)

---

## Developer Workflow

### 1. Setup Development Environment

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Python dependencies
pip install -r tools_py/requirements.txt

# Build Rust tools
cd tools_rust
cargo build --release
```

### 2. Validate Everything

```bash
cd hardware

# Validate all schemas/registries/layouts
sch-hw validate

# Validate specific file
sch-hw validate registry/controls.core.json
```

### 3. Compile Control Registry

```bash
# Generate C++ headers + hash tables
cargo run --bin sch-regc -- compile \
  registry/controls.core.json \
  runtime_cpp/include/sch_hw/

# Output:
# ✓ Generated C++ header: registry.gen.hpp
# ✓ Generated hash table: registry_hashes.json
```

### 4. Build C++ SDK

```bash
cd runtime_cpp

mkdir build && cd build
cmake ..
make -j$(sysctl -n hw.ncpu)

# Run tests
./test/sch_hw_tests
```

### 5. Build Your Own Module

```bash
# 1. Create manifest
cat > my_module/manifest.json << EOF
{
  "schema": "sch-hw-manifest/1",
  "model": "my_control_surface",
  "power_class": "P2",
  "capabilities": {
    "inputs": [
      { "id": "knob.0", "type": "continuous", "resolution": 12 }
    ],
    "outputs": [
      { "id": "led.0", "type": "pwm", "channels": 1 }
    ]
  }
}
EOF

# 2. Validate
sch-hw validate my_module/manifest.json

# 3. Implement firmware (Zephyr RTOS or PlatformIO)
# 4. Create layout binding
# 5. Test with virtual simulation
```

---

## Testing

### Unit Tests

**C++ Tests** (Catch2):
```bash
cd runtime_cpp/build
./test/sch_hw_tests
```

**Rust Tests**:
```bash
cd tools_rust
cargo test
```

**Python Tests** (pytest):
```bash
cd tools_py
pytest
```

### Integration Tests

**Hardware-in-the-Loop**:
```bash
# Connect module via USB
# Run enumeration test
sch-hw test enum

# Run control flow test
sch-hw test control-flow

# Run feedback test
sch-hw test feedback-flow
```

### Virtual Simulation

**Mock Transport**:
```bash
# Run virtual module simulation
sch-hw sim examples/virtual_modules/control_knobs_8_sim.json
```

---

## Documentation

### Platform Documentation
- **SDK Guide**: `hardware/SDK.md`
- **Platform Overview**: `hardware/platform/README.md`
- **Bus Specification**: `hardware/docs/specifications/sch-bus-1.md`

### Implementation Documentation
- **Reference Hardware Plan**: `hardware/plans/reference-hardware-implementation.md`
- **Foundational Research**: `hardware/docs/architecture/foundational-platforms-research.md`

### Integration Documentation
- **White Room Integration**: `../ingest/hardware_ingest.md`
- **Main README**: `../README.md` (hardware section)

---

## Integration with White Room

### JUCE Backend (C++ Audio Engine)
- Hardware Host connects via `IEngineSink` interface
- Control events map to DSP parameters
- Same control registry used for automation

### SDK (TypeScript Definitions)
- Control IDs mirror TypeScript interfaces
- Shared semantic model across platforms

### Swift Frontend (SwiftUI Interface)
- Same Control Registry for UI controls
- Layout bindings work for both hardware and software UI

### DAW Control (Python Integration)
- Hardware modules accessible via DAW control
- MIDI fallback using same control IDs

---

## Contributing

### Issue Tracking
All work tracked via Beads (bd):
```bash
# Check for existing work
bd ready --json

# Create new issue
bd create "Design new control module"

# Close issue (triggers Confucius auto-learning)
bd close hardware-1
```

### Code Style
- **C++**: Google C++ Style Guide
- **Rust**: rustfmt + clippy
- **Python**: PEP 8 + black
- **JSON**: 2-space indentation

### Pull Requests
1. Create feature branch from main
2. Make changes with descriptive commits
3. Run validation: `sch-hw validate`
4. Run tests: `cargo test && pytest`
5. Submit PR with description

---

## Philosophy

> **The hardware platform is a capability-driven, bus-connected, layout-bound projection layer over the same semantic control registry used everywhere else.**

That's how you get:
- ✅ Universality
- ✅ Longevity
- ✅ Remixability
- ✅ Zero rewrites
- ✅ Infinite form factors

**Hardware is now a platform, not a product.**

The question isn't "what hardware should we build?"
The question is "what modules will we plugin?"

---

## Status

**Platform SDK v1**: COMPLETE ✅
**Reference Hardware**: PLANNING COMPLETE ✅ → EXECUTION 🚧

**Next Steps**:
1. Build reference hardware (control_knobs_8_ref)
2. Complete Rust compilers (sch-layc, sch-manf)
3. Implement USB/UART transports
4. Connect Host to White Room engine

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**
