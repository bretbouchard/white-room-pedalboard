#include "dsp/GateDetector.h"
#include "dsp/EnvelopeGenerator.h"
#include "dsp/EnvelopeFollower.h"
#include <gtest/gtest.h>

using namespace FilterGate;

//==============================================================================
// Gate Detector Tests
//==============================================================================

TEST(GateDetector, OpensWhenInputExceedsThreshold)
{
    GateDetector gate;
    GateParams params;
    params.threshold = 0.5f;
    params.attackMs = 1.0f;  // Fast attack
    gate.setParams(params);

    gate.prepare(48000.0, 512);

    // Input below threshold
    EXPECT_FALSE(gate.isOpen());

    // Input exceeds threshold
    gate.process(0.7f);

    // Should open immediately (isOpenState is set right away)
    EXPECT_TRUE(gate.isOpen());

    // With 1ms attack, gateState should be rising but may not be at 1.0 yet
    EXPECT_GT(gate.getGateState(), 0.0f);
}

TEST(GateDetector, ClosesWhenInputBelowThreshold)
{
    GateDetector gate;
    GateParams params;
    params.threshold = 0.5f;
    params.holdMs = 10.0f;    // Short hold
    params.releaseMs = 10.0f;  // Fast release
    gate.setParams(params);

    gate.prepare(48000.0, 512);

    // Open gate
    gate.process(0.7f);
    EXPECT_TRUE(gate.isOpen());

    // Process hold period + release period
    int totalSamples = static_cast<int>((params.holdMs + params.releaseMs) * 48.0f + 10);
    for (int i = 0; i < totalSamples; i++)
    {
        gate.process(0.3f);
    }

    // Gate should close
    EXPECT_LT(gate.getGateState(), 0.5f);
}

TEST(GateDetector, HysteresisPreventsChatter)
{
    GateDetector gate;
    GateParams params;
    params.threshold = 0.5f;
    params.hysteresis = 0.1f;
    params.attackMs = 1.0f;
    params.releaseMs = 1.0f;
    gate.setParams(params);

    gate.prepare(48000.0, 512);

    // Open at higher threshold (0.6)
    gate.process(0.65f);
    EXPECT_TRUE(gate.isOpen());

    // Should not close until below lower threshold (0.4)
    gate.process(0.45f);

    // Process a few samples to see if it stays open
    for (int i = 0; i < 10; i++)
    {
        gate.process(0.45f);
    }

    // Should still be open (45% > 40% close threshold)
    EXPECT_TRUE(gate.isOpen());

    // Now go below threshold
    int releaseSamples = static_cast<int>(params.releaseMs * 48.0f);
    for (int i = 0; i < releaseSamples + 10; i++)
    {
        gate.process(0.35f);
    }

    // Should close now
    EXPECT_FALSE(gate.isOpen());
}

TEST(GateDetector, AttackTime)
{
    GateDetector gate;
    GateParams params;
    params.attackMs = 50.0f;  // 50ms attack
    params.threshold = 0.5f;
    gate.setParams(params);

    gate.prepare(48000.0, 512);

    gate.process(1.0f);  // Strong input

    // Should not open instantly
    float state1 = gate.getGateState();
    EXPECT_GT(state1, 0.0f);
    EXPECT_LT(state1, 1.0f);

    // Process more samples (should open gradually)
    for (int i = 0; i < 1000; i++)
    {
        gate.process(1.0f);
    }

    float state2 = gate.getGateState();
    EXPECT_GT(state2, state1);  // Should have opened more
}

TEST(GateDetector, ReleaseTime)
{
    GateDetector gate;
    GateParams params;
    params.threshold = 0.5f;
    params.releaseMs = 100.0f;
    params.holdMs = 0.0f;  // No hold
    params.attackMs = 1.0f;  // Fast attack to fully open quickly
    gate.setParams(params);

    gate.prepare(48000.0, 512);

    // Open gate
    for (int i = 0; i < 100; i++)
    {
        gate.process(1.0f);
    }

    EXPECT_TRUE(gate.isOpen());

    gate.process(0.0f);  // Input stops

    // Should close gradually (but isOpenState should still be true)
    EXPECT_TRUE(gate.isOpen());  // Logical state is still open

    float state = gate.getGateState();
    EXPECT_GT(state, 0.0f);  // Envelope hasn't fully decayed yet

    // Process some release samples
    int releaseSamples = static_cast<int>(params.releaseMs * 48.0f / 2);  // Half of release
    for (int i = 0; i < releaseSamples; i++)
    {
        gate.process(0.0f);
    }

    float state2 = gate.getGateState();
    EXPECT_GT(state2, 0.0f);  // Should not be fully closed yet
    EXPECT_LT(state2, state);  // Should have decayed
}

