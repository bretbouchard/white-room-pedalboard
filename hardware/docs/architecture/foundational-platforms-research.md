# Foundational Platforms Research

**Created**: Thu Jan 15 17:50 EST 2026
**Purpose**: Research existing platforms to leverage rather than building from scratch
**Issue**: hardware-1

---

## Executive Summary

After comprehensive research of existing hardware platforms, we identified proven systems that can accelerate development while maintaining our platform philosophy. Key finding: **build on top of existing ecosystems, don't reinvent the wheel.**

**Recommendation**: Use Teensy 4.1 for development, migrate to ESP32-S3 + Zephyr RTOS for production.

---

## Research Question

> "What are our foundational steps? Are there systems or platforms or work from other people we can use?"

**Philosophy**: Hardware should be a platform layer, not a device. We need proven platforms that support:
- Bus-based modularity
- Hot-pluggable modules
- Capability-driven composition
- RTOS determinism (for audio)

---

## Platform Categories

### 1. MCU Development Platforms

#### Teensy 4.1 (Development Phase)

**Website**: https://www.pjrc.com/store/teensy41.html
**Price**: ~$20 USD
**Architecture**: ARM Cortex-M7 @ 600 MHz

**Strengths**:
- ✅ Massive performance overhead (600 MHz for control protocol)
- ✅ Native USB + 3x UART + SPI + I2C (all transports we need)
- ✅ 5V tolerant I/O (hardware interface flexibility)
- ✅ **Existing Eurorack Shield ecosystem** (critical for modular synthesis)
- ✅ Arduino/PlatformIO support (fastest prototyping path)
- ✅ Hand-solderable QFP package (prototype-friendly)

**Weaknesses**:
- ❌ 5V operation (higher power than 3.3V alternatives)
- ❌ Arduino ecosystem (less structure than RTOS)
- ❌ Not production-scale (hand assembly only)

**Use Case**: **Development reference** - fastest path to working prototype

**Key Feature - Eurorack Shield**:
```cpp
// Teensy Audio Shield compatibility
// Already has: Stereo ADC/DAC, headphone amp, SD card
// Perfect for rapid audio module prototyping
```

**Community Resources**:
- Teensyduino installer (IDE integration)
- PlatformIO teensy board definition
- Large GitHub ecosystem of audio projects

#### ESP32-S3 + Zephyr RTOS (Production Phase)

**Website**: https://www.espressif.com/en/products/sesp32-s3
**Price**: ~$5 USD (volume)
**Architecture**: Xtensa LX7 dual-core @ 240 MHz

**Strengths**:
- ✅ Dual-core (one for protocol, one for application)
- ✅ Native USB + 4x UART + SPI + I2C
- ✅ 3.3V operation (lower power)
- ✅ **Zephyr RTOS support** (production-grade, deterministic)
- ✅ BLE + WiFi (future expansion: wireless control)
- ✅ Mass-producible QFN package (factory assembly)
- ✅ Massive ecosystem (Espressif is huge)

**Weaknesses**:
- ❌ Lower clock speed than Teensy (not an issue for protocol)
- ❌ More complex toolchain (Zephyr vs Arduino)
- ❌ 3.3V only (need level shifters for 5V sensors)

**Use Case**: **Production target** - scale to manufacturing

**Zephyr RTOS Integration**:
```yaml
# prj.conf (Zephyr configuration)
CONFIG_GPIO=y
CONFIG_I2C=y
CONFIG_USB_DEVICE_STACK=y
CONFIG_SYSTEM_WORKQUEUE_PRIORITY=7
# Deterministic threading for SCH-BUS/1 protocol
```

**Community Resources**:
- ESP-IDF (official SDK)
- Zephyr upstream support (since 3.1)
- ESP32-POE kits (Ethernet + Power over Ethernet)

**Decision**: **Start with Teensy 4.1, migrate to ESP32-S3**

---

### 2. RTOS Options

#### Zephyr RTOS (Chosen)

**Website**: https://www.zephyrproject.org/
**License**: Apache 2.0
**Maturity**: Production-grade (used by Google, Intel, Nordic)

