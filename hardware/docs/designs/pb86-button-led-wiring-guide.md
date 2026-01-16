# PB86 Button + LED Wiring Guide - 8-Button Row

## Overview

How to wire 8 PB86 push buttons with built-in LEDs to create a **single input/output row** that can be used as:
- **Input**: Detect button presses
- **Output**: Control LED on/off state

Perfect for: Step sequencers, drum machines, pattern launchers

---

## PB86 Button Basics

### What is PB86?

The PB86 is a **push button with built-in LED**. It has two separate circuits:

**1. Switch Circuit** (Input):
- Normally open (NO) momentary switch
- Closes when button is pressed
- Used for input detection

**2. LED Circuit** (Output):
- Built-in LED (single color: red, green, yellow, or white)
- Separate from switch circuit
- Used for visual feedback

### Pin Configuration

Looking at the bottom of the PB86 (6 pins total):

```
┌─────────────────┐
│  PB86 Button    │
│                 │
│  ╔═════════════╗│
│  ║   BUTTON    ║│
│  ╚═════════════╝│
│                 │
│  [1] [2] [3]   │ ← Bottom view
│  [4] [5] [6]   │
└─────────────────┘
```

**Pin Functions**:
- **Pins 1-2**: Switch (NO contacts)
- **Pin 3**: Switch common (connects to 1-2 when pressed)
- **Pins 4-5**: LED anode (+)
- **Pin 6**: LED cathode (-)

**Schematic Symbol**:
```
        Switch Circuit          LED Circuit
     ┌─────────┐            ┌─────────┐
    ─┤ NO     ├─            ┤ LED    ├─
     │  SW1   │            │  BUILT  │
    ─┤ NO     ├─            │   IN   │─
     │        │            └─────────┘
     └───┬────┘
         │
      COMMON
```

---

## Wiring 8 PB86 Buttons (Single Row)

### Option 1: Direct MCP23017 + 74HC595 (Recommended)

**Components**:
- 8× PB86 buttons with LEDs
- 1× MCP23017 I/O expander (for button inputs)
- 1× 74HC595 shift register (for LED outputs)
- 8× 150Ω resistors (for LED current limiting)

**Circuit Diagram**:
```
         5V
          │
          ├─────────────────────────────────┐
          │                                 │
    ┌─────┴─────┐                    ┌─────┴─────┐
    │  MCP23017 │                    │  74HC595  │
    │  (Input)  │                    │ (Output)  │
    └─────┬─────┘                    └─────┬─────┘
          │                                 │
          │ GPB0-7 (8 I/O pins)            │ Q0-7 (8 outputs)
          │                                 │
    ┌─────┴─────┬─────┬─────┬─────┬─────┬─────┬─────┐
    │     │     │     │     │     │     │     │     │
  ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐
  │LED │ │LED │ │LED │ │LED │ │LED │ │LED │ │LED │ │LED │
  │ R1 │ │ R2 │ │ R3 │ │ R4 │ │ R5 │ │ R6 │ │ R7 │ │ R8 │
  └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘
    │     │     │     │     │     │     │     │     │
    │    ┌┴┐   ┌┴┐   ┌┴┐   ┌┴┐   ┌┴┐   ┌┴┐   ┌┴┐   ┌┴┐
    │    │1│   │2│   │3│   │4│   │5│   │6│   │7│   │8│
    │    │ │   │ │   │ │   │ │   │ │   │ │   │ │   │ │
    │  ┌─┴─┴─┐ ┌─┴─┴─┐ ┌─┴─┴─┐ ┌─┴─┴─┐ ┌─┴─┴─┐ ┌─┴─┴─┐ ┌─┴─┴─┐ ┌─┴─┴─┐
    │  │PB86 │ │PB86 │ │PB86 │ │PB86 │ │PB86 │ │PB86 │ │PB86 │ │PB86 │
    │  │ #1  │ │ #2  │ │ #3  │ │ #4  │ │ #5  │ │ #6  │ │ #7  │ │ #8  │
    │  └─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘
    │    │       │       │       │       │       │       │       │
    │    │      GND      GND     GND     GND     GND     GND     GND
    │    │       │       │       │       │       │       │       │
    │    └───────┴───────┴───────┴───────┴───────┴───────┴───────┘
    │
    │    Common rails (all buttons connected)
    │
    │    SWITCH INPUTS (to MCP23017)
    │
    ├───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┐
    │       │       │       │       │       │       │       │       │
  ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐
  │NO  │ │NO  │ │NO  │ │NO  │ │NO  │ │NO  │ │NO  │ │NO  │
  │    │ │    │ │    │ │    │ │    │ │    │ │    │ │    │
  │SW  │ │SW  │ │SW  │ │SW  │ │SW  │ │SW  │ │SW  │ │SW  │
  │#1  │ │#2  │ │#3  │ │#4  │ │#5  │ │#6  │ │#7  │ │#8  │
  └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘
    │     │     │     │     │     │     │     │     │
    └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
                  │
             to MCP23017
           (pull-up inputs)
```

