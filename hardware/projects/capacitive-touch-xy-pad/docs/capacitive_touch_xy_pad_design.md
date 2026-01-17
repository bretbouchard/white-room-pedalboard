# Capacitive Touch XY Pad with PCB-Only Pressure Sensing

**Project**: White Room Hardware Platform - Capacitive Touch XY Pad
**Date**: January 16, 2026
**Status**: Design Phase

---

## 🎯 Requirements

### Primary Requirements
1. **XY Pad Touch Surface** - 2D position detection via capacitive sensing
2. **Pressure Sensitivity** - Detect touch pressure using PCB-only methods
3. **No Additional Sensors** - Pressure sensing achieved through PCB design
4. **White Room Integration** - Compatible with existing hardware platform

### Performance Targets
- **XY Resolution**: Minimum 8x8 grid (64 positions)
- **Pressure Sensitivity**: 3-4 pressure levels (light, medium, hard)
- **Response Time**: < 10ms for touch detection
- **Power Consumption**: Low power mode for battery operation
- **Size**: Compact form factor (50mm x 50mm minimum)

---

## 🔬 Technical Approach

### 1. XY Position Detection - Mutual Capacitance

**Technology**: Mutual Capacitance X-Y Grid

**How It Works**:
- Create grid of orthogonal electrodes (transmitter rows, receiver columns)
- Measure capacitance at each intersection
- Finger touch reduces mutual capacitance at intersection
- Scan entire grid to find touch position(s)

**Design**:
```
Top Layer: X Electrodes (Transmitters)
┌─────────────────────────────┐
│ ══════════════════════════  │  ← X1
│ ══════════════════════════  │  ← X2
│ ══════════════════════════  │  ← X3
│ ══════════════════════════  │  ← X4
└─────────────────────────────┘
         ↓ Dielectric ↓
Bottom Layer: Y Electrodes (Receivers)
┌─────────────────────────────┐
│ ║ ║ ║ ║ ║ ║ ║ ║ ║ ║ ║ ║ ║ │  ← Y1-Y8
└─────────────────────────────┘
```

**Grid Specification**:
- **X Electrodes**: 8 parallel horizontal traces (transmitters)
- **Y Electrodes**: 8 parallel vertical traces (receivers)
- **Intersection Points**: 8×8 = 64 sensing points
- **Trace Width**: 0.3mm
- **Trace Spacing**: 0.5mm
- **Grid Pitch**: 6mm

### 2. Pressure Sensing - PCB Deformation Method

**Technology**: Capacitive Pressure Sensing via PCB Flex

**How It Works**:
1. **Resting State**: Two capacitive plates separated by flexible PCB substrate
2. **Light Press**: Substrate compresses slightly → increase in capacitance
3. **Hard Press**: Substrate compresses more → larger capacitance change
4. **Measurement**: Detect change in mutual capacitance amplitude

**Implementation**:
- Use same mutual capacitance grid for pressure detection
- Measure **amount** of capacitance change (not just presence)
- Calibrate thresholds: Light (5-10% ΔC), Medium (10-20% ΔC), Hard (>20% ΔC)

**Advantages**:
- ✅ No additional sensors needed
- ✅ Uses existing capacitive grid
- ✅ PCB-only solution
- ✅ Simple calibration in software

### 3. Touch Controller Options

#### Option A: ESP32 Built-in Touch (Recommended for Prototype)
**Pros**:
- Built-in capacitive touch sensing
- No additional IC needed
- Low cost
- Easy programming

**Cons**:
- Limited to 10 touch channels
- Self-capacitance only (not mutual)
- Requires manual scanning

**Implementation**:
- Use 8 GPIO pins for X electrodes (transmit)
- Use 8 GPIO pins for Y electrodes (receive)
- Software scanning: Enable one X, read all Y, repeat
- **Pressure**: Measure absolute capacitance value on each Y

#### Option B: Dedicated Touch Controller (FT6236)
**Pros**:
- True mutual capacitance
- Hardware multi-touch
- I2C interface (simple)
- Built-in calibration

**Cons**:
- Additional IC cost (~$3)
- Requires driver integration
- More complex design

**Recommendation**: Start with ESP32 built-in touch, upgrade to FT6236 if needed

---

## 📐 PCB Design Specifications

### Stackup
```
Layer 1 (Top):    X Electrodes (Grounded when not transmitting)
Layer 2 (GND):    Solid ground plane (shield)
Layer 3 (Signal): Y Electrodes (Read channels)
Layer 4 (Bottom): Additional ground or routing
```

### Materials
- **Substrate**: FR4 standard (1.6mm thickness)
- **Copper Weight**: 1oz (35µm)
- **Surface Finish**: ENIG or HASL
- **Solder Mask**: Green (expose touch pads)

### Touch Area
- **Active Area**: 48mm × 48mm
- **Total Board Size**: 60mm × 60mm (including connector)
- **Touch Surface**: Exposed copper with solder mask opening

### Electrode Pattern (Top Layer - X Electrodes)
```
┌────────────────────────────────────────┐
│  ═════════════════════════════════  │ ← X1 (Y=0mm)
│                                        │
│  ═════════════════════════════════  │ ← X2 (Y=6mm)
│                                        │
│  ═════════════════════════════════  │ ← X3 (Y=12mm)
│                                        │
│  ═════════════════════════════════  │ ← X4 (Y=18mm)
│                                        │
│  ═════════════════════════════════  │ ← X5 (Y=24mm)
│                                        │
│  ═════════════════════════════════  │ ← X6 (Y=30mm)
│                                        │
│  ═════════════════════════════════  │ ← X7 (Y=36mm)
│                                        │
│  ═════════════════════════════════  │ ← X8 (Y=42mm)
└────────────────────────────────────────┘
  0mm                                 48mm
```

