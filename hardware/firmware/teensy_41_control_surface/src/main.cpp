/**
 * White Room Hardware Platform - Reference Control Surface
 * Target: Teensy 4.1
 * Module: control_knobs_8_ref (8 rotary encoders + 8 RGB LEDs)
 * Protocol: SCH-BUS/1 via native USB
 *
 * Hardware Configuration:
 * - Encoders 0-7: Pins 0-15 (Phase A/B pairs)
 * - Encoder Switches 0-7: Pins 16-23
 * - I2C LED Backpack: Pins 18 (SDA), 19 (SCL)
 * - USB: Native USB (SCH-BUS/1 transport)
 *
 * Power Class: P2 (150mA max)
 * - MCU: ~100mA
 * - LEDs: ~40mA (8x 5mA @ 50% duty)
 * - Encoders: ~10mA
 */

#include <Arduino.h>
#include <Encoder.h>
#include <Adafruit_ISK29FRSH4.h>
#include <Wire.h>

// SCH-BUS/1 protocol implementation
#include "sch_bus_protocol.h"
#include "control_surface.h"

// ============================================================================
// Hardware Configuration
// ============================================================================

// Encoder pins (Phase A/B pairs)
constexpr uint8_t ENCODER_PINS_A[8] = {0, 2, 4, 6, 8, 10, 12, 14};
constexpr uint8_t ENCODER_PINS_B[8] = {1, 3, 5, 7, 9, 11, 13, 15};

// Encoder switch pins (push buttons)
constexpr uint8_t ENCODER_SWITCH_PINS[8] = {16, 17, 18, 19, 20, 21, 22, 23};

// I2C configuration for LED backpack
constexpr uint8_t I2C_SDA = 18;
constexpr uint8_t I2C_SCL = 19;
constexpr uint8_t LED_BACKPACK_ADDR = 0x74;

// SCH-BUS/1 configuration
constexpr uint16_t MODULE_ADDR = 0x0001;  // Module address
constexpr uint16_t HOST_ADDR = 0x0000;     // Host address
constexpr uint8_t USB_POLL_RATE_MS = 1;   // 1 kHz polling rate

// ============================================================================
// Module Manifest (SCH-HW-MANIFEST/1)
// ============================================================================

const char MODULE_MANIFEST[] = R"({
  "schema": "sch-hw-manifest/1",
  "model": "control_knobs_8_ref",
  "power_class": "P2",
  "capabilities": {
    "inputs": [
      {"id": "knob.0", "type": "continuous", "resolution": 12},
      {"id": "knob.1", "type": "continuous", "resolution": 12},
      {"id": "knob.2", "type": "continuous", "resolution": 12},
      {"id": "knob.3", "type": "continuous", "resolution": 12},
      {"id": "knob.4", "type": "continuous", "resolution": 12},
      {"id": "knob.5", "type": "continuous", "resolution": 12},
      {"id": "knob.6", "type": "continuous", "resolution": 12},
      {"id": "knob.7", "type": "continuous", "resolution": 12}
    ],
    "outputs": [
      {"id": "led.0", "type": "pwm", "channels": 3},
      {"id": "led.1", "type": "pwm", "channels": 3},
      {"id": "led.2", "type": "pwm", "channels": 3},
      {"id": "led.3", "type": "pwm", "channels": 3},
      {"id": "led.4", "type": "pwm", "channels": 3},
      {"id": "led.5", "type": "pwm", "channels": 3},
      {"id": "led.6", "type": "pwm", "channels": 3},
      {"id": "led.7", "type": "pwm", "channels": 3}
    ]
  }
})";

// ============================================================================
// Global Objects
// ============================================================================

// Encoder objects (from Encoder library)
Encoder encoders[8] = {
    Encoder(ENCODER_PINS_A[0], ENCODER_PINS_B[0]),
    Encoder(ENCODER_PINS_A[1], ENCODER_PINS_B[1]),
    Encoder(ENCODER_PINS_A[2], ENCODER_PINS_B[2]),
    Encoder(ENCODER_PINS_A[3], ENCODER_PINS_B[3]),
    Encoder(ENCODER_PINS_A[4], ENCODER_PINS_B[4]),
    Encoder(ENCODER_PINS_A[5], ENCODER_PINS_B[5]),
    Encoder(ENCODER_PINS_A[6], ENCODER_PINS_B[6]),
    Encoder(ENCODER_PINS_A[7], ENCODER_PINS_B[7])
};

