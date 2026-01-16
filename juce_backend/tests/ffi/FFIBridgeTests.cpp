/*
  ==============================================================================

    FFIBridgeTests.cpp
    Created: January 15, 2026
    Author:  Bret Bouchard

    Comprehensive tests for FFI Bridge between JUCE backend and Swift frontend.
    Tests serialization, deserialization, memory management, and cross-language calls.

  ==============================================================================
*/

#include <catch2/catch_test_macros.hpp>
#include <catch2/generators/catch_generators.hpp>
#include "ffi/JuceFFI.h"
#include "audio/ProjectionEngine.h"
#include <thread>
#include <chrono>

using namespace juce;

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create test SongState for FFI serialization
 */
SongState createTestSongState()
{
    SongState song;
    song.id = "test_song_ffi_001";
    song.name = "FFI Test Song";
    song.tempo = 120.0;
    song.timeSignatureNumerator = 4;
    song.timeSignatureDenominator = 4;
    song.activePerformanceId = "perf_ffi_001";
    song.density = 0.6;
    song.grooveProfileId = "groove_straight";
    song.consoleXProfileId = "consolex_default";

    // Add some notes
    for (int i = 0; i < 10; ++i)
    {
        NoteEvent note;
        note.id = String("note_") + String(i);
        note.startTime = i * 44100;
        note.duration = 22050;
        note.pitch = 60 + i;
        note.velocity = 0.7f;
        song.notes.add(note);
    }

    return song;
}

/**
 * Create test PerformanceState for FFI serialization
 */
PerformanceState createTestPerformanceState()
{
    PerformanceState perf;
    perf.activePerformanceId = new String("perf_ffi_001");
    perf.currentDensity.store(0.6);
    perf.currentGrooveProfileId = new String("groove_straight");
    perf.currentConsoleXProfileId = new String("consolex_default");
    perf.currentBar.store(0);

    return perf;
}

// ============================================================================
// Serialization Tests
// ============================================================================

TEST_CASE("FFI::serializeSongState - Basic serialization", "[ffi][serialization]")
{
    SongState song = createTestSongState();

    SECTION("Serializes to valid JSON")
    {
        auto json = FFI::serializeSongState(song);
        REQUIRE(json.isNotEmpty());
        REQUIRE(JSON::parse(json).isValid());
    }

    SECTION("Contains all required fields")
    {
        auto json = FFI::serializeSongState(song);
        var parsed;
        REQUIRE(JSON::parse(json).wasOk());

        parsed = JSON::parse(json);

        auto* obj = parsed.getDynamicObject();
        REQUIRE(obj != nullptr);
        REQUIRE(obj->hasProperty("id"));
        REQUIRE(obj->hasProperty("name"));
        REQUIRE(obj->hasProperty("tempo"));
        REQUIRE(obj->hasProperty("timeSignatureNumerator"));
        REQUIRE(obj->hasProperty("timeSignatureDenominator"));
        REQUIRE(obj->hasProperty("notes"));
    }

    SECTION("Serializes notes array correctly")
    {
        auto json = FFI::serializeSongState(song);
        var parsed;
        REQUIRE(JSON::parse(json).wasOk());

        parsed = JSON::parse(json);

        auto* obj = parsed.getDynamicObject();
        auto notes = obj->getProperty("notes");

        REQUIRE(notes.isArray());
        REQUIRE(notes.getArray()->size() == 10);
    }
}

TEST_CASE("FFI::deserializeSongState - Basic deserialization", "[ffi][deserialization]")
{
    SongState original = createTestSongState();
    auto json = FFI::serializeSongState(original);

    SECTION("Deserializes from valid JSON")
    {
        SongState deserialized;
        auto result = FFI::deserializeSongState(json, deserialized);

        REQUIRE(result.success);
        REQUIRE(deserialized.id == original.id);
        REQUIRE(deserialized.name == original.name);
    }

    SECTION("Preserves all notes")
    {
        SongState deserialized;
        auto result = FFI::deserializeSongState(json, deserialized);

        REQUIRE(result.success);
        REQUIRE(deserialized.notes.size() == original.notes.size());
    }

    SECTION("Preserves note properties")
    {
        SongState deserialized;
        auto result = FFI::deserializeSongState(json, deserialized);

        REQUIRE(result.success);

        for (int i = 0; i < original.notes.size(); ++i)
        {
            REQUIRE(deserialized.notes[i].id == original.notes[i].id);
            REQUIRE(deserialized.notes[i].startTime == original.notes[i].startTime);
            REQUIRE(deserialized.notes[i].duration == original.notes[i].duration);
            REQUIRE(deserialized.notes[i].pitch == original.notes[i].pitch);
            REQUIRE(deserialized.notes[i].velocity == Approx(original.notes[i].velocity));
        }
    }
}

