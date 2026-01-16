#pragma once

namespace SchillingerEcosystem {

/**
 * Audio processing constants used throughout the application
 */
namespace AudioConstants {
    // Time-related constants
    constexpr double MIN_TIME_OFFSET = 0.001;        // Minimum time offset for clip positioning (1ms)
    constexpr double MIN_CLIP_DURATION = 0.001;      // Minimum duration for a valid clip (1ms)

    // Stretch ratio limits for time stretching
    constexpr double MIN_STRETCH_RATIO = 0.1;        // Minimum stretch ratio (10% speed)
    constexpr double MAX_STRETCH_RATIO = 4.0;        // Maximum stretch ratio (400% speed)

    // Fade calculation constants
    constexpr double FADE_AMPLITUDE = 0.5;           // Amplitude factor for S-curve fades

    // Default sample rates
    constexpr double DEFAULT_SAMPLE_RATE = 44100.0;  // Default CD quality sample rate
    constexpr double TEST_SAMPLE_RATE = 44100.0;     // Sample rate used for testing/temporary clips

    // Gain and processing limits
    constexpr double MAX_GAIN = 2.0;                 // Maximum gain multiplier
    constexpr double MIN_GAIN = 0.0;                 // Minimum gain multiplier

    // Panning constants
    constexpr double MAX_PAN = 1.0;                  // Maximum right pan
    constexpr double MIN_PAN = -1.0;                 // Maximum left pan
    constexpr double CENTER_PAN = 0.0;               // Center pan position
}

/**
 * Mathematical constants for audio processing
 */
namespace MathConstants {
    constexpr double PI = 3.14159265358979323846;    // Pi constant for mathematical calculations
    constexpr double TWO_PI = 2.0 * PI;              // 2 * PI for periodic functions
}

/**
 * Clip validation and constraint constants
 */
namespace ClipConstants {
    constexpr double MIN_VALID_DURATION = 0.001;     // Minimum duration for a clip to be considered valid
    constexpr double POSITION_EPSILON = 1e-9;        // Small epsilon for floating point comparisons
}

/**
 * UI and interaction constants
 */
namespace UIConstants {
    // Note: These would be defined if needed for UI-related magic numbers
}

} // namespace SchillingerEcosystem