// LED backpack driver
Adafruit_ISK29FRSH4 led_backpack;

// SCH-BUS/1 protocol handler
SchBusProtocol sch_bus;

// Control surface state
ControlSurfaceState state;

// ============================================================================
// Setup Function
// ============================================================================

void setup() {
    // Initialize serial for debugging
    Serial.begin(115200);
    delay(100);
    Serial.println("White Room Hardware Platform - Control Surface v1");
    Serial.println("Model: control_knobs_8_ref");
    Serial.println("Target: Teensy 4.1");
    Serial.println("");

    // Initialize I2C for LED backpack
    Wire.begin(I2C_SDA, I2C_SCL);
    Serial.println("✓ I2C initialized");

    // Initialize LED backpack
    if (!led_backpack.begin(LED_BACKPACK_ADDR)) {
        Serial.println("✗ Failed to initialize LED backpack");
        while (1) {
            delay(100);  // Halt on error
        }
    }
    Serial.println("✓ LED backpack initialized");

    // Clear all LEDs
    for (uint8_t i = 0; i < 8; i++) {
        led_backpack.setLED(i, 0, 0, 0);
    }
    led_backpack.show();
    Serial.println("✓ LEDs cleared");

    // Initialize encoder switch pins with pullup
    for (uint8_t i = 0; i < 8; i++) {
        pinMode(ENCODER_SWITCH_PINS[i], INPUT_PULLUP);
    }
    Serial.println("✓ Encoder switches initialized");

    // Initialize SCH-BUS/1 protocol
    sch_bus.init(MODULE_ADDR, HOST_ADDR);
    Serial.println("✓ SCH-BUS/1 protocol initialized");

    // Initialize control surface state
    state_init(&state);
    Serial.println("✓ Control surface state initialized");

    // Send HELLO message to host
    if (sch_bus.sendHello()) {
        Serial.println("✓ HELLO message sent");
    } else {
        Serial.println("✗ Failed to send HELLO message");
    }

    Serial.println("");
    Serial.println("Setup complete. Entering main loop...");
    Serial.println("");
}

// ============================================================================
// Main Loop
// ============================================================================

void loop() {
    static uint32_t last_usb_poll = 0;
    static uint32_t last_encoder_read = 0;

    // Get current time
    uint32_t now = millis();

    // Read encoders every 1ms (1 kHz rate)
    if (now - last_encoder_read >= 1) {
        read_encoders();
        read_encoder_switches();
        last_encoder_read = now;
    }

    // Process USB messages every 1ms (1 kHz rate)
    if (now - last_usb_poll >= USB_POLL_RATE_MS) {
        process_usb_messages();
        last_usb_poll = now;
    }

    // Update LEDs (only if changes pending)
    if (state.leds_dirty) {
        update_leds();
    }
}

// ============================================================================
// Encoder Reading
// ============================================================================

void read_encoders() {
    for (uint8_t i = 0; i < 8; i++) {
        int32_t new_position = encoders[i].read();

        // Check if encoder changed
        if (new_position != state.encoder_positions[i]) {
            int32_t delta = new_position - state.encoder_positions[i];
            state.encoder_positions[i] = new_position;

            // Normalize to 12-bit range (0-4095)
            uint16_t normalized = normalize_encoder_value(new_position);

            // Send SCH-BUS/1 EVENT message
            sch_bus.sendEncoderEvent(i, normalized, micros());

            // Mark LEDs as dirty (for visual feedback)
            state.leds_dirty = true;
        }
    }
}

void read_encoder_switches() {
    for (uint8_t i = 0; i < 8; i++) {
        bool new_state = (digitalRead(ENCODER_SWITCH_PINS[i]) == LOW);

        // Check for rising/falling edge
        if (new_state != state.encoder_switch_states[i]) {
            state.encoder_switch_states[i] = new_state;

            // Send SCH-BUS/1 EVENT message for switch press
            sch_bus.sendSwitchEvent(i, new_state, micros());

            // Mark LEDs as dirty (for visual feedback)
            state.leds_dirty = true;
        }
    }
}

// ============================================================================
// LED Control
// ============================================================================

