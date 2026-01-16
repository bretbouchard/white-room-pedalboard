# Component Inventory - White Room Hardware Platform

**Date**: January 15, 2026
**Status**: On-hand components ready for hardware development
**Repository**: hardware/docs/inventory/

---

## Executive Summary

This document catalogs all components currently on-hand for White Room hardware development. Components span analog synthesis, digital control, power management, and interface categories - providing comprehensive flexibility for multiple hardware module designs.

**Total Components**: 1,000+ individual ICs, 500+ transistors/diodes, 7 motorized faders

---

## Component Categories

### 1. Analog Synthesis & DSP
- **VCOs**: ICL8038CCPD x15
- **OTAs**: LM13700 x25 (dual OTA)
- **Filters**: AS3320 x2, MF6CN x15
- **Companders**: NE570N x20
- **Effects**: PT2399 x12 (echo delay)

### 2. Digital Signal Processing
- **FM Synthesis**: YM3812 x4 (OPL2)
- **ADC**: TLC0838CN x3, ADC0808CCN x5
- **DAC**: PCM5102A x2 (I2S)
- **Filters**: MF6CN x15 (6th order Butterworth)

### 3. Logic & Digital ICs
- **Counters**: CD4017B x30, CD4022BE x20
- **Shift Registers**: 74HC595 x210, CD4517 x10, SN74HC164N x10
- **Multiplexers**: CD4051BE x10, CD22M3494EZ x3 (crosspoint)
- **Inverters**: CD4069 x10, CD40106BE x20 (Schmitt)
- **Switches**: CD4066 x20, SN74HC14N x30
- **Decoders**: CD4514BE x5

### 4. Microcontrollers & Computing
- **Teensy 4.1** x1 (600 MHz ARM Cortex-M7)
- **Daisy Seed** x1 (STM32-based audio)
- **Raspberry Pi Pico** x2 (RP2040)
- **PIC16F1705-I/SL** x10
- **ATTINY85-20PU** x5

### 5. I/O Expansion
- **MCP23017** x11 (16-bit I2C I/O expander)
- **MPR121** x24 (capacitive touch: 4 chips + 20 breakout boards)

### 6. Operational Amplifiers
- **TL072CN** x22 (dual JFET)
- **TL074CN** x20 (quad JFET)
- **LM324N** x25 (quad bipolar)
- **LF347N** x25 (quad JFET)
- **LM308N** x10
- **MUSES8820** x10 (premium audio)
- **OPA134PA** x5

### 7. Interface Components
- **Motorized Faders**: Behringer X32 faders x7 (100mm)
- **Push Buttons**: PB86 x40 (with LED), PB86-A1/A0 x40 (momentary with LED)
- **MIDI**: DIN female x8 (4 PCB + 4 panel mount)
- **Audio Jacks**: 1/4" x18 (PCB mount, 6.35mm)
- **Potentiometer**: 250K Log x1 (Alps)

### 8. Transistors
- **NPN**: BC549C x50, BC107B x50, BC109B x50, BC550C x25, 2N3904 x100
- **PNP**: BC560C x25, BC560 x100, 2N3906 x100, BC184C x50
- **Power**: 2N3055 x10, TIP31C x10
- **JFET**: PF5102 x10, BS170 x10
- **MOSFET**: 2N7000 x50

### 9. Specialized Components
- **Vactrols**: VTL5C1 x10 (audio optocoupler)
- **LDRs**: 5537 x50 (photoresistors)
- **Timers**: NE555 x50
- **Optoisolators**: 4N25 x20
- **Display Drivers**: LM3916N x10 (LED VU meter)

### 10. Power Management
- **Regulators**: LM317 x30 (adjustable)
- **Charge Pump**: TC1044SCPA x5 (DC-DC converter)

### 11. Discrete Components
- **Diodes**: 1N34A x10 (germanium), 1N5817 x50 (Schottky)
- **Flip Flops**: CD4013BE x10

---

## Component Details

### A. Specialized Synthesis ICs

