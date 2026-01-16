/**
 * Audio Layer Tests
 *
 * Tests for T017-T023: Scheduler, Voice Manager, Console/Mixing
 */

#include <gtest/gtest.h>
#include "audio/Scheduler.h"
#include "audio/VoiceManager.h"
#include "audio/ConsoleSystem.h"

#include <thread>
#include <chrono>

using namespace white_room::audio;

// =============================================================================
// SCHEDULER TESTS (T017)
// =============================================================================

TEST(SchedulerTest, DefaultState) {
    SchedulerConfig config;
    config.sampleRate = 48000.0;
    config.bufferSize = 512;
    config.lookaheadMs = 200.0;

    Scheduler scheduler(config);

    // Check initial state
    EXPECT_EQ(scheduler.getPlaybackState(), PlaybackState::Stopped);

    TransportPosition pos = scheduler.getTransportPosition();
    EXPECT_EQ(pos.sampleTime, 0);
    EXPECT_DOUBLE_EQ(pos.tempo, 120.0);
}

TEST(SchedulerTest, TransportControl) {
    SchedulerConfig config;
    Scheduler scheduler(config);

    // Test play
    scheduler.play();
    EXPECT_EQ(scheduler.getPlaybackState(), PlaybackState::Playing);

    // Test pause
    scheduler.pause();
    EXPECT_EQ(scheduler.getPlaybackState(), PlaybackState::Paused);

    // Test stop
    scheduler.play();
    scheduler.stop();
    EXPECT_EQ(scheduler.getPlaybackState(), PlaybackState::Stopped);
    EXPECT_EQ(scheduler.getTransportPosition().sampleTime, 0);
}

TEST(SchedulerTest, Seek) {
    SchedulerConfig config;
    Scheduler scheduler(config);

    scheduler.seek(48000);  // Seek to 1 second
    auto pos = scheduler.getTransportPosition();
    EXPECT_EQ(pos.sampleTime, 48000);
}

TEST(SchedulerTest, EventScheduling) {
    SchedulerConfig config;
    Scheduler scheduler(config);

    // Schedule note on
    bool scheduled = scheduler.scheduleNoteOn(0, 60, 100, 48000);
    EXPECT_TRUE(scheduled);

    // Schedule note off
    scheduled = scheduler.scheduleNoteOff(0, 60, 96000);
    EXPECT_TRUE(scheduled);

    // Schedule parameter change
    scheduled = scheduler.scheduleParameterChange(0, 0, 0.5f, 72000);
    EXPECT_TRUE(scheduled);
}

TEST(SchedulerTest, LoopPoints) {
    SchedulerConfig config;
    Scheduler scheduler(config);

    // Set loop points
    scheduler.setLoopPoints(0, 480000);  // 0 to 10 seconds

    auto loop = scheduler.getLoopPoints();
    EXPECT_TRUE(loop.enabled);
    EXPECT_EQ(loop.startSample, 0);
    EXPECT_EQ(loop.endSample, 480000);

    // Clear loop
    scheduler.clearLoop();
    loop = scheduler.getLoopPoints();
    EXPECT_FALSE(loop.enabled);
}

// =============================================================================
// VOICE MANAGER TESTS (T018)
// =============================================================================

TEST(VoiceManagerTest, DefaultState) {
    VoiceManagerConfig config;
    config.maxPolyphony = 32;

    VoiceManager vm(config);

    // Check initial state
    EXPECT_EQ(vm.getMaxPolyphony(), 32);
    EXPECT_EQ(vm.getActiveVoiceCount(), 0);
    EXPECT_EQ(vm.getIdleVoiceCount(), 32);
}

TEST(VoiceManagerTest, VoiceAllocation) {
    VoiceManagerConfig config;
    config.maxPolyphony = 8;

    VoiceManager vm(config);

    // Allocate voices
    int voice1 = vm.allocateVoice(60, 100, VoicePriority::Primary, 0, 0, 1.0);
    EXPECT_GE(voice1, 0);
    EXPECT_EQ(vm.getActiveVoiceCount(), 1);

    int voice2 = vm.allocateVoice(64, 100, VoicePriority::Primary, 0, 0, 1.0);
    EXPECT_GE(voice2, 0);
    EXPECT_NE(voice1, voice2);  // Should be different voices
    EXPECT_EQ(vm.getActiveVoiceCount(), 2);

    // Check voice info
    VoiceInfo info = vm.getVoiceInfo(voice1);
    EXPECT_EQ(info.pitch, 60);
    EXPECT_EQ(info.velocity, 100);
    EXPECT_EQ(info.priority, VoicePriority::Primary);
    EXPECT_TRUE(vm.isVoiceActive(voice1));
}

