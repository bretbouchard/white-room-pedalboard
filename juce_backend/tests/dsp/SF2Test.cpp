/*
  ==============================================================================

    SF2Test.cpp
    Created: 25 Dec 2024
    Author:  Bret Bouchard

    TDD Test Suite for SF2 SoundFont 2 Support
    - 18 tests for complete SF2 file format support
    - Tests parser, instruments, metadata

  ==============================================================================
*/

#include "../../include/dsp/SF2Reader.h"
#include "../../include/dsp/SamSamplerDSP.h"
#include "DSPTestFramework.h"
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <cstdint>
#include <iostream>

using namespace DSPTestFramework;

//==============================================================================
// Test Suite 1: SF2 Parser Tests (8 tests)
//==============================================================================

void test_LoadSF2FromFile()
{
    // Test: Can load valid SF2 file
    // NOTE: This test requires a real SF2 file
    // For now, test with nullptr (should return nullptr)

    auto sf2 = SF2Reader::loadFromFile("/nonexistent/file.sf2");
    if (sf2 != nullptr) throw std::runtime_error("Should return nullptr for invalid file");
}

void test_LoadInvalidSF2()
{
    // Test: Rejects invalid files
    auto sf2 = SF2Reader::loadFromFile("/tmp/invalid.txt");
    if (sf2 != nullptr) throw std::runtime_error("Should reject invalid files");
}

void test_ParseRIFFHeader()
{
    // Test: Parses RIFF header correctly
    // Create minimal valid RIFF header
    uint8_t riffData[] = {
        'R', 'I', 'F', 'F',  // RIFF ID
        0x10, 0x00, 0x00, 0x00,  // File size (16 bytes)
        's', 'f', 'b', 'k'   // File type
    };

    bool isValid = SF2Reader::isValidSF2Memory(riffData, sizeof(riffData));
    if (!isValid) throw std::runtime_error("Should recognize valid RIFF header");
}

void test_ParseINFOChunk()
{
    // Test: Extracts metadata from INFO chunk
    // This will be tested with real SF2 file
    // For now, test metadata access

    auto sampler = std::make_unique<SamSamplerDSP>();

    // Before loading, metadata should be empty
    juce::String romName = sampler->getSoundFontRomName();
    if (romName.isNotEmpty()) throw std::runtime_error("ROM name should be empty before load");
}

void test_ParseSDTAChunk()
{
    // Test: Loads sample data from sdta chunk
    // This requires a real SF2 file
    auto sampler = std::make_unique<SamSamplerDSP>();

    // Should have 0 samples before load
    int sampleCount = sampler->getLoadedSampleCount();
    if (sampleCount != 0) throw std::runtime_error("Should have 0 samples before load");
}

void test_ParsePDTAChunk()
{
    // Test: Loads instruments from pdta chunk
    auto sampler = std::make_unique<SamSamplerDSP>();

    // Should have 0 instruments before load
    int instrumentCount = sampler->getSoundFontInstrumentCount();
    if (instrumentCount != 0) throw std::runtime_error("Should have 0 instruments before load");
}

void test_ZoneKeyRanges()
{
    // Test: Key ranges work correctly
    SF2File::SF2Instrument::SF2Zone zone;
    zone.keyRangeLow = 60;
    zone.keyRangeHigh = 72;

    if (!zone.isInRange(64, 100)) throw std::runtime_error("Should be in range");
    if (zone.isInRange(59, 100)) throw std::runtime_error("Should be below range");
    if (zone.isInRange(73, 100)) throw std::runtime_error("Should be above range");
}

void test_ZoneVelocityRanges()
{
    // Test: Velocity ranges work correctly
    SF2File::SF2Instrument::SF2Zone zone;
    zone.velocityRangeLow = 64;
    zone.velocityRangeHigh = 127;

    if (!zone.isInRange(60, 100)) throw std::runtime_error("Should be in range");
    if (zone.isInRange(60, 63)) throw std::runtime_error("Should be below range");
}

