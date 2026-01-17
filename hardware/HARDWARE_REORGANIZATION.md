# Hardware Folder Reorganization Plan

**Goal**: Create project-centric structure with reusable components for nested schematics

---

## 📁 New Structure

```
hardware/
├── shared/                          # Reusable components library
│   ├── components/                  # Shared component modules
│   │   ├── schematics/             # Reusable schematic snippets
│   │   │   ├── capacitive_touch_xy_pad/
│   │   │   │   ├── xy_pad.kicad_sch
│   │   │   │   └── README.md
│   │   │   ├── button_matrix_8x8/
│   │   │   ├── led_ring/
│   │   │   ├── encoder_knob/
│   │   │   └── fader_linear/
│   │   ├── footprints/              # Custom footprints
│   │   │   ├── PB86.pretty/
│   │   │   └── custom.pretty/
│   │   └── models/                  # 3D models
│   │       ├── ESP32-WROOM-32.step
│   │       └── ...
│   ├── libraries/                   # Standard KiCad libraries
│   │   ├── symbols/                # Symbol libraries
│   │   └── footprints/             # Footprint libraries
│   └── templates/                   # Project templates
│       ├── spice-to-kicad-workflow/
│       └── kicad-project-template/
│
├── projects/                        # Individual hardware projects
│   ├── capacitive-touch-xy-pad/
│   │   ├── schematics/             # Project-specific schematics
│   │   │   └── main.kicad_sch
│   │   ├── pcb/                    # PCB files
│   │   │   ├── main.kicad_pcb
│   │   │   └── gerber/
│   │   ├── spice/                  # SPICE simulations
│   │   │   ├── touch_sensor.sp
│   │   │   └── validation_report.md
│   │   ├── docs/                   # Project documentation
│   │   │   ├── design.md
│   │   │   ├── bom.md
│   │   │   └── assembly.md
│   │   └── README.md
│   │
│   └── pb86-8-button-interface/
│       ├── schematics/
│       ├── pcb/
│       ├── spice/
│       └── docs/
│
├── firmware/                        # Hardware firmware
│   └── ...
│
├── infrastructure/                  # Build infrastructure
│   └── ...
│
└── docs/                           # Hardware documentation
    ├── architecture/
    ├── workflows/
    └── user-guides/
```

---

## 🎯 Key Principles

### 1. Shared Components Library
- **Reusable schematic modules** (capacitive touch, buttons, etc.)
- **Custom footprints** (PB86, special connectors)
- **3D models** for visualization
- **Standard KiCad libraries** (symbols, footprints)

### 2. Project-Centric Organization
- **Each project is self-contained**
- **Projects import shared components**
- **Nested schematics** use shared modules
- **Clear separation** between reusable and project-specific

### 3. Hierarchy for Reuse
```
Project Schematic (main.kicad_sch)
├── Shared Component: Capacitive Touch XY Pad
├── Shared Component: Button Matrix 8x8
├── Shared Component: LED Ring
└── Project-Specific: Power Supply
```

---

## 📦 Migration Steps

### Phase 1: Create Structure ✅
- [x] Create shared/ directory
- [x] Create components/ subdirectories
- [x] Create projects/ directory

### Phase 2: Extract Shared Components
- [ ] Move capacitive touch to shared/components/schematics/
- [ ] Move PB86 footprint to shared/components/footprints/
- [ ] Create component README files
- [ ] Document component interfaces

### Phase 3: Reorganize Projects
- [ ] Move pb86-8-button to projects/
- [ ] Move capacitive-touch-xy-pad to projects/
- [ ] Update project file paths
- [ ] Test nested schematics

### Phase 4: Update Documentation
- [ ] Update QUICKSTART.md
- [ ] Create component usage guide
- [ ] Document nested schematic workflow
- [ ] Update WORKFLOW_SETUP_COMPLETE.md

### Phase 5: Clean Up
- [ ] Remove old schematics/ folder
- [ ] Consolidate documentation
- [ ] Update .gitignore
- [ ] Commit and push

---

## 🔧 Component Interface Standard

Each shared component must include:

### 1. README.md
```markdown
# Component Name

## Description
Brief description of what this component does

## Interface
- **Power**: +3.3V, GND
- **Inputs**: List of input signals
- **Outputs**: List of output signals
- **Control**: Any control signals

## Schematic
- File: component.kicad_sch
- KiCad version: 9.0

## Usage
1. In KiCad: Place → Add Sheet
2. Import component schematic
3. Connect power and signals
4. Annotate and update references

## Dependencies
- External components needed
- Footprint libraries required
- Any special requirements

## Projects Using This Component
- Project A
- Project B
```

### 2. Schematic File
- Clean, annotated schematic
- Power flags included
- Interface labels clearly defined
- No hierarchical sheet conflicts

### 3. Footprint Assignment
- All components have footprints
- Footprints in shared/libraries/footprints/
- 3D models if available

---

## 💡 Nested Schematic Workflow

### Creating a Project with Shared Components

1. **Create new project**:
   ```bash
   cd hardware/projects
   mkdir my-new-controller
   cd my-new-controller
   ```

2. **Initialize KiCad project**:
   ```bash
   kicad my-new-controller.kicad_pro
   ```

3. **Add shared components**:
   - In schematic editor: Place → Add Sheet
   - Browse to: `shared/components/schematics/xy_pad/xy_pad.kicad_sch`
   - Add sheet to project
   - Connect hierarchical pins

4. **Document**:
   - Create project README.md
   - Document which shared components used
   - Add to projects list in this file

---

## 📊 Component Library

### Available Shared Components

#### Input Components
- **Capacitive Touch XY Pad** - 8×8 grid with pressure sensing
- **Button Matrix 8×8** - 64 buttons with multiplexing
- **Rotary Encoder** - Quadrature encoder with pushbutton
- **Linear Fader** - Potentiometer with ADC

#### Output Components
- **LED Ring 12** - 12-LED circular display
- **LED Bar Graph** - 10-LED level indicator
- **7-Segment Display** - Numeric display

#### Interface Components
- **PB86 Button** - Tactile button module
- **MCP23017 I/O Expander** - 16-bit I2C GPIO expander
- **74HC595 Shift Register** - 8-bit serial-in parallel-out

#### Power Components
- **3.3V Regulator** - LDO regulator
- **5V Regulator** - USB power supply
- **Battery Charger** - Li-ion charging circuit

---

## ✅ Benefits

1. **Reuse**: Design once, use everywhere
2. **Consistency**: Same component behaves identically
3. **Efficiency**: Faster project setup
4. **Maintenance**: Update component once, all projects benefit
5. **Documentation**: Centralized component documentation
6. **Nested Schematics**: Cleaner project schematics

---

## 🚀 Next Steps

1. **Create shared component structure**
2. **Extract reusable components from existing projects**
3. **Document component interfaces**
4. **Test nested schematic workflow**
5. **Update project documentation**
6. **Commit and push to git**

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**

White Room Hardware Platform