#### AS3394E - Synth on a Chip (x1)
- **Description**: Complete analog synthesizer voice
- **Features**: VCO, VCF, VCA, LFO, noise generator
- **Applications**: Voice module, complete synthesizer voice
- **Datasheet**: Alfa AS3394E

#### AS3310 - ADSR Envelope Generator (x2)
- **Description**: ADSR envelope generator clone
- **Original**: ECEM3310 (Roland IR3109)
- **Applications**: Envelope generation, VCAs
- **Datasheet**: Alfa AS3310

#### AS3320 - VCF (x2)
- **Description**: Voltage-controlled filter
- **Original**: CEM3320 (classic synthesizer filter)
- **Applications**: Filter modules, voltage-controlled tone
- **Datasheet**: Alfa AS3320

#### YM3812 - FM Synthesis (x4)
- **Description**: OPL2 FM synthesis chip
- **Applications**: FM synthesis, retro computer sound
- **Interface**: Parallel digital
- **Datasheet**: Yamaha YM3812

### B. Analog Building Blocks

#### ICL8038CCPD - VCO (x15)
- **Description**: Precision waveform generator/voltage-controlled oscillator
- **Outputs**: Sine, square, triangle, sawtooth
- **Frequency Range**: 0.001 Hz to 300 kHz
- **Applications**: VCO modules, LFOs, function generators
- **Datasheet**: Intersil ICL8038

#### LM13700 - Dual OTA (x25)
- **Description**: Dual operational transconductance amplifier
- **Applications**: VCA, filters, voltage-controlled circuits
- **Features**: Linearizing diodes, high impedance output
- **Datasheet**: National/TI LM13700

#### NE570N - Compander (x20)
- **Description**: Dual compander (compressor/expander)
- **Applications**: Dynamics processing, noise reduction
- **Features**: RMS detector, precision rectifier
- **Datasheet**: Signetics NE570

#### PT2399 - Echo Delay (x12)
- **Description**: Digital echo delay processor
- **Delay Time**: Up to 442ms
- **Applications**: Delay effects, reverb (with modulation)
- **Datasheet**: Princeton Technology PT2399

### C. Control Interface

#### PB86 - Push Button with LED (x40 + x40)
- **Description**: Momentary push button with integrated LED
- **Types**: PB86 (standard), PB86-A1/A0 (momentary reset)
- **Applications**: Control panels, user interface
- **Mounting**: PCB mount

#### Behringer X32 Motorized Fader (x7)
- **Description**: 100mm motorized fader from Behringer X32 mixer
- **Applications**: DAW control surfaces, automation
- **Interface**: 10k linear potentiometer + motor
- **Feedback**: Position sensing needed

#### MPR121 - Capacitive Touch (x24)
- **Description**: 12-channel capacitive touch sensor
- **Interface**: I2C
- **Applications**: Touch buttons, proximity sensing
- **Configurable**: 4 chips + 20 breakout boards

### D. Data Conversion

#### TLC0838CN - 8-bit ADC + 8x MUX (x3)
- **Description**: 8-bit successive approximation ADC with 8-channel mux
- **Resolution**: 8-bit (256 steps)
- **Channels**: 8 single-ended or 4 differential
- **Interface**: Multiplexed output
- **Datasheet**: TI TLC0838

#### ADC0808CCN - 8-bit ADC (x5)
- **Description**: 8-bit ADC with sample-hold
- **Resolution**: 8-bit
- **Channels**: 8 analog inputs
- **Conversion Time**: 100 μs
- **Datasheet**: ADC0808

#### PCM5102A - I2S DAC (x2)
- **Description**: Stereo DAC with I2S interface
- **Resolution**: 16/24/32-bit
- **Sample Rate**: Up to 384 kHz
- **Applications**: Audio output, high-quality DAC
- **Interface**: I2S, hardware/software volume control
- **Datasheet**: TI PCM5102

### E. Microcontrollers

#### Teensy 4.1 (x1)
- **Description**: ARM Cortex-M7 @ 600 MHz
- **Memory**: 1MB flash, 512KB RAM
- **I/O**: 34x digital, 18x ADC, native USB
- **Applications**: Main control surface MCU, SCH-BUS/1 module
- **Current Use**: Reference control surface firmware

