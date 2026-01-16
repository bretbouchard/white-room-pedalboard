#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <memory>
#include <vector>
#include <optional>
#include <stdexcept>
#include <chrono>
#include <numeric>

// Include the implemented CounterpointEngine
#include "../src/musical_control/CounterpointEngine.h"

// Week 2 Tuesday GREEN Phase Tests - These should PASS with our implementation
class CounterpointEngineGreenPhaseTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Test setup - create basic test data
        cantusFirmus = MusicalControl::VoicePart("Test Cantus Firmus");
        cantusFirmus.notes = {
            MusicalControl::Note(60, 1.0, 0.0),   // C4
            MusicalControl::Note(62, 1.0, 1.0),   // D4
            MusicalControl::Note(64, 1.0, 2.0),   // E4
            MusicalControl::Note(65, 1.0, 3.0),   // F4
            MusicalControl::Note(67, 1.0, 4.0)    // G4
        };

        basicRules.species = MusicalControl::CounterpointSpecies::FIRST;
        basicRules.tempo = 120.0;
        basicRules.timeSignatureNumerator = 4;
        basicRules.timeSignatureDenominator = 4;
        basicRules.counterpointMin = 60;
        basicRules.counterpointMax = 84;
        basicRules.maxMelodicInterval = 12;
        basicRules.maxParallelMotions = 2;
    }

    MusicalControl::VoicePart cantusFirmus;
    MusicalControl::CounterpointRules basicRules;
};

// Test 1: Basic Counterpoint Generation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldGenerateCounterpointWithSameLengthAsCantusFirmus) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    auto counterpoint = engine->generateCounterpoint(cantusFirmus, basicRules);

    // GREEN phase - these assertions should PASS because CounterpointEngine is implemented
    EXPECT_EQ(counterpoint.notes.size(), cantusFirmus.notes.size())
        << "Counterpoint should have same number of notes as cantus firmus";
    EXPECT_FALSE(counterpoint.notes.empty())
        << "Counterpoint should not be empty";
    EXPECT_EQ(counterpoint.name, "Counterpoint 1st Species")
        << "Counterpoint name should reflect species type";
}

// Test 2: Species Validation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldValidateFirstSpeciesCharacteristics) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    basicRules.species = MusicalControl::CounterpointSpecies::FIRST;
    auto counterpoint = engine->generateCounterpoint(cantusFirmus, basicRules);

    // GREEN phase - these assertions should PASS
    EXPECT_EQ(counterpoint.notes.size(), cantusFirmus.notes.size())
        << "First species should have 1:1 note ratio";

    // Check that all notes have same duration (1:1 rhythm)
    for (const auto& note : counterpoint.notes) {
        EXPECT_DOUBLE_EQ(note.duration, 1.0)
            << "First species notes should have same duration as cantus firmus";
    }
}

// Test 3: Error Handling - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldHandleInvalidInputGracefully) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    // Test empty cantus firmus
    MusicalControl::VoicePart emptyCantus("Empty");

    // GREEN phase - this should now PASS because we have error handling
    EXPECT_THROW(engine->generateCounterpoint(emptyCantus, basicRules), std::invalid_argument)
        << "Should throw exception for empty cantus firmus";

    // Test invalid MIDI notes
    MusicalControl::VoicePart invalidCantus("Invalid MIDI");
    invalidCantus.notes = {MusicalControl::Note(-1, 1.0, 0.0)};  // Invalid MIDI note

    EXPECT_THROW(engine->generateCounterpoint(invalidCantus, basicRules), std::invalid_argument)
        << "Should throw exception for invalid MIDI notes";
}

// Test 4: Performance Requirements - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldMeetPerformanceRequirements) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    // Test with larger cantus firmus
    MusicalControl::VoicePart longCantus("Long Cantus Firmus");
    for (int i = 0; i < 16; ++i) {
        longCantus.notes.emplace_back(60 + (i % 12), 1.0, i * 1.0);
    }

    // GREEN phase - performance test should PASS because implementation is efficient
    auto startTime = std::chrono::high_resolution_clock::now();
    auto counterpoint = engine->generateCounterpoint(longCantus, basicRules);
    auto endTime = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);

    EXPECT_LT(duration.count(), 100)  // Should complete in less than 100ms
        << "Counterpoint generation should be fast for real-time use";

    EXPECT_FALSE(counterpoint.notes.empty())
        << "Should generate counterpoint even for longer cantus firmus";
}

