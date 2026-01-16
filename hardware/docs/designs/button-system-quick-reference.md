# Button System Quick Reference - Choose Your Approach

## Two Distinct Systems

### System 1: PB86 Mechanical Button Matrix
**Traditional tactile buttons** with built-in LEDs
- Mechanical feel (clicky feedback)
- Simple wiring, low complexity
- Perfect for: Step sequencers, clip launchers

### System 2: Capacitive Touch (Two Implementation Options)

**Option A: Through-Hole MPR121 Design**
- Custom-sized PCB grids that mount **behind a panel**
- Multiple MPR121s on one PCB
- DIY assembly (hand-solder through-hole)
- Cost: $113 (8×8 grid)

**Option B: SMD Combo IC Design** (NEW!)
- Professional SMD assembly with combo ICs
- **MTCH10x series**: Touch + LED driver in ONE chip
- Outsourced assembly (JLCPCB, PCBWay)
- Cost: $155 (8×8 grid, fully assembled)
- Perfect for: Production-quality, professional finish

---

## Quick Comparison

| Feature | PB86 Mechanical | Cap Touch (Through-Hole) | Cap Touch (SMD Combo) |
|---------|-----------------|--------------------------|---------------------|
| **Feel** | Mechanical click | Smooth touch | Smooth touch |
| **Velocity** | ❌ On/off only | ✅ Pressure sensitive | ✅ Pressure sensitive |
| **LEDs** | Built-in (single) | RGB | RGB |
| **Assembly** | DIY hand-solder | DIY hand-solder | Professional SMT |
| **Cost** | $23 per BM-1x8 | $113 (8×8 grid) | $155 (8×8 grid) |
| **Lead Time** | 1 week | 2-3 weeks | 3-4 weeks |
| **Complexity** | Low | Moderate | Low (no firmware) |
| **Best For** | Prototyping | Prototyping | Production |

---

## Decision Tree

**Question 1: Do you want tactile feedback?**
- ✅ Yes → **PB86 Mechanical** (you feel the click)
- ❌ No → Go to Q2

**Question 2: Do you need velocity sensitivity?**
- ✅ Yes → Go to Q2a
- ❌ No → Go to Q3

**Q2a: Through-hole or SMD assembly?**
- ✅ **DIY/Prototype** → **Capacitive Touch (Through-Hole MPR121)** - $113
- ✅ **Production** → **Capacitive Touch (SMT Combo IC)** - $155

**Question 3: What's your primary use?**
- Step sequencer → **PB86 Mechanical** (tactile = precise)
- Clip launcher → **PB86 Mechanical** (visual feedback)
- Drum pads → **Capacitive Touch Grid** (velocity = expressive)
- Expression control → **Capacitive Touch Grid** (continuous pressure)

---

## System 1: PB86 Mechanical Button Matrix

### Module Sizes Available
- **BM-1x8**: 8 buttons (4" × 1" panel)
- **BM-2x4**: 8 buttons (4" × 2" panel)
- **BM-4x4**: 16 buttons (4" × 4" panel)
- **BM-8x8**: 64 buttons (8" × 8" panel)
- **BM-8x16**: 128 buttons (16" × 8" panel)

### Stacking System
```
┌─────────────────────────────────┐
│  BM-1x8 #3 (row 3)             │
├─────────────────────────────────┤
│  BM-1x8 #2 (row 2)             │
├─────────────────────────────────┤
│  BM-1x8 #1 (row 1)             │
└─────────────────────────────────┘
```
**Result**: 3×8 grid (3 instruments × 8 steps)

### Cost
- **BM-1x8**: $23 per module
- **3× BM-1x8 stacked**: $68 (3-instrument drum machine)
- **BM-8x8**: $97 (8-instrument drum machine)

### On-Hand Components
- ✅ PB86 buttons: 80× available
- ✅ MCP23017: 11× available
- ✅ 74HC595: 210× available
- All other components on-hand

### Key Features
- ✅ Mechanical tactile feedback (satisfying click)
- ✅ Built-in LEDs (simple integration)
- ✅ Stackable modules (build as needed)
- ✅ Low complexity (simple wiring)
- ✅ Cost-effective (uses on-hand parts)

### Limitations
- ❌ No velocity sensitivity (on/off only)
- ❌ Single-color LEDs (no RGB)
- ❌ Panel cutouts required
- ❌ Mechanical wear (1M cycle lifespan)

