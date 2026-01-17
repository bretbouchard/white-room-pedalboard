# Capacitive Touch XY Pad - Visual Wiring Diagram

**Copy this exactly in KiCad Schematic Editor**

---

## 📐 Component Placement Map

```
┌─────────────────────────────────────────────────────────┐
│                    KiCad Schematic Layout               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  X1  X2  X3  X4  X5  X6  X7  X8                        │
│  ●   ●   ●   ●   ●   ●   ●   ●                         │
│  │   │   │   │   │   │   │   │                         │
│  └───┴───┴───┴───┴───┴───┴───┘                          │
│      │   │   │   │   │   │   │                          │
│      ▼   ▼   ▼   ▼   ▼   ▼   ▼                          │
│  ┌─────────────────────────────────┐                   │
│  │                                 │                   │
│  │         ESP32-WROOM-32         │                   │
│  │             (U1)                │                   │
│  │                                 │                   │
│  └─────────────────────────────────┘                   │
│      │   │   │   │   │   │   │                          │
│      ▼   ▼   ▼   ▼   ▼   ▼   ▼                          │
│  ●   ●   ●   ●   ●   ●   ●   ●                         │
│  Y1  Y2  Y3  Y4  Y5  Y6  Y7  Y8                        │
│  │   │   │   │   │   │   │   │                         │
│  ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼                          │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │
│  │R1│ │R2│ │R3│ │R4│ │R5│ │R6│ │R7│ │R8│    │
│  │1M│ │1M│ │1M│ │1M│ │1M│ │1M│ │1M│ │1M│    │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘    │
│    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼                 │
│    └────┴────┴────┴────┴────┴────┴────┘                  │
│           │                                           │
│           ▼                                           │
│    ┌──────────────┐                                   │
│    │ Header J1    │                                   │
│    │  (12 pins)   │                                   │
│    └──────────────┘                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 EXACT Wiring Instructions

### Power Wiring (RED in diagram)
```
+3.3V ───┬── ESP32 pin 2 (VCC)
        ├── Header pin 1
        ├── R1 pin 1 (top)
        ├── R2 pin 1 (top)
        ├── R3 pin 1 (top)
        ├── R4 pin 1 (top)
        ├── R5 pin 1 (top)
        ├── R6 pin 1 (top)
        ├── R7 pin 1 (top)
        └── R8 pin 1 (top)

GND ───┬── ESP32 pin 1 (GND)
       └── Header pin 2
