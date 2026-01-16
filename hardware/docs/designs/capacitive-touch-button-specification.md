# Capacitive Touch Button Module Specification

## Overview

Advanced capacitive touch button system using MPR121 touch sensor controller with RGB LED feedback. Designed for premium tactile response, velocity sensitivity, and visual feedback.

**Key Features:**
- 12-channel capacitive touch per MPR121
- Velocity-sensitive response (pressure mapping)
- RGB LED feedback per button
- Multi-touch detection
- configurable touch thresholds
- Auto-calibration on startup

---

## MPR121 Capacitive Touch Controller

### Technical Specifications

**Datasheet**: https://www.nxp.com/docs/en/data-sheet/MPR121.pdf

**Key Features**:
- 12 capacitive touch channels
- I2C interface (up to 400 kHz)
- 3.3V operation (on-board 5V→3.3V LDO)
- Configable touch/release thresholds
- Auto-calibration
- Low power: 29µA typical (1 channel active)
- Overvoltage protection (±8V on electrode pins)

**Electrode Configuration**:
- Electrode capacitance: 10pF typical
- Touch detection threshold: configurable (default 0x0F)
- Release threshold: configurable (default 0x0A)
- Debounce: 4 samples typical
- Filter: soft + medium filtering

### I2C Addressing

**Base Address**: 0x5A (default)

**Address Select Pins** (ADDR0, ADDR1, ADDR2):
```
ADDR2 | ADDR1 | ADDR0 | I2C Address
------+-------+-------+-------------
  0   |   0   |   0   |   0x5A
  0   |   0   |   1   |   0x5B
  0   |   1   |   0   |   0x5C
  0   |   1   |   1   |   0x5D
  1   |   0   |   0   |   0x5E
  1   |   0   |   1   |   0x5F
  1   |   1   |   0   |   0x60
  1   |   1   |   1   |   0x61
```

**Multiple I2C Buses** (Teensy 4.1):
- Wire (primary): 0x5A-0x61 (up to 8 MPR121)
- Wire1 (secondary): 0x5A-0x61 (up to 8 more)
- Wire2 (tertiary): 0x5A-0x61 (up to 8 more)
- **Total**: 24 MPR121 chips = 288 touch channels

---

## Button Module Configurations

### 1. CTB-1x8 (Capacitive Touch Button 1×8)

**Use Case**: 8-button touch strip, step sequencer row

**Panel Size**: 4" × 1" (100mm × 25mm)

**Components**:
- MPR121: 1 (12 channels, use 8)
- RGB LEDs: 8 (APA106-WS or similar)
- Current limiting resistors: 24 (3 per LED: R, G, B)
- Aluminum panel: 1
- Custom PCB: 1

**Touch Electrodes**:
- Material: Copper pads on PCB (12mm diameter)
- Overlay: 2mm polycarbonate or acrylic (clear or frosted)
- Spacing: 15mm center-to-center
- Ground guard ring around each electrode

**LED Integration**:
- RGB LED under touch pad
- Light pipe: 5mm clear acrylic rod (10mm long)
- Diffuser: frosted polycarbonate sheet (1mm)
- Button feel: Smooth polycarbonate surface

**SCH-BUS/1 Capabilities**:
```json
{
  "module_type": "capacitive_touch_button",
  "model": "CTB_1x8_v1",
  "button_count": 8,
  "rgb_leds": true,
  "touch_channels": 8,
  "velocity_sensitive": true
}
```

**Applications**:
- Step sequencer row
- Parameter slider (8 presets)
- Clip launcher
- Transport controls

---

### 2. CTB-2x4 (Capacitive Touch Button 2×4)

**Use Case**: Compact grid, mini drum machine

**Panel Size**: 4" × 2" (100mm × 50mm)

**Components**:
- MPR121: 1 (use 8)
- RGB LEDs: 8
- Aluminum panel: 1
- Custom PCB: 1

**Layout**: 2 rows × 4 columns grid

**Applications**:
- 2-instrument drum machine
- Preset grid (2 banks × 4 presets)
- Mini clip launcher

---

### 3. CTB-8x8 (Capacitive Touch Button 8×8)

**Use Case**: Full drum machine, clip launcher

**Panel Size**: 8" × 8" (200mm × 200mm)

**Components**:
- MPR121: 6 (72 channels, use 64)
- RGB LEDs: 64
- Aluminum panel: 1
- Custom PCB: 1 (multi-layer)

**Power**:
- 5V @ 1.5A typical (all LEDs white = max current)
- 3.3V @ 100mA for MPR121s

**Heat Management**:
- Thermal relief cuts in PCB under LEDs
- Aluminum panel as heat sink
- Current limiting per LED bank (4 banks of 16)

**Applications**:
- 8-instrument drum machine
- 64-clip launcher
- MIDI piano roll
- Parameter grid