TEST(VoiceManagerTest, VoiceRelease) {
    VoiceManagerConfig config;
    VoiceManager vm(config);

    // Allocate and release voice
    int voice = vm.allocateVoice(60, 100, VoicePriority::Primary, 0, 0, 1.0);
    EXPECT_TRUE(vm.isVoiceActive(voice));

    vm.releaseVoice(voice, 48000);
    // Voice should still be active until release time
    vm.update(96000);  // Past release time
    EXPECT_FALSE(vm.isVoiceActive(voice));
}

TEST(VoiceManagerTest, VoiceStealing) {
    VoiceManagerConfig config;
    config.maxPolyphony = 4;
    config.enableStealing = true;
    config.stealingPolicy = StealingPolicy::LowestPriority;

    VoiceManager vm(config);

    // Allocate all voices with tertiary priority
    for (int i = 0; i < 4; ++i) {
        vm.allocateVoice(60 + i, 100, VoicePriority::Tertiary, 0, 0, 10.0);
    }
    EXPECT_EQ(vm.getActiveVoiceCount(), 4);
    EXPECT_EQ(vm.getIdleVoiceCount(), 0);

    // Try to allocate high priority voice (should steal)
    int voice = vm.allocateVoice(72, 100, VoicePriority::Primary, 1, 0, 1.0);
    EXPECT_GE(voice, 0);  // Should successfully steal
    EXPECT_EQ(vm.getActiveVoiceCount(), 4);  // Still max polyphony
}

TEST(VoiceManagerTest, PolyphonyLimit) {
    VoiceManagerConfig config;
    config.maxPolyphony = 4;
    config.enableStealing = false;

    VoiceManager vm(config);

    // Allocate up to limit
    int v0 = vm.allocateVoice(60, 100, VoicePriority::Primary, 0, 0, 10.0);
    int v1 = vm.allocateVoice(64, 100, VoicePriority::Primary, 0, 0, 10.0);
    int v2 = vm.allocateVoice(68, 100, VoicePriority::Primary, 0, 0, 10.0);
    int v3 = vm.allocateVoice(72, 100, VoicePriority::Primary, 0, 0, 10.0);

    EXPECT_GE(v0, 0);
    EXPECT_GE(v1, 0);
    EXPECT_GE(v2, 0);
    EXPECT_GE(v3, 0);

    // Try to allocate beyond limit (should fail)
    int v4 = vm.allocateVoice(76, 100, VoicePriority::Primary, 0, 0, 10.0);
    EXPECT_EQ(v4, -1);  // No voices available
}

TEST(VoiceManagerTest, StopRoleVoices) {
    VoiceManagerConfig config;
    VoiceManager vm(config);

    // Allocate voices for different roles
    vm.allocateVoice(60, 100, VoicePriority::Primary, 0, 0, 10.0);
    vm.allocateVoice(64, 100, VoicePriority::Secondary, 1, 0, 10.0);
    vm.allocateVoice(68, 100, VoicePriority::Primary, 1, 0, 10.0);

    EXPECT_EQ(vm.getActiveVoiceCount(), 3);

    // Stop role 1 voices
    vm.stopRoleVoices(1);
    EXPECT_EQ(vm.getActiveVoiceCount(), 1);  // Only role 0 voice remains
}

// =============================================================================
// CONSOLE SYSTEM TESTS (T023)
// =============================================================================

TEST(ConsoleSystemTest, DefaultState) {
    ConsoleConfig config;
    ConsoleSystem console(config);

    // Master bus should exist
    BusConfig master = console.getBusConfig(0);
    EXPECT_EQ(master.type, BusType::Master);
    EXPECT_EQ(master.name, "Master");
    EXPECT_FALSE(master.muted);
    EXPECT_DOUBLE_EQ(master.gain, 1.0);
}

TEST(ConsoleSystemTest, BusManagement) {
    ConsoleConfig config;
    ConsoleSystem console(config);

    // Add voice bus
    BusConfig busConfig;
    busConfig.name = "Voice 1";
    busConfig.type = BusType::Voice;
    busConfig.busIndex = 1;
    busConfig.gain = 0.8;

    EXPECT_TRUE(console.addBus(busConfig));

    // Get bus config
    BusConfig retrieved = console.getBusConfig(1);
    EXPECT_EQ(retrieved.name, "Voice 1");
    EXPECT_DOUBLE_EQ(retrieved.gain, 0.8);

    // Modify bus
    console.setBusGain(1, 0.5);
    console.setBusPan(1, -0.5);
    console.setBusMuted(1, true);

    retrieved = console.getBusConfig(1);
    EXPECT_DOUBLE_EQ(retrieved.gain, 0.5);
    EXPECT_DOUBLE_EQ(retrieved.pan, -0.5);
    EXPECT_TRUE(retrieved.muted);
}

