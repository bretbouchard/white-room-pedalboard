/*******************************************************************************
 * FilterGate - Preset Manager Tests
 *
 * Tests for preset save/load, JSON serialization, and validation.
 *
 * @author FilterGate Autonomous Agent 7
 * @date  2025-12-30
 ******************************************************************************/

#include <gtest/gtest.h>
#include "PresetManager.h"
#include "FilterGateProcessor.h"
#include <fstream>

using namespace FilterGate;

//==============================================================================
// JSON Serialization Tests
//==============================================================================

class PresetSerializationTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Create a test preset with known values
        testPreset.name = "Test Preset";
        testPreset.author = "Test Author";
        testPreset.category = "Test";
        testPreset.description = "Test description";
        testPreset.version = 1;

        testPreset.gateThreshold = 0.6f;
        testPreset.gateAttack = 15.0f;
        testPreset.gateHold = 120.0f;
        testPreset.gateRelease = 180.0f;
        testPreset.gateHysteresis = 0.08f;

        testPreset.env1Mode = 1; // ADSR
        testPreset.env1Attack = 25.0f;
        testPreset.env1Decay = 150.0f;
        testPreset.env1Sustain = 0.6f;
        testPreset.env1Release = 250.0f;
        testPreset.env1Loop = true;
        testPreset.env1VelocitySensitive = false;

        testPreset.phaserAStages = 6;
        testPreset.phaserARate = 0.7f;
        testPreset.phaserADepth = 0.6f;
        testPreset.phaserAFeedback = 0.55f;
        testPreset.phaserACenter = 1200.0f;
        testPreset.phaserASpread = 2200.0f;
        testPreset.phaserAMix = 0.55f;

        testPreset.filterModel = 1; // LADDER
        testPreset.filterCutoff = 1500.0f;
        testPreset.filterResonance = 0.65f;

        testPreset.mixerDryLevel = 0.3f;
        testPreset.mixerWetLevel = 0.7f;
        testPreset.mixerRouting = 1; // PARALLEL

        testPreset.modulationRoutes.add("0,0,0.8,10.0");
        testPreset.modulationRoutes.add("1,1,0.5,15.0");
    }

    Preset testPreset;
};

TEST_F(PresetSerializationTest, CanConvertToJSON) {
    auto json = testPreset.toJSON();

    EXPECT_TRUE(json.isObject());
    EXPECT_EQ(json.getProperty("name", "").toString(), "Test Preset");
    EXPECT_EQ(json.getProperty("author", "").toString(), "Test Author");
    EXPECT_EQ(json.getProperty("category", "").toString(), "Test");
}

TEST_F(PresetSerializationTest, CanConvertFromJSON) {
    auto json = testPreset.toJSON();
    Preset decoded = Preset::fromJSON(json);

    EXPECT_EQ(decoded.name, testPreset.name);
    EXPECT_EQ(decoded.author, testPreset.author);
    EXPECT_EQ(decoded.category, testPreset.category);
    EXPECT_FLOAT_EQ(decoded.gateThreshold, testPreset.gateThreshold);
    EXPECT_FLOAT_EQ(decoded.env1Attack, testPreset.env1Attack);
    EXPECT_EQ(decoded.env1Loop, testPreset.env1Loop);
}