---

### 4. CTB-8x16 (Capacitive Touch Button 8×16)

**Use Case**: Full-featured drum machine with 16 steps

**Panel Size**: 16" × 8" (400mm × 200mm)

**Components**:
- MPR121: 11 (132 channels, use 128)
- RGB LEDs: 128
- Aluminum panel: 1 (reinforced)
- Custom PCB: 1 (4-layer)

**Power**:
- 5V @ 3A typical (all LEDs white)
- 3.3V @ 200mA for MPR121s

**Thermal Management**:
- Multiple current-limited LED banks (8 banks)
- Thermal vias to aluminum panel
- Forced airflow (optional 5V fan for all-white scenario)

**Applications**:
- Full drum machine (8 instruments × 16 steps)
- 128-clip launcher
- Large control surface

---

## Touch Electrode Design

### Electrode Configuration

**Physical Layout**:
```
┌─────────────────────────────────┐
│                                 │ ← 2mm polycarbonate overlay
│                                 │
│    ┌──────────────────┐         │
│    │  Copper Pad      │         │ ← 12mm diameter touch pad
│    │  (electrode)     │         │
│    │        ║         │         │
│    │   RGB LED        │         │ ← RGB LED under pad
│    └──────────────────┘         │
│                                 │
│    [Ground Guard Ring]          │ ← Ground ring around pad
└─────────────────────────────────┘
```

**PCB Design**:
- Layer 1 (Top): Touch pads + ground guard
- Layer 2 (GND): Solid ground plane
- Layer 3 (Power): 5V LED power
- Layer 4 (Bottom): LED control signals

**Touch Pad Size**:
- 12mm diameter (113mm² area)
- 0.5mm clearance to ground guard
- 0.2mm trace width to MPR121

**Ground Guard Ring**:
- 2mm wide ring around touch pad
- Connected to solid ground plane
- Via stitching to GND layer
- Reduces parasitic capacitance

**Overlay Materials**:
- **Polycarbonate 2mm**: Excellent touch sensitivity
- **Acrylic 2mm**: Good sensitivity, lower cost
- **Glass 3mm**: Premium feel, lower sensitivity
- **No overlay** (bare PCB): Maximum sensitivity

**Recommended**: Polycarbonate 2mm (clear or frosted)

---

## LED Feedback System

### RGB LED Selection

**Recommended LEDs**:
- **APA106-WS**: Integrated driver (3-wire interface), 5mm package
- **PL9823-F8**: Common anode, 4-wire (R, G, B, cathode)
- **WS2812B**: Integrated driver, chainable, 5×5mm SMD

**For CTB Modules**: Use PL9823-F8 (common anode, simple PWM control)

**LED Characteristics**:
- Forward voltage (R/G/B): 2.0V / 3.0V / 3.0V
- Forward current: 20mA per color
- Luminous intensity: 2000mcd (red), 3000mcd (green/blue)
- Viewing angle: 120°

### Current Limiting

**Per-LED Resistors** (5V supply):
```
R_red = (5V - 2.0V) / 0.020A = 150Ω
R_green = (5V - 3.0V) / 0.020A = 100Ω
R_blue = (5V - 3.0V) / 0.020A = 100Ω
```

**Use**: 150Ω for red, 100Ω for green/blue (1/4W resistors)

### PWM Control

**Hardware PWM** (Teensy 4.1):
- 16-bit PWM resolution (65536 levels)
- 1.5kHz PWM frequency (flicker-free)
- 8 PWM channels per LED (R, G, B) = 24 channels per module

**LED Multiplexing** (for CTB-8x8, CTB-8x16):
- Bank switching (4 banks of 16 LEDs)
- 1kHz refresh rate per bank
- Reduces peak current consumption

### Light Pipe Design

**Light Pipe Material**: Clear acrylic rod (5mm diameter × 10mm length)

**Configuration**:
```
┌────────────────────────────────┐
│   Polycarbonate Overlay        │
├────────────────────────────────┤
│   ┌──────────────────────┐     │
│   │ Light Pipe (acrylic) │     │
│   │        ║             │     │
│   │   RGB LED            │     │
│   └──────────────────────┘     │
└────────────────────────────────┘
```

**Light Diffusion**:
- Frosted tip on light pipe
- Diffuser sheet: 1mm white polycarbonate
- Even illumination across touch pad

---

## MPR121 Configuration

### Register Settings

**Touch Threshold**:
```cpp
#define MPR121_TOUCH_THRESHOLD  0x0F  // Touch detection threshold
#define MPR121_RELEASE_THRESHOLD 0x0A  // Release detection threshold
```