---

## Detailed Wiring Steps

### Step 1: Power Rails

**Create two common rails** on PCB or perfboard:

1. **+5V Rail** (for LED anodes)
2. **GND Rail** (for LED cathodes + switch commons)

**Wire all button LEDs in parallel**:
```
5V ───┬───[R]───┬───[R]───┬───[R]───┬───[R]─── ...
      │   150Ω   │   150Ω   │   150Ω   │   150Ω
      │         │         │         │
      ├─ LED1+  ├─ LED2+  ├─ LED3+  ├─ LED4+  ...
      │         │         │         │
     GND       GND       GND       GND
```

---

### Step 2: Switch Inputs (MCP23017)

**Connect each button switch to MCP23017 input pin**:

```
Button 1 Switch Common ──→ MCP23017 GPB0
Button 2 Switch Common ──→ MCP23017 GPB1
Button 3 Switch Common ──→ MCP23017 GPB2
Button 4 Switch Common ──→ MCP23017 GPB3
Button 5 Switch Common ──→ MCP23017 GPB4
Button 6 Switch Common ──→ MCP23017 GPB5
Button 7 Switch Common ──→ MCP23017 GPB6
Button 8 Switch Common ──→ MCP23017 GPB7
```

**Switch Wiring**:
- Each PB86 has **2 NO contacts** (pins 1-2) and **1 common** (pin 3)
- Connect **common pin 3** to MCP23017 input
- Connect **both NO pins 1-2** to GND
- When pressed: common connects to GND → MCP23017 reads LOW

**Internal Pull-Up** (MCP23017):
```
MCP23017 GPB0 ──┬─── 100kΩ pull-up ──→ 5V
                │
                └─── Button 1 Common
                            │
                          Button 1 NO ──→ GND (when pressed)
```

**Result**:
- Button not pressed: MCP23017 reads HIGH (pull-up)
- Button pressed: MCP23017 reads LOW (connected to GND)

---

### Step 3: LED Outputs (74HC595)

**Connect each LED to 74HC595 output pin**:

```
74HC595 Q0 ──→ [150Ω] ──→ Button 1 LED Anode (pins 4-5)
74HC595 Q1 ──→ [150Ω] ──→ Button 2 LED Anode
74HC595 Q2 ──→ [150Ω] ──→ Button 3 LED Anode
74HC595 Q3 ──→ [150Ω] ──→ Button 4 LED Anode
74HC595 Q4 ──→ [150Ω] ──→ Button 5 LED Anode
74HC595 Q5 ──→ [150Ω] ──→ Button 6 LED Anode
74HC595 Q6 ──→ [150Ω] ──→ Button 7 LED Anode
74HC595 Q7 ──→ [150Ω] ──→ Button 8 LED Anode

All LED Cathodes (pin 6) ──→ GND
```

**Current Limiting Resistor**:
- Red LED (2.0V): R = (5V - 2.0V) / 0.020A = 150Ω
- Green/Yellow LED (3.0V): R = (5V - 3.0V) / 0.020A = 100Ω
- Use **150Ω for red**, **100Ω for green/yellow**

---

## Complete Schematic

### MCP23017 Connections

```
        MCP23017 I/O Expander
        ┌──────────────────┐
5V ─────┤ VDD           GPA │─ (not used)
GND ─────┤ VSS           GPB │─ Button 1-8 inputs
SDA ─────┤ SDA          INTA │─ Interrupt output (optional)
SCL ─────┤ SCL          INTB │─ Interrupt output (optional)
        │ RESET         A0  │─ Address select (GND = 0x20)
5V ─────┤ A1           A2  │─ Address select (GND = 0x20)
        └──────────────────┘

Button Wiring:
GPB0 ──→ Button 1 Common (pin 3)
GPB1 ──→ Button 2 Common (pin 3)
GPB2 ──→ Button 3 Common (pin 3)
GPB3 ──→ Button 4 Common (pin 3)
GPB4 ──→ Button 5 Common (pin 3)
GPB5 ──→ Button 6 Common (pin 3)
GPB6 ──→ Button 7 Common (pin 3)
GPB7 ──→ Button 8 Common (pin 3)

All Button NO pins (1,2) ──→ GND
```