### Perfect For
- Step sequencers (tactile = precise timing)
- Clip launchers (visual + tactile feedback)
- Drum machines (traditional feel)
- Transport controls (clicky buttons)

---

## System 2: Capacitive Touch Grid (Custom PCB)

### Grid Sizes Available
- **4×4**: 16 touch points (60mm × 60mm PCB)
- **8×8**: 64 touch points (120mm × 120mm PCB)
- **8×16**: 128 touch points (240mm × 120mm PCB)
- **16×16**: 256 touch points (240mm × 240mm PCB)
- **Custom**: Any size you need!

### One PCB Per Grid Size
```
┌─────────────────────────────────────┐
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 0) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 1) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 2) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 3) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 4) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 5) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 6) │
│  ●  ●  ●  ●  ●  ●  ●  ●   (row 7) │
└─────────────────────────────────────┘
```
**8×8 Grid**: 6× MPR121 on one PCB

### Cost
- **4×4 Grid**: $35
- **8×8 Grid**: $113
- **8×16 Grid**: $204
- **16×16 Grid**: $420

### On-Hand Components
- ✅ MPR121: 24× available (enough for 8×8 grid)
- All other components on-hand

### Key Features
- ✅ Velocity-sensitive (pressure → MIDI velocity)
- ✅ RGB LED feedback (full color per touch point)
- ✅ Custom PCB size (design once, use forever)
- ✅ Mounts behind panel (no cutouts)
- ✅ Premium smooth feel
- ✅ Aftertouch support
- ✅ Infinite durability (no moving parts)
- ✅ Multiple MPR121s on one PCB

### Limitations
- ❌ No tactile feedback (smooth surface)
- ❌ Higher initial cost (PCB design + fabrication)
- ❌ MPR121 calibration required
- ❌ More complex wiring (I2C to multiple chips)
- ❌ One PCB per grid size (not modular like tiles)

### Perfect For
- Drum pads (velocity = expressive playing)
- Expression control (continuous pressure)
- Premium interfaces (modern feel)
- Known grid sizes (standard configurations)

---

## Panel Design Comparison

### PB86 Mechanical Panel
```
┌──────────────────────────────────────┐
│  [Btn] [Btn] [Btn] [Btn] [Btn] [Btn] │ ← 12.5mm cutouts
│   1     2     3     4     5     6    │
│  [Btn] [Btn]                        │
│   7     8                           │
└──────────────────────────────────────┘
```
- **Material**: Aluminum 2mm
- **Cutouts**: 12.5mm diameter (one per button)
- **Labels**: Laser-etched
- **Buttons**: Protrude through panel

### Capacitive Touch Grid Panel
```
┌──────────────────────────────────────┐
│                                      │ ← Smooth surface
│         (Touch anywhere)             │   (no cutouts)
│                                      │
└──────────────────────────────────────┘
```
- **Material**: Polycarbonate 3mm
- **Cutouts**: None!
- **Labels**: Optional laser etching
- **PCB**: Mounts behind panel
- **Touch**: Works through 3mm panel
- **LEDs**: Shine through panel

---

## Example Projects

### Project A: 3-Instrument Drum Machine

**Option 1: PB86 Mechanical**
- 3× BM-1x8 stacked
- Panel: 4" × 3" aluminum
- Cost: $68
- Timeline: 1 week
- Feel: Clicky mechanical

**Option 2: Capacitive Touch Grid**
- 1× custom PCB (12×4 grid)
- Panel: 180mm × 60mm polycarbonate
- Cost: ~$90
- Timeline: 3 weeks (2 weeks PCB, 1 week assembly)
- Feel: Smooth, velocity-sensitive

**Choose**: PB86 for traditional drum machine, Capacitive for expressive pads

---

### Project B: 8-Instrument Drum Machine

**Option 1: PB86 Mechanical**
- 1× BM-8x8
- Panel: 8" × 8" aluminum
- Cost: $97
- Timeline: 2 weeks
- Features: 64 buttons, multi-page (16 steps)

**Option 2: Capacitive Touch Grid**
- 1× custom PCB (8×8 grid)
- Panel: 120mm × 120mm polycarbonate
- Cost: $113
- Timeline: 3 weeks (2 weeks PCB, 1 week assembly)
- Features: 64 touch points, RGB LEDs, velocity