**Filter Configuration**:
```cpp
// Filter settings (global)
MHDR  = 0x01  // Max half delta rising (filtered)
NHDR  = 0x01  // Noise half delta rising (unfiltered)
NCLR  = 0x0E  // Noise count limit
FDLR  = 0x00  // Filter delay count

MHDF  = 0x01  // Max half delta falling
NHDF  = 0x01  // Noise half delta falling
NCLF  = 0x0E  // Noise count limit falling
FDLF  = 0x00  // Filter delay count
```

**Debounce**:
```cpp
DTR = 0x00  // Debounce touch (no debounce)
DRF = 0x00  // Debounce release (no debounce)
```

**Auto-Configuration**:
```cpp
// Auto-configure (run once on startup)
ACCR0 = 0x0F  // USL = 256 * 0.0F / 256 = Vdd * 0.94
ACCR1 = 0x10  // LSL = 256 * 0x10 / 256 = Vdd * 0.06
ACCR2 = 0x20  // TL = Vdd * 0.5 * (ACCR0 + ACCR1) / 256
```

### Calibration Routine

**Startup Calibration**:
```cpp
void calibrateMPR121(uint8_t address) {
    // 1. Reset all electrode baseline values
    writeRegister(address, MPR121_SRST, 0x63);

    // 2. Wait for auto-calibration to complete
    delay(500);

    // 3. Read back baseline values
    for (int i = 0; i < 12; i++) {
        uint16_t baseline = readRegister(address, MPR121_BASELINE_0 + i);
        Serial.printf("Electrode %d baseline: %d\n", i, baseline);
    }

    // 4. Adjust touch thresholds if needed
    // (increase if touch not detected, decrease if too sensitive)
}
```

**Runtime Recalibration** (optional):
- Triggered by user (long-press combo)
- Recalibrates when environmental changes detected
- Stores new baseline in EEPROM

---

## Touch Pressure Mapping

### Velocity Sensitivity

**Pressure Detection** (MPR121 filtered data):
```cpp
uint16_t readTouchPressure(uint8_t electrode) {
    // Read filtered data (higher = more pressure)
    uint16_t filtered = readRegister(mpr121_addr, MPR121_FFDAT_0 + electrode);

    // Read baseline (calibrated value)
    uint16_t baseline = readRegister(mpr121_addr, MPR121_BASELINE_0 + electrode);

    // Pressure = filtered - baseline (0-255 range)
    uint16_t pressure = filtered - baseline;

    // Clamp to 0-255
    if (pressure > 255) pressure = 255;

    return pressure;
}
```

**Velocity Mapping**:
```cpp
uint8_t pressureToVelocity(uint16_t pressure) {
    // Map 0-255 pressure to 1-127 MIDI velocity
    uint8_t velocity = map(pressure, 0, 255, 1, 127);

    // Apply exponential curve for more natural response
    velocity = (uint8_t)(127.0 * pow(velocity / 127.0, 0.5));

    return velocity;
}
```

**Aftertouch Support**:
```cpp
void sendAftertouch(uint8_t electrode, uint8_t channel) {
    uint16_t pressure = readTouchPressure(electrode);
    uint8_t aftertouch = map(pressure, 0, 255, 0, 127);

    // Send MIDI channel pressure
    midiSendAftertouch(channel, aftertouch);
}
```

---

## SCH-BUS/1 Integration

### Event Messages

**Button Press**:
```json
{
  "type": "BUTTON_EVENT",
  "button_id": 5,
  "action": "press",
  "velocity": 100,
  "timestamp_us": 12345678
}
```

**Button Release**:
```json
{
  "type": "BUTTON_EVENT",
  "button_id": 5,
  "action": "release",
  "timestamp_us": 12345999
}
```

**Aftertouch**:
```json
{
  "type": "BUTTON_EVENT",
  "button_id": 5,
  "action": "aftertouch",
  "pressure": 180,
  "timestamp_us": 12346100
}
```

### LED Feedback

**Set LED Color**:
```json
{
  "type": "LED_FEEDBACK",
  "button_id": 5,
  "color": {
    "r": 255,
    "g": 128,
    "b": 0
  },
  "brightness": 0.75
}
```

**Blink LED** (for playhead):
```json
{
  "type": "LED_FEEDBACK",
  "button_id": 12,
  "mode": "blink",
  "blink_rate_hz": 4
}
```

---

## Panel Design

### Cutout Dimensions

**Touch Pad Cutout** (if using overlay):
- 12mm diameter circle
- Or 12mm × 12mm square (rounded corners)

**LED Light Pipe Hole** (if separate):
- 5mm diameter hole
- Centered under touch pad

**Button Spacing**:
- 15mm center-to-center (horizontal)
- 15mm center-to-center (vertical)
- 3mm gap between pads

**Label Area** (optional):
- 10mm height below/above each row
- Laser-etched labels
- Backlit with edge-lighting

### Materials