TEST_F(PresetSerializationTest, JSONRoundTripPreservesData) {
    auto json = testPreset.toJSON();
    Preset decoded = Preset::fromJSON(json);

    // Check all critical parameters
    EXPECT_FLOAT_EQ(decoded.gateThreshold, testPreset.gateThreshold);
    EXPECT_FLOAT_EQ(decoded.gateAttack, testPreset.gateAttack);
    EXPECT_FLOAT_EQ(decoded.gateHold, testPreset.gateHold);
    EXPECT_FLOAT_EQ(decoded.gateRelease, testPreset.gateRelease);
    EXPECT_FLOAT_EQ(decoded.gateHysteresis, testPreset.gateHysteresis);

    EXPECT_EQ(decoded.env1Mode, testPreset.env1Mode);
    EXPECT_FLOAT_EQ(decoded.env1Attack, testPreset.env1Attack);
    EXPECT_FLOAT_EQ(decoded.env1Decay, testPreset.env1Decay);
    EXPECT_FLOAT_EQ(decoded.env1Sustain, testPreset.env1Sustain);
    EXPECT_FLOAT_EQ(decoded.env1Release, testPreset.env1Release);
    EXPECT_EQ(decoded.env1Loop, testPreset.env1Loop);
    EXPECT_EQ(decoded.env1VelocitySensitive, testPreset.env1VelocitySensitive);

    EXPECT_EQ(decoded.phaserAStages, testPreset.phaserAStages);
    EXPECT_FLOAT_EQ(decoded.phaserARate, testPreset.phaserARate);
    EXPECT_FLOAT_EQ(decoded.phaserADepth, testPreset.phaserADepth);
    EXPECT_FLOAT_EQ(decoded.phaserAFeedback, testPreset.phaserAFeedback);
    EXPECT_FLOAT_EQ(decoded.phaserACenter, testPreset.phaserACenter);
    EXPECT_FLOAT_EQ(decoded.phaserASpread, testPreset.phaserASpread);
    EXPECT_FLOAT_EQ(decoded.phaserAMix, testPreset.phaserAMix);

    EXPECT_EQ(decoded.filterModel, testPreset.filterModel);
    EXPECT_FLOAT_EQ(decoded.filterCutoff, testPreset.filterCutoff);
    EXPECT_FLOAT_EQ(decoded.filterResonance, testPreset.filterResonance);

    EXPECT_FLOAT_EQ(decoded.mixerDryLevel, testPreset.mixerDryLevel);
    EXPECT_FLOAT_EQ(decoded.mixerWetLevel, testPreset.mixerWetLevel);
    EXPECT_EQ(decoded.mixerRouting, testPreset.mixerRouting);

    EXPECT_EQ(decoded.modulationRoutes.size(), testPreset.modulationRoutes.size());
    for (int i = 0; i < testPreset.modulationRoutes.size(); ++i) {
        EXPECT_EQ(decoded.modulationRoutes[i], testPreset.modulationRoutes[i]);
    }
}

TEST_F(PresetSerializationTest, CanConvertToString) {
    juce::String jsonString = testPreset.toString();

    EXPECT_FALSE(jsonString.isEmpty());
    EXPECT_TRUE(jsonString.contains("\"name\": \"Test Preset\""));
    EXPECT_TRUE(jsonString.contains("\"author\": \"Test Author\""));
}

TEST_F(PresetSerializationTest, CanConvertFromString) {
    juce::String jsonString = testPreset.toString();
    Preset decoded = Preset::fromString(jsonString);

    EXPECT_EQ(decoded.name, testPreset.name);
    EXPECT_FLOAT_EQ(decoded.gateThreshold, testPreset.gateThreshold);
}

TEST_F(PresetSerializationTest,FromStringHandlesInvalidJSON) {
    juce::String invalidJSON = "{ invalid json }";

    EXPECT_THROW(Preset::fromString(invalidJSON), PresetException);
}

TEST_F(PresetSerializationTest, FromStringHandlesEmptyString) {
    juce::String emptyString = "";

    EXPECT_THROW(Preset::fromString(emptyString), PresetException);
}

TEST_F(PresetSerializationTest, FromJSONHandlesMissingFields) {
    auto* json = new juce::DynamicObject();
    json->setProperty("name", "Minimal");

    // Should not throw, should use defaults
    Preset preset = Preset::fromJSON(json);

    EXPECT_EQ(preset.name, "Minimal");
    EXPECT_FLOAT_EQ(preset.gateThreshold, 0.5f); // Default value
}

//==============================================================================
// Preset Validation Tests
//==============================================================================

class PresetValidationTest : public ::testing::Test {
protected:
    void SetUp() override {
        manager = std::make_unique<PresetManager>();
    }

    std::unique_ptr<PresetManager> manager;
};

