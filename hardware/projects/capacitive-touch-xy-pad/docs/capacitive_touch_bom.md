# Capacitive Touch XY Pad - Bill of Materials

**White Room Hardware Platform**
**Date**: January 16, 2026
**Project**: Capacitive Touch XY Pad with PCB-Only Pressure Sensing

---

## 📦 Complete BOM

### Active Components

| Ref | Component | Value | Package | Quantity | Datasheet | Notes |
|-----|-----------|-------|---------|----------|-----------|-------|
| **U1** | ESP32-WROOM-32 | ESP32 | Module | 1 | [Link](https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf) | WiFi/BT module, 38-pin |

### Passive Components

| Ref | Component | Value | Package | Quantity | Tolerance | Power | Notes |
|-----|-----------|-------|---------|----------|-----------|-------|-------|
| **R1-R8** | Resistor | 1MΩ | 0603 | 8 | 5% (J) | 1/10W | Pullup for Y electrodes |

### Connectors & Test Points

| Ref | Component | Value | Package | Quantity | Pads | Notes |
|-----|-----------|-------|---------|----------|------|-------|
| **J1** | Pin Header | 1×12 | 2.54mm | 1 | 12 | Interface to White Room |
| **X1-X8** | Test Point | Pad | 2.0mm | 8 | 1 | X electrode connections |
| **Y1-Y8** | Test Point | Pad | 2.0mm | 8 | 1 | Y electrode connections |

---

## 🛒 Ordering Information

### PCB
**Item**: Custom PCB - Capacitive Touch XY Pad
**Specifications**:
- Dimensions: 60mm × 60mm
- Layers: 4
- Thickness: 1.6mm
- Copper: 1oz (35µm)
- Surface Finish: ENIG
- Solder Mask: Green (expose touch pads)
**Quantity**: 5 (prototyping)
**Estimated Cost**: $5-10
**Supplier**: PCBWay, JLCPCB, or similar

### ESP32 Module
**Part Number**: ESP32-WROOM-32
**Supplier**: Espressif, Digi-Key, Mouser, Amazon
**Unit Cost**: ~$5
**Quantity**: 1
**Alternatives**:
- ESP32-WROOM-32U (external antenna)
- ESP32-S2-WROVER (built-in touch optimization)

### Resistors
**Part Number**: Generic 1MΩ 0603
**Supplier**: Digi-Key, Mouser, LCSC
**Unit Cost**: ~$0.01 each
**Quantity**: 8 (buy pack of 10)
**Part Numbers**:
- Yageo: RC0603FR-071ML
- KOA: RK73H1JTTD1003F
- Panasonic: ERJ-3GEYJ105V

### Connector
**Part Number**: 1×12 Pin Header 2.54mm
**Supplier**: Digi-Key, Mouser, Amazon
**Unit Cost**: ~$0.10
**Quantity**: 1
**Notes**: Can use right-angle or vertical

### Test Points
**Part Number**: Test Point Pad 2.0mm
**Supplier**: N/A (PCB feature)
**Cost**: Included in PCB
**Quantity**: 16 (8 X + 8 Y)

---

## 💰 Cost Summary

| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| PCB (60×60mm, 4-layer) | 5 | $2.00 | $10.00 |
| ESP32-WROOM-32 | 1 | $5.00 | $5.00 |
| Resistors 1MΩ 0603 | 8 | $0.01 | $0.08 |
| Pin Header 1×12 | 1 | $0.10 | $0.10 |
| **Total** | | | **$15.18** |
| **Per Unit** | | | **$3.04** |

**Note**: Prices are estimates. Actual costs may vary.

---

## 📊 Component Specifications

### ESP32-WROOM-32
**Key Features**:
- WiFi 802.11 b/g/n
- Bluetooth 4.2 BR/EDR and BLE
- 240MHz dual-core processor
- 520KB SRAM
- 4MB Flash
- 38 GPIO pins
- **10 capacitive touch sensing channels** (T0-T9)
- Operating voltage: 2.7V - 3.6V
- Operating temperature: -40°C to +85°C

**Touch Sensing Specs**:
- **Touch sensitivity**: < 0.5pF change detectable
- **Noise tolerance**: < 100mV
- **Sampling rate**: Up to 1MHz
- **Power consumption**: < 1mA per active channel

