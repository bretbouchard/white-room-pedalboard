/*
  ==============================================================================

    FastMathCompilationTest.cpp
    Created: December 31, 2025
    Author: Bret Bouchard

    Simple compilation test for FastMath.h optimizations
    Verifies that fast math functions compile and link correctly

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <cmath>
#include <cstdio>
#include "dsp/FastMath.h"

//==============================================================================
// Fast Math Compilation Tests
//==============================================================================

TEST(FastMathCompilationTest, FastSinCompiles)
{
    printf("\n=== FAST MATH COMPILATION TEST: fastSin ===\n");

    // Test that fastSin compiles and produces reasonable results
    float result = DSP::FastMath::fastSin(M_PI / 2.0f);

    printf("  fastSin(π/2) = %.6f (expected: ~1.0)\n", result);

    // Should be approximately 1.0 (within 1% error tolerance)
    EXPECT_NEAR(result, 1.0f, 0.01f);
}

TEST(FastMathCompilationTest, FastCosCompiles)
{
    printf("\n=== FAST MATH COMPILATION TEST: fastCos ===\n");

    float result = DSP::FastMath::fastCos(0.0f);

    printf("  fastCos(0) = %.6f (expected: ~1.0)\n", result);

    // Should be approximately 1.0
    EXPECT_NEAR(result, 1.0f, 0.01f);
}

TEST(FastMathCompilationTest, FastPow2Compiles)
{
    printf("\n=== FAST MATH COMPILATION TEST: fastPow2 ===\n");

    float result = DSP::FastMath::fastPow2(1.0f);

    printf("  fastPow2(1.0) = %.6f (expected: ~2.0)\n", result);

    // 2^1 = 2
    EXPECT_NEAR(result, 2.0f, 0.01f);
}

TEST(FastMathCompilationTest, DetuneToFactorCompiles)
{
    printf("\n=== FAST MATH COMPILATION TEST: detuneToFactor ===\n");

    // Test detune = 0 cents (should be exactly 1.0)
    double result1 = DSP::FastMath::detuneToFactor(0.0);
    printf("  detuneToFactor(0) = %.8f (expected: 1.0)\n", result1);
    EXPECT_NEAR(result1, 1.0, 0.0001);

    // Test detune = 1200 cents (1 octave, should be exactly 2.0)
    double result2 = DSP::FastMath::detuneToFactor(1200.0);
    printf("  detuneToFactor(1200) = %.8f (expected: 2.0)\n", result2);
    EXPECT_NEAR(result2, 2.0, 0.0001);
}

TEST(FastMathCompilationTest, FastSoftClipCompiles)
{
    printf("\n=== FAST MATH COMPILATION TEST: fastSoftClip ===\n");

    float result1 = DSP::FastMath::fastSoftClip(0.5f);
    float result2 = DSP::FastMath::fastSoftClip(2.0f);

    printf("  fastSoftClip(0.5) = %.6f\n", result1);
    printf("  fastSoftClip(2.0) = %.6f (should be clipped to 1.0)\n", result2);

    EXPECT_NEAR(result2, 1.0f, 0.01f);
}

TEST(FastMathCompilationTest, VerifyFastMathAccuracy)
{
    printf("\n=== FAST MATH ACCURACY VERIFICATION ===\n");

    bool accurate = DSP::FastMath::verifyFastMathAccuracy();

    printf("  Fast math accuracy verification: %s\n", accurate ? "PASS" : "FAIL");

    EXPECT_TRUE(accurate) << "Fast math approximations exceeded error tolerance";
}

TEST(FastMathCompilationTest, BenchmarkFastMath)
{
    printf("\n=== FAST MATH BENCHMARK ===\n");

    double speedup = DSP::FastMath::benchmarkFastMath();

    printf("  Fast math speedup factor: %.2fx\n", speedup);

    // Should be at least 2x faster
    EXPECT_GT(speedup, 2.0) << "Fast math not significantly faster than standard library";
}