### 74HC595 Connections

```
        74HC595 Shift Register
        ┌──────────────────┐
5V ─────┤ VCC           QA │─ Button 1 LED (via resistor)
GND ─────┤ GND           QB │─ Button 2 LED (via resistor)
DATA ────┤ DS           QC │─ Button 3 LED (via resistor)
LATCH ───┤ ST_CP        QD │─ Button 4 LED (via resistor)
CLOCK ───┤ SH_CP        QE │─ Button 5 LED (via resistor)
        │ OE#          QF │─ Button 6 LED (via resistor)
5V ─────┤ MR (reset)  QG │─ Button 7 LED (via resistor)
        └─────────────── QH │─ Button 8 LED (via resistor)
                         └───┘

Control Signals:
DATA  ──→ Serial data in (from Teensy 4.1)
LATCH ──→ Latch signal (from Teensy 4.1)
CLOCK ──→ Clock signal (from Teensy 4.1)
OE#   ──→ Output Enable (connect to GND or PWM for brightness)
MR    ──→ Master Reset (connect to 5V)
```

---

## Microcontroller Interface (Teensy 4.1)

### Pin Connections

```
Teensy 4.1                    MCP23017                    74HC595
┌─────────┐                  ┌─────────┐               ┌─────────┐
│         │                  │         │               │         │
│  3.3V   │─── 5V ──────────→│ VDD     │               │         │
│  GND    │─── GND ─────────→│ VSS     │─── GND ──────→│ GND     │
│  SDA 18 │─── SDA ─────────→│ SDA     │               │         │
│  SCL 19 │─── SCL ─────────→│ SCL     │               │         │
│         │                  │         │               │         │
│  GPIO 2 │─────────────────────────────────────────→│ DATA    │
│  GPIO 3 │─────────────────────────────────────────→│ LATCH   │
│  GPIO 4 │─────────────────────────────────────────→│ CLOCK   │
│  GPIO 5 │─── PWM ─────────────────────────────────→│ OE#     │
│         │                  │         │               │         │
└─────────┘                  └─────────┘               └─────────┘
```

### I2C Addressing (MCP23017)

**Default Address**: 0x20 (A0, A1, A2 all grounded)

**For multiple modules**: Set jumpers for unique addresses
```
A2 A1 A0 | I2C Address
---------+------------
0  0  0  | 0x20 (default)
0  0  1  | 0x21
0  1  0  | 0x22
... etc.
```

---

## Code Example (Arduino/Teensy)

### Reading Button Inputs

```cpp
#include <Wire.h>

#define MCP23017_ADDR 0x20

void setup() {
  Wire.begin();

  // Configure MCP23017 GPB0-7 as inputs with pull-ups
  Wire.beginTransmission(MCP23017_ADDR);
  Wire.write(0x00); // IODIRA register (not used)
  Wire.write(0x00); // IODIRB register (0 = input)
  Wire.write(0xFF); // IPOLA register (not used)
  Wire.write(0xFF); // IPOLB register (1 = pull-up enabled)
  Wire.endTransmission();
}

void loop() {
  // Read button states
  Wire.beginTransmission(MCP23017_ADDR);
  Wire.write(0x13); // GPIOB register
  Wire.endTransmission();
  Wire.requestFrom(MCP23017_ADDR, 1);

  uint8_t buttonStates = Wire.read();

  // Check each button (bit 0 = button 1, bit 7 = button 8)
  for (int i = 0; i < 8; i++) {
    if (!(buttonStates & (1 << i))) {
      // Button i+1 is pressed (LOW = pressed)
      Serial.printf("Button %d pressed\n", i + 1);
    }
  }

  delay(10); // Debounce
}
```

### Controlling LED Outputs

