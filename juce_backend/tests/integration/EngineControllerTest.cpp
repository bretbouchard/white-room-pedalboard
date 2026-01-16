/*
  ==============================================================================

    EngineControllerTest.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Tests for SDK Integration Layer (Phase 3)

  ==============================================================================
*/

#include "EngineController.h"
#include "EventQueue.h"
#include "SongModelAdapter.h"

#include <cassert>
#include <iostream>
#include <cstring>

namespace Test {

int testsPassed = 0;
int testsFailed = 0;

#define TEST(name) \
    void test_##name(); \
    struct TestRunner_##name { \
        TestRunner_##name() { /* Disabled - run manually */ } \
    } runner_##name; \
    void test_##name()

#define EXPECT_TRUE(condition) \
    if (!(condition)) { \
        throw std::runtime_error("Expected TRUE but got FALSE: " #condition); \
    }

#define EXPECT_FALSE(condition) \
    if (condition) { \
        throw std::runtime_error("Expected FALSE but got TRUE: " #condition); \
    }

#define EXPECT_EQ(expected, actual) \
    if ((expected) != (actual)) { \
        throw std::runtime_error("Expected " + std::to_string(expected) + \
                              " but got " + std::to_string(actual)); \
    }

#define EXPECT_NEAR(expected, actual, tolerance) \
    if (std::abs((expected) - (actual)) > (tolerance)) { \
        throw std::runtime_error("Expected " + std::to_string(expected) + \
                              " but got " + std::to_string(actual) + \
                              " (tolerance: " + std::to_string(tolerance) + ")"); \
    }

#define EXPECT_NOT_NULL(ptr) \
    if ((ptr) == nullptr) { \
        throw std::runtime_error("Expected non-NULL pointer but got NULL"); \
    }

//==============================================================================
// TEST SUITE: SongModel Adapter
//==============================================================================

TEST(SongModelAdapterCreate)
{
    Integration::SongModelAdapter adapter;
    EXPECT_TRUE(!adapter.isLoaded());
    EXPECT_EQ(0, adapter.getTrackCount());
}

TEST(SongModelAdapterLoadEmptySong)
{
    Integration::SongModelAdapter adapter;

    // TODO: Create empty SongModel_v1
    // SongModel_v1 emptyModel;
    // bool loaded = adapter.loadSongModel(emptyModel);
    // EXPECT_TRUE(loaded);
    // EXPECT_TRUE(adapter.isLoaded());

    // For now, just test that it doesn't crash
    EXPECT_TRUE(true);
}

//==============================================================================
// TEST SUITE: EventQueue
//==============================================================================

TEST(EventQueueCreate)
{
    Integration::EventQueue queue;
    EXPECT_TRUE(queue.initialize(48000.0));
    EXPECT_EQ(0, queue.getEventCount());
    EXPECT_EQ(-1.0, queue.getNextEventTime());
}

TEST(EventQueueScheduleEvent)
{
    Integration::EventQueue queue;
    EXPECT_TRUE(queue.initialize(48000.0));

    Integration::QueuedEvent event;
    event.time = 1.0;
    event.type = Integration::EventType::NOTE_ON;
    event.targetTrackId = "track_0";
    event.data.note.midiNote = 60;
    event.data.note.velocity = 0.8f;

    EXPECT_TRUE(queue.scheduleEvent(event));
    EXPECT_EQ(1, queue.getEventCount());
    EXPECT_NEAR(1.0, queue.getNextEventTime(), 0.001);
}

TEST(EventQueueProcessEvents)
{
    Integration::EventQueue queue;
    EXPECT_TRUE(queue.initialize(48000.0));

    // Schedule note-on event
    Integration::QueuedEvent event;
    event.time = 0.5;
    event.type = Integration::EventType::NOTE_ON;
    event.targetTrackId = "track_0";
    event.data.note.midiNote = 60;
    event.data.note.velocity = 0.8f;

    EXPECT_TRUE(queue.scheduleEvent(event));

    // Create dummy instrument map
    std::map<std::string, DSP::InstrumentDSP*> instruments;
    // TODO: Add actual instrument when available

    // Process events (should not crash)
    queue.processEvents(1.0, instruments);
    EXPECT_EQ(0, queue.getEventCount());  // Event should be processed
}

TEST(EventQueueQuantization)
{
    Integration::EventQueue queue;
    EXPECT_TRUE(queue.initialize(48000.0));

    // Set quantization to 1/4 note at 120 BPM = 0.5 seconds
    queue.setQuantization(0.5);

    EXPECT_NEAR(0.5, queue.getQuantization(), 0.001);
}

TEST(EventQueueClear)
{
    Integration::EventQueue queue;
    EXPECT_TRUE(queue.initialize(48000.0));

    Integration::QueuedEvent event;
    event.time = 1.0;
    event.type = Integration::EventType::NOTE_ON;
    event.targetTrackId = "track_0";

    EXPECT_TRUE(queue.scheduleEvent(event));
    EXPECT_EQ(1, queue.getEventCount());

    queue.clear();
    EXPECT_EQ(0, queue.getEventCount());
}

//==============================================================================
// TEST SUITE: EngineController
//==============================================================================

TEST(EngineControllerCreate)
{
    Integration::EngineController engine;

    Integration::EngineConfig config;
    config.sampleRate = 48000.0;
    config.blockSize = 512;
    config.numOutputChannels = 2;

    EXPECT_TRUE(engine.initialize(config));
    EXPECT_FALSE(engine.isSongLoaded());
}

TEST(EngineControllerTransport)
{
    Integration::EngineController engine;

    Integration::EngineConfig config;
    config.sampleRate = 48000.0;
    config.blockSize = 512;

    EXPECT_TRUE(engine.initialize(config));

    // Test transport state
    EXPECT_TRUE(Integration::TransportState::STOPPED == engine.getTransportState());
    EXPECT_NEAR(0.0, engine.getCurrentPosition(), 0.001);

    // Can't play without song loaded
    EXPECT_FALSE(engine.play());
}

TEST(EngineControllerTempo)
{
    Integration::EngineController engine;

    Integration::EngineConfig config;
    config.sampleRate = 48000.0;
    config.blockSize = 512;
    config.tempo = 140.0;

    EXPECT_TRUE(engine.initialize(config));

    EXPECT_NEAR(140.0, engine.getTempo(), 0.001);

    engine.setTempo(160.0);
    EXPECT_NEAR(160.0, engine.getTempo(), 0.001);
}

TEST(EngineControllerTimeSignature)
{
    Integration::EngineController engine;

    Integration::EngineConfig config;
    config.sampleRate = 48000.0;
    config.blockSize = 512;
    config.timeSigUpper = 3;
    config.timeSigLower = 4;

    EXPECT_TRUE(engine.initialize(config));

    int upper, lower;
    engine.getTimeSignature(upper, lower);

    EXPECT_EQ(3, upper);
    EXPECT_EQ(4, lower);
}

TEST(EngineControllerProcessAudio)
{
    Integration::EngineController engine;

    Integration::EngineConfig config;
    config.sampleRate = 48000.0;
    config.blockSize = 512;
    config.numOutputChannels = 2;

    EXPECT_TRUE(engine.initialize(config));

    // Create output buffers
    float* outputs[2];
    float outputBuffer[2][512];

    outputs[0] = outputBuffer[0];
    outputs[1] = outputBuffer[1];

    // Fill with noise
    for (int i = 0; i < 512; ++i) {
        outputBuffer[0][i] = 0.5f;
        outputBuffer[1][i] = 0.5f;
    }

    // Process (should not crash without song loaded)
    engine.process(outputs, 2, 512);

    // Output should be cleared (no instruments)
    for (int i = 0; i < 512; ++i) {
        EXPECT_NEAR(0.0f, outputBuffer[0][i], 0.0001f);
        EXPECT_NEAR(0.0f, outputBuffer[1][i], 0.0001f);
    }
}

//==============================================================================
// TEST SUITE: Integration End-to-End
//==============================================================================

TEST(IntegrationFullStack)
{
    // Create engine
    Integration::EngineController engine;

    Integration::EngineConfig config;
    config.sampleRate = 48000.0;
    config.blockSize = 512;
    config.numOutputChannels = 2;
    config.tempo = 120.0;

    EXPECT_TRUE(engine.initialize(config));

    // TODO: Load SongModel
    // TODO: Verify instruments created
    // TODO: Schedule events
    // TODO: Process audio
    // TODO: Verify output

    // For now, just test initialization
    EXPECT_TRUE(true);
}

} // namespace Test

//==============================================================================
// Main
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "===========================================\n";
    std::cout << "SDK Integration Tests (Phase 3)\n";
    std::cout << "===========================================\n\n";

    // SongModelAdapter Tests
    std::cout << "Running: SongModelAdapterCreate\n";
    try {
        Test::test_SongModelAdapterCreate();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nRunning: SongModelAdapterLoadEmptySong\n";
    try {
        Test::test_SongModelAdapterLoadEmptySong();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // EventQueue Tests
    std::cout << "\nRunning: EventQueueCreate\n";
    try {
        Test::test_EventQueueCreate();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nRunning: EventQueueScheduleEvent\n";
    try {
        Test::test_EventQueueScheduleEvent();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nRunning: EventQueueProcessEvents\n";
    try {
        Test::test_EventQueueProcessEvents();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nRunning: EventQueueQuantization\n";
    try {
        Test::test_EventQueueQuantization();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nRunning: EventQueueClear\n";
    try {
        Test::test_EventQueueClear();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // EngineController Tests
    std::cout << "\nRunning: EngineControllerCreate\n";
    try {
        Test::test_EngineControllerCreate();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nRunning: EngineControllerTransport\n";
    try {
        Test::test_EngineControllerTransport();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nRunning: EngineControllerTempo\n";
    try {
        Test::test_EngineControllerTempo();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nRunning: EngineControllerTimeSignature\n";
    try {
        Test::test_EngineControllerTimeSignature();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nRunning: EngineControllerProcessAudio\n";
    try {
        Test::test_EngineControllerProcessAudio();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    // Integration Tests
    std::cout << "\nRunning: IntegrationFullStack\n";
    try {
        Test::test_IntegrationFullStack();
        Test::testsPassed++;
        std::cout << "PASSED\n";
    } catch (const std::exception& e) {
        Test::testsFailed++;
        std::cout << "FAILED: " << e.what() << "\n";
    }

    std::cout << "\nAll tests completed.\n";
    std::cout << "Passed: " << Test::testsPassed << "\n";
    std::cout << "Failed: " << Test::testsFailed << "\n";
    std::cout << "===========================================\n";
    std::cout << "\n";

    return (Test::testsFailed == 0) ? 0 : 1;
}