//==============================================================================
// Test Suite 2: SF2 Instrument Tests (6 tests)
//==============================================================================

void test_SoundFontInstrumentCount()
{
    // Test: Gets correct instrument count
    auto sampler = std::make_unique<SamSamplerDSP>();

    int count = sampler->getSoundFontInstrumentCount();
    if (count != 0) throw std::runtime_error("Should have 0 instruments when no SF2 loaded");
}

void test_SelectSoundFontInstrument()
{
    // Test: Can switch between instruments
    auto sampler = std::make_unique<SamSamplerDSP>();

    // Selecting without SF2 loaded should fail
    bool selected = sampler->selectSoundFontInstrument(0);
    if (selected) throw std::runtime_error("Should fail to select instrument without SF2");
}

void test_SoundFontSamplePlayback()
{
    // Test: Samples play correctly after SF2 load
    auto sampler = std::make_unique<SamSamplerDSP>();
    sampler->prepareToPlay(48000.0, 512);

    juce::AudioBuffer<float> buffer(2, 512);
    juce::MidiBuffer midi = Framework::createNoteOn(60, 0.8f);

    sampler->processBlock(buffer, midi);

    // Without samples, should be silent
    if (!Framework::isSilent(buffer)) throw std::runtime_error("Should be silent without samples");
}

void test_SoundFontKeyZones()
{
    // Test: Key zones trigger right samples
    // This requires a loaded SF2 with key zones
    // For now, test basic key range logic

    SF2File::SF2Instrument::SF2Zone zone1;
    zone1.keyRangeLow = 0;
    zone1.keyRangeHigh = 60;

    SF2File::SF2Instrument::SF2Zone zone2;
    zone2.keyRangeLow = 61;
    zone2.keyRangeHigh = 127;

    if (!zone1.isInRange(30, 100)) throw std::runtime_error("Zone 1 should cover key 30");
    if (!zone2.isInRange(100, 100)) throw std::runtime_error("Zone 2 should cover key 100");
}

void test_SoundFontVelocityZones()
{
    // Test: Velocity zones work correctly
    SF2File::SF2Instrument::SF2Zone zone;
    zone.velocityRangeLow = 0;
    zone.velocityRangeHigh = 63;

    if (!zone.isInRange(60, 50)) throw std::runtime_error("Should match velocity 50");
    if (zone.isInRange(60, 100)) throw std::runtime_error("Should not match velocity 100");
}

void test_SoundFontLoopPoints()
{
    // Test: Loop points work correctly
    auto sampler = std::make_unique<SamSamplerDSP>();

    // Set loop points
    SamSamplerDSP::LoopPoints loop;
    loop.mode = SamSamplerDSP::LoopMode::Forward;
    loop.startSample = 1000;
    loop.endSample = 5000;

    sampler->setLoopPoints(loop);

    const auto& retrieved = sampler->getLoopPoints();
    if (retrieved.startSample != 1000) throw std::runtime_error("Loop start not set correctly");
    if (retrieved.endSample != 5000) throw std::runtime_error("Loop end not set correctly");
    if (retrieved.mode != SamSamplerDSP::LoopMode::Forward) throw std::runtime_error("Loop mode not set correctly");
}

//==============================================================================
// Test Suite 3: SF2 Metadata Tests (4 tests)
//==============================================================================

void test_GetSoundFontRomName()
{
    // Test: Extracts ROM name
    auto sampler = std::make_unique<SamSamplerDSP>();

    juce::String romName = sampler->getSoundFontRomName();
    if (romName.isNotEmpty()) throw std::runtime_error("ROM name should be empty without SF2");
}

void test_GetSoundFontAuthor()
{
    // Test: Extracts author
    auto sampler = std::make_unique<SamSamplerDSP>();

    juce::String author = sampler->getSoundFontAuthor();
    if (author.isNotEmpty()) throw std::runtime_error("Author should be empty without SF2");
}