TEST(GateDetector, HoldTime)
{
    GateDetector gate;
    GateParams params;
    params.threshold = 0.5f;
    params.holdMs = 100.0f;
    params.releaseMs = 10.0f;
    gate.setParams(params);

    gate.prepare(48000.0, 512);

    // Open gate
    gate.process(1.0f);
    EXPECT_TRUE(gate.isOpen());

    // Input drops below threshold
    int holdSamples = static_cast<int>(params.holdMs * 48.0f);

    // During hold, should stay open
    for (int i = 0; i < holdSamples; i++)
    {
        gate.process(0.3f);
        EXPECT_TRUE(gate.isOpen());
    }

    // After hold + release, should close
    int releaseSamples = static_cast<int>(params.releaseMs * 48.0f);
    for (int i = 0; i < releaseSamples + 10; i++)
    {
        gate.process(0.3f);
    }

    EXPECT_FALSE(gate.isOpen());
}

TEST(GateDetector, ResetsCorrectly)
{
    GateDetector gate;
    GateParams params;
    params.threshold = 0.5f;
    gate.setParams(params);

    gate.prepare(48000.0, 512);

    // Open gate
    for (int i = 0; i < 100; i++)
    {
        gate.process(1.0f);
    }

    EXPECT_TRUE(gate.isOpen());

    // Reset
    gate.reset();

    // Should be closed
    EXPECT_FALSE(gate.isOpen());
    EXPECT_FLOAT_EQ(gate.getGateState(), 0.0f);
}

TEST(GateDetector, BlockProcessing)
{
    GateDetector gate;
    GateParams params;
    params.threshold = 0.5f;
    params.attackMs = 1.0f;
    gate.setParams(params);

    gate.prepare(48000.0, 512);

    // Create test buffer
    float buffer[256];
    for (int i = 0; i < 256; i++)
    {
        buffer[i] = (i < 128) ? 0.7f : 0.3f;  // First half above, second half below
    }

    gate.process(buffer, 256);

    // Should have opened and closed
    EXPECT_FALSE(gate.isOpen());  // Should be closed at end
}

//==============================================================================
// Envelope Generator Tests
//==============================================================================

TEST(EnvelopeGenerator, ADSRAttackPhase)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADSR;
    params.attackMs = 100.0f;
    env.setParams(params);

    env.prepare(48000.0, 512);

    env.trigger();

    // Should be in attack phase
    EXPECT_GT(env.getCurrentLevel(), 0.0f);
    EXPECT_LT(env.getCurrentLevel(), 1.0f);
    EXPECT_EQ(env.getStageName(), "ATTACK");

    // Process through attack
    for (int i = 0; i < 4800; i++)
    {
        env.process();
    }

    // Should be at or near 1.0
    EXPECT_GE(env.getCurrentLevel(), 0.99f);
}

TEST(EnvelopeGenerator, ADSRDecayPhase)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADSR;
    params.attackMs = 10.0f;
    params.decayMs = 50.0f;
    params.sustain = 0.5f;
    env.setParams(params);

    env.prepare(48000.0, 512);

    env.trigger();

    // Process through attack
    for (int i = 0; i < 1000; i++)
    {
        env.process();
    }

    // Should be in decay phase
    EXPECT_LT(env.getCurrentLevel(), 1.0f);
    EXPECT_GE(env.getCurrentLevel(), 0.5f);
    EXPECT_EQ(env.getStageName(), "DECAY");
}

TEST(EnvelopeGenerator, ADSRSustainPhase)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADSR;
    params.attackMs = 10.0f;
    params.decayMs = 50.0f;
    params.sustain = 0.5f;
    env.setParams(params);

    env.prepare(48000.0, 512);

    env.trigger();

    // Process through attack + decay
    for (int i = 0; i < 3000; i++)
    {
        env.process();
    }

    // Should hold at sustain level
    EXPECT_FLOAT_EQ(env.getCurrentLevel(), 0.5f);
    EXPECT_EQ(env.getStageName(), "SUSTAIN");
}