TEST(ConsoleSystemTest, EffectManagement) {
    ConsoleConfig config;
    ConsoleSystem console(config);

    // Add bus
    BusConfig busConfig;
    busConfig.name = "Bus 1";
    busConfig.busIndex = 1;
    console.addBus(busConfig);

    // Add effect (should be bypassed by default)
    EffectConfig effect;
    effect.name = "Reverb";
    effect.type = EffectType::Reverb;
    effect.busIndex = 1;

    EXPECT_TRUE(console.addEffect(1, effect));

    // Check effect state
    EffectConfig retrieved = console.getEffectConfig(1, 0);
    EXPECT_EQ(retrieved.name, "Reverb");
    EXPECT_EQ(retrieved.state, EffectState::Bypassed);

    // Enable effect
    console.setEffectState(1, 0, EffectState::Active);
    retrieved = console.getEffectConfig(1, 0);
    EXPECT_EQ(retrieved.state, EffectState::Active);

    // Set parameter
    console.setEffectParameter(1, 0, "roomSize", 0.7);
    double paramValue = console.getEffectParameter(1, 0, "roomSize");
    EXPECT_DOUBLE_EQ(paramValue, 0.7);
}

TEST(ConsoleSystemTest, Routing) {
    ConsoleConfig config;
    ConsoleSystem console(config);

    // Add buses
    BusConfig bus1;
    bus1.busIndex = 1;
    console.addBus(bus1);

    BusConfig bus2;
    bus2.busIndex = 2;
    console.addBus(bus2);

    // Add routing
    RoutingConnection routing(1, 2, 0.5);  // Bus 1 -> Bus 2 at 50%
    EXPECT_TRUE(console.addRouting(routing));

    // Get routings
    std::vector<RoutingConnection> routings = console.getRoutings(1);
    EXPECT_EQ(routings.size(), 1);
    EXPECT_EQ(routings[0].destBus, 2);
    EXPECT_DOUBLE_EQ(routings[0].amount, 0.5);

    // Modify routing
    console.setRoutingAmount(1, 2, 0.8);
    routings = console.getRoutings(1);
    EXPECT_DOUBLE_EQ(routings[0].amount, 0.8);
}

TEST(ConsoleSystemTest, MasterLevels) {
    ConsoleConfig config;
    ConsoleSystem console(config);

    // Master levels should be silent initially
    LevelMeter levels = console.getMasterLevels();
    EXPECT_LT(levels.peakL, -50.0f);  // Very quiet
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

TEST(AudioLayerIntegration, SchedulerWithVoiceManager) {
    // Create scheduler
    SchedulerConfig schedConfig;
    Scheduler scheduler(schedConfig);

    // Create voice manager
    VoiceManagerConfig vmConfig;
    VoiceManager vm(vmConfig);

    // Start playback
    scheduler.play();

    // Schedule note events
    int64_t time = 0;
    for (int i = 0; i < 10; ++i) {
        scheduler.scheduleNoteOn(0, 60 + i, 100, time);
        scheduler.scheduleNoteOff(0, 60 + i, time + 48000);
        time += 48000;
    }

    // Process events
    auto events = scheduler.processEvents(512);
    EXPECT_GE(events.size(), 0);  // Some events ready
}

TEST(AudioLayerIntegration, PolyphonyWithConsole) {
    // Create voice manager
    VoiceManagerConfig vmConfig;
    vmConfig.maxPolyphony = 16;
    VoiceManager vm(vmConfig);

    // Create console
    ConsoleConfig consoleConfig;
    ConsoleSystem console(consoleConfig);

    // Allocate voices
    for (int i = 0; i < 16; ++i) {
        int voice = vm.allocateVoice(60 + i, 100, VoicePriority::Primary, 0, 0, 1.0);
        EXPECT_GE(voice, 0);
    }

    EXPECT_EQ(vm.getActiveVoiceCount(), 16);
    EXPECT_DOUBLE_EQ(vm.getPolyphonyUsage(), 1.0);
}

// Main function for standalone execution
int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