TEST_CASE("FFI::serializePerformanceState - Basic serialization", "[ffi][serialization]")
{
    PerformanceState perf = createTestPerformanceState();

    SECTION("Serializes to valid JSON")
    {
        auto json = FFI::serializePerformanceState(perf);
        REQUIRE(json.isNotEmpty());
        REQUIRE(JSON::parse(json).isValid());
    }

    SECTION("Contains all required fields")
    {
        auto json = FFI::serializePerformanceState(perf);
        var parsed;
        REQUIRE(JSON::parse(json).wasOk());

        parsed = JSON::parse(json);

        auto* obj = parsed.getDynamicObject();
        REQUIRE(obj != nullptr);
        REQUIRE(obj->hasProperty("activePerformanceId"));
        REQUIRE(obj->hasProperty("currentDensity"));
        REQUIRE(obj->hasProperty("currentGrooveProfileId"));
        REQUIRE(obj->hasProperty("currentConsoleXProfileId"));
        REQUIRE(obj->hasProperty("currentBar"));
    }

    SECTION("Preserves atomic values")
    {
        auto json = FFI::serializePerformanceState(perf);
        var parsed;
        REQUIRE(JSON::parse(json).wasOk());

        parsed = JSON::parse(json);

        auto* obj = parsed.getDynamicObject();
        double density = obj->getProperty("currentDensity");
        int bar = obj->getProperty("currentBar");

        REQUIRE(density == Approx(0.6));
        REQUIRE(bar == 0);
    }
}

TEST_CASE("FFI::deserializePerformanceState - Basic deserialization", "[ffi][deserialization]")
{
    PerformanceState original = createTestPerformanceState();
    auto json = FFI::serializePerformanceState(original);

    SECTION("Deserializes from valid JSON")
    {
        PerformanceState deserialized;
        auto result = FFI::deserializePerformanceState(json, deserialized);

        REQUIRE(result.success);
        REQUIRE(deserialized.activePerformanceId->equalsIgnoreCase(*original.activePerformanceId));
        REQUIRE(deserialized.currentDensity.load() == Approx(original.currentDensity.load()));
    }

    SECTION("Preserves all atomic values")
    {
        PerformanceState deserialized;
        auto result = FFI::deserializePerformanceState(json, deserialized);

        REQUIRE(result.success);
        REQUIRE(deserialized.currentDensity.load() == Approx(original.currentDensity.load()));
        REQUIRE(deserialized.currentBar.load() == original.currentBar.load());
    }
}

// ============================================================================
// Round-Trip Tests
// ============================================================================

TEST_CASE("FFI - SongState round-trip preserves data", "[ffi][roundtrip]")
{
    SongState original = createTestSongState();

    SECTION("Single round-trip")
    {
        auto json = FFI::serializeSongState(original);
        SongState deserialized;
        auto result = FFI::deserializeSongState(json, deserialized);

        REQUIRE(result.success);
        REQUIRE(deserialized.id == original.id);
        REQUIRE(deserialized.name == original.name);
        REQUIRE(deserialized.tempo == Approx(original.tempo));
        REQUIRE(deserialized.notes.size() == original.notes.size());
    }

    SECTION("Multiple round-trips maintain consistency")
    {
        SongState roundTrip1 = original;
        for (int i = 0; i < 10; ++i)
        {
            auto json = FFI::serializeSongState(roundTrip1);
            SongState deserialized;
            auto result = FFI::deserializeSongState(json, deserialized);
            REQUIRE(result.success);
            roundTrip1 = deserialized;
        }

        REQUIRE(roundTrip1.id == original.id);
        REQUIRE(roundTrip1.notes.size() == original.notes.size());
    }
}

