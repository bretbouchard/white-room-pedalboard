# First Module Recommendation: 7-Fader Motorized Control Surface

**Recommendation**: Build this first!
**Timeline**: 1-2 weeks
**Cost**: $0 (all components on-hand)
**Impressiveness**: ★★★★★ (7 moving faders!)
**Utility**: ★★★★★ (essential for mixing/DAW control)

---

## Why Start Here?

### Advantages
1. ✅ **Immediate Start**: All components on-hand
2. ✅ **Visual Impact**: 7 motorized faders moving in sync is impressive
3. ✅ **High Utility**: Essential for any DAW/mixing workflow
4. ✅ **Technical Validation**: Tests complex SCH-BUS/1 features (motor control, feedback)
5. ✅ **Foundation**: Serves as anchor for other modules

### What You'll Learn
- Motorized fader control (PWM direction/speed)
- Position sensing (ADC readback)
- Touch detection (MPR121)
- LED feedback (automation status, clip indicators)
- SCH-BUS/1 enumeration and manifest
- Layout binding system

---

## Technical Specifications

### Module Overview

**Model**: `fader_module_7ch_v1`
**Power Class**: P3 (300mA typical)
**Panel Size**: 14" wide × 3" high (7 faders @ 2" each + transport)

**Components Used**:
- Behringer X32 motorized faders (x7)
- Teensy 4.1 (x1) - Main MCU
- MCP23017 (x2) - I/O expansion (32 pins total)
- MPR121 (x1) - Capacitive touch sensing
- 74HC595 (x2) - LED feedback (16 LEDs)
- TL072CN (x2) - Position sensing buffers
- LM317 (x1) - 5V regulator for motors

### Pin Assignment

**Teensy 4.1 Pin Usage**:
```
USB           - SCH-BUS/1 transport
18 (SDA)      - I2C bus (MCP23017, MPR121)
19 (SCL)      - I2C bus
0-7           - MCP23017 GPIO (fader touch buttons)
8-15          - 74HC595 LED feedback
16-17         - Fader motor PWM (optional)
```

**MCP23017 #1 (Address 0x20)**:
```
GPA0-7        - Fader touch inputs 0-7 (from MPR121)
GPB0-7        - Fader position ADC select (optional)
```

**MCP23017 #2 (Address 0x21)**:
```
GPA0-7        - Motor direction control
GPB0-7        - Additional LEDs (automation, clip)
```

---

## Circuit Design

### Fader Motor Control

**Challenge**: Behringer X32 faders use 10k linear potentiometers + motor

**Motor Specs** (typical):
- Voltage: 5V-12V DC
- Current: 100-200mA per motor
- Direction: H-bridge control

**H-Bridge Design** (using available components):
```
          +5V
           |
        [2N3055]  (NPN power transistor)
           |
   FADER MOTOR
           |
        [2N3906]  (PNP transistor)
           |
          GND
```

**PWM Control**:
- Use Teensy 4.1 hardware PWM (pins 16-17)
- Frequency: 1 kHz (audible noise reduction)
- Duty cycle: 0-100% (speed control)

**Direction Control**:
- H-bridge or simple polarity reversal
- Use 2N3904/2N3906 transistors (you have 100 each!)

### Position Sensing

**Challenge**: Read fader position with 10-bit resolution

**Solution 1: Direct ADC** (if fader pots accessible)
- Use Teensy 4.1 ADC (pins 14-21)
- 10-bit resolution (1024 steps)
- Voltage divider for 0-3.3V range

**Solution 2: External ADC** (if pots are 5V)
- Use ADC0808CCN (8-channel, 8-bit)
- MCP23017 for channel selection
- TL072 buffers for impedance matching

**Circuit**:
```
FADER WIPER (0-5V)
    |
   [10k] resistor
    |
    +-----[TL072 Buffer]-----+
    |                        |
   GND                   ADC INPUT
```

### Touch Sensing

**Challenge**: Detect when user touches fader

**Solution**: MPR121 capacitive touch (x1, 12 channels)

**Wiring**:
```
FADER CAP   MPR121 INPUT
   ───────►  CH0
   ───────►  CH1
   ───────►  CH2
   ...
   ───────►  CH6
```

**Alternative**: Use conductive foam on fader cap + MPR121

### LED Feedback

**Per-Fader LEDs** (2 per fader = 14 total):
- **LED 1**: Clip indicator (red)
- **LED 2**: Automation status (green/yellow)

**Additional LEDs** (8):
- **Transport**: Play, stop, record, etc.
- **Select**: Track select buttons

**Driver**: 74HC595 shift registers (x2 = 16 outputs)

**Circuit**:
```
Teensy DATA ──► 74HC595 #1 ──► 74HC595 #2 ──► LEDs
Teensy LATCH ──► Both 74HC595 RCLK
Teensy CLOCK ──► Both 74HC595 SRCLK
```

---

## Panel Layout

### Front Panel Design

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐          │
│  │ ● │  │ ● │  │ ● │  │ ● │  │ ● │  │ ● │  │ ● │  │ ● │         │
│  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘         │
│    │      │      │      │      │      │      │      │          │
│  TR1    TR2    TR3    TR4    TR5    TR6    MST           │
│   [●]   [●]   [●]   [●]   [●]   [●]   [●]                     │
│   ●●     ●●     ●●     ●●     ●●     ●●     ●●              │
│                                                               │
│  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐      │
│  │ ◀ │  │ ◀ │  │ ◀ │  │ ◀ │  │ ◀ │  │ ◀ │  │ ◀ │  │ ◀ │      │
│  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘      │
│    │      │      │      │      │      │      │      │          │
│  [◄]   [■]   [●]   [█]   [LOC]  [S1]  [S2]  [S3]          │
│  REW  STOP PLAY REC  WRITE SEL1  SEL2  SEL3               │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Legend**:
- `[●]` = LED indicator (clip/automation)
- `●●` = Touch strip (MPR121)
- `[◀]` = Scrub wheel (small fader)
- `[S1-S3]` = Select buttons (track banks)

### Panel Dimensions

**Overall**: 14" wide × 5" high
- **Fader Section**: 14" × 3"
- **Transport Section**: 14" × 2"

**Mounting Holes**: 4 holes (corners)
- **Spacing**: 13" × 4" (center-to-center)
- **Size**: #6 (1/8" diameter)

---

## Firmware Architecture

### Main Loop

```cpp
void loop() {
    // Read fader positions (1 kHz)
    if (millis() - last_fader_read >= 1) {
        read_all_faders();
        last_fader_read = millis();
    }

    // Read touch sensors (100 Hz)
    if (millis() - last_touch_read >= 10) {
        read_touch_sensors();
        last_touch_read = millis();
    }

    // Process SCH-BUS/1 messages (1 kHz)
    process_usb_messages();

    // Update motor positions (only when touched)
    update_motor_positions();

    // Update LEDs (only when changed)
    if (leds_dirty) {
        update_leds();
    }
}
```

### Fader Reading

```cpp
void read_all_faders() {
    for (uint8_t i = 0; i < 7; i++) {
        uint16_t new_position = read_fader_adc(i);

        // Check for change (deadband to prevent jitter)
        if (abs(new_position - fader_positions[i]) > 2) {
            fader_positions[i] = new_position;

            // Send SCH-BUS/1 EVENT message
            send_fader_event(i, new_position, micros());

            // Mark LEDs as dirty (clip/automation feedback)
            leds_dirty = true;
        }
    }
}
```

### Motor Control

```cpp
void update_motor_positions() {
    for (uint8_t i = 0; i < 7; i++) {
        // Only move if user is NOT touching
        if (!touch_states[i] && motor_targets[i] != fader_positions[i]) {
            // Calculate error
            int16_t error = motor_targets[i] - fader_positions[i];

            // Set direction
            set_motor_direction(i, error > 0);

            // Set speed (PWM)
            uint8_t speed = constrain(abs(error) * 4, 0, 255);
            set_motor_speed(i, speed);

            // Stop when arrived
            if (abs(error) < 2) {
                set_motor_speed(i, 0);
            }
        } else {
            // User is touching - stop motor
            set_motor_speed(i, 0);
        }
    }
}
```

### Touch Sensing

```cpp
void read_touch_sensors() {
    // Read MPR121 via I2C
    uint16_t touch_data = mpr121_read_touch_inputs();

    for (uint8_t i = 0; i < 7; i++) {
        bool new_touch = (touch_data & (1 << i));

        // Detect touch state change
        if (new_touch != touch_states[i]) {
            touch_states[i] = new_touch;

            // Send SCH-BUS/1 EVENT message
            send_touch_event(i, new_touch, micros());

            // Mark LEDs as dirty (show touch feedback)
            leds_dirty = true;
        }
    }
}
```

---

## SCH-BUS/1 Integration

### Module Manifest

```json
{
  "schema": "sch-hw-manifest/1",
  "model": "fader_module_7ch_v1",
  "power_class": "P3",
  "capabilities": {
    "inputs": [
      {"id": "fader.0", "type": "continuous", "resolution": 10, "description": "Track 1 fader"},
      {"id": "fader.1", "type": "continuous", "resolution": 10, "description": "Track 2 fader"},
      {"id": "fader.2", "type": "continuous", "resolution": 10, "description": "Track 3 fader"},
      {"id": "fader.3", "type": "continuous", "resolution": 10, "description": "Track 4 fader"},
      {"id": "fader.4", "type": "continuous", "resolution": 10, "description": "Track 5 fader"},
      {"id": "fader.5", "type": "continuous", "resolution": 10, "description": "Track 6 fader"},
      {"id": "fader.6", "type": "continuous", "resolution": 10, "description": "Master fader"},
      {"id": "touch.0", "type": "trigger", "description": "Track 1 touch"},
      {"id": "touch.1", "type": "trigger", "description": "Track 2 touch"},
      {"id": "touch.2", "type": "trigger", "description": "Track 3 touch"},
      {"id": "touch.3", "type": "trigger", "description": "Track 4 touch"},
      {"id": "touch.4", "type": "trigger", "description": "Track 5 touch"},
      {"id": "touch.5", "type": "trigger", "description": "Track 6 touch"},
      {"id": "touch.6", "type": "trigger", "description": "Master touch"}
    ],
    "outputs": [
      {"id": "motor.0", "type": "pwm", "channels": 1, "description": "Track 1 motor"},
      {"id": "motor.1", "type": "pwm", "channels": 1, "description": "Track 2 motor"},
      {"id": "motor.2", "type": "pwm", "channels": 1, "description": "Track 3 motor"},
      {"id": "motor.3", "type": "pwm", "channels": 1, "description": "Track 4 motor"},
      {"id": "motor.4", "type": "pwm", "channels": 1, "description": "Track 5 motor"},
      {"id": "motor.5", "type": "pwm", "channels": 1, "description": "Track 6 motor"},
      {"id": "motor.6", "type": "pwm", "channels": 1, "description": "Master motor"},
      {"id": "led.clip.0", "type": "pwm", "channels": 1, "description": "Track 1 clip LED"},
      {"id": "led.auto.0", "type": "pwm", "channels": 1, "description": "Track 1 automation LED"},
      ...
    ]
  }
}
```

### Layout Bindings

**Configuration A: Audio Mixer**
```json
{
  "layout_name": "audio_mixer_6ch",
  "bindings": [
    {"endpoint": "fader.0", "control_id": "MIX.CH0.FADER"},
    {"endpoint": "fader.1", "control_id": "MIX.CH1.FADER"},
    {"endpoint": "fader.6", "control_id": "MIX.MASTER.FADER"},
    {"endpoint": "motor.0", "control_id": "MIX.CH0.FADER_AUTOMATION"},
    {"endpoint": "led.clip.0", "control_id": "MIX.CH0.CLIP"},
    {"endpoint": "led.auto.0", "control_id": "MIX.CH0.AUTOMATION_WRITE"}
  ]
}
```

**Configuration B: DAW Transport**
```json
{
  "layout_name": "daw_transport_automation",
  "bindings": [
    {"endpoint": "fader.0", "control_id": "TRANSPORT.SCRUB"},
    {"endpoint": "fader.1-6", "control_id": "TRANSPORT.AUTOMATION_1-6"},
    {"endpoint": "touch.0-6", "control_id": "TRANSPORT.TOUCH_1-7"}
  ]
}
```

---

## Power Budget

### Current Consumption

| Component | Quantity | Current (mA) | Voltage (V) | Power (mW) |
|-----------|----------|--------------|-------------|------------|
| Teensy 4.1 | 1 | 100 | 3.3 | 330 |
| MCP23017 | 2 | 20 | 5 | 100 |
| MPR121 | 1 | 10 | 3.3 | 33 |
| 74HC595 | 2 | 40 | 5 | 200 |
| LEDs (16) | 16 | 80 | 5 | 400 |
| Fader Motors | 7 | 700 (peak) | 5 | 3500 |
| **Total** | | **950** | | **4563** |

**Peak Power**: ~4.6W
**USB Power**: 500mA max (insufficient!)

**Solution**: External 5V 2A power supply required

### Power Supply Design

**Options**:
1. **LM317** (x2) - 5V 2A linear supply
2. **USB-C** + external supply - Power pass-through
3. **Wall wart** - 5V 2A regulated

**Recommendation**: External 5V 2A supply with USB pass-through for Teensy

---

## Bill of Materials

### Components On-Hand

| Component | Quantity | Source |
|-----------|----------|--------|
| Behringer X32 fader | 7 | On-hand |
| Teensy 4.1 | 1 | On-hand |
| MCP23017 | 2 | On-hand (11 available) |
| MPR121 | 1 | On-hand (24 available) |
| 74HC595 | 2 | On-hand (210 available) |
| TL072CN | 2 | On-hand (22 available) |
| LM317 | 1 | On-hand (30 available) |
| 2N3055 | 7 | On-hand (10 available) |
| 2N3904/2N3906 | 14 | On-hand (100 each) |
| PB86 button | 8 | On-hand (80 available) |
| LEDs | 16 | On-hand (from buttons) |

**Total Cost**: $0 (all on-hand!)

### Additional Components Needed

| Component | Quantity | Est. Cost | Source |
|-----------|----------|-----------|--------|
| PCB or perfboard | 1 | $10 | PCBWay |
| Panel material | 1 | $15 | Local hardware |
| Power supply | 1 | $10 | Digikey |
| Connectors | Various | $5 | Digikey |
| Knobs/caps | 7 | $10 | Various |
| **Total** | | **$50** | |

---

## Assembly Steps

### Week 1: Electronics

1. **Design schematic** (KiCad)
   - Fader motor control (H-bridge)
   - Position sensing (ADC)
   - Touch sensing (MPR121)
   - LED feedback (74HC595)

2. **Build prototype** (perfboard)
   - Solder components
   - Test motor control
   - Test position sensing
   - Test touch sensing

3. **Firmware development**
   - Modify PlatformIO project
   - Implement motor control
   - Implement touch sensing
   - Test SCH-BUS/1 protocol

### Week 2: Mechanical

1. **Design panel** (OpenSCAD or hand-drawn)
   - 14" × 5" panel
   - Fader cutouts (7 slots)
   - Button/LED holes
   - Mounting holes

2. **Fabricate panel**
   - 3D print or laser cut
   - Drill holes
   - Finish surface

3. **Assembly**
   - Mount faders
   - Install electronics
   - Wire everything
   - Test all functions

---

## Testing Checklist

### Hardware Tests

- [ ] Motor moves smoothly in both directions
- [ ] Motor speed control works (PWM)
- [ ] Position sensing accurate (ADC)
- [ ] Touch sensing reliable (MPR121)
- [ ] LED feedback works (74HC595)
- [ ] Power consumption within limits

### SCH-BUS/1 Tests

- [ ] Module enumeration (HELLO → WELCOME → MANIFEST)
- [ ] Fader events sent (position changes)
- [ ] Touch events sent (touch detection)
- [ ] Motor feedback works (automation write)
- [ ] LED feedback works (clip, automation)
- [ ] Hot-plug detection works

### Integration Tests

- [ ] Connect to White Room engine
- [ ] Test audio mixing workflow
- [ ] Test DAW transport workflow
- [ ] Test automation write/playback
- [ ] Test layout switching (mixer → transport)

---

## Success Criteria

### Must Have (MVP)

- ✅ 7 faders move and sense position
- ✅ Touch detection works reliably
- ✅ LED feedback shows status
- ✅ SCH-BUS/1 protocol works
- ✅ Hot-plug enumeration works

### Nice to Have

- ✅ Motor automation write
- ✅ Scrub wheel functionality
- ✅ Bank switching (16+ faders)
- ✅ Display integration (future)

---

## Next Steps After This Module

### Module 2: Button Matrix (Drum Machine)
- Build 4x4 or 8x8 LED button matrix
- Perfect for step sequencing
- Uses PB86 buttons (64 on-hand)

### Module 3: Encoder Module
- 8-channel encoder module
- Parameter editing control
- Knob modularity testing

### Module 4: Complete Integration
- Combine all modules
- Test complete workflows
- Document system

---

## What Do You Think?

**Questions**:
1. Ready to start with 7-fader module?
2. Want 6 tracks + master, or 4 subgroups + master?
3. Have dual encoders for knob modules?
4. What knob sizes do you have/prefer?
5. Want to design panel first, or electronics first?
6. Ready to order additional components ($50)?

**Recommendation**: Let's start with this module! It's impressive, useful, and validates the entire platform architecture.

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**
