#pragma once

#include <cstdint>

namespace DSP {

//==============================================================================
// Platform-Agnostic Color Types (ARGB Format)
//==============================================================================

/**
 * @brief Platform-agnostic color representation (32-bit ARGB)
 *
 * Format: 0xAARRGGBB
 * - Bits 24-31: Alpha (0-255)
 * - Bits 16-23: Red (0-255)
 * - Bits 8-15: Green (0-255)
 * - Bits 0-7: Blue (0-255)
 */
using ColorARGB = uint32_t;

// Common color constants
namespace Colors {
    constexpr ColorARGB Black      = 0xFF000000;
    constexpr ColorARGB White      = 0xFFFFFFFF;
    constexpr ColorARGB Red        = 0xFFFF0000;
    constexpr ColorARGB Green      = 0xFF00FF00;
    constexpr ColorARGB Blue       = 0xFF0000FF;
    constexpr ColorARGB Yellow     = 0xFFFFFF00;
    constexpr ColorARGB Cyan       = 0xFF00FFFF;
    constexpr ColorARGB Magenta    = 0xFFFF00FF;
    constexpr ColorARGB Transparent = 0x00000000;
    constexpr ColorARGB Grey       = 0xFF808080;
    constexpr ColorARGB LightGrey  = 0xFFC0C0C0;
    constexpr ColorARGB DarkGrey   = 0xFF404040;
}

// Color utility functions
inline ColorARGB makeColor(uint8_t a, uint8_t r, uint8_t g, uint8_t b) {
    return ((uint32_t)a << 24) | ((uint32_t)r << 16) | ((uint32_t)g << 8) | (uint32_t)b;
}

inline uint8_t getAlpha(ColorARGB color) { return (color >> 24) & 0xFF; }
inline uint8_t getRed(ColorARGB color)   { return (color >> 16) & 0xFF; }
inline uint8_t getGreen(ColorARGB color) { return (color >> 8) & 0xFF; }
inline uint8_t getBlue(ColorARGB color)  { return color & 0xFF; }

} // namespace DSP