**Choose**: PB86 for cost/complexity, Capacitive for premium feel

---

### Project C: Clip Launcher (64 clips)

**Option 1: PB86 Mechanical**
- 1× BM-8x8
- Panel: 8" × 8" aluminum
- Cost: $97
- Timeline: 2 weeks
- Features: 64 buttons, tactile feedback

**Option 2: Capacitive Touch Grid**
- 1× custom PCB (8×8 grid)
- Panel: 120mm × 120mm polycarbonate
- Cost: $113
- Timeline: 3 weeks
- Features: 64 touch points, RGB colors, velocity-sensitive clip launch

**Choose**: PB86 for reliable clip triggering, Capacitive for visual feedback

---

### Project D: Expression Pad (8×8 grid)

**Option 1: PB86 Mechanical**
- ❌ Not suitable (no velocity sensitivity)

**Option 2: Capacitive Touch Grid**
- 1× custom PCB (8×8 grid)
- Panel: 120mm × 120mm polycarbonate
- Cost: $113
- Timeline: 3 weeks
- Features: Velocity-sensitive, aftertouch, RGB pressure visualization

**Choose**: Capacitive touch only (PB86 can't do velocity)

---

## Hybrid Approach

**Combine Both Systems!**

```
┌─────────────────────────────────────────┐
│  [PB86 Step Sequencer]  [Cap Touch Pads]│
│  (tactile timing)        (expression)   │
└─────────────────────────────────────────┘
```

**Example Configuration**:
- **Left side**: PB86 8×8 for step sequencing (tactile precision)
- **Right side**: Capacitive 4×4 for drum pads (velocity expression)

**Best of Both Worlds**:
- Tactile buttons for precise timing
- Touch pads for expressive playing
- Cost: $97 + $35 = $132 (BM-8x8 + 4×4 capacitive grid)

---

## Recommendation

### Start with PB86 Mechanical if:
- ✅ You want tactile feedback
- ✅ You're building step sequencers
- ✅ You want simple, reliable buttons
- ✅ Cost is a concern
- ✅ You have 80× PB86 on-hand

### Start with Capacitive Touch Grid if:
- ✅ You need velocity sensitivity
- ✅ You want a premium smooth interface
- ✅ You're building drum pads
- ✅ You want RGB LED feedback
- ✅ You know what grid size you need

### Build Both if:
- ✅ You want maximum flexibility
- ✅ You have the budget
- ✅ You need different input types
- ✅ You want to experiment

---

## Quick Start

### PB86 Mechanical Quick Start
1. Build **BM-1x8** prototype ($23)
2. Test button matrix functionality
3. Stack 3× for **3-instrument drum machine** ($68)
4. Scale to **BM-8x8** when ready ($97)

**Timeline**: 1-2 weeks to first working prototype

### Capacitive Touch Grid Quick Start
1. Choose grid size (4×4, 8×8, 8×16, custom)
2. Design **custom PCB** for that size
3. Order prototype boards (5 pieces)
4. Assemble and test single PCB
5. Build **8×8 grid** with single PCB ($113)

**Timeline**: 3 weeks to first working prototype (2 weeks PCB, 1 week assembly)

---

## Documentation

For detailed specifications, see:
- **PB86 Mechanical**: `pb86-button-matrix-system.md`
- **Capacitive Touch (Through-Hole)**: `capacitive-touch-pcb-grid-system.md`
- **Capacitive Touch (SMD Combo IC)**: `capacitive-touch-smd-combo-ic-design.md`
- **Modular Architecture**: `modular-control-surface-architecture.md`

---

## Which Should You Build First?

**If you want to start NOW** → Build **PB86 BM-1x8**
- All components on-hand
- No custom PCB needed (can use perfboard)
- Simple wiring
- 1 week to working prototype

**If you want premium feel** → Choose capacitive approach:
- **Through-hole MPR121**: $113, DIY assembly, 2-3 weeks
- **SMD combo IC**: $155, professional assembly, 3-4 weeks
- Both offer velocity sensitivity and RGB LEDs
- Choose based on budget and quality requirements

**If you want maximum flexibility** → Build **both**
- PB86 for step sequencing (tactile)
- Capacitive for drum pads (velocity)
- Combine in single control surface
