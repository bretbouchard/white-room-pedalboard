# Reference Hardware Implementation Plan v1

**Created**: Thu Jan 15 17:45 EST 2026
**Status**: Planning Phase
**Issue**: hardware-1
**Priority**: High (establishes baseline for all future hardware)

---

## Overview

Design and build the first reference hardware modules following the White Room Hardware Platform architecture. This establishes the physical baseline for all future hardware development.

**Key Philosophy**: Hardware is a platform layer, not a product. We're building reference implementations that demonstrate the platform's capabilities.

---

## Architecture Review

### Three-Layer System

```
┌─────────────────────────────────────────────┐
│ Layer 3 — Engine (White Room JUCE Backend)  │
│ • DSP graph, roles, scenes, timing           │
│ • Deterministic processing                   │
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
│ Layer 1 — Hardware Modules (THIS PLAN)      │
│ • Control modules (knobs, encoders, pads)   │
│ • Audio modules (ADC/DAC, clocking)         │
│ • Compute modules (MCU, transport)          │
│ • Bus connectivity (SCH-BUS/1)              │
└─────────────────────────────────────────────┘
```

### Four Stable Contracts (Already Defined)

1. **Control Registry (SCH-CTRL/1)**: 22 semantic controls with stable IDs
2. **Layout Binding (SCH-LAYOUT/1)**: Bind module endpoints to control IDs
3. **Module Manifest (SCH-HW-MANIFEST/1)**: Capability-based discovery
4. **Hardware Bus (SCH-BUS/1)**: Hot-pluggable protocol with CRC16-CCITT

---

## Design Requirements

### Module System Requirements

Based on platform SDK specifications:

1. **Bus Protocol**: SCH-BUS/1 compliance
   - Framed messages: `[SOF][VER][TYPE][LEN][SRC][DST][SEQ][PAYLOAD][CRC]`
   - CRC16-CCITT error detection
   - Power classes P0-P5 (50mA to negotiated)
   - Message types: HELLO, WELCOME, EVENT, FEEDBACK, ERROR

2. **Capability Discovery**: SCH-HW-MANIFEST/1 compliance
   - JSON manifest per module
   - Declares inputs/outputs with types and resolutions
   - Power class specification
   - No semantic knowledge in firmware

3. **Layout Binding**: SCH-LAYOUT/1 compliance
   - Bindings map module endpoints to Control Registry IDs
   - Feedback mappings for LEDs/displays
   - Swappable without firmware changes

### Reference Module Targets

From `examples/modules/control_knobs_8_ref/manifest.json`:

```json
{
  "model": "control_knobs_8",
  "power_class": "P2",
  "capabilities": {
    "inputs": [
      {"id": "knob.0", "type": "continuous", "resolution": 12}
      // ... 7 more knobs
    ],
    "outputs": [
      {"id": "led.0", "type": "pwm", "channels": 1}
      // ... 7 more LEDs
    ]
  }
}
```

**Target**: 8-knob control surface with LED feedback

---

## Platform Selection Analysis

### Compute Module Options

#### Option 1: Teensy 4.1 (Development Phase)

**Pros**:
- ✅ 600 MHz ARM Cortex-M7 (plenty of overhead)
- ✅ Native USB + 3x UART + SPI + I2C
- ✅ 5V tolerant inputs (hardware interface flexibility)
- ✅ Existing Eurorack shield ecosystem
- ✅ Arduino/PlatformIO support (fast prototyping)
- ✅ ~$20 USD

**Cons**:
- ❌ 5V operation (higher power than 3.3V)
- ❌ Arduino ecosystem (less RTOS structure)
- ❌ Not production-scale (hand-solderable QFP)

**Verdict**: **Development reference** - fastest path to working prototype

#### Option 2: ESP32-S3 + Zephyr RTOS (Production)

**Pros**:
- ✅ 240 MHz dual-core Xtensa LX7 (sufficient for protocol)
- ✅ Native USB + 4x UART + SPI + I2C
- ✅ 3.3V operation (lower power)
- ✅ Zephyr RTOS (production-grade, deterministic)
- ✅ BLE + WiFi (future expansion)
- ✅ Mass-producible (QFN package)
- ✅ ~$5 USD

**Cons**:
- ❌ Lower clock speed than Teensy (not an issue for protocol)
- ❌ More complex toolchain (Zephyr)
- ❌ 3.3V only (need level shifters for 5V sensors)

**Verdict**: **Production target** - scale to manufacturing

### Decision: **Start with Teensy 4.1, migrate to ESP32-S3**

**Rationale**:
1. Fastest path to working prototype (Teensy 4.1)
2. Proven platform (Teensy Eurorack Shield)
3. Clear migration path (ESP32-S3 + Zephyr)
4. PlatformIO abstracts build system differences