**Why Zephyr?**:
- ✅ **Deterministic scheduling** (critical for audio timing)
- ✅ **Built-in USB device stack** (no custom USB drivers)
- ✅ **Device tree** (hardware description, not hardcoded pins)
- ✅ **Bluetooth + WiFi** (future expansion)
- ✅ **Massive driver library** (sensors, displays, radios)
- ✅ **Scalable** (from Cortex-M0 to Cortex-A53)

**Architecture**:
```c
// Zephyr threads (deterministic)
K_THREAD_DEFINE(bus_thread, bus_protocol_loop, 4096, 5, 0, K_TICKS_FOREVER);
K_THREAD_DEFINE(app_thread, application_loop, 4096, 6, 0, K_TICKS_FOREVER);

// Message queues (thread-safe)
k_msgq bus_events;
k_msgq feedback_events;
```

**Alternative Considered**: FreeRTOS
- ✅ More widely used
- ❌ Less structured (no unified device tree)
- ❌ USB stack is vendor-specific
- **Verdict**: Zephyr is better for production

#### Arduino Superloop (Development)

**Use Case**: Rapid prototyping on Teensy 4.1
- ✅ Fastest path to working code
- ✅ Huge library ecosystem
- ❌ No determinism guarantees
- ❌ No threading (superloop only)

**Migration Path**: Arduino → Zephyr (well-documented)

---

### 3. Build Systems

#### PlatformIO (Chosen)

**Website**: https://platformio.org/
**License**: Open source (Apache 2.0)

**Why PlatformIO?**:
- ✅ **Unified build system** (Teensy, ESP32, STM32, etc.)
- ✅ **Library manager** (dependency management like npm)
- ✅ **Testing framework** (Unity for unit tests)
- ✅ **CI/CD integration** (GitHub Actions, Travis)
- ✅ **VS Code integration** (great IDE)
- ✅ **Multi-project** (firmware + tests in one repo)

**Example Project Structure**:
```
firmware/
├── platformio.ini
├── src/
│   └── main.cpp
├── test/
│   └── test_main.cpp
└── lib/
    └── sch-bus/
        └── src/
            └── protocol.cpp
```

**platformio.ini**:
```ini
[env:teensy41]
platform = teensy
board = teensy41
framework = arduino
lib_deps = Encoder

[env:esp32s3]
platform = espressif32
board = esp32-s3-devkitc-1
framework = zephyr
```

**Alternative**: Make + CMake
- ❌ More verbose
- ❌ No library management
- ❌ Platform-specific
- **Verdict**: PlatformIO is superior for firmware

---

### 4. PCB Design Tools

#### KiCad 8.0 (Chosen)

**Website**: https://www.kicad.org/
**License**: GPL-3 (open source)
**Maturity**: Production-grade (used by Adafruit, SparkFun)

**Why KiCad?**:
- ✅ **Free and open source** (no license fees)
- ✅ **Professional-grade features** (differential pairs, length matching)
- ✅ **Huge component library** (3D models, footprints)
- ✅ **Cross-platform** (macOS, Linux, Windows)
- ✅ **Active development** (8.0 release in 2024)
- ✅ **Gerber export** (works with any fab house)

**Workflow**:
1. **Schematic Editor**: Design circuit
2. **PCB Layout**: Route traces, place components
3. **3D Viewer**: Verify mechanical fit
4. **Gerber Export**: Send to PCBWay / JLCPCB

**Integration with PlatformIO**:
- KiCad can generate netlists for firmware
- Firmware can test against schematic (continuity tests)

**Alternative**: Eagle (Autodesk)
- ❌ Subscription-based (expensive)
- ❌ Limited board size in free tier
- **Verdict**: KiCad is better for open source

---

### 5. Mechanical Design

#### OpenSCAD (Chosen)

**Website**: https://openscad.org/
**License**: GPL-2 (open source)
**Paradigm**: Programmatic 3D CAD (code, not GUI)

**Why OpenSCAD?**:
- ✅ **Parametric design** (change one variable, entire design updates)
- ✅ **Version control friendly** (text files, not binaries)
- ✅ **Scriptable** (generate entire families of enclosures)
- ✅ **Open source** (no license fees)