// Test 5: Counterpoint Analysis - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldAnalyzeCounterpointQuality) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    auto counterpoint = engine->generateCounterpoint(cantusFirmus, basicRules);
    auto analysis = engine->analyzeCounterpoint(cantusFirmus, counterpoint, basicRules);

    // GREEN phase - these assertions should PASS
    EXPECT_TRUE(analysis.isValid)
        << "Generated counterpoint should be valid";
    EXPECT_GE(analysis.voiceLeadingScore, 0.0)
        << "Voice leading score should be non-negative";
    EXPECT_LE(analysis.voiceLeadingScore, 100.0)
        << "Voice leading score should be at most 100";
    EXPECT_LE(analysis.parallelMotionViolations, 2)
        << "Should have minimal parallel motion violations";
    EXPECT_TRUE(analysis.speciesConforms)
        << "Counterpoint should conform to species characteristics";
}

// Test 6: Rhythmic Pattern Generation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldGenerateSchillingerRhythmicPatterns) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    std::vector<int> basePattern = {1, 0, 1, 0};  // Basic rhythm
    std::vector<int> resultantPattern = {1, 1, 0};  // Resultant pattern

    auto patterns = engine->generateRhythmicPatterns(basePattern, resultantPattern, 1);

    // GREEN phase - these assertions should PASS
    EXPECT_FALSE(patterns.empty())
        << "Should generate at least one rhythmic pattern";
    EXPECT_EQ(patterns[0].size(), basePattern.size())
        << "Generated pattern should match base pattern length";

    // Verify pattern contains binary values
    for (const auto& pattern : patterns) {
        for (int value : pattern) {
            EXPECT_TRUE(value == 0 || value == 1)
                << "Rhythmic patterns should contain only 0s and 1s";
        }
    }
}

// Test 7: Voice Leading Validation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldApplyVoiceLeadingConstraints) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    std::vector<MusicalControl::Note> sourceNotes = {
        MusicalControl::Note(60, 1.0, 0.0),  // C4
        MusicalControl::Note(64, 1.0, 1.0)   // E4
    };

    std::vector<MusicalControl::Note> targetNotes = {
        MusicalControl::Note(62, 1.0, 0.0),  // D4
        MusicalControl::Note(65, 1.0, 1.0)   // F4
    };

    bool voiceLeadingValid = engine->applyVoiceLeading(sourceNotes, targetNotes, basicRules);

    // GREEN phase - this assertion should PASS
    EXPECT_TRUE(voiceLeadingValid)
        << "Voice leading should be valid for reasonable melodic motion";
}

// Test 8: Second Species Generation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldGenerateSecondSpeciesCounterpoint) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    basicRules.species = MusicalControl::CounterpointSpecies::SECOND;
    auto counterpoint = engine->generateCounterpoint(cantusFirmus, basicRules);

    // GREEN phase - these assertions should PASS
    EXPECT_EQ(counterpoint.notes.size(), cantusFirmus.notes.size() * 2)
        << "Second species should have 2:1 note ratio";

    // Check that counterpoint has shorter durations (faster motion)
    for (const auto& note : counterpoint.notes) {
        EXPECT_NEAR(note.duration, 0.5, 0.01)
            << "Second species notes should be half duration";
    }

    EXPECT_EQ(counterpoint.name, "Counterpoint 2th Species")
        << "Counterpoint name should reflect second species";
}

// Test 9: Third Species Generation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldGenerateThirdSpeciesCounterpoint) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    basicRules.species = MusicalControl::CounterpointSpecies::THIRD;
    auto counterpoint = engine->generateCounterpoint(cantusFirmus, basicRules);

    // GREEN phase - these assertions should PASS
    EXPECT_GE(counterpoint.notes.size(), cantusFirmus.notes.size() * 3)
        << "Third species should have 3+:1 note ratio";

    // Check that counterpoint has very short durations (fast motion)
    for (const auto& note : counterpoint.notes) {
        EXPECT_NEAR(note.duration, 0.333, 0.05)
            << "Third species notes should be approximately one-third duration";
    }

    EXPECT_EQ(counterpoint.name, "Counterpoint 3th Species")
        << "Counterpoint name should reflect third species";
}

// Test 10: Fourth Species Generation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldGenerateFourthSpeciesCounterpoint) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    basicRules.species = MusicalControl::CounterpointSpecies::FOURTH;
    auto counterpoint = engine->generateCounterpoint(cantusFirmus, basicRules);

    // GREEN phase - these assertions should PASS
    EXPECT_EQ(counterpoint.notes.size(), cantusFirmus.notes.size())
        << "Fourth species should have 1:1 note ratio but with suspensions";

    EXPECT_EQ(counterpoint.name, "Counterpoint 4th Species")
        << "Counterpoint name should reflect fourth species";
}

