/*
  ==============================================================================

    FastRNG.h
    Created: January 9, 2026
    Author: Bret Bouchard

    Fast random number generator for audio DSP hot paths
    - 5-10x faster than std::mt19937
    - No blocking (unlike std::random_device on Linux)
    - LCG-based with good statistical properties for audio
    - Suitable for real-time audio processing

  ==============================================================================
*/

#ifndef FASTRNG_H_INCLUDED
#define FASTRNG_H_INCLUDED

#include <cstdint>

namespace DSP {

//==============================================================================
// Fast Random Number Generator (LCG-based)
//==============================================================================

/**
 * @brief Fast linear congruential generator for audio DSP
 *
 * Uses the Numerical Recipes LCG constants:
 * - Multiplier: 1664525
 * - Increment: 1013904223
 *
 * Speed: 5-10x faster than std::mt19937
 * Quality: Sufficient for audio (noise, dithering, modulation)
 * Determinism: Fixed seed produces reproducible sequences
 *
 * NOT suitable for:
 * - Cryptography
 * - Statistical simulations
 * - Monte Carlo methods
 *
 * Suitable for:
 * - Audio noise generation
 * - Parameter modulation
 * - Dithering
 * - Synthesis algorithms
 */
class FastRNG {
public:
    //==========================================================================
    // Construction
    //==========================================================================

    /**
     * @brief Construct FastRNG with optional seed
     * @param seed Initial seed value (default: 42 for determinism)
     */
    explicit FastRNG(uint32_t seed = 42) noexcept
        : state_(seed)
    {
    }

    //==========================================================================
    // Random number generation
    //==========================================================================

    /**
     * @brief Generate random float in range [-1, 1]
     * @return Random value between -1.0f and 1.0f
     */
    inline float next() noexcept
    {
        state_ = state_ * 1664525u + 1013904223u;  // LCG step
        return (state_ >> 16) / 65535.0f * 2.0f - 1.0f;
    }

    /**
     * @brief Generate random float in range [0, 1]
     * @return Random value between 0.0f and 1.0f
     */
    inline float nextFloat() noexcept
    {
        state_ = state_ * 1664525u + 1013904223u;  // LCG step
        return (state_ >> 16) / 65535.0f;
    }

    /**
     * @brief Generate random float in range [min, max]
     * @param min Minimum value (inclusive)
     * @param max Maximum value (inclusive)
     * @return Random value between min and max
     */
    inline float nextRange(float min, float max) noexcept
    {
        return min + nextFloat() * (max - min);
    }

    /**
     * @brief Generate random uint32
     * @return Random 32-bit unsigned integer
     */
    inline uint32_t nextUInt() noexcept
    {
        state_ = state_ * 1664525u + 1013904223u;  // LCG step
        return state_;
    }

    //==========================================================================
    // Seeding
    //==========================================================================

    /**
     * @brief Reseed the generator
     * @param seed New seed value
     */
    void seed(uint32_t s) noexcept
    {
        state_ = s;
    }

    /**
     * @brief Get current state (for save/restore)
     * @return Current internal state
     */
    uint32_t getState() const noexcept
    {
        return state_;
    }

    /**
     * @brief Set state (for save/restore)
     * @param state New state value
     */
    void setState(uint32_t state) noexcept
    {
        state_ = state;
    }

private:
    uint32_t state_;
};

//==============================================================================
// Convenience functions
//==============================================================================

/**
 * @brief Global FastRNG instance for quick access
 *
 * For most audio DSP use cases, a single global instance is sufficient.
 * Each call advances the generator state, providing independent random values.
 */
inline FastRNG& getGlobalFastRNG()
{
    static FastRNG globalRNG(42);  // Fixed seed for determinism
    return globalRNG;
}

/**
 * @brief Quick random float in [-1, 1] using global RNG
 */
inline float fastRandom() noexcept
{
    return getGlobalFastRNG().next();
}

/**
 * @brief Quick random float in [0, 1] using global RNG
 */
inline float fastRandomFloat() noexcept
{
    return getGlobalFastRNG().nextFloat();
}

} // namespace DSP

#endif // FASTRNG_H_INCLUDED