**Panel Options**:
1. **Aluminum 2mm**: Premium feel, excellent heat dissipation
2. **Polycarbonate 3mm**: Translucent, can backlight labels
3. **Acrylic 3mm**: Lower cost, clear for backlighting

**Finish**:
- Brushed aluminum (clear coat)
- Black anodized + laser etching
- Powder coat (custom colors)

---

## Power Distribution

### Current Requirements

**Per-LED Current** (all on, white):
- Red: 20mA @ 2.0V
- Green: 20mA @ 3.0V
- Blue: 20mA @ 3.0V
- **Total**: 60mA per LED

**Per-Module Current**:
- **CTB-1x8**: 8 LEDs × 60mA = 480mA (typical: 240mA @ 50% brightness)
- **CTB-8x8**: 64 LEDs × 60mA = 3.84A (typical: 1.9A @ 50% brightness)
- **CTB-8x16**: 128 LEDs × 60mA = 7.68A (typical: 3.8A @ 50% brightness)

**MPR121 Current**:
- 29µA per active channel
- 12 channels = 350µA typical
- Negligible compared to LEDs

### Power Management

**Brightness Scaling**:
- Default: 50% brightness (15mA per LED)
- Saves 50% power
- Still very bright for indoor use

**Current Limiting**:
- 4 banks of 16 LEDs (CTB-8x8)
- Each bank limited to 500mA max
- Total: 2A max per module

**Recommended Power Supplies**:
- CTB-1x8: 5V 1A
- CTB-8x8: 5V 3A
- CTB-8x16: 5V 5A

---

## Testing & Calibration

### Touch Sensitivity Test

**Test Procedure**:
1. Power on module, wait 500ms for calibration
2. Touch each electrode with finger
3. Verify: LED lights, BUTTON_EVENT sent
4. Vary touch pressure
5. Verify: Velocity changes (1-127)

**Acceptance Criteria**:
- All electrodes detect touch reliably
- No false triggers (without touch)
- Velocity mapping feels natural
- Response time < 10ms

### LED Feedback Test

**Test Procedure**:
1. Send LED_FEEDBACK messages (all colors)
2. Verify: Correct colors displayed
3. Check brightness levels (0-100%)
4. Test blink mode (various rates)

**Acceptance Criteria**:
- All colors accurate (RGB)
- Brightness control smooth
- Blink timing precise
- No flicker

### Environmental Testing

**Temperature**:
- Test at 10°C, 25°C, 40°C
- Verify touch sensitivity consistent
- Recalibrate if needed

**Humidity**:
- Test at 30%, 60%, 90% RH
- Verify no false triggers
- Check for condensation

---

## Comparison: PB86 vs Capacitive Touch

| Feature | PB86 Button | Capacitive Touch |
|---------|-------------|------------------|
| Tactile feedback | ✅ Mechanical click | ❌ No feedback |
| Durability | 1M cycles | Infinite |
| Sensitivity | Single threshold | Velocity sensitive |
| Cost | $0.50 each | $1.50 each (MPR121 share) |
| Complexity | Simple | Moderate (calibration) |
| Feel | Traditional | Premium/modern |
| LED integration | Built-in | Requires light pipe |

**Recommendation**:
- **Use PB86** for: Step sequencers, clip launchers (tactile feel preferred)
- **Use capacitive** for: Expression control, velocity-sensitive pads, premium interfaces

---

## Bill of Materials (CTB-1x8)

| Component | Qty | Cost | Source |
|-----------|-----|------|--------|
| MPR121 touch controller | 1 | $1.50 | On-hand |
| RGB LEDs (PL9823-F8) | 8 | $2.00 | DigiKey |
| Resistors 150Ω | 8 | $0.10 | On-hand |
| Resistors 100Ω | 16 | $0.20 | On-hand |
| Aluminum panel 2mm | 1 | $5.00 | Custom |
| Polycarbonate overlay 2mm | 1 | $3.00 | McMaster |
| Custom PCB | 1 | $15.00 | PCBWay |
| **Total** | | **$26.80** | |

**On-Hand**:
- MPR121 (×24 available)
- Resistors (×1000s available)

**Additional**:
- LEDs + panel + PCB + overlay = $25

---

## Success Criteria

1. ✅ **Touch detected reliably on all electrodes**
2. ✅ **Velocity sensitivity feels natural**
3. ✅ **LED feedback colors accurate**
4. ✅ **No false triggers (without touch)**
5. ✅ **Power consumption within limits**
6. ✅ **SCH-BUS/1 enumeration works**
7. ✅ **Hot-plug detection functional**

---

## Next Steps

1. **Build CTB-1x8 prototype** (validates design)
2. **Test touch sensitivity** (adjust thresholds)
3. **Test LED feedback** (color accuracy)
4. **Optimize power consumption** (brightness scaling)
5. **Scale to CTB-8x8** (full grid)
6. **Integrate with drum machine software**