```cpp
#define DATA_PIN  2
#define LATCH_PIN 3
#define CLOCK_PIN 4

void setLED(uint8_t ledNum, bool state) {
  // Shift out 8 bits (one for each LED)
  digitalWrite(LATCH_PIN, LOW);

  for (int i = 0; i < 8; i++) {
    bool ledState = (i == ledNum) ? state : false;
    digitalWrite(DATA_PIN, ledState);
    digitalWrite(CLOCK_PIN, HIGH);
    digitalWrite(CLOCK_PIN, LOW);
  }

  digitalWrite(LATCH_PIN, HIGH);
}

// Example: Turn on LED 5
setLED(4, true);  // LED 5 on
delay(1000);
setLED(4, false); // LED 5 off
```

### Combined: Button Press Lights LED

```cpp
void loop() {
  // Read button states
  Wire.beginTransmission(MCP23017_ADDR);
  Wire.write(0x13);
  Wire.endTransmission();
  Wire.requestFrom(MCP23017_ADDR, 1);
  uint8_t buttonStates = Wire.read();

  // Update LEDs based on button states
  digitalWrite(LATCH_PIN, LOW);
  shiftOut(DATA_PIN, CLOCK_PIN, LSBFIRST, buttonStates);
  digitalWrite(LATCH_PIN, HIGH);

  delay(10);
}
```

---

## PCB Layout Tips

### Trace Width
- **Power traces**: 0.5mm (20 mil) minimum
- **Signal traces**: 0.25mm (10 mil) minimum
- **GND plane**: Fill all unused space

### Component Placement
- Place MCP23017 near Teensy 4.1 (short I2C traces)
- Place 74HC595 near button LEDs (short output traces)
- Group 8 buttons in linear array
- Add mounting holes at corners

### Test Points
- Add test points for:
  - SDA, SCL (I2C)
  - DATA, LATCH, CLOCK (LED control)
  - 5V, GND (power)
  - Each button input (for debugging)

---

## Power Consumption

### Per-Button LED
- Forward current: 20mA (typical)
- Voltage drop: 2.0V (red) or 3.0V (green/yellow)
- Power per LED: 40-60mW

### Total for 8 Buttons
- All LEDs on: 8 × 20mA = 160mA
- MCP23017 current: 1mA
- 74HC595 current: 10mA
- **Total**: ~170mA

### Power Supply
- Use **5V 1A supply** for safety margin
- Add **100µF capacitor** near power input
- Add **0.1µF decoupling capacitor** near each IC

---

## Troubleshooting

### Buttons Not Detected
- Check I2C wiring (SDA, SCL)
- Verify MCP23017 address (0x20 default)
- Check pull-ups enabled (IPOLB register)
- Test with multimeter: button press should pull pin LOW

### LEDs Not Lighting
- Check 74HC595 connections (DATA, LATCH, CLOCK)
- Verify LED polarity (anode/cathode)
- Check resistor values (150Ω red, 100Ω green)
- Test LED with 5V + resistor directly

### Intermittent Behavior
- Add debounce (10-50ms delay in code)
- Check all ground connections
- Verify power supply stability
- Add 0.1µF decoupling capacitors

---

## Expansion

### Add More Rows
To add 8 more buttons (second row):
- Add another MCP23017 (address 0x21)
- Add another 74HC595 (daisy-chain DATA out)
- Connect same DATA, LATCH, CLOCK signals
- Total: 16 buttons (2 rows × 8)

### Daisy-Chaining 74HC595
```
Teensy DATA ──→ 74HC595 #1 QH' ──→ 74HC595 #2 DS ──→ ...
```

Each 74HC595 needs its own latch/clock, but data cascades.

---

## Bill of Materials

| Component | Qty | Cost | Source |
|-----------|-----|------|--------|
| PB86 button with LED | 8 | $4.00 | On-hand |
| MCP23017 I/O expander | 1 | $1.50 | On-hand |
| 74HC595 shift register | 1 | $0.50 | On-hand |
| Resistors 150Ω | 8 | $0.10 | On-hand |
| Resistors 100Ω (if green LEDs) | 8 | $0.10 | On-hand |
| Capacitor 100µF | 1 | $0.10 | On-hand |
| Capacitor 0.1µF | 2 | $0.05 | On-hand |
| **Total** | | **$6.35** | |

**On-Hand**: All components available!

---

## Summary

✅ **8 buttons** with individual LED control
✅ **Input detection** via MCP23017 (I2C)
✅ **LED feedback** via 74HC595 (shift register)
✅ **Low cost** ($6.35 in parts)
✅ **Simple code** (I2C + SPI)
✅ **Expandable** (add more rows)

Perfect for building a **1×8 step sequencer row** or **8-button control strip**!