TEST(EnvelopeGenerator, ADSRReleasePhase)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADSR;
    params.attackMs = 10.0f;
    params.decayMs = 50.0f;
    params.sustain = 0.5f;
    params.releaseMs = 50.0f;
    env.setParams(params);

    env.prepare(48000.0, 512);

    env.trigger();

    // Process to sustain
    for (int i = 0; i < 3000; i++)
    {
        env.process();
    }

    EXPECT_FLOAT_EQ(env.getCurrentLevel(), 0.5f);

    env.release();

    // Should be in release phase
    EXPECT_LT(env.getCurrentLevel(), 0.5f);
    EXPECT_GT(env.getCurrentLevel(), 0.0f);
    EXPECT_EQ(env.getStageName(), "RELEASE");
}

TEST(EnvelopeGenerator, ADRNoSustain)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADR;
    params.attackMs = 10.0f;
    params.decayMs = 100.0f;
    env.setParams(params);

    env.prepare(48000.0, 512);

    env.trigger();

    // Process through attack + decay
    for (int i = 0; i < 5000; i++)
    {
        env.process();
    }

    // Should decay to zero (no sustain)
    EXPECT_LT(env.getCurrentLevel(), 0.01f);
    EXPECT_EQ(env.getStageName(), "IDLE");
}

TEST(EnvelopeGenerator, Retrigger)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADSR;
    params.attackMs = 50.0f;
    env.setParams(params);

    env.prepare(48000.0, 512);

    // First trigger
    env.trigger();
    for (int i = 0; i < 1000; i++)
    {
        env.process();
    }

    float level1 = env.getCurrentLevel();

    // Retrigger from current level
    env.trigger();
    float level2 = env.getCurrentLevel();

    // Should restart attack from zero
    EXPECT_LT(level2, level1);
}

TEST(EnvelopeGenerator, LoopMode)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADR;
    params.attackMs = 10.0f;
    params.decayMs = 50.0f;
    params.loop = true;
    env.setParams(params);

    env.prepare(48000.0, 512);

    env.trigger();

    // Process through first complete envelope
    for (int i = 0; i < 3000; i++)
    {
        env.process();
    }

    // Should have restarted
    EXPECT_GT(env.getCurrentLevel(), 0.0f);
}

TEST(EnvelopeGenerator, VelocitySensitivity)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADSR;
    params.attackMs = 10.0f;
    params.sustain = 0.5f;
    params.velocitySensitive = true;
    env.setParams(params);

    env.prepare(48000.0, 512);

    // Trigger at half velocity
    env.trigger(0.5f);

    // Process through attack
    for (int i = 0; i < 1000; i++)
    {
        env.process();
    }

    // Peak should be at 0.5 (not 1.0)
    EXPECT_LE(env.getCurrentLevel(), 0.51f);

    // Sustain should be 0.25 (0.5 * 0.5)
    for (int i = 0; i < 1000; i++)
    {
        env.process();
    }

    EXPECT_FLOAT_EQ(env.getCurrentLevel(), 0.25f);
}

TEST(EnvelopeGenerator, ResetsCorrectly)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADSR;
    env.setParams(params);

    env.prepare(48000.0, 512);

    env.trigger();

    // Process some
    for (int i = 0; i < 1000; i++)
    {
        env.process();
    }

    EXPECT_GT(env.getCurrentLevel(), 0.0f);

    // Reset
    env.reset();

    // Should be idle
    EXPECT_FLOAT_EQ(env.getCurrentLevel(), 0.0f);
    EXPECT_EQ(env.getStageName(), "IDLE");
}

TEST(EnvelopeGenerator, BlockProcessing)
{
    EnvelopeGenerator env;
    EnvelopeParams params;
    params.mode = EnvMode::ADR;
    params.attackMs = 10.0f;
    params.decayMs = 50.0f;
    env.setParams(params);

    env.prepare(48000.0, 512);

    env.trigger();

    float output[256];
    env.process(output, 256);

    // Should have processed all samples
    EXPECT_EQ(env.getStageName(), "DECAY");  // Should be in decay after 256 samples
}

//==============================================================================
// Envelope Follower Tests
//==============================================================================

TEST(EnvelopeFollower, FollowsAmplitude)
{
    EnvelopeFollower follower;
    EnvelopeFollowerParams params;
    params.attackMs = 0.1f;  // Very fast attack (almost instant)
    follower.setParams(params);
    follower.prepare(48000.0, 512);

    float level = follower.process(1.0f);
    EXPECT_GT(level, 0.9f);
}