#### Daisy Seed (x1)
- **Description**: STM32-based audio development board
- **Features**: Audio codec, USB, SD card
- **Applications**: Audio modules, DSP
- **Ecosystem**: Electro-Smith Daisy platform

#### Raspberry Pi Pico (x2)
- **Description**: RP2040 dual-core ARM Cortex-M0+
- **Applications**: Auxiliary controllers, I/O expansion
- **Interface**: PIO (programmable I/O)

#### PIC16F1705-I/SL (x10)
- **Description**: 8-bit PIC microcontroller
- **Applications**: Simple control tasks, I/O expansion
- **Features**: 12-bit ADC, comparators, DAC

### F. Expansion & Interface

#### MCP23017 - 16-bit I/O Expander (x11)
- **Description**: I2C 16-bit I/O expander
- **Applications**: GPIO expansion, matrix scanning
- **Interface**: I2C (up to 8 devices on bus)
- **Datasheet**: Microchip MCP23017

#### CD22M3494EZ - Crosspoint Switch (x3)
- **Description**: 16x16 crosspoint switch matrix
- **Applications**: Signal routing, patch matrix
- **Interface**: Parallel digital control

### G. Operational Amplifiers

#### TL072CN - Dual JFET Opamp (x22)
- **Description**: Low-noise JFET-input dual opamp
- **Applications**: Audio processing, filters, buffers
- **Features**: Low noise, high slew rate
- **Datasheet**: TI TL072

#### TL074CN - Quad JFET Opamp (x20)
- **Description**: Low-noise JFET-input quad opamp
- **Applications**: Multiple audio stages, filters
- **Features**: Same as TL072 but quad package

#### MUSES8820 - Premium Audio Opamp (x10)
- **Description**: High-end audio opamp from MUSES
- **Applications**: Premium audio paths, mastering
- **Features**: Extremely low distortion

### H. Logic & Digital

#### 74HC595 - 8-bit Shift Register (x210)
- **Description**: 8-bit serial-in parallel-out shift register
- **Applications**: LED driving, output expansion, multiplexing
- **Interface**: SPI-like (data, latch, clock)

#### CD4017B - Decade Counter (x30)
- **Description**: 5-stage Johnson decade counter
- **Applications**: Sequencer, pattern generation, clock division
- **Outputs**: 10 decoded outputs

#### CD4066 - Quad Bilateral Switch (x20)
- **Description**: Quad analog switch
- **Applications**: Signal switching, analog routing
- **Features**: Low on-resistance

### I. Power Management

#### LM317 - Voltage Regulator (x30)
- **Description**: Adjustable positive voltage regulator
- **Output**: 1.25V to 37V, up to 1.5A
- **Applications**: Power supplies, voltage regulation
- **Datasheet**: TI LM317

#### TC1044SCPA - DC-DC Converter (x5)
- **Description**: Charge pump voltage converter
- **Applications**: Negative voltage generation, voltage inversion
- **Output**: Can generate negative rails from positive

### J. Specialized Components

#### VTL5C1 - Audio Optocoupler/Vactrol (x10)
- **Description**: LED + LDR in light-tight package
- **Applications**: Voltage-controlled resistance, compressors, filters
- **Response**: Smooth, logarithmic compression
- **Applications**: Vintage-style compressors, VCAs

#### LDR 5537 - Photoresistor (x50)
- **Description**: Cadmium sulfide photoresistive cell
- **Applications**: Light sensing, vactrols (with LED)
- **Resistance**: 10k (dark) to ~1M (bright)

---

## Usage Recommendations

### For Reference Control Surface (hardware-1)

**Components to Use**:
- ✅ Teensy 4.1 (x1) - Main MCU
- ✅ MCP23017 (x1-2) - I/O expansion for encoders/switches
- ✅ PB86 push buttons (x8) - Encoder switches
- ⚠️ Need: Rotary encoders (8x) - NOT in inventory