### Resistor 1MΩ 0603
**Specifications**:
- **Package**: 0603 (1608 metric)
- **Power rating**: 1/10W (0.1W)
- **Tolerance**: ±5% (J) or ±1% (F)
- **Temperature coefficient**: ±100ppm/°C
- **Voltage rating**: 50V
- **Operating temperature**: -55°C to +125°C

**Recommended Suppliers**:
- Yageo RC0603FR-071ML (1%, ±100ppm/°C)
- KOA RK73H1JTTD1003F (1%, ±100ppm/°C)
- Panasonic ERJ-3GEYJ105V (5%, ±200ppm/°C)

### Pin Header 1×12
**Specifications**:
- **Pitch**: 2.54mm (0.100")
- **Rows**: 1
- **Pins**: 12
- **Current rating**: 1A per pin
- **Voltage rating**: 250V
- **Material**: Brass with tin plating

**Recommended Suppliers**:
- Sullins SBH11-PBPC-D12-ST
- Harwin M20-8821245
- TE Connectivity 1-1734641-2

---

## 🔧 Assembly Notes

### Soldering Requirements
1. **ESP32 Module**: Use soldering iron or hot plate (module has castellated pads)
2. **0603 Resistors**: Fine-tip soldering iron, 0.5mm solder
3. **Pin Header**: Through-hole, standard soldering

### Tools Needed
- Soldering iron (temperature controlled)
- Fine tip (1-2mm)
- Solder wire (0.5mm, lead-free or 63/37)
- Flux pen (optional but recommended)
- Tweezers (for 0603 components)
- Multimeter (for testing)

### Assembly Order
1. Clean PCB with isopropyl alcohol
2. Solder 0603 resistors (R1-R8)
3. Solder pin header (J1)
4. Solder ESP32 module (U1)
5. Inspect for solder bridges
6. Test continuity with multimeter
7. Apply conformal coating (optional)

---

## ✅ Quality Checklist

### PCB Inspection
- [ ] No scratches on touch surface
- [ ] All traces intact
- [ ] No solder bridges
- [ ] Pad dimensions correct
- [ ] Solder mask properly aligned

### Component Inspection
- [ ] ESP32 module orientation correct
- [ ] Resistor values verified (1MΩ)
- [ ] Pin header straight
- [ ] No damaged components

### Electrical Testing
- [ ] Continuity test: +3.3V to all VCC pins
- [ ] Continuity test: GND to all GND pins
- [ ] Continuity test: X1-X8 to correct GPIO
- [ ] Continuity test: Y1-Y8 through pullups
- [ ] No shorts between adjacent pins
- [ ] ESP32 powers on (3.3V present)

---

## 📚 Alternative Components

### ESP32 Alternatives
| Part | Pros | Cons | Cost |
|------|------|------|------|
| ESP32-S2-WROVER | Built-in touch optimization, low power | Fewer GPIO | $6 |
| ESP32-C3 | Low cost, small | Not as powerful | $3 |
| ESP32-PICO-D4 | Integrated flash | Harder to solder | $5 |

### Resistor Alternatives
| Value | Effect | When to Use |
|-------|--------|-------------|
| 2.2MΩ | Higher sensitivity (less noise) | Noisy environment |
| 470kΩ | Lower sensitivity (faster response) | High-speed scanning |
| 510kΩ | Balanced | General use |

### Connector Alternatives
| Type | Pros | Cons | Cost |
|------|------|------|------|
| Right-angle header | Compact PCB footprint | Cable sticks up | $0.15 |
| Board-to-board FPC | Low profile | Custom cable | $0.50 |
| Terminal block | Tool-free connection | Larger | $0.30 |

---

## 🚀 Ordering Checklist

### Ready to Order
- [ ] PCB files generated (Gerber)
- [ ] PCB specifications confirmed
- [ ] ESP32 module selected
- [ ] Resistors in stock or ordered
- [ ] Connector in stock or ordered
- [ ] Budget approved (~$15 total)

### PCB Specifications for Manufacturer
- **Dimensions**: 60mm × 60mm
- **Layers**: 4
- **Stackup**: Signal/GND/Signal/Signal
- **Thickness**: 1.6mm
- **Copper weight**: 1oz (35µm)
- **Trace width/space**: 0.3mm/0.3mm
- **Pad size**: 2.0mm diameter
- **Surface finish**: ENIG or HASL
- **Solder mask**: Green
- **Silkscreen**: White
- **Exposed pads**: Touch surface (no mask)

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**

White Room Hardware Platform - Capacitive Touch XY Pad