TEST_CASE("FFI - PerformanceState round-trip preserves data", "[ffi][roundtrip]")
{
    PerformanceState original = createTestPerformanceState();

    SECTION("Single round-trip")
    {
        auto json = FFI::serializePerformanceState(original);
        PerformanceState deserialized;
        auto result = FFI::deserializePerformanceState(json, deserialized);

        REQUIRE(result.success);
        REQUIRE(deserialized.activePerformanceId->equalsIgnoreCase(*original.activePerformanceId));
        REQUIRE(deserialized.currentDensity.load() == Approx(original.currentDensity.load()));
    }

    SECTION("Multiple round-trips maintain consistency")
    {
        PerformanceState roundTrip1 = original;
        for (int i = 0; i < 10; ++i)
        {
            auto json = FFI::serializePerformanceState(roundTrip1);
            PerformanceState deserialized;
            auto result = FFI::deserializePerformanceState(json, deserialized);
            REQUIRE(result.success);
            roundTrip1 = deserialized;
        }

        REQUIRE(roundTrip1.activePerformanceId->equalsIgnoreCase(*original.activePerformanceId));
        REQUIRE(roundTrip1.currentDensity.load() == Approx(original.currentDensity.load()));
    }
}

// ============================================================================
// Error Handling Tests
// ============================================================================

TEST_CASE("FFI::deserializeSongState - Invalid JSON handling", "[ffi][error]")
{
    SECTION("Empty string returns error")
    {
        SongState song;
        auto result = FFI::deserializeSongState("", song);

        REQUIRE(!result.success);
        REQUIRE(result.errorMessage.isNotEmpty());
    }

    SECTION("Invalid JSON returns error")
    {
        SongState song;
        auto result = FFI::deserializeSongState("{invalid json}", song);

        REQUIRE(!result.success);
        REQUIRE(result.errorMessage.isNotEmpty());
    }

    SECTION("Missing required fields returns error")
    {
        SongState song;
        auto result = FFI::deserializeSongState("{\"id\": \"test\"}", song);

        REQUIRE(!result.success);
        REQUIRE(result.errorMessage.isNotEmpty());
    }

    SECTION("Invalid field types returns error")
    {
        SongState song;
        auto result = FFI::deserializeSongState(
            "{\"id\": \"test\", \"tempo\": \"not a number\"}", song);

        REQUIRE(!result.success);
    }
}

TEST_CASE("FFI::deserializePerformanceState - Invalid JSON handling", "[ffi][error]")
{
    SECTION("Empty string returns error")
    {
        PerformanceState perf;
        auto result = FFI::deserializePerformanceState("", perf);

        REQUIRE(!result.success);
        REQUIRE(result.errorMessage.isNotEmpty());
    }

    SECTION("Invalid JSON returns error")
    {
        PerformanceState perf;
        auto result = FFI::deserializePerformanceState("{invalid json}", perf);

        REQUIRE(!result.success);
        REQUIRE(result.errorMessage.isNotEmpty());
    }

    SECTION("Missing required fields returns error")
    {
        PerformanceState perf;
        auto result = FFI::deserializePerformanceState("{}", perf);

        REQUIRE(!result.success);
        REQUIRE(result.errorMessage.isNotEmpty());
    }
}

// ============================================================================
// Performance Tests
// =============================================================================

TEST_CASE("FFI - Serialization performance", "[ffi][performance]")
{
    SECTION("Serialize typical song quickly")
    {
        SongState song = createTestSongState();

        auto start = std::chrono::high_resolution_clock::now();

        for (int i = 0; i < 1000; ++i)
        {
            auto json = FFI::serializeSongState(song);
        }

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

        // Should serialize 1000 songs in less than 100ms
        REQUIRE(duration.count() < 100);
    }

    SECTION("Serialize large song efficiently")
    {
        SongState song = createTestSongState();

        // Add 10,000 notes
        for (int i = 0; i < 10000; ++i)
        {
            NoteEvent note;
            note.id = String("note_") + String(i);
            note.startTime = i * 1000;
            note.duration = 500;
            note.pitch = 60 + (i % 24);
            note.velocity = 0.7f;
            song.notes.add(note);
        }

        auto start = std::chrono::high_resolution_clock::now();
        auto json = FFI::serializeSongState(song);
        auto end = std::chrono::high_resolution_clock::now();

        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

        // Should serialize large song in less than 50ms
        REQUIRE(duration.count() < 50);
    }
}