**Components to Consider**:
- Use 74HC595 shift registers instead of MCP23017 for LED feedback (210 available!)
- Use PCM5102A for audio interface module (future)

**Missing Components**:
- ❌ Rotary encoders with quadrature output (8x needed)
- ❌ RGB LEDs or LED backpack (8x needed)
- ❌ USB-C connector (panel mount)

### For Audio Interface Module (Future)

**Components Available**:
- ✅ PCM5102A (x2) - I2S DAC for output
- ✅ TL072CN/TL074CN (x42) - Analog output buffers
- ⚠️ Need: ADC for input (TLC0838CN or ADC0808CCN available)

**Recommendations**:
- Use PCM5102A + TL072 for stereo output
- Use TLC0838CN for 8-channel input (with multiplexing)

### For Analog Synthesis Voice Module

**Components Available**:
- ✅ AS3394E (x1) - Complete voice (VCO, VCF, VCA, LFO)
- ✅ AS3310 (x2) - ADSR envelopes
- ✅ LM13700 (x25) - VCAs, filters
- ✅ TL072CN/TL074CN (x42) - Buffer amps, mixers

**Design**: Complete eurorack-style voice module with:
- VCO (AS3394E or ICL8038)
- VCF (AS3320 or LM13700 state variable)
- VCA (LM13700)
- Envelope (AS3310)
- LFO (ICL8038)

### For Motorized Fader Control Surface

**Components Available**:
- ✅ Behringer X32 faders (x7) - 100mm motorized
- ✅ MCP23017 (x11) - Fader position reading
- ✅ Teensy 4.1 (x1) - Main MCU
- ✅ MPR121 (x24) - Touch buttons for transport controls

**Design**: 7-fader DAW control surface with:
- 7 motorized faders (write automation)
- Transport controls (play, stop, record)
- Touch-sensitive buttons

### For FM Synthesis Module

**Components Available**:
- ✅ YM3812 (x4) - OPL2 FM chips
- ✅ Teensy 4.1 - Control interface
- ⚠️ Need: DAC for control voltages

**Design**: Desktop FM synthesizer with:
- 4x YM3812 for multi-timbral FM
- Digital control via Teensy
- Analog output filters (TL072)

---

## Component Organization

### Storage Recommendations

1. **IC Storage**: Anti-static bags, labeled by category
2. **Transistors**: Component organizers with clear labels
3. **Faders**: Original packaging or custom foam inserts
4. **SMD Components**: Tape reels for 74HC595 (210 pieces!)

### Labeling System

```
[Category] [Part Number] [Quantity] [Location]

Examples:
- VCO ICL8038CCPD x15 Box A-1
- OTA LM13700 x25 Box A-2
- MCU TEENSY41 x1 Box B-1
- FADER X32 x7 Box C-1
```

---

## Procurement Recommendations

### Immediate Needs (hardware-1)

**Missing Components**:
1. **Rotary Encoders**: Bournes PEC11R-4215F-S0024 (x8)
   - Digikey: https://www.digikey.com/product-detail/en/bourns-inc/PEC11R-4215F-S0024/PEC11R-4215F-S0024-ND/5636525
   - Cost: ~$2.50 each
   - Total: ~$20

2. **RGB LEDs**: Adafruit 4x8 LED Backpack (ISK29FRSH4)
   - Adafruit: https://www.adafruit.com/product/3467
   - Cost: ~$8.95 each
   - Total: ~$9 (1 backpack = 8 RGB LEDs)

3. **USB-C Connector**: GCT USB4105-GF-A
   - Digikey: https://www.digikey.com/product-detail/en/global-connector-technology/USB4105-GF-A/635-USB4105-GF-ACT-ND/6157020
   - Cost: ~$1.20 each
   - Total: ~$1.20

**Total BOM Cost**: ~$30 (missing components only)

### Alternative Designs (Using Available Components)

**Option 1: Use 74HC595 for LED Feedback**
- Instead of I2C LED backpack: Use 3x 74HC595 shift registers
- Pros: Already have 210 shift registers!
- Cons: Requires more pins (3 pins vs 2 pins for I2C)
- Cost: $0 (already on hand)

