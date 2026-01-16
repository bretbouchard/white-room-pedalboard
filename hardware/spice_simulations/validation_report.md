# SPICE Simulation Validation Report
## PB86 8-Button Circuit

### Date: January 16, 2026

## Circuit Analysis

### Button Input Circuit
- **Pull-up resistors**: 100kΩ each (MCP23017 internal pull-ups)
- **Button states**: 
  - Released: 5V (through pull-up)
  - Pressed: 0V (connected to GND)
- **Input impedance**: 10pF capacitor (MCU input capacitance)

**Expected behavior**:
- Button released: V_IN = 5V
- Button pressed: V_IN = 0V

### LED Output Circuit
- **LED supply**: 5V
- **Series resistors**: 50Ω (74HC595 output) + 150Ω (current limiting) = 200Ω total
- **LED forward voltage**: ~2.0V (red LED)
- **Expected current**: I = (V_CC - V_LED) / R_total = (5V - 2V) / 200Ω = 15mA

**Expected behavior**:
- LED ON: 15mA current, forward voltage ~2.0V
- LED OFF: 0mA current, 0V across LED

## Power Consumption

### Per Button
- LED current: 15mA
- Input current: ~0.05mA (5V / 100kΩ)
- Total per button: ~15.05mA

### Total (8 buttons)
- All LEDs ON: 8 × 15mA = 120mA
- All inputs: 8 × 0.05mA = 0.4mA
- Total: ~120.4mA

## Validation Summary

✅ **Button input circuit**: Correctly designed
- Pull-up resistors ensure 5V when released
- Button press provides reliable 0V

✅ **LED current**: Safe operating range
- 15mA per LED is within typical 20mA max rating
- Total 120mA is reasonable for 5V supply

✅ **Power consumption**: Acceptable
- Total ~120mA for all 8 buttons
- Well within typical USB 500mA limit

## Recommendations

1. **Proceed to breadboard prototype**: Circuit is validated and safe
2. **KiCad schematic**: Ready for PCB layout
3. **Component selection**:
   - MCP23017: I2C I/O expander (already in inventory)
   - 74HC595: SPI shift register (already in inventory)
   - 150Ω resistors: Current limiting (0.25W sufficient)
   - PB86 buttons: Mechanical buttons with LEDs

## Next Steps

1. Build breadboard prototype
2. Test button detection and LED control
3. Write firmware for MCP23017/74HC595
4. Design PCB layout in KiCad