```

### X Electrodes (BLUE in diagram)
```
X1 ── ESP32 IO4  ── Header pin 3
X2 ── ESP32 IO5  ── Header pin 4
X3 ── ESP32 IO6  ── Header pin 5
X4 ── ESP32 IO7  ── Header pin 6
X5 ── ESP32 IO8
X6 ── ESP32 IO9
X7 ── ESP32 IO10
X8 ── ESP32 IO11
```

### Y Electrodes (GREEN in diagram)
```
Y1 ── R1 pin 2 ── Header pin 7
Y2 ── R2 pin 2 ── Header pin 8
Y3 ── R3 pin 2 ── Header pin 9
Y4 ── R4 pin 2 ── Header pin 10
Y5 ── R5 pin 2 ── Header pin 11
Y6 ── R6 pin 2 ── Header pin 12
Y7 ── R7 pin 2 (no header)
Y8 ── R8 pin 2 (no header)
```

---

## 🎨 Color-Coded Wiring Guide

**Use wire labels to color-code:**

### 🔴 RED Wires (+3.3V)
- ESP32 VCC → Header pin 1
- ESP32 VCC → All resistor tops (pin 1)

### ⚫ BLACK Wires (GND)
- ESP32 GND → Header pin 2

### 🔵 BLUE Wires (X Electrodes)
- X1 → ESP32 IO4 → Header pin 3
- X2 → ESP32 IO5 → Header pin 4
- X3 → ESP32 IO6 → Header pin 5
- X4 → ESP32 IO7 → Header pin 6
- X5 → ESP32 IO8
- X6 → ESP32 IO9
- X7 → ESP32 IO10
- X8 → ESP32 IO11

### 🟢 GREEN Wires (Y Electrodes)
- Y1 → R1 bottom → Header pin 7
- Y2 → R2 bottom → Header pin 8
- Y3 → R3 bottom → Header pin 9
- Y4 → R4 bottom → Header pin 10
- Y5 → R5 bottom → Header pin 11
- Y6 → R6 bottom → Header pin 12
- Y7 → R7 bottom
- Y8 → R8 bottom

---

## 📝 Step-by-Step Copy Process

### Step 1: Place Components (30 seconds)

1. **Press A** (Add symbol)
2. **Type ESP32**, select, place center
3. **Press A**, **type Conn_01x12**, place right
4. **Press A**, **type R**, press V, type **1M**, place 8 times
5. **Press A**, **type TestPoint**, place 16 times (8 top, 8 bottom)

### Step 2: Wire Power (1 minute)

1. **Press W** (Wire tool)
2. Click +3.3V symbol, click ESP32 pin 2
3. Click +3.3V symbol, click header pin 1
4. Click +3.3V symbol, click all resistor tops
5. Click GND symbol, click ESP32 pin 1
6. Click GND symbol, click header pin 2

### Step 3: Wire X Electrodes (1 minute)

1. Press W
2. Click X1, click ESP32 IO4, click header pin 3
3. Click X2, click ESP32 IO5, click header pin 4
4. Click X3, click ESP32 IO6, click header pin 5
5. Click X4, click ESP32 IO7, click header pin 6
6. Click X5, click ESP32 IO8
7. Click X6, click ESP32 IO9
8. Click X7, click ESP32 IO10
9. Click X8, click ESP32 IO11

### Step 4: Wire Y Electrodes (1 minute)

1. Press W
2. Click Y1, click R1 bottom, click header pin 7
3. Click Y2, click R2 bottom, click header pin 8
4. Click Y3, click R3 bottom, click header pin 9
5. Click Y4, click R4 bottom, click header pin 10
6. Click Y5, click R5 bottom, click header pin 11
7. Click Y6, click R6 bottom, click header pin 12
8. Click Y7, click R7 bottom
9. Click Y8, click R8 bottom

### Step 5: Add Labels (30 seconds)

1. **Press L** (Label)
2. Click each wire, type name (X1, X2, Y1, Y2, etc.)
3. This makes the schematic readable

---

## ✅ Verification Checklist

After wiring, verify:

**Power**:
- [ ] +3.3V connected to ESP32 VCC
- [ ] +3.3V connected to header pin 1
- [ ] +3.3V connected to all 8 resistors (top)
- [ ] GND connected to ESP32 GND
- [ ] GND connected to header pin 2

**X Electrodes**:
- [ ] X1 → ESP32 IO4 → Header pin 3
- [ ] X2 → ESP32 IO5 → Header pin 4
- [ ] X3 → ESP32 IO6 → Header pin 5
- [ ] X4 → ESP32 IO7 → Header pin 6
- [ ] X5 → ESP32 IO8
- [ ] X6 → ESP32 IO9
- [ ] X7 → ESP32 IO10
- [ ] X8 → ESP32 IO11

**Y Electrodes**:
- [ ] Y1 → R1 → Header pin 7
- [ ] Y2 → R2 → Header pin 8
- [ ] Y3 → R3 → Header pin 9
- [ ] Y4 → R4 → Header pin 10
- [ ] Y5 → R5 → Header pin 11
- [ ] Y6 → R6 → Header pin 12
- [ ] Y7 → R7
- [ ] Y8 → R8

---

## 🎯 Time Estimate

**Total time: 5 minutes**

- Place components: 30 seconds
- Wire power: 1 minute
- Wire X electrodes: 1 minute
- Wire Y electrodes: 1 minute
- Add labels: 30 seconds
- Verification: 1 minute

---

## 💡 Pro Tips

1. **Use keyboard shortcuts**: A (add), W (wire), L (label), M (move)
2. **Press Esc** frequently to exit tools
3. **Press R** before placing to rotate components
4. **Zoom in** (Ctrl+Scroll) for precision
5. **Use labels** (L) to name nets for clarity

---

## 📱 Reference

**Phone-accessible guide**: http://192.168.1.186:8000/capacitive_touch_visual_wiring.md

**KiCad project**: `/Users/bretbouchard/apps/schill/white_room/hardware/kicad_projects/capacitive-touch-xy-pad/`

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**

White Room Hardware Platform