**Option 2: Use ADC for Position Sensing**
- Instead of quadrature encoders: Use 250K pot + ADC
- Pros: Potentiometer available (x1), ADCs available (x8)
- Cons: Lower resolution, no absolute position
- Cost: $0 (already on hand)

**Option 3: Use MCP23017 for I/O Expansion**
- Already have 11 chips!
- Pros: Reduces pin count on Teensy
- Cons: Requires I2C polling
- Cost: $0 (already on hand)

---

## Project Prioritization

### High Priority (Use Existing Components)

1. **Motorized Fader Control Surface** (7 faders available)
   - Use all 7 Behringer X32 faders
   - Perfect for DAW control
   - All components on-hand

2. **Analog Synthesis Voice Module**
   - Use AS3394E (complete voice)
   - Or build from ICL8038 + AS3320 + AS3310
   - All components on-hand

3. **Audio Interface Module**
   - Use PCM5102A (DAC) + TL072 (output buffers)
   - Use TLC0838CN (ADC) for inputs
   - All components on-hand

### Medium Priority (Need Few Components)

1. **Reference Control Surface** (hardware-1)
   - Teensy 4.1 available
   - Need: Encoders ($20), LEDs ($9), USB-C ($1.20)
   - Total additional cost: ~$30

2. **FM Synthesis Module**
   - YM3812 available (x4)
   - Need: DAC for control voltages
   - Additional cost: ~$10

### Low Priority (Many Components Needed)

1. **Matrix Mixer** (16x16)
   - CD22M3494EZ available (x3)
   - Need: Potentiometers (16x), knobs, jacks
   - High mechanical cost

---

## Design Flexibility

### Modular Design Philosophy

Given the extensive inventory, hardware development can follow three paths:

1. **Eurorack-Style Modules**: Individual modules for each function
2. **Integrated Desktop Units**: Complete instruments in one box
3. **Control Surfaces**: DAW controllers, control panels

### Recommended Development Order

1. **Start Simple**: Reference control surface (hardware-1)
   - Validates SCH-BUS/1 protocol
   - Minimal additional components needed
   - Foundation for all future modules

2. **Add Audio**: Audio interface module
   - PCM5102A DAC + TLC0838CN ADC
   - Enables testing with actual audio

3. **Add Control**: Motorized fader surface
   - 7 faders available
   - Perfect for DAW control

4. **Add Synthesis**: Analog voice module
   - AS3394E or discrete (ICL8038 + AS3320 + AS3310)
   - Complete analog synthesizer voice

---

## Component Cross-Reference

### Alternative Substitutions

| Original | Available | Notes |
|----------|-----------|-------|
| Bournes PEC11R | 250K pot + ADC | Lower resolution, simpler |
| I2C LED backpack | 3x 74HC595 | More pins, $0 cost |
| MCP23017 | 74HC595 | Parallel vs I2C |
| AS3320 VCF | LM13700 | State variable filter |
| AS3310 ADSR | NE555 + LM13700 | Discrete envelope |

---

## Maintenance & Storage

### Static Protection

- Store all ICs in anti-static bags
- Ground workspace when handling components
- Use anti-static mat for assembly

### Moisture Protection

- Desiccant packs in storage containers
- Silica gel for long-term storage
- Climate-controlled storage (ideal)

### Inventory Tracking

- Update this document when components are used
- Track component sources (datasheet links)
- Note any substitutions or modifications

---

## Next Actions

### Immediate (This Week)

1. ✅ **Document inventory** - DONE
2. ⚠️ **Order missing components** for hardware-1 ($30)
3. ⚠️ **Design alternative** using only on-hand components
4. ⚠️ **Test available components** (verify functionality)

### Short Term (This Month)

1. **Complete hardware-1** (reference control surface)
2. **Start audio interface module** (PCM5102A)
3. **Design motorized fader surface** (7 faders)

### Long Term (Next Quarter)

1. **Analog synthesis voice** (AS3394E)
2. **FM synthesis module** (YM3812)
3. **Matrix mixer** (CD22M3494EZ)

---

**Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)**
