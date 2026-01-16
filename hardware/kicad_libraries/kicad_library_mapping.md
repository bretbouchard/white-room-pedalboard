# KiCad Library Mapping for PB86 Circuit

## Standard Components (Already in KiCad Libraries)

### Resistors
- Symbol: `Device:R`
- Footprint: `Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal`

### Capacitors
- Electrolytic (100µF):
  - Symbol: `Device:CP`
  - Footprint: `Capacitor_THT:CP_Radial_D5.0mm_P2.50mm`
- Ceramic (100nF):
  - Symbol: `Device:C`
  - Footprint: `Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm`

### LEDs
- Symbol: `Device:LED`
- Footprint: `LED_THT:LED_D3.0mm` or `LED_THT:LED_D5.0mm`

### ICs
- MCP23017 (I2C I/O Expander):
  - Symbol: `MCU_Microchip_CP2102:CP2102-GM` (similar 28-pin IC)
  - Footprint: `Package_DIP:DIP-28_W15.24mm`
  
- 74HC595 (Shift Register):
  - Symbol: `74xGxx:74HC595`
  - Footprint: `Package_DIP:DIP-16_W7.62mm`

## Custom Components

### PB86 Button
- Symbol: `PB86:PB86_Button` (custom)
- Footprint: `PB86:PB86` (custom)

## Installation

1. Copy custom libraries to KiCad user directory:
   ```bash
   # On macOS
   cp -r symbols/PB86.lib ~/Library/Preferences/kicad/symbols/
   cp -r footprints/PB86.pretty ~/Documents/kicad/footprints/
   ```

2. In KiCad, configure paths:
   - Preferences → Configure Paths
   - Add `KICAD_USER_LIBS` pointing to custom library location

3. In schematic editor:
   - Preferences → Manage Symbol Libraries
   - Add custom symbol library

4. In PCB editor:
   - Preferences → Manage Footprint Libraries
   - Add custom footprint library

## Usage

When placing components in schematic:
- Search for component by name
- Select appropriate symbol
- Assign footprint from mapping table above