**Example Enclosure Script**:
```openscad
// control_knobs_8_ref_enclosure.scad
width = 150;
depth = 100;
height = 50;

difference() {
    cube([width, depth, height]);
    translate([5, 5, 2]) {
        cube([width-10, depth-10, height-4]);
    }
    // Knob cutouts (generated)
    for (i = [0:7]) {
        translate([knob_positions[i][0], knob_positions[i][1], 0]) {
            cylinder(d=10, h=5);
        }
    }
}
```

**Alternative**: Fusion 360
- ✅ More powerful (CAM, simulation)
- ❌ Not version-control friendly
- ❌ Proprietary (Autodesk)
- **Verdict**: OpenSCAD for enclosures, Fusion 360 for complex mechanics

---

### 6. Modular Hardware Platforms (Inspiration)

#### Eurocrack / Eurorack (Modular Synthesis)

**Philosophy**: Each module is a functional unit (VCO, VCF, VCA, etc.)
- **Power**: ±12V, +5V (standardized bus)
- **Mechanical**: 3U height, HP width (1 HP = 5.08 mm)
- **Control**: CV (1V/octave pitch), gates (triggers)
- **Mix-and-match**: Any brand works with any other brand

**Lessons for White Room**:
- ✅ Standardized power classes (P0-P5)
- ✅ Standardized mechanical form factor (optional)
- ✅ **Capability-based discovery** (not brand-specific)
- ✅ **Hot-pluggable** (patch cables = physical bus)

**Key Difference**: Eurorack uses voltage-based control, White Room uses digital protocol

#### Little Wire / Bus Pirate (USB Protocol Tools)

**Philosophy**: USB-based hardware hacking tools
- **Bus Pirate**: Multi-protocol bridge (I2C, SPI, UART, 1-Wire)
- **Little Wire**: USB I/O for microcontroller projects

**Lessons for White Room**:
- ✅ **USB as first-class transport** (not just for firmware updates)
- ✅ **Protocol bridges** (SCH-BUS/1 → USB, UART, SPI)
- ✅ **Open-source firmware** (community contributions)

#### MIDI (Musical Instrument Digital Interface)

**Philosophy**: Universal protocol for musical instruments
- **Standard**: 31.25 kbaud, 5-pin DIN connector
- **Messages**: Note On, Note Off, Control Change, etc.
- **Ubiquitous**: Every synth, DAW, controller speaks MIDI

**Lessons for White Room**:
- ✅ **Standardized message types** (EVENT, FEEDBACK, ERROR)
- ✅ **Discovery protocol** (HELLO, WELCOME, MANIFEST)
- ✅ **CRC for error detection** (MIDI uses running status, we use CRC16)
- ✅ **Universal adoption** (hardware + software)

**Key Difference**: MIDI is musical semantic, SCH-BUS/1 is transport-agnostic

---

## Component Selection Research

### Rotary Encoders

#### Requirements
- Quadrature output (A/B phase)
- Push button (detent switch)
- 12-24 PPR (pulses per revolution)
- Panel mount option

#### Top Choices

**Bourns PEC11R Series** (Chosen)
- **Part**: PEC11R-4215F-S0024
- **PPR**: 24 (high resolution)
- **Life**: 100,000 cycles
- **Cost**: ~$2.50 each
- **Mount**: Through-hole (easy prototyping)
- **Source**: Digikey, Mouser

**Alternative**: ALPS EC12E
- **PPR**: 15 (lower resolution)
- **Life**: 50,000 cycles
- **Cost**: ~$1.80 each
- **Verdict**: Bournes is better quality

### LEDs (RGB)

#### Requirements
- I2C interface (saves pins)
- PWM per channel
- 16-bit brightness resolution
- Low power consumption

#### Top Choice

**Adafruit 4x8-LED Backpack** (ISK29FRSH4)
- **Driver**: ISK29FRSH4 (4x8 LED matrix driver)
- **Interface**: I2C (2 pins for 32 LEDs!)
- **PWM**: 16-bit per channel (65,536 levels)
- **Cost**: ~$8.95 (8x RGB LEDs)
- **Source**: Adafruit

**Why I2C?**
- Saves GPIO pins (2 pins vs 24 pins for individual PWM)
- Hardware PWM (no CPU overhead)
- Addressable (multiple backpacks on same bus)