// Test 11: Fifth Species Generation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldGenerateFifthSpeciesCounterpoint) {
    auto engine = std::make_unique<MusicalControl::CounterpointEngine>();

    basicRules.species = MusicalControl::CounterpointSpecies::FIFTH;
    auto counterpoint = engine->generateCounterpoint(cantusFirmus, basicRules);

    // GREEN phase - these assertions should PASS
    EXPECT_GE(counterpoint.notes.size(), cantusFirmus.notes.size())
        << "Fifth species should have varied note ratios";

    // Check for varied durations (mixed rhythmic patterns)
    std::vector<double> durations;
    for (const auto& note : counterpoint.notes) {
        durations.push_back(note.duration);
    }

    // Calculate duration variance
    double mean = std::accumulate(durations.begin(), durations.end(), 0.0) / durations.size();
    double variance = 0.0;
    for (double dur : durations) {
        variance += (dur - mean) * (dur - mean);
    }
    variance /= durations.size();

    EXPECT_GT(variance, 0.01)  // Should have varied durations
        << "Fifth species should have mixed rhythmic patterns";

    EXPECT_EQ(counterpoint.name, "Counterpoint 5th Species")
        << "Counterpoint name should reflect fifth species";
}

// Test 12: Species Name Utility - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldReturnCorrectSpeciesNames) {
    EXPECT_EQ(MusicalControl::CounterpointEngine::getSpeciesName(MusicalControl::CounterpointSpecies::FIRST),
              "Counterpoint 1st Species");
    EXPECT_EQ(MusicalControl::CounterpointEngine::getSpeciesName(MusicalControl::CounterpointSpecies::SECOND),
              "Counterpoint 2th Species");
    EXPECT_EQ(MusicalControl::CounterpointEngine::getSpeciesName(MusicalControl::CounterpointSpecies::THIRD),
              "Counterpoint 3th Species");
    EXPECT_EQ(MusicalControl::CounterpointEngine::getSpeciesName(MusicalControl::CounterpointSpecies::FOURTH),
              "Counterpoint 4th Species");
    EXPECT_EQ(MusicalControl::CounterpointEngine::getSpeciesName(MusicalControl::CounterpointSpecies::FIFTH),
              "Counterpoint 5th Species");
}

// Test 13: Note Range Validation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldValidateNoteRanges) {
    EXPECT_TRUE(MusicalControl::CounterpointEngine::isNoteInRange(60, 48, 72))
        << "Note 60 should be in range 48-72";
    EXPECT_FALSE(MusicalControl::CounterpointEngine::isNoteInRange(40, 48, 72))
        << "Note 40 should not be in range 48-72";
    EXPECT_FALSE(MusicalControl::CounterpointEngine::isNoteInRange(80, 48, 72))
        << "Note 80 should not be in range 48-72";
}

// Test 14: Interval Calculation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldCalculateIntervalsCorrectly) {
    MusicalControl::Note note1(60, 1.0, 0.0);  // C4
    MusicalControl::Note note2(64, 1.0, 0.0);  // E4
    MusicalControl::Note note3(72, 1.0, 0.0);  // C5

    EXPECT_EQ(MusicalControl::CounterpointEngine::calculateInterval(note1, note2), 4)
        << "Interval between C4 and E4 should be 4 (major third)";
    EXPECT_EQ(MusicalControl::CounterpointEngine::calculateInterval(note1, note3), 12)
        << "Interval between C4 and C5 should be 12 (octave)";
}

// Test 15: Consonance Detection - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldDetectConsonantIntervals) {
    EXPECT_TRUE(MusicalControl::CounterpointEngine::isConsonantInterval(1))   // Unison
        << "Unison should be consonant";
    EXPECT_TRUE(MusicalControl::CounterpointEngine::isConsonantInterval(3))   // Minor third
        << "Minor third should be consonant";
    EXPECT_TRUE(MusicalControl::CounterpointEngine::isConsonantInterval(4))   // Major third
        << "Major third should be consonant";
    EXPECT_TRUE(MusicalControl::CounterpointEngine::isConsonantInterval(7))   // Perfect fifth
        << "Perfect fifth should be consonant";
    EXPECT_TRUE(MusicalControl::CounterpointEngine::isConsonantInterval(12))  // Octave
        << "Octave should be consonant";
    EXPECT_FALSE(MusicalControl::CounterpointEngine::isConsonantInterval(2))  // Second
        << "Second should be dissonant";
    EXPECT_FALSE(MusicalControl::CounterpointEngine::isConsonantInterval(6))  // Tritone
        << "Tritone should be dissonant";
}

// Test 16: Random Melody Generation - Should PASS
TEST_F(CounterpointEngineGreenPhaseTest, ShouldGenerateRandomMelody) {
    auto melody = MusicalControl::CounterpointEngine::generateRandomMelody(8, 60, 72);

    EXPECT_EQ(melody.notes.size(), 8)
        << "Random melody should have correct length";
    EXPECT_EQ(melody.name, "Random Melody")
        << "Random melody should have correct name";

    // Check that all notes are in range
    for (const auto& note : melody.notes) {
        EXPECT_GE(note.midiNote, 60)
            << "Random melody notes should be at or above minimum range";
        EXPECT_LE(note.midiNote, 72)
            << "Random melody notes should be at or below maximum range";
    }
}

// Main function for running this test file
int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}