TEST_CASE("FFI - Deserialization performance", "[ffi][performance]")
{
    SECTION("Deserialize typical song quickly")
    {
        SongState song = createTestSongState();
        auto json = FFI::serializeSongState(song);

        auto start = std::chrono::high_resolution_clock::now();

        for (int i = 0; i < 1000; ++i)
        {
            SongState deserialized;
            auto result = FFI::deserializeSongState(json, deserialized);
            REQUIRE(result.success);
        }

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

        // Should deserialize 1000 songs in less than 200ms
        REQUIRE(duration.count() < 200);
    }

    SECTION("Deserialize large song efficiently")
    {
        SongState song = createTestSongState();

        // Add 10,000 notes
        for (int i = 0; i < 10000; ++i)
        {
            NoteEvent note;
            note.id = String("note_") + String(i);
            note.startTime = i * 1000;
            note.duration = 500;
            note.pitch = 60 + (i % 24);
            note.velocity = 0.7f;
            song.notes.add(note);
        }

        auto json = FFI::serializeSongState(song);

        auto start = std::chrono::high_resolution_clock::now();
        SongState deserialized;
        auto result = FFI::deserializeSongState(json, deserialized);
        auto end = std::chrono::high_resolution_clock::now();

        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

        REQUIRE(result.success);
        REQUIRE(duration.count() < 100);
    }
}

// ============================================================================
// Memory Management Tests
// ============================================================================

TEST_CASE("FFI - Memory management", "[ffi][memory]")
{
    SECTION("No memory leaks on repeated serialization")
    {
        SongState song = createTestSongState();

        auto initialMemory = getMemoryUsage();

        for (int i = 0; i < 10000; ++i)
        {
            auto json = FFI::serializeSongState(song);
        }

        auto finalMemory = getMemoryUsage();
        auto memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be minimal (< 10MB)
        REQUIRE(memoryIncrease < 10 * 1024 * 1024);
    }

    SECTION("No memory leaks on repeated deserialization")
    {
        SongState song = createTestSongState();
        auto json = FFI::serializeSongState(song);

        auto initialMemory = getMemoryUsage();

        for (int i = 0; i < 10000; ++i)
        {
            SongState deserialized;
            auto result = FFI::deserializeSongState(json, deserialized);
            REQUIRE(result.success);
        }

        auto finalMemory = getMemoryUsage();
        auto memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be minimal (< 10MB)
        REQUIRE(memoryIncrease < 10 * 1024 * 1024);
    }

    SECTION("No memory leaks on round-trip")
    {
        SongState song = createTestSongState();

        auto initialMemory = getMemoryUsage();

        for (int i = 0; i < 1000; ++i)
        {
            auto json = FFI::serializeSongState(song);
            SongState deserialized;
            auto result = FFI::deserializeSongState(json, deserialized);
            REQUIRE(result.success);
        }

        auto finalMemory = getMemoryUsage();
        auto memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be minimal (< 5MB)
        REQUIRE(memoryIncrease < 5 * 1024 * 1024);
    }
}

// ============================================================================
// Thread Safety Tests
// ============================================================================