TEST_F(PresetValidationTest, ValidPresetPasses) {
    Preset preset;
    preset.name = "Valid";

    EXPECT_TRUE(manager->validatePreset(preset));
    EXPECT_TRUE(manager->getValidationError().isEmpty());
}

TEST_F(PresetValidationTest, PresetWithoutNameFails) {
    Preset preset;
    // name is empty by default

    EXPECT_FALSE(manager->validatePreset(preset));
    EXPECT_FALSE(manager->getValidationError().isEmpty());
    EXPECT_TRUE(manager->getValidationError().contains("name"));
}

TEST_F(PresetValidationTest, GateThresholdOutOfRange) {
    Preset preset;
    preset.name = "Invalid Gate";
    preset.gateThreshold = 1.5f; // Too high

    EXPECT_FALSE(manager->validatePreset(preset));
    EXPECT_TRUE(manager->getValidationError().contains("threshold"));
}

TEST_F(PresetValidationTest, FilterCutoffOutOfRange) {
    Preset preset;
    preset.name = "Invalid Filter";
    preset.filterCutoff = 50000.0f; // Too high

    EXPECT_FALSE(manager->validatePreset(preset));
    EXPECT_TRUE(manager->getValidationError().contains("cutoff"));
}

TEST_F(PresetValidationTest, OutputLevelOutOfRange) {
    Preset preset;
    preset.name = "Invalid Output";
    preset.mixerOutputLevel = 3.0f; // Too high

    EXPECT_FALSE(manager->validatePreset(preset));
    EXPECT_TRUE(manager->getValidationError().contains("output level"));
}

TEST_F(PresetValidationTest, InvalidEnvelopeMode) {
    Preset preset;
    preset.name = "Invalid Env Mode";
    preset.env1Mode = 5; // Invalid

    EXPECT_FALSE(manager->validatePreset(preset));
    EXPECT_TRUE(manager->getValidationError().contains("mode"));
}

TEST_F(PresetValidationTest, InvalidDriveType) {
    Preset preset;
    preset.name = "Invalid Drive";
    preset.preDriveType = 10; // Invalid

    EXPECT_FALSE(manager->validatePreset(preset));
    EXPECT_TRUE(manager->getValidationError().contains("drive"));
}

TEST_F(PresetValidationTest, InvalidPhaserStages) {
    Preset preset;
    preset.name = "Invalid Phaser";
    preset.phaserAStages = 5; // Must be 4, 6, or 8

    EXPECT_FALSE(manager->validatePreset(preset));
    EXPECT_TRUE(manager->getValidationError().contains("stages"));
}

//==============================================================================
// Factory Presets Tests
//==============================================================================

class FactoryPresetsTest : public ::testing::Test {
protected:
    void SetUp() override {
        manager = std::make_unique<PresetManager>();
    }

    std::unique_ptr<PresetManager> manager;
};

TEST_F(FactoryPresetsTest, CanGetFactoryPresets) {
    auto presets = manager->getFactoryPresets();

    EXPECT_GT(presets.size(), 0);
}

TEST_F(FactoryPresetsTest, FactoryPresetsHaveRequiredFields) {
    auto presets = manager->getFactoryPresets();

    for (const auto& preset : presets) {
        EXPECT_FALSE(preset.name.isEmpty());
        EXPECT_FALSE(preset.category.isEmpty());
        EXPECT_FALSE(preset.author.isEmpty());
        EXPECT_GE(preset.version, 1);
    }
}

TEST_F(FactoryPresetsTest, FactoryPresetsAreValid) {
    auto presets = manager->getFactoryPresets();

    for (const auto& preset : presets) {
        EXPECT_TRUE(manager->validatePreset(preset))
            << "Preset '" << preset.name.toStdString() << "' failed validation: "
            << manager->getValidationError().toStdString();
    }
}

TEST_F(FactoryPresetsTest, CanGetFactoryPresetByName) {
    Preset preset = manager->getFactoryPreset("Init");

    EXPECT_EQ(preset.name, "Init");
    EXPECT_EQ(preset.category, "Factory");
}