### Electrode Pattern (Layer 3 - Y Electrodes)
```
┌────────────────────────────────────────┐
│  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║ │
│                                        │
│  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║ │
│                                        │
│  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║ │
│                                        │
│  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║ │
│                                        │
│  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║ │
│                                        │
│  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║ │
│                                        │
│  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║ │
│                                        │
│  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║ │
└────────────────────────────────────────┘
  Y1 Y2 Y3 Y4 Y5 Y6 Y7 Y8
  0  6  12 18 24 30 36 42 mm
```

---

## 🔌 Interface & Connectivity

### Connector
- **Type**: 2.54mm pin header (1×12 pins)
- **Pinout**:
  1.  VCC (3.3V)
  2.  GND
  3.  X1 (GPIO)
  4.  X2 (GPIO)
  5.  X3 (GPIO)
  6.  X4 (GPIO)
  7.  Y1 (Touch/ADC)
  8.  Y2 (Touch/ADC)
  9.  Y3 (Touch/ADC)
  10. Y4 (Touch/ADC)
  11. Y5 (Touch/ADC)
  12. Y6 (Touch/ADC)

### Communication
- **Protocol**: Direct GPIO scanning
- **Scan Rate**: 100Hz (10ms per full scan)
- **Data Format**: Struct with X, Y, and pressure values

---

## 💻 Software Algorithm

### Scan Procedure
```c
// Pseudocode for XY + pressure scanning
for (int x = 0; x < 8; x++) {
    // Activate X electrode
    pinMode(X_PINS[x], OUTPUT);
    digitalWrite(X_PINS[x], HIGH);

    // Read all Y electrodes
    for (int y = 0; y < 8; y++) {
        int capacitance = touchRead(Y_PINS[y]);
        grid[x][y] = capacitance;
    }

    // Deactivate X electrode
    pinMode(X_PINS[x], INPUT);
}

// Find touch position
max_capacitance = find_max(grid);
x_pos = max_capacitance.x;
y_pos = max_capacitance.y;
pressure = calculate_pressure(max_capacitance.value);
```

### Pressure Calibration
```c
int calculate_pressure(int capacitance) {
    int baseline = 50000; // No-touch baseline
    int delta = baseline - capacitance;

    if (delta < 5000) return PRESSURE_NONE;       // No touch
    if (delta < 10000) return PRESSURE_LIGHT;     // Light touch
    if (delta < 15000) return PRESSURE_MEDIUM;    // Medium press
    return PRESSURE_HARD;                         // Hard press
}
```

---

## 🧪 SPICE Simulation Plan

### Simulation 1: Single Touch Point
- Model mutual capacitance at one grid intersection
- Simulate finger touch (capacitance decrease)
- Verify change is detectable

### Simulation 2: Grid Scanning
- Model 2×2 grid subset
- Simulate sequential scanning
- Measure crosstalk between adjacent electrodes

### Simulation 3: Pressure Response
- Model variable distance between electrodes
- Simulate different pressure levels
- Verify linear response curve

---

## 📋 Bill of Materials (Draft)

### Components
| Part | Value | Package | Qty | Reference |
|------|-------|---------|-----|-----------|
| PCB | Custom XY Pad | 60×60mm FR4 | 1 | U1 |
| Pin Header | 1×12 2.54mm | THT | 1 | J1 |
| ESP32 | Microcontroller | Module | 1 | (external) |
| Resistors | 10k (pull-up) | 0603 | 8 | R1-R8 |
| Capacitors | 100pF (filter) | 0603 | 8 | C1-C8 |

### Estimated Cost
- PCB: $5 (prototype)
- Components: $2
- ESP32: $5 (if not already available)
- **Total**: ~$12

---

## ✅ Validation Checklist

### Hardware Validation
- [ ] PCB manufactured without errors
- [ ] Continuity tests pass
- [ ] No short circuits between layers
- [ ] Touch surface clean and exposed

### Electrical Validation
- [ ] SPICE simulation matches expected behavior
- [ ] Capacitance values within range (10-100pF)
- [ ] No crosstalk between electrodes
- [ ] Signal-to-noise ratio > 20dB

### Functional Validation
- [ ] XY position detection works (8×8 grid)
- [ ] Pressure sensitivity detected (3 levels)
- [ ] Multi-touch rejection (single touch only)
- [ ] Response time < 10ms
- [ ] Calibration stable over temperature

### Integration Validation
- [ ] ESP32 communication successful
- [ ] Data format compatible with White Room
- [ ] Power consumption within budget
- [ ] Mechanical mounting compatible

---

## 🎯 Next Steps

1. ✅ Research complete
2. **Current**: Design electrode pattern and PCB stackup
3. Create SPICE simulation
4. Design KiCad schematic
5. Design PCB layout
6. Generate Gerber files
7. Order prototype PCB
8. Test and calibrate
9. Document findings

---

## 📚 References

1. Infineon PSoC™ 4 CAPSENSE™ Touchpad Design Guide (2024)
2. Microchip Capacitive Touch Sensor Design Guide
3. ESP32 Capacitive Touch Sensor Documentation
4. "Flexible Transparent Capacitive Pressure Sensors" (2025)
5. "Advances in 3D Printed Electromechanical Sensors" (2025)

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**

White Room Hardware Platform - Capacitive Touch XY Pad Design