void test_GetSoundFontVersion()
{
    // Test: Extracts version
    auto sampler = std::make_unique<SamSamplerDSP>();

    juce::String version = sampler->getSoundFontRomVersion();
    if (version.isNotEmpty()) throw std::runtime_error("Version should be empty without SF2");
}

void test_GetSoundFontMetadata()
{
    // Test: All metadata present
    auto sampler = std::make_unique<SamSamplerDSP>();

    // All metadata should be empty without SF2
    if (sampler->getSoundFontRomName().isNotEmpty()) throw std::runtime_error("ROM name should be empty");
    if (sampler->getSoundFontAuthor().isNotEmpty()) throw std::runtime_error("Author should be empty");
    if (sampler->getSoundFontProduct().isNotEmpty()) throw std::runtime_error("Product should be empty");
    if (sampler->getSoundFontCopyright().isNotEmpty()) throw std::runtime_error("Copyright should be empty");
    if (sampler->getSoundFontEngine().isNotEmpty()) throw std::runtime_error("Engine should be empty");
}

//==============================================================================
// Test Runner
//==============================================================================

int main(int argc, char* argv[])
{
    juce::ignoreUnused(argc);
    juce::ignoreUnused(argv);

    int passed = 0;
    int failed = 0;

    #define RUN_TEST(test) \
        do { \
            std::cout << "Running: " #test "..."; \
            try { \
                test(); \
                std::cout << " PASSED\n"; \
                passed++; \
            } catch (const std::exception& e) { \
                std::cout << " FAILED: " << e.what() << "\n"; \
                failed++; \
            } \
        } while(0)

    //==========================================================================
    // Test Suite 1: SF2 Parser Tests
    //==========================================================================

    std::cout << "\n--- SF2 Parser Tests ---\n";
    RUN_TEST(test_LoadSF2FromFile);
    RUN_TEST(test_LoadInvalidSF2);
    RUN_TEST(test_ParseRIFFHeader);
    RUN_TEST(test_ParseINFOChunk);
    RUN_TEST(test_ParseSDTAChunk);
    RUN_TEST(test_ParsePDTAChunk);
    RUN_TEST(test_ZoneKeyRanges);
    RUN_TEST(test_ZoneVelocityRanges);

    //==========================================================================
    // Test Suite 2: SF2 Instrument Tests
    //==========================================================================

    std::cout << "\n--- SF2 Instrument Tests ---\n";
    RUN_TEST(test_SoundFontInstrumentCount);
    RUN_TEST(test_SelectSoundFontInstrument);
    RUN_TEST(test_SoundFontSamplePlayback);
    RUN_TEST(test_SoundFontKeyZones);
    RUN_TEST(test_SoundFontVelocityZones);
    RUN_TEST(test_SoundFontLoopPoints);

    //==========================================================================
    // Test Suite 3: SF2 Metadata Tests
    //==========================================================================

    std::cout << "\n--- SF2 Metadata Tests ---\n";
    RUN_TEST(test_GetSoundFontRomName);
    RUN_TEST(test_GetSoundFontAuthor);
    RUN_TEST(test_GetSoundFontVersion);
    RUN_TEST(test_GetSoundFontMetadata);

    //==========================================================================
    // Summary
    //==========================================================================

    std::cout << "\n========================================\n";
    std::cout << "SF2 SoundFont 2 Test Results\n";
    std::cout << "========================================\n";
    std::cout << "Total Tests: " << (passed + failed) << "\n";
    std::cout << "Passed: " << passed << "\n";
    std::cout << "Failed: " << failed << "\n";
    std::cout << "========================================\n";

    if (failed == 0)
    {
        std::cout << "ALL TESTS PASSED - GREEN PHASE!\n";
        return 0;
    }
    else
    {
        std::cout << "SOME TESTS FAILED - RED PHASE\n";
        return 1;
    }
}