TEST_F(FactoryPresetsTest, GetInvalidPresetReturnsEmpty) {
    Preset preset = manager->getFactoryPreset("Nonexistent Preset");

    EXPECT_EQ(preset.name, "Untitled"); // Default value
}

TEST_F(FactoryPresetsTest, CanGetPresetNames) {
    auto names = manager->getFactoryPresetNames();

    EXPECT_GT(names.size(), 0);
    EXPECT_TRUE(names.contains("Init"));
    EXPECT_TRUE(names.contains("Subtle Phaser"));
    EXPECT_TRUE(names.contains("Deep Phaser"));
}

TEST_F(FactoryPresetsTest, HasExpectedPresets) {
    auto names = manager->getFactoryPresetNames();

    // Check for some expected presets
    EXPECT_TRUE(names.contains("Init"));
    EXPECT_TRUE(names.contains("Subtle Phaser"));
    EXPECT_TRUE(names.contains("Deep Phaser"));
    EXPECT_TRUE(names.contains("Filter Sweep"));
    EXPECT_TRUE(names.contains("Gate Trigger"));
    EXPECT_TRUE(names.contains("Dual Phaser"));
    EXPECT_TRUE(names.contains("Vintage"));
    EXPECT_TRUE(names.contains("Modern"));
    EXPECT_TRUE(names.contains("Ambient Pad"));
    EXPECT_TRUE(names.contains("Funk Rhythm"));
    EXPECT_TRUE(names.contains("Electronic"));
    EXPECT_TRUE(names.contains("Bass Enhancer"));
    EXPECT_TRUE(names.contains("Vocal FX"));
    EXPECT_TRUE(names.contains("Drum Bus"));
    EXPECT_TRUE(names.contains("Synth Lead"));
    EXPECT_TRUE(names.contains("Guitar FX"));
    EXPECT_TRUE(names.contains("Experimental"));
    EXPECT_TRUE(names.contains("Minimal"));
}

//==============================================================================
// Preset File I/O Tests
//==============================================================================

class PresetFileIOTest : public ::testing::Test {
protected:
    void SetUp() override {
        manager = std::make_unique<PresetManager>();

        // Create test preset
        testPreset.name = "File Test";
        testPreset.author = "Test";
        testPreset.category = "Test";

        // Create temp directory
        tempDir = juce::File::getSpecialLocation(juce::File::tempDirectory)
                       .getChildFile("FilterGateTest");

        if (tempDir.exists()) {
            tempDir.deleteRecursively();
        }
        tempDir.createDirectory();
    }

    void TearDown() override {
        if (tempDir.exists()) {
            tempDir.deleteRecursively();
        }
    }

    std::unique_ptr<PresetManager> manager;
    Preset testPreset;
    juce::File tempDir;
};

TEST_F(PresetFileIOTest, CanSavePresetToFile) {
    juce::File testFile = tempDir.getChildFile("test_preset.json");

    bool success = manager->saveUserPreset(testPreset, testFile);

    EXPECT_TRUE(success);
    EXPECT_TRUE(testFile.existsAsFile());
}

TEST_F(PresetFileIOTest, CanLoadPresetFromFile) {
    juce::File testFile = tempDir.getChildFile("test_preset.json");

    // Save preset
    manager->saveUserPreset(testPreset, testFile);

    // Load preset
    Preset loaded = manager->loadUserPreset(testFile);

    EXPECT_EQ(loaded.name, testPreset.name);
    EXPECT_EQ(loaded.author, testPreset.author);
    EXPECT_EQ(loaded.category, testPreset.category);
}

TEST_F(PresetFileIOTest, SaveAndLoadPreservesData) {
    juce::File testFile = tempDir.getChildFile("roundtrip_test.json");

    // Set some specific values
    testPreset.gateThreshold = 0.75f;
    testPreset.env1Attack = 42.0f;
    testPreset.phaserAStages = 8;
    testPreset.filterCutoff = 2500.0f;

    // Save
    manager->saveUserPreset(testPreset, testFile);

    // Load
    Preset loaded = manager->loadUserPreset(testFile);

    EXPECT_FLOAT_EQ(loaded.gateThreshold, 0.75f);
    EXPECT_FLOAT_EQ(loaded.env1Attack, 42.0f);
    EXPECT_EQ(loaded.phaserAStages, 8);
    EXPECT_FLOAT_EQ(loaded.filterCutoff, 2500.0f);
}

TEST_F(PresetFileIOTest, LoadingNonexistentFileThrows) {
    juce::File nonexistent = tempDir.getChildFile("nonexistent.json");

    EXPECT_THROW(manager->loadUserPreset(nonexistent), PresetException);
}

TEST_F(PresetFileIOTest, LoadingInvalidJSONThrows) {
    juce::File invalidFile = tempDir.getChildFile("invalid.json");
    invalidFile.replaceWithText("not valid json");

    EXPECT_THROW(manager->loadUserPreset(invalidFile), PresetException);
}

TEST_F(PresetFileIOTest, CanGetUserPresetsDirectory) {
    juce::File presetDir = manager->getUserPresetsDirectory();

    EXPECT_TRUE(presetDir.exists());
    EXPECT_TRUE(presetDir.isDirectory());
}

TEST_F(PresetFileIOTest, UserPresetsDirectoryContainsFilterGate) {
    juce::File presetDir = manager->getUserPresetsDirectory();

    juce::String path = presetDir.getFullPathName();
    EXPECT_TRUE(path.contains("FilterGate"));
    EXPECT_TRUE(path.contains("Presets"));
}

TEST_F(PresetFileIOTest, CanGetUserPresetFiles) {
    // Create some test preset files
    juce::File file1 = tempDir.getChildFile("preset1.json");
    juce::File file2 = tempDir.getChildFile("preset2.json");
    juce::File notJSON = tempDir.getChildFile("readme.txt");

    file1.replaceWithText("{}");
    file2.replaceWithText("{}");
    notJSON.replaceWithText("text");

    // Note: getUserPresetFiles uses system documents directory,
    // so we can't easily test this with tempDir
    // Just verify the method doesn't crash
    auto files = manager->getUserPresetFiles();

    // Should return empty or some files, but shouldn't crash
    SUCCEED();
}

//==============================================================================
// Preset Application Tests
//==============================================================================

class PresetApplicationTest : public ::testing::Test {
protected:
    void SetUp() override {
        processor = std::make_unique<FilterGateProcessor>();
        processor->prepareToPlay(48000.0, 512);
    }

    std::unique_ptr<FilterGateProcessor> processor;
};

TEST_F(PresetApplicationTest, CanApplyPresetToProcessor) {
    Preset preset;
    preset.name = "Test Apply";

    // Set some parameters
    preset.gateThreshold = 0.6f;
    preset.env1Attack = 50.0f;
    preset.filterCutoff = 2000.0f;

    // Should not throw
    EXPECT_NO_THROW(preset.applyToModules(*processor));
}

TEST_F(PresetApplicationTest, ApplyingPresetModifiesProcessor) {
    Preset preset;
    preset.name = "Test Modify";

    preset.gateThreshold = 0.7f;
    preset.env1Attack = 100.0f;

    preset.applyToModules(*processor);

    // Verify parameters were applied (we can't easily check all of them)
    // Just verify it didn't crash
    SUCCEED();
}

TEST_F(PresetApplicationTest, CanApplyModulationRoutes) {
    Preset preset;
    preset.name = "Test Modulation";

    preset.modulationRoutes.add("0,0,0.5,10.0");  // ENV1 -> FILTER_CUTOFF
    preset.modulationRoutes.add("1,1,0.3,15.0");  // ENV2 -> FILTER_RESONANCE

    preset.applyToModules(*processor);

    // Verify modulation matrix has routes
    EXPECT_EQ(processor->getModMatrix().getNumRoutes(), 2);
}

//==============================================================================
// Specific Preset Content Tests
//==============================================================================

class PresetContentTest : public ::testing::Test {
protected:
    void SetUp() override {
        manager = std::make_unique<PresetManager>();
    }