void update_leds() {
    for (uint8_t i = 0; i < 8; i++) {
        // Scale 16-bit brightness to 8-bit for LED driver
        uint8_t r = state.led_colors[i].r >> 8;
        uint8_t g = state.led_colors[i].g >> 8;
        uint8_t b = state.led_colors[i].b >> 8;

        led_backpack.setLED(i, r, g, b);
    }
    led_backpack.show();
    state.leds_dirty = false;
}

// ============================================================================
// USB Message Processing
// ============================================================================

void process_usb_messages() {
    SchBusMessage msg;

    // Process all pending messages
    while (sch_bus.receive(&msg)) {
        switch (msg.type) {
            case SCH_BUS_MSG_WELCOME:
                handle_welcome(&msg);
                break;

            case SCH_BUS_MSG_MANIFEST_REQUEST:
                handle_manifest_request(&msg);
                break;

            case SCH_BUS_MSG_FEEDBACK:
                handle_feedback(&msg);
                break;

            case SCH_BUS_MSG_ERROR:
                handle_error(&msg);
                break;

            default:
                Serial.print("Unknown message type: 0x");
                Serial.println(msg.type, HEX);
                break;
        }
    }
}

// ============================================================================
// SCH-BUS/1 Message Handlers
// ============================================================================

void handle_welcome(SchBusMessage* msg) {
    Serial.println("Received WELCOME message");

    // Send MANIFEST to host
    if (sch_bus.sendManifest(MODULE_MANIFEST)) {
        Serial.println("✓ MANIFEST sent");
    } else {
        Serial.println("✗ Failed to send MANIFEST");
    }
}

void handle_manifest_request(SchBusMessage* msg) {
    Serial.println("Received MANIFEST_REQUEST");

    // Send MANIFEST to host
    if (sch_bus.sendManifest(MODULE_MANIFEST)) {
        Serial.println("✓ MANIFEST sent");
    } else {
        Serial.println("✗ Failed to send MANIFEST");
    }
}

void handle_feedback(SchBusMessage* msg) {
    // Parse feedback message
    // Format: [endpoint_id_hi, endpoint_id_lo, value_hi, value_lo, value_hi, value_lo, value_hi, value_lo]
    // For RGB LEDs: [R, G, B] (16-bit each)

    if (msg->length < 8) {
        Serial.println("Invalid FEEDACK message length");
        return;
    }

    uint16_t endpoint_id = (msg->payload[0] << 8) | msg->payload[1];
    uint16_t r = (msg->payload[2] << 8) | msg->payload[3];
    uint16_t g = (msg->payload[4] << 8) | msg->payload[5];
    uint16_t b = (msg->payload[6] << 8) | msg->payload[7];

    // Extract LED index from endpoint ID (e.g., "led.0" -> 0)
    uint8_t led_index = endpoint_id & 0xFF;

    if (led_index < 8) {
        // Update LED color
        state.led_colors[led_index].r = r;
        state.led_colors[led_index].g = g;
        state.led_colors[led_index].b = b;
        state.leds_dirty = true;

        Serial.print("LED");
        Serial.print(led_index);
        Serial.print(" updated: R=");
        Serial.print(r);
        Serial.print(" G=");
        Serial.print(g);
        Serial.print(" B=");
        Serial.println(b);
    }
}

void handle_error(SchBusMessage* msg) {
    Serial.print("ERROR message received: ");
    Serial.println((char*)msg->payload);
}

// ============================================================================
// Utility Functions
// ============================================================================

uint16_t normalize_encoder_value(int32_t position) {
    // Normalize encoder position to 12-bit range (0-4095)
    // Encoder can be negative or exceed range, so wrap around

    const int32_t MAX_VALUE = 4095;
    int32_t normalized = position % (MAX_VALUE + 1);

    if (normalized < 0) {
        normalized += MAX_VALUE + 1;
    }

    return (uint16_t)normalized;
}

// ============================================================================
// Control Surface State Management
// ============================================================================

void state_init(ControlSurfaceState* s) {
    memset(s, 0, sizeof(ControlSurfaceState));

    // Initialize all encoders to center position
    for (uint8_t i = 0; i < 8; i++) {
        s->encoder_positions[i] = 2048;  // Center of 12-bit range
        encoders[i].write(2048);
    }

    // Initialize all LEDs to off
    for (uint8_t i = 0; i < 8; i++) {
        s->led_colors[i].r = 0;
        s->led_colors[i].g = 0;
        s->led_colors[i].b = 0;
    }

    s->leds_dirty = false;
}