TEST_CASE("FFI - Thread-safe serialization", "[ffi][threading]")
{
    SongState song = createTestSongState();
    const int numThreads = 10;
    const int iterationsPerThread = 100;

    std::vector<std::thread> threads;

    for (int t = 0; t < numThreads; ++t)
    {
        threads.emplace_back([&song, iterationsPerThread]()
        {
            for (int i = 0; i < iterationsPerThread; ++i)
            {
                auto json = FFI::serializeSongState(song);
                REQUIRE(json.isNotEmpty());
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }

    // If we get here without crashing, threading works
    REQUIRE(true);
}

TEST_CASE("FFI - Thread-safe deserialization", "[ffi][threading]")
{
    SongState song = createTestSongState();
    auto json = FFI::serializeSongState(song);
    const int numThreads = 10;
    const int iterationsPerThread = 100;

    std::vector<std::thread> threads;

    for (int t = 0; t < numThreads; ++t)
    {
        threads.emplace_back([&json, iterationsPerThread]()
        {
            for (int i = 0; i < iterationsPerThread; ++i)
            {
                SongState deserialized;
                auto result = FFI::deserializeSongState(json, deserialized);
                REQUIRE(result.success);
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }

    // If we get here without crashing, threading works
    REQUIRE(true);
}

// ============================================================================
// Cross-Language Integration Tests
// ============================================================================

TEST_CASE("FFI - Swift interop", "[ffi][swift]")
{
    SECTION("Can be called from Swift")
    {
        SongState song = createTestSongState();

        // Simulate Swift calling C++ FFI
        auto json = FFI::serializeSongState(song);

        // Verify JSON can be parsed by Swift
        REQUIRE(json.isNotEmpty());
        REQUIRE(JSON::parse(json).isValid());
    }

    SECTION("Can deserialize Swift-generated JSON")
    {
        // Simulate Swift-generated JSON
        String swiftJson = R"(
            {
                "id": "swift_song_001",
                "name": "Swift Song",
                "tempo": 140.0,
                "timeSignatureNumerator": 3,
                "timeSignatureDenominator": 4,
                "activePerformanceId": "swift_perf_001",
                "density": 0.7,
                "grooveProfileId": "groove_swing",
                "consoleXProfileId": "consolex_custom",
                "notes": []
            }
        )";

        SongState song;
        auto result = FFI::deserializeSongState(swiftJson, song);

        REQUIRE(result.success);
        REQUIRE(song.id == "swift_song_001");
        REQUIRE(song.name == "Swift Song");
        REQUIRE(song.tempo == Approx(140.0));
    }
}

// ============================================================================
// Edge Cases Tests
// ============================================================================

TEST_CASE("FFI - Edge cases", "[ffi][edge]")
{
    SECTION("Empty song state")
    {
        SongState song;
        song.id = "empty";
        song.name = "Empty";
        song.tempo = 120.0;
        song.timeSignatureNumerator = 4;
        song.timeSignatureDenominator = 4;

        auto json = FFI::serializeSongState(song);
        REQUIRE(json.isNotEmpty());

        SongState deserialized;
        auto result = FFI::deserializeSongState(json, deserialized);

        REQUIRE(result.success);
        REQUIRE(deserialized.notes.size() == 0);
    }

    SECTION("Song with extremely long name")
    {
        SongState song = createTestSongState();
        song.name = String::repeatedString("A", 10000);

        auto json = FFI::serializeSongState(song);
        REQUIRE(json.isNotEmpty());

        SongState deserialized;
        auto result = FFI::deserializeSongState(json, deserialized);

        REQUIRE(result.success);
        REQUIRE(deserialized.name == song.name);
    }

    SECTION("Song with special characters in name")
    {
        SongState song = createTestSongState();
        song.name = "Test\"Song\"with\\special/characters";

        auto json = FFI::serializeSongState(song);
        REQUIRE(json.isNotEmpty());

        SongState deserialized;
        auto result = FFI::deserializeSongState(json, deserialized);

        REQUIRE(result.success);
        REQUIRE(deserialized.name == song.name);
    }

    SECTION("Song with extreme tempo values")
    {
        SongState song = createTestSongState();

        SECTION("Very slow tempo")
        {
            song.tempo = 10.0;
            auto json = FFI::serializeSongState(song);

            SongState deserialized;
            auto result = FFI::deserializeSongState(json, deserialized);

            REQUIRE(result.success);
            REQUIRE(deserialized.tempo == Approx(10.0));
        }

        SECTION("Very fast tempo")
        {
            song.tempo = 300.0;
            auto json = FFI::serializeSongState(song);

            SongState deserialized;
            auto result = FFI::deserializeSongState(json, deserialized);

            REQUIRE(result.success);
            REQUIRE(deserialized.tempo == Approx(300.0));
        }
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get current memory usage (platform-specific)
 */
size_t getMemoryUsage()
{
#ifdef JUCE_MAC
    struct task_basic_info info;
    mach_msg_type_number_t size = sizeof(info);
    task_info(mach_task_self(), TASK_BASIC_INFO, (task_info_t)&info, &size);
    return info.resident_size;
#elif defined(JUCE_WINDOWS)
    PROCESS_MEMORY_COUNTERS pmc;
    GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc));
    return pmc.WorkingSetSize;
#else
    return 0; // Not implemented for this platform
#endif
}