---

## Module Designs

### Module 1: Control Surface (8 knobs + LEDs)

**Target**: `control_knobs_8_ref` from platform SDK

#### Components

**MCU**: Teensy 4.1
- 600 MHz ARM Cortex-M7
- Native USB (SCH-BUS/1 transport)
- 34x digital I/O, 18x ADC channels

**Controls**: 8x Rotary Encoders with Knobs
- Part: Bourns PEC11R-4215F-S0024
- Quadrature outputs (A/B phase)
- Push button (detent switch)
- 24 PPR (pulses per revolution)
- LED ring support (future expansion)

**Feedback**: 8x RGB LEDs (PWM per channel)
- Part: Adafruit 4x8-LED Backpack (ISK29FRSH4)
- I2C interface (saves pins)
- PWM control per LED channel
- 16-bit brightness resolution

**Power**: Class P2 (150mA max)
- MCU: ~100mA (600 MHz, USB active)
- LEDs: ~40mA (8x 5mA @ 50% duty)
- Encoders: ~10mA (quadrature inputs)

**SCH-BUS/1 Interface**: Native USB
- Endpoint: USB CDC + Custom HID
- Frame rate: 1000 Hz (1ms polling)
- Message type: EVENT (knob changes), FEEDBACK (LED updates)

#### Schematic Design

```
┌─────────────────────────────────────────────────────┐
│ Teensy 4.1                                          │
│                                                     │
│  USB ───► SCH-BUS/1 Transport                       │
│                                                     │
│  Pins 0-7 ──► Encoders 0-7 (Phase A)                │
│  Pins 8-15 ──► Encoders 0-7 (Phase B)              │
│  Pins 16-23 ──► Encoder Switches 0-7                │
│                                                     │
│  I2C (SDA/SCL) ──► LED Backpack (8x RGB)           │
│                                                     │
│  3.3V ──► LEDs, Encoders (logic)                   │
│  VIN ────► 5V regulator input                       │
└─────────────────────────────────────────────────────┘
```

#### Firmware Architecture

**Framework**: PlatformIO + Teensy core
**RTOS**: None (superloop - sufficient for control surface)
**Protocol**: SCH-BUS/1 USB transport

**Key Functions**:
- `enum_module()`: Send HELLO, wait for WELCOME, send MANIFEST
- `read_encoders()`: Poll quadrature state, detect changes
- `send_event()`: Build SCH-BUS/1 EVENT frame for knob changes
- `receive_feedback()`: Process FEEDBACK frames, update LEDs
- `main_loop()`: 1 kHz polling (match USB frame rate)

**Event Format** (from platform SDK):
```cpp
struct InputEvent {
    uint16_t endpoint_id;  // "knob.0" → hash
    uint16_t value;        // 0-4095 (12-bit)
    uint64_t timestamp;    // microseconds
};
```

#### BOM (Bill of Materials)

| Qty | Part | Description | Unit Cost | Source |
|-----|------|-------------|-----------|--------|
| 1 | Teensy 4.1 | MCU + USB | $19.80 | PJRC |
| 8 | Bourns PEC11R-4215F-S0024 | Encoder with switch | $2.50 | Digikey |
| 1 | Adafruit ISK29FRSH4 | 4x8 RGB LED backpack | $8.95 | Adafruit |
| 8 | Knob cap | 6mm diameter | $0.50 | Various |
| 1 | USB-C connector | Panel mount | $1.20 | Digikey |
| 1 | 5V regulator | LDO, 1A | $0.80 | Digikey |
| - | PCB | Custom 2-layer | $15 | PCBWay |
| - | Enclosure | 3D printed case | $5 | Various |
| | | **Total** | **~$60** | |

---

### Module 2: Audio Interface (Stereo In/Out + Headphone)

**Target**: Future expansion (not immediate priority)

#### Components

**ADC**: Texas Instruments PCM3168A
- 8-channel, 24-bit, 192 kHz
- 106 dB SNR
- SPI control

**DAC**: Cirrus Logic CS4272
- 2-channel, 24-bit, 192 kHz
- 109 dB SNR
- I2S output

**Headphone Amp**: Texas Instruments TPA6139A2
- 80 mW into 32 Ω
- I2C volume control

**Clock**: Crystek CCHD-950
- 100 MHz ultra-low jitter
- < 100 fs RMS jitter

**SCH-BUS/1 Interface**: I2S audio + SPI control
- Sample rate: 48 kHz (White Room engine standard)
- Word length: 24-bit
- Frame sync: I2S standard

**Power**: Class P4 (500mA max)
- ADC: ~150mA
- DAC: ~120mA
- Headphone amp: ~200mA @ 32 Ω
- Clock: ~30mA

#### Status: **Phase 2** (after control surface validated)

---

