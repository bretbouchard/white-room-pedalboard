* SPICE Netlist for 8-Button PB86 Circuit
* Created: January 16, 2026
* Purpose: Validate button input + LED output circuits

* ============================================================
* POWER SUPPLY
* ============================================================
VCC 1 0 DC 5.0

* ============================================================
* DECOUPLING CAPACITORS
* ============================================================
C1 VCC 0 100u
C2 VCC 0 100n

* ============================================================
* BUTTON 1
* ============================================================
* Voltage source simulates button press (5V = released, 0V = pressed)
V_BUTTON1 IN1_1 0 PULSE(5 0 1ms 1ms 100ms 200ms)
R_PULLUP1 IN1_1 VCC 100k
C_IN1 IN1_1 0 10p

* ============================================================
* BUTTON 2
* ============================================================
V_BUTTON2 IN2_1 0 PULSE(5 0 10ms 1ms 100ms 200ms)
R_PULLUP2 IN2_1 VCC 100k
C_IN2 IN2_1 0 10p

* ============================================================
* BUTTON 3
* ============================================================
V_BUTTON3 IN3_1 0 PULSE(5 0 20ms 1ms 100ms 200ms)
R_PULLUP3 IN3_1 VCC 100k
C_IN3 IN3_1 0 10p

* ============================================================
* BUTTON 4
* ============================================================
V_BUTTON4 IN4_1 0 PULSE(5 0 30ms 1ms 100ms 200ms)
R_PULLUP4 IN4_1 VCC 100k
C_IN4 IN4_1 0 10p

* ============================================================
* BUTTON 5
* ============================================================
V_BUTTON5 IN5_1 0 PULSE(5 0 40ms 1ms 100ms 200ms)
R_PULLUP5 IN5_1 VCC 100k
C_IN5 IN5_1 0 10p

* ============================================================
* BUTTON 6
* ============================================================
V_BUTTON6 IN6_1 0 PULSE(5 0 50ms 1ms 100ms 200ms)
R_PULLUP6 IN6_1 VCC 100k
C_IN6 IN6_1 0 10p

* ============================================================
* BUTTON 7
* ============================================================
V_BUTTON7 IN7_1 0 PULSE(5 0 60ms 1ms 100ms 200ms)
R_PULLUP7 IN7_1 VCC 100k
C_IN7 IN7_1 0 10p

* ============================================================
* BUTTON 8
* ============================================================
V_BUTTON8 IN8_1 0 PULSE(5 0 70ms 1ms 100ms 200ms)
R_PULLUP8 IN8_1 VCC 100k
C_IN8 IN8_1 0 10p

* ============================================================
* LED CIRCUIT (74HC595 driving LEDs)
* ============================================================
V_LED1 Q1_1 0 PULSE(0 5 0ms 0ms 50ms 100ms)
R_OUT1 Q1_1 LED1_ANODE 50
D1 LED1_ANODE LED1_CATHODE D_LED
R_LIMIT1 LED1_CATHODE 0 150

V_LED2 Q2_1 0 PULSE(0 5 0ms 0ms 50ms 100ms)
R_OUT2 Q2_1 LED2_ANODE 50
D2 LED2_ANODE LED2_CATHODE D_LED
R_LIMIT2 LED2_CATHODE 0 150

V_LED3 Q3_1 0 PULSE(0 5 0ms 0ms 50ms 100ms)
R_OUT3 Q3_1 LED3_ANODE 50
D3 LED3_ANODE LED3_CATHODE D_LED
R_LIMIT3 LED3_CATHODE 0 150

V_LED4 Q4_1 0 PULSE(0 5 0ms 0ms 50ms 100ms)
R_OUT4 Q4_1 LED4_ANODE 50
D4 LED4_ANODE LED4_CATHODE D_LED
R_LIMIT4 LED4_CATHODE 0 150

V_LED5 Q5_1 0 PULSE(0 5 0ms 0ms 50ms 100ms)
R_OUT5 Q5_1 LED5_ANODE 50
D5 LED5_ANODE LED5_CATHODE D_LED
R_LIMIT5 LED5_CATHODE 0 150

V_LED6 Q6_1 0 PULSE(0 5 0ms 0ms 50ms 100ms)
R_OUT6 Q6_1 LED6_ANODE 50
D6 LED6_ANODE LED6_CATHODE D_LED
R_LIMIT6 LED6_CATHODE 0 150

V_LED7 Q7_1 0 PULSE(0 5 0ms 0ms 50ms 100ms)
R_OUT7 Q7_1 LED7_ANODE 50
D7 LED7_ANODE LED7_CATHODE D_LED
R_LIMIT7 LED7_CATHODE 0 150

V_LED8 Q8_1 0 PULSE(0 5 0ms 0ms 50ms 100ms)
R_OUT8 Q8_1 LED8_ANODE 50
D8 LED8_ANODE LED8_CATHODE D_LED
R_LIMIT8 LED8_CATHODE 0 150

* ============================================================
* LED DIODE MODEL
* ============================================================
.MODEL D_LED D(Is=1e-10 Rs=1 N=1.8 Cjo=10p)

* ============================================================
* SIMULATION COMMANDS
* ============================================================
.TRAN 10u 200m
* Print LED current measurements (current through LED diodes)
.PRINT TRAN I(D1) I(D2) I(D3) I(D4)
.PRINT TRAN I(D5) I(D6) I(D7) I(D8)
* Print button input voltages
.PRINT TRAN V(IN1_1) V(IN2_1) V(IN3_1) V(IN4_1)
.PRINT TRAN V(IN5_1) V(IN6_1) V(IN7_1) V(IN8_1)
.END