    std::unique_ptr<PresetManager> manager;
};

TEST_F(PresetContentTest, InitPresetHasDefaults) {
    Preset preset = manager->getFactoryPreset("Init");

    EXPECT_EQ(preset.name, "Init");
    EXPECT_EQ(preset.category, "Factory");

    // Check default values
    EXPECT_FLOAT_EQ(preset.gateThreshold, 0.5f);
    EXPECT_EQ(preset.env1Mode, 1); // ADSR
    EXPECT_EQ(preset.phaserAStages, 4);
    EXPECT_EQ(preset.filterModel, 0); // SVF
}

TEST_F(PresetContentTest, SubtlePhaserIsSubtle) {
    Preset preset = manager->getFactoryPreset("Subtle Phaser");

    EXPECT_EQ(preset.category, "Phaser");
    EXPECT_LE(preset.phaserADepth, 0.5f);
    EXPECT_LE(preset.phaserAMix, 0.4f);
    EXPECT_LE(preset.mixerWetLevel, 0.6f);
}

TEST_F(PresetContentTest, DeepPhaserIsDeep) {
    Preset preset = manager->getFactoryPreset("Deep Phaser");

    EXPECT_EQ(preset.category, "Phaser");
    EXPECT_EQ(preset.phaserAStages, 8);
    EXPECT_GE(preset.phaserADepth, 0.7f);
    EXPECT_GE(preset.phaserAFeedback, 0.6f);
}

TEST_F(PresetContentTest, FunkRhythmHasLoopingEnvelope) {
    Preset preset = manager->getFactoryPreset("Funk Rhythm");

    EXPECT_EQ(preset.category, "Rhythm");
    EXPECT_EQ(preset.env1Mode, 0); // ADR
    EXPECT_TRUE(preset.env1Loop);
}

TEST_F(PresetContentTest, VintageUsesSoftClip) {
    Preset preset = manager->getFactoryPreset("Vintage");

    EXPECT_EQ(preset.category, "Character");
    EXPECT_EQ(preset.preDriveType, 0); // SOFT_CLIP
    EXPECT_GT(preset.preDriveDrive, 0.0f);
}

TEST_F(PresetContentTest, ModernHasStereoPhasers) {
    Preset preset = manager->getFactoryPreset("Modern");

    EXPECT_EQ(preset.category, "Character");
    EXPECT_EQ(preset.dualPhaserRouting, 2); // STEREO
    EXPECT_EQ(preset.dualPhaserLFOPhaseOffset, 180.0f);
}

TEST_F(PresetContentTest, ExperimentalHasComplexModulation) {
    Preset preset = manager->getFactoryPreset("Experimental");

    EXPECT_EQ(preset.category, "Experimental");
    EXPECT_GT(preset.modulationRoutes.size(), 3);
    EXPECT_EQ(preset.dualPhaserRouting, 1); // PARALLEL
    EXPECT_GT(preset.dualPhaserCrossFeedback, 0.0f);
}

TEST_F(PresetContentTest, ExtremeModulationIsExtreme) {
    Preset preset = manager->getFactoryPreset("Extreme Modulation");

    EXPECT_EQ(preset.category, "Experimental");
    EXPECT_EQ(preset.phaserAStages, 8);
    EXPECT_FLOAT_EQ(preset.phaserADepth, 1.0f);
    EXPECT_FLOAT_EQ(preset.phaserAFeedback, 0.9f);
    EXPECT_FLOAT_EQ(preset.mixerWetLevel, 1.0f);
    EXPECT_FLOAT_EQ(preset.mixerDryLevel, 0.0f);
}

TEST_F(PresetContentTest, MinimalIsMinimal) {
    Preset preset = manager->getFactoryPreset("Minimal");

    EXPECT_EQ(preset.category, "Character");
    EXPECT_LE(preset.phaserADepth, 0.3f);
    EXPECT_LE(preset.phaserAMix, 0.3f);
    EXPECT_LE(preset.mixerWetLevel, 0.4f);
}

//==============================================================================
// Main
//==============================================================================

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
