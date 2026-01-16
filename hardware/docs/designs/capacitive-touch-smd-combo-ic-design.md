# Capacitive Touch Grid System - SMD Combo IC Design

## Overview

**Professional SMD-based capacitive touch grid** using combo ICs that integrate touch sensing + LED driving in a single chip. Designed for outsourced PCB assembly with modern surface-mount components.

**Key Innovation**: One IC handles both touch sensing AND LED driving!

---

## Combo IC Options

### Option 1: Microchip MTCH10x Series (Recommended)

**MTCH1010** - Single-channel touch + LED driver
- **Package**: 2mm × 2mm DFN-8 (SMD)
- **Channels**: 1 touch input + 1 LED driver
- **Cost**: ~$0.60 each (DigiKey)
- **Pros**: Ultra-low cost, tiny footprint
- **Cons**: Only 1 channel per chip

**MTCH1030** - 3-channel touch + LED drivers
- **Package**: 3mm × 3mm QFN-16 (SMD)
- **Channels**: 3 touch inputs + 3 LED drivers
- **Cost**: ~$1.20 each
- **Pros**: Good balance of cost/performance
- **Cons**: 3 channels may not divide evenly into grid sizes

**Best for**: Cost-sensitive designs, outsourcing-friendly

---

### Option 2: Infineon PSoC 4000 (CY8C40xx)

**CY8C4014LQI** - Programmable SoC with CAPSENSE
- **Package**: QFN-36 (5mm × 5mm)
- **Channels**: Up to 16 capacitive touch channels + programmable LED drivers
- **Cost**: ~$2.50 each
- **Pros**: Highly programmable, many channels, integrated ARM Cortex-M0
- **Cons**: More complex firmware, higher cost
- **Firmware**: Free CAPSENSE development tools

**Best for**: High-performance designs, advanced features

---

### Option 3: Awinic AW93805QNR

**AW93805QNR** - 5-channel capacitive detection SoC
- **Package**: QFN-24 (SMD)
- **Channels**: 5 touch inputs (integrated LED drivers likely)
- **Cost**: ~$1.00 each (estimated)
- **Pros**: 5 channels (good for 5×5 grids)
- **Cons**: Less documentation (Chinese manufacturer)

**Best for**: Budget designs with Chinese supply chain

---

## Recommended Design: MTCH10x Series

### Why MTCH10x?

1. **Low Cost**: $0.60-1.20 per chip
2. **Simple**: No firmware needed (hardware state machine)
3. **Tiny**: 2mm × 2mm footprint
4. **Reliable**: Proven automotive-grade
5. **Easy**: Direct button replacement architecture

---

## Grid Configurations (MTCH10x)

### Grid 4×4 (16 Touch Points)

**Using MTCH1030 (3-channel chips)**:
- Chips needed: 6× MTCH1030 (18 channels, use 16, 2 spare)
- PCB size: 60mm × 60mm
- Total chip cost: 6 × $1.20 = $7.20

**Alternative**: Use MTCH1010 (1-channel)
- Chips needed: 16× MTCH1010
- Total chip cost: 16 × $0.60 = $9.60

---

### Grid 8×8 (64 Touch Points)

**Using MTCH1030 (3-channel)**:
- Chips needed: 22× MTCH1030 (66 channels, use 64, 2 spare)
- PCB size: 120mm × 120mm
- Total chip cost: 22 × $1.20 = $26.40

**Using MTCH1010 (1-channel)**:
- Chips needed: 64× MTCH1010
- Total chip cost: 64 × $0.60 = $38.40

---

### Grid 8×16 (128 Touch Points)

**Using MTCH1030 (3-channel)**:
- Chips needed: 43× MTCH1030 (129 channels, use 128, 1 spare)
- PCB size: 240mm × 120mm
- Total chip cost: 43 × $1.20 = $51.60

---

## SMD Component Selection

### LEDs: SMD 0603 RGB

**Recommended**: SMD RGB LED 0603 package
- **Size**: 1.6mm × 0.8mm × 0.8mm (L×W×H)
- **Cost**: $0.15-0.25 each
- **Options**:
  - **Common cathode**: AVAGO AGMS3011PWW ($0.22)
  - **Common anode**: Lite-On LTST-C19HE1WT ($0.18)

**For 8×8 grid**: 64 × $0.20 = $12.80

---