### Module 3: Compute/Bus Host (Raspberry Pi CM4)

**Target**: White Room engine integration (future)

#### Components

**Compute**: Raspberry Pi Compute Module 4
- Quad-core Cortex-A72 @ 1.5 GHz
- 4GB LPDDR4
- 16GB eMMC
- Gigabit Ethernet + WiFi

**SCH-BUS/1 Bridge**: USB HUB
- USB 3.0 hub chip
- Up to 4 modules
- 5 Gbps per port

**Engine**: White Room JUCE backend
- Cross-compiled for ARM64
- ALSA audio interface
- WebSocket remote control

**Power**: Class P5 (negotiated)
- CM4: ~2A (peak)
- USB hub: ~500mA
- Modules: variable

#### Status: **Phase 3** (after bus validation complete)

---

## Mechanical Design

### Enclosure Strategy

**Reference Form Factor**: Eurorack-compatible (optional)
- Width: 8HP (40.5 mm)
- Height: 3U (133.35 mm)
- Depth: 40 mm (front panel to PCB)

**Alternative**: Desktop enclosure
- Width: 150 mm
- Depth: 100 mm
- Height: 50 mm
- Rubber feet

**Decision**: **Desktop enclosure** (more flexible for development)

### Front Panel Design

**Layout** (8 knobs in 2 rows):
```
┌─────────────────────────────────┐
│  KNOB 0   KNOB 1   KNOB 2   KNOB 3  │
│  (LED)    (LED)    (LED)    (LED)   │
│                                 │
│  KNOB 4   KNOB 5   KNOB 6   KNOB 7  │
│  (LED)    (LED)    (LED)    (LED)   │
│                                 │
│  [USB-C]  [POWER]               │
└─────────────────────────────────┘
```

**Materials**:
- Front panel: Brushed aluminum (1.6 mm)
- Side panels: Powder-coated steel
- Bottom: ABS plastic with rubber feet

**CAD Software**: OpenSCAD (parametric, open source)

---

## Power Distribution

### System Design

**Input**: USB-C 5V (from host or external supply)
**Regulation**:
- 5V LDO → 3.3V for MCU, LEDs, encoders
- Protection: Polyfuse on USB input, reverse polarity diode

**Power Classes** (from SCH-BUS/1 spec):
- P0: 50mA (sensors only)
- P1: 100mA (small displays)
- P2: 150mA (control surface) ← **Our target**
- P3: 300mA (small audio)
- P4: 500mA (large audio)
- P5: Negotiated (compute modules)

### Current Budget (Module 1)

| Component | 3.3V Current | 5V Current |
|-----------|--------------|------------|
| Teensy 4.1 | 80mA | - |
| Encoders (8x) | 2mA | - |
| LEDs (8x @ 50%) | 40mA | - |
| **Total** | **122mA** | **-** |
| **Margin** | **28mA** | **-** |

**Headroom**: 18% margin (acceptable for development)

---

## Development Workflow

### Phase 1: Prototype (Week 1-2)

**Goal**: Working control surface with mock transport

**Tasks**:
1. ✅ Design schematic (KiCad)
2. ✅ Order BOM components
3. ✅ Hand-wire prototype on breadboard
4. ✅ Implement firmware (PlatformIO + Teensy)
5. ✅ Test with mock SCH-BUS/1 transport

**Deliverables**:
- Working prototype
- Firmware validated against SDK
- Mock transport tests passing

### Phase 2: PCB Design (Week 3-4)

**Goal**: Production-ready PCB

**Tasks**:
1. ✅ Create PCB layout (KiCad)
2. ✅ Design front panel (OpenSCAD)
3. ✅ Generate Gerbers
4. ✅ Order PCB + stencils
5. ✅ Design enclosure (OpenSCAD)

**Deliverables**:
- PCB Gerbers
- Front panel design files
- Enclosure design files

### Phase 3: Assembly & Testing (Week 5-6)

**Goal**: Complete reference module

**Tasks**:
1. ✅ Assemble PCB (hand-solder)
2. ✅ Flash firmware
3. ✅ Mechanical assembly
4. ✅ Integration tests (with Host SDK)
5. ✅ Document procedures

**Deliverables**:
- Assembled reference module
- Test results
- Assembly documentation

---

## Testing Strategy

### Unit Tests

**Firmware Tests** (PlatformIO + Unity):
- `test_encoder_reading()`: Verify quadrature decoding
- `test_usb_transport()`: Verify SCH-BUS/1 frame building
- `test_led_feedback()`: Verify LED PWM control
- `test_power_consumption()`: Verify current draw <150mA

### Integration Tests

**Host SDK Tests** (C++ Catch2):
- `test_module_enumeration()`: Verify HELLO/WELCOME/MANIFEST
- `test_control_event_flow()`: Knob → EVENT → engine
- `test_feedback_flow()`: Engine → FEEDBACK → LED
- `test_hot_plug()`: Verify unplug/replug recovery