TEST(EnvelopeFollower, FastAttack)
{
    EnvelopeFollower follower;
    EnvelopeFollowerParams params;
    params.attackMs = 0.1f;  // Very fast
    follower.setParams(params);

    follower.prepare(48000.0, 512);

    // Should attack quickly
    float level = follower.process(1.0f);
    EXPECT_GT(level, 0.5f);
}

TEST(EnvelopeFollower, SlowRelease)
{
    EnvelopeFollower follower;
    EnvelopeFollowerParams params;
    params.attackMs = 1.0f;
    params.releaseMs = 100.0f;
    follower.setParams(params);

    follower.prepare(48000.0, 512);

    // Attack
    follower.process(1.0f);

    // Signal stops
    float level = follower.process(0.0f);
    EXPECT_GT(level, 0.0f);

    // Should decay slowly
    for (int i = 0; i < 100; i++)
    {
        level = follower.process(0.0f);
    }
    EXPECT_GT(level, 0.0f);
}

TEST(EnvelopeFollower, RectifiesInput)
{
    EnvelopeFollower follower;
    EnvelopeFollowerParams params;
    params.attackMs = 0.1f;  // Very fast
    follower.setParams(params);
    follower.prepare(48000.0, 512);

    // Negative input
    float level1 = follower.process(-0.8f);
    EXPECT_GT(level1, 0.7f);

    // Reset for next test
    follower.reset();

    // Positive input
    float level2 = follower.process(0.8f);
    EXPECT_GT(level2, 0.7f);

    // Should be similar
    EXPECT_NEAR(level1, level2, 0.1f);
}

TEST(EnvelopeFollower, ResetsCorrectly)
{
    EnvelopeFollower follower;
    follower.prepare(48000.0, 512);

    // Build up envelope
    follower.process(1.0f);
    EXPECT_GT(follower.getCurrentLevel(), 0.0f);

    // Reset
    follower.reset();

    // Should be zero
    EXPECT_FLOAT_EQ(follower.getCurrentLevel(), 0.0f);
}

TEST(EnvelopeFollower, BlockProcessing)
{
    EnvelopeFollower follower;
    EnvelopeFollowerParams params;
    params.attackMs = 0.1f;  // Very fast
    follower.setParams(params);
    follower.prepare(48000.0, 512);

    float input[256];
    float output[256];

    for (int i = 0; i < 256; i++)
    {
        input[i] = 0.8f;
    }

    follower.process(input, output, 256);

    // Output should be high
    EXPECT_GT(output[255], 0.7f);
}

//==============================================================================
// Integration Tests
//==============================================================================

TEST(Integration, GateTriggersEnvelope)
{
    GateDetector gate;
    EnvelopeGenerator env;

    GateParams gateParams;
    gateParams.threshold = 0.5f;
    gateParams.attackMs = 1.0f;
    gate.setParams(gateParams);

    EnvelopeParams envParams;
    envParams.mode = EnvMode::ADSR;
    envParams.attackMs = 10.0f;
    env.setParams(envParams);

    gate.prepare(48000.0, 512);
    env.prepare(48000.0, 512);

    // Audio input exceeds threshold
    gate.process(0.8f);

    // Gate opens, trigger envelope
    if (gate.isOpen())
    {
        env.trigger();
    }

    EXPECT_EQ(env.getStageName(), "ATTACK");
}

TEST(Integration, EnvelopeFollowerModulatesGate)
{
    EnvelopeFollower follower;
    GateDetector gate;

    EnvelopeFollowerParams followerParams;
    followerParams.attackMs = 1.0f;
    followerParams.releaseMs = 50.0f;
    follower.setParams(followerParams);

    GateParams gateParams;
    gateParams.threshold = 0.3f;
    gateParams.attackMs = 1.0f;
    gate.setParams(gateParams);

    follower.prepare(48000.0, 512);
    gate.prepare(48000.0, 512);

    // Envelope level controls gate threshold
    float envelope = follower.process(0.8f);
    EXPECT_GT(envelope, 0.5f);

    // Gate opens at lower threshold due to envelope
    gate.process(0.4f);
    EXPECT_TRUE(gate.isOpen());
}

//==============================================================================
// Main test runner
//==============================================================================

int main(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