### Capacitors: SMD 0603 or 0402

**Touch sensor capacitors** (per MTCH10x datasheet):
- CIN (input capacitor): 10nF (X7R ceramic)
- CSH (sampling capacitor): 4.7nF (C0G ceramic)

**Package**: 0402 (1mm × 0.5mm)
- **Cost**: $0.01 each
- **For 8×8**: 22 chips × 2 capacitors = 44 × $0.01 = $0.44

---

### Resistors: SMD 0402

**LED current limiting** (if needed):
- Package: 0402
- Cost: $0.005 each
- **For 8×8**: ~$0.20 total

---

## PCB Design (SMD-Optimized)

### Layer Stack-up (4-layer)

**Layer 1 (Top)**:
- Touch electrodes (copper pads)
- SMD LED footprints (0603)
- SMD IC footprints (QFN/DFN)

**Layer 2 (GND)**:
- Solid ground plane
- Guard rings around touch pads

**Layer 3 (Power)**:
- 5V LED power
- 3.3V logic power

**Layer 4 (Bottom)**:
- Signal routing
- Test points

---

### Touch Electrode Design

**SMD-compatible electrodes**:
- Size: 8mm × 8mm square (64mm²)
- Spacing: 12mm center-to-center
- Material: Copper with ENIG finish (gold)
- Clearance: 3mm to ground plane

**No components on electrodes** (keep clear for touch sensing)

---

### LED Placement

**SMD LEDs under touch electrodes**:
- Mount RGB LED directly under electrode center
- LED shines through PCB (use transparent solder mask)
- Light passes through polycarbonate panel
- No light pipes needed!

**LED orientation**:
- Anode/cathode facing toward PCB edge (for easy routing)
- Consistent orientation across all LEDs

---

## Assembly: Outsourced SMT

### PCB Fabrication Specs

**Manufacturer**: JLCPCB, PCBWay, or similar
**Quantity**: 5 pieces (prototypes) or 100+ (production)
**Lead time**: 5-7 days
**Cost**: ~$20-60 depending on size

**Specs**:
- Layers: 4
- Thickness: 1.6mm
- Copper weight: 1oz (outer), 0.5oz (inner)
- Solder mask: Black (or transparent under LEDs)
- Silkscreen: White (labels)
- Surface finish: ENIG (gold) - required for touch electrodes

---

### SMT Assembly Service

**Recommended**: JLCPCB Assembly (PCBWay similar)
- **Setup fee**: $50-100 (one-time)
- **Placement fee**: $0.01-0.03 per component
- **Stencil**: Included in setup fee

**For 8×8 grid**:
- Components: 22× MTCH1030 + 64× LEDs + capacitors + resistors ≈ 160 components
- Placement cost: 160 × $0.02 = $3.20
- Total assembly: $50 + $3.20 = $53.20

---

### Component Sourcing

**Option A: JLCPCB Basic Parts** (cheapest)
- JLC has stock of common SMD parts
- Limited selection but good prices
- No shipping cost (included in assembly)

**Option B: Customer Supplied** (more options)
- You buy components, ship to JLC
- More component choices
- You pay shipping + risk of damage

**Option C: Hybrid** (recommended)
- Use JLC basic parts for LEDs, capacitors, resistors
- Supply specialized parts (MTCH10x ICs) yourself
- Best of both worlds

---

## Bill of Materials (8×8 Grid Example)

### Components

| Part | Description | Qty | Unit Cost | Total Cost | Source |
|------|-------------|-----|-----------|------------|--------|
| MTCH1030 | Touch+LED combo 3-ch | 22 | $1.20 | $26.40 | DigiKey |
| RGB LED | SMD 0603 common cathode | 64 | $0.20 | $12.80 | JLC stock |
| Capacitor | 10nF X7R 0402 | 22 | $0.01 | $0.22 | JLC stock |
| Capacitor | 4.7nF C0G 0402 | 22 | $0.01 | $0.22 | JLC stock |
| Resistor | 150Ω 0402 (if needed) | 64 | $0.005 | $0.32 | JLC stock |
| **Components Subtotal** | | | | **$39.96** | |

### PCB & Assembly

| Item | Description | Cost |
|------|-------------|------|
| PCB fabrication | 120mm × 120mm, 4-layer, ENIG | $40.00 |
| SMT assembly setup | One-time fee | $50.00 |
| Component placement | 160 components @ $0.02 | $3.20 |
| Stencil | Included | $0.00 |
| **PCB+Assembly Subtotal** | | **$93.20** |