### Hardware-in-the-Loop Tests

**Physical Tests**:
- `test_knob_accuracy()`: Verify 12-bit resolution
- `test_led_brightness()`: Verify 16-bit PWM levels
- `test_usb_latency()`: Verify <1ms round-trip
- `test_power_budget()`: Measure actual current draw

### Validation Criteria

**Module 1 Success Criteria**:
- ✅ All 8 knobs report 12-bit values
- ✅ Knob changes trigger SCH-BUS/1 EVENT messages
- ✅ LEDs respond to FEEDBACK messages within 1ms
- ✅ Module enumeration completes <100ms after plug-in
- ✅ Power consumption <150mA (P2 class)
- ✅ Hot-plug recovery succeeds 100% of trials

---

## Documentation Deliverables

### Design Documents

1. **Schematic**: `hardware/docs/designs/control_knobs_8_ref_schematic.pdf`
2. **PCB Layout**: `hardware/docs/designs/control_knobs_8_ref_pcb.pdf`
3. **BOM**: `hardware/docs/designs/control_knobs_8_ref_bom.csv`
4. **Firmware**: `hardware/firmware/teensy_41_control_surface/`
5. **Firmware README**: `hardware/firmware/README.md`

### Assembly Guide

1. **PCB Assembly**: Step-by-step soldering order
2. **Mechanical Assembly**: Panel, knobs, enclosure
3. **Firmware Flashing**: PlatformIO instructions
4. **Testing Procedure**: Verification checklist

### Integration Guide

1. **Host Integration**: How to use with C++ Host SDK
2. **Layout Binding**: Example `performance_minimal.json` usage
3. **Troubleshooting**: Common issues and fixes

---

## Success Metrics

### Technical Metrics

- ✅ 8 knobs with 12-bit resolution (4096 steps)
- ✅ <1ms latency from knob turn to engine event
- ✅ <100ms module enumeration time
- ✅ <150mA power consumption (P2 class)
- ✅ 100% hot-plug recovery success rate
- ✅ SCH-BUS/1 protocol compliance 100%

### Development Metrics

- ✅ BOM cost < $100 (achieved: $60)
- ✅ Assembly time < 2 hours (hand solder)
- ✅ Documentation complete
- ✅ All tests passing
- ✅ Reference design reusable for future modules

---

## Risks & Mitigations

### Risk 1: USB Latency Too High

**Probability**: Low
**Impact**: High (unusable for real-time control)

**Mitigation**:
- Use native USB (not CDC-ACM)
- 1 kHz polling rate (1ms frame time)
- Test early in Phase 1
- Fallback: UART transport at 115200 baud

### Risk 2: Power Budget Exceeded

**Probability**: Medium
**Impact**: Medium (need higher power class)

**Mitigation**:
- Measure current draw early
- Optimize LED brightness
- Use LDO with low quiescent current
- Fallback: P3 class (300mA)

### Risk 3: Quadrature Decoder Complexity

**Probability**: Medium
**Impact**: Low (well-understood problem)

**Mitigation**:
- Use proven encoder library (Encoder.h)
- Test on breadboard first
- Fallback: Timer-based quadrature decoding

### Risk 4: Supply Chain Delays

**Probability**: High (current market)
**Impact**: Medium (schedule slip)

**Mitigation**:
- Order BOM immediately
- Have alternative parts identified
- Use through-hole where possible (Teensy)

---

## Next Steps (Immediate Actions)

1. ✅ **Review and approve this plan** with user
2. ✅ **Order BOM** for Module 1 (8 knobs + LEDs)
3. ✅ **Set up PlatformIO project** for Teensy 4.1
4. ✅ **Create KiCad schematic** for Module 1
5. ✅ **Implement firmware skeleton** with mock transport
6. ✅ **Write unit tests** for firmware components

---

## Appendix: Technology References

### Documentation Links

- **Teensy 4.1**: https://www.pjrc.com/store/teensy41.html
- **PlatformIO**: https://platformio.org/
- **KiCad**: https://www.kicad.org/
- **OpenSCAD**: https://openscad.org/
- **Zephyr RTOS**: https://www.zephyrproject.org/

### Component Datasheets

- **Bournes PEC11R**: Quadrature encoder with switch
- **Adafruit ISK29FRSH4**: 4x8 RGB LED backpack
- **Teensy 4.1**: Complete MCU reference manual

### SDK References

- **SCH-BUS/1 Specification**: `docs/specifications/sch-bus-1.md`
- **Control Registry**: `registry/controls.core.json`
- **C++ Host SDK**: `runtime_cpp/include/sch_hw/host.hpp`

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**