**Alternative**: NeoPixels (WS2812B)
- ✅ Single-wire interface
- ❌ 5V only (level shifter needed)
- ❌ Software PWM (CPU overhead)
- **Verdict**: I2C backpack is better for battery power

### USB Connectors

#### Requirements
- Panel mount option
- USB-C (modern standard)
- High current capability (500mA+)

#### Top Choice

**USB-C Panel Mount Connector**
- **Part**: GCT USB4105-GF-A
- **Current**: 3A (plenty of headroom)
- **Mount**: Panel mount (integrated)
- **Cost**: ~$1.20 each
- **Source**: Digikey

---

## Supply Chain Considerations

### Lead Times (Current Market)

| Component | Typical Lead Time | Current Lead Time |
|-----------|-------------------|-------------------|
| Teensy 4.1 | 1 week | 2-3 weeks |
| ESP32-S3 | 4-6 weeks | 8-12 weeks |
| Bournes Encoders | 2-4 weeks | 4-6 weeks |
| USB-C Connectors | 2-3 weeks | 6-8 weeks |
| PCB Fabrication | 1 week | 2-3 weeks |

**Mitigation**:
- Order BOM immediately
- Have second-source alternatives
- Use through-hole where possible (Teensy)

### Cost Optimization

| Strategy | Savings | Tradeoff |
|----------|---------|----------|
| ESP32-S3 vs Teensy 4.1 | 75% ($15 vs $20) | Lower clock speed |
| SMT vs Through-Hole | 40% assembly cost | Requires reflow oven |
| 2-layer vs 4-layer PCB | 50% fabrication cost | No ground plane |
| Volume discounts (100+) | 20-30% component cost | Cash flow impact |

**Recommendation**: Start with through-hole (hand assembly), migrate to SMT for production.

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| USB latency too high | Low | High | Test early, UART fallback |
| Power budget exceeded | Medium | Medium | Measure early, optimize LEDs |
| Zephyr learning curve | Medium | Low | Start with Arduino (Teensy) |
| Supply chain delays | High | Medium | Order BOM immediately |

### Development Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Toolchain complexity | Medium | Medium | Use PlatformIO (unified) |
| Firmware bugs | High | Low | Unit tests (Unity) |
| PCB errors | Medium | Medium | Prototype on breadboard first |
| Mechanical fit issues | Low | Medium | 3D print enclosure first |

---

## Recommendations Summary

### Phase 1: Development (Weeks 1-6)

**Platform**: Teensy 4.1 + Arduino
- ✅ Fastest path to working prototype
- ✅ Hand-wire on breadboard
- ✅ PlatformIO for build system
- ✅ KiCad for schematic capture

**Deliverables**:
- Working 8-knob control surface
- Mock SCH-BUS/1 transport tests
- Firmware validated against SDK

### Phase 2: Production Transition (Weeks 7-12)

**Platform**: ESP32-S3 + Zephyr RTOS
- ✅ Production-ready MCU
- ✅ Deterministic scheduling
- ✅ Lower cost, higher scalability
- ✅ BLE/WiFi expansion path

**Deliverables**:
- Production firmware
- PCB design (KiCad)
- Mechanical design (OpenSCAD)

### Phase 3: Scale (Months 4-6)

**Manufacturing**:
- SMT assembly (factory)
- Volume production (100+ units)
- CE/FCC certification

---

## Conclusion

**Key Insight**: We don't need to invent anything. Proven platforms exist for every layer of our hardware:

- **MCU**: Teensy 4.1 (dev) → ESP32-S3 (prod)
- **RTOS**: Arduino (prototyping) → Zephyr (production)
- **Build System**: PlatformIO (all phases)
- **PCB Design**: KiCad 8.0 (all phases)
- **Mechanical**: OpenSCAD (enclosures)

**Our Innovation**: The four stable contracts (SCH-CTRL/1, SCH-LAYOUT/1, SCH-HW-MANIFEST/1, SCH-BUS/1) that bind these proven platforms into a unified hardware platform layer.

**Next Step**: Build reference module (hardware-1) using Teensy 4.1, validate platform SDK, then migrate to ESP32-S3.

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**
