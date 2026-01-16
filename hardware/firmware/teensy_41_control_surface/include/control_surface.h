/**
 * Control Surface State Management
 * White Room Hardware Platform - Reference Control Surface
 */

#ifndef CONTROL_SURFACE_H
#define CONTROL_SURFACE_H

#include <Arduino.h>
#include <stdint.h>

// ============================================================================
// LED Color Structure
// ============================================================================

struct LEDColor {
    uint16_t r;  // Red (16-bit for 16-bit PWM)
    uint16_t g;  // Green
    uint16_t b;  // Blue
};

// ============================================================================
// Control Surface State
// ============================================================================

struct ControlSurfaceState {
    // Encoder positions (0-4095, 12-bit resolution)
    int32_t encoder_positions[8];

    // Encoder switch states (true=pressed, false=released)
    bool encoder_switch_states[8];

    // LED colors (RGB, 16-bit per channel)
    LEDColor led_colors[8];

    // Dirty flag for LED updates
    bool leds_dirty;
};

// ============================================================================
// State Management Functions
// ============================================================================

/**
 * Initialize control surface state
 * @param s State structure to initialize
 */
void state_init(ControlSurfaceState* s);

#endif // CONTROL_SURFACE_H