### Panel & Mounting

| Item | Description | Cost |
|------|-------------|------|
| Polycarbonate panel | 120mm × 120mm, 3mm | $20.00 |
| M3 standoffs | 10mm height, 4 pcs | $2.00 |
| **Hardware Subtotal** | | **$22.00** |

### **Grand Total: $155.16**

**Without MTCH10x cost** (if you supply):
- PCB + Assembly + Hardware = $128.76

---

## Comparison: SMD Combo IC vs Through-Hole

| Aspect | SMD Combo IC (MTCH10x) | Through-Hole (MPR121) |
|--------|------------------------|----------------------|
| **IC Cost** | $26.40 (22× MTCH1030) | $9.00 (6× MPR121) |
| **PCB Cost** | $40 (4-layer, ENIG) | $60 (4-layer) |
| **Assembly** | $53 (outsourced SMT) | $0 (hand solder) |
| **LED Cost** | $12.80 (SMD 0603) | $12.80 (through-hole) |
| **Total** | **$155** | **$97** (DIY assembly) |

**Trade-off**:
- SMD: Higher cost, professional quality, smaller
- Through-hole: Lower cost, DIY assembly, larger

---

## Firmware Requirements

### MTCH10x: No Firmware Needed!

**Hardware state machine** handles:
- Touch detection
- Debounce
- LED control (on/off)
- Auto-calibration

**Host microcontroller** (Teensy 4.1) only needs to:
- Read touch status via I2C
- Send LED commands via I2C
- Simple register read/write

**Example Code**:
```cpp
// Read touch status
uint8_t touch_status = readRegister(mtch1030_addr, STATUS_REG);

// Set LED state
writeRegister(mtch1030_addr, LED_CONTROL_REG, 0xFF); // All LEDs on
```

---

## Advantages of SMD Combo IC Approach

✅ **Professional Quality**: Factory-assembled, reliable
✅ **Compact**: Tiny ICs, minimal board space
✅ **Scalable**: Easy to add more chips for larger grids
✅ **No Firmware**: Hardware state machine, no coding needed
✅ **Cost-Effective**: Low-cost ICs, automated assembly
✅ **Production-Ready**: Can scale to 1000+ units

---

## Disadvantages

❌ **Higher Initial Cost**: Setup fees, assembly costs
❌ **Lead Time**: 2-3 weeks (PCB + assembly + shipping)
❌ **Less DIY**: Requires specialized equipment to rework
❌ **Fixed Design**: Hard to modify once assembled

---

## Recommendations

### For Prototyping (1-5 units)
**Use through-hole MPR121 design**:
- Lower cost ($97 vs $155)
- Can hand-assemble yourself
- Easy to modify/debug
- 1-week lead time (PCB only)

### For Production (100+ units)
**Use SMD MTCH10x design**:
- Professional quality
- Automated assembly
- Lower per-unit cost at scale
- Production-ready

### For Best of Both
**Prototype with through-hole, then switch to SMD**:
- Validate design with cheap through-hole
- Then redesign for SMT production
- Common industry practice

---

## Next Steps

1. **Order MTCH1030 Samples** (Microchip free samples)
2. **Design Test PCB** (small 2×2 grid)
3. **Validate Touch Sensitivity**
4. **Test LED Brightness**
5. **Scale to Full Design**

---

## Suppliers

### Combo ICs
- **Microchip MTCH10x**: DigiKey, Mouser, Microchip Direct
- **PSoC 4000**: Infineon, DigiKey, Mouser
- **Awinic**: Alibaba, LCSC (Chinese suppliers)

### PCB Assembly
- **JLCPCB**: Low cost, good quality (China)
- **PCBWay**: Similar to JLCPCB
- **OSH Park**: US-based (higher cost, faster shipping)

### Components
- **DigiKey**: Wide selection, fast shipping
- **Mouser**: Similar to DigiKey
- **LCSC**: Chinese supplier (cheaper, slower)

---

## Success Criteria

1. ✅ **Touch sensitivity works through panel**
2. ✅ **LED feedback visible and bright**
3. ✅ **SMT assembly quality acceptable**
4. ✅ **Cost within budget**
5. ✅ **Scalable to production**
