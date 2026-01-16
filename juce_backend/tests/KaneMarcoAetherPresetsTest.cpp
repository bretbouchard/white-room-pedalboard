/*
  ==============================================================================

   Kane Marco Aether Preset Validation Test
   Validates all 20 factory presets for correct structure and parameter ranges

  ==============================================================================
*/

#include <gtest/gtest.h>
#include <nlohmann/json.hpp>
#include <fstream>
#include <filesystem>
#include <cmath>

using json = nlohmann::json;

namespace KaneMarcoAetherTests {

struct PresetInfo {
    std::string filename;
    std::string name;
    std::string category;
    json parameters;
};

class KaneMarcoAetherPresetsTest : public ::testing::Test {
protected:
    std::vector<PresetInfo> presets;
    std::filesystem::path presetsDir;

    void SetUp() override {
        presetsDir = "/Users/bretbouchard/apps/schill/juce_backend/presets/KaneMarcoAether";

        // Load all preset files
        for (const auto& entry : std::filesystem::directory_iterator(presetsDir)) {
            if (entry.path().extension() == ".json") {
                std::ifstream file(entry.path());
                json presetJson;
                file >> presetJson;

                PresetInfo info;
                info.filename = entry.path().filename().string();
                info.name = presetJson["name"];
                info.category = presetJson["category"];
                info.parameters = presetJson["parameters"];

                presets.push_back(info);
            }
        }
    }

    // Helper to check if parameter is in range [0, 1]
    bool isParameterInRange(float value) {
        return value >= 0.0f && value <= 1.0f;
    }

    // Helper to convert normalized parameter to actual value
    float normalizeToActual(float normalized, float min, float max) {
        return min + normalized * (max - min);
    }
};

// Test 1: Verify all 20 presets are present
TEST_F(KaneMarcoAetherPresetsTest, PresetCount) {
    EXPECT_EQ(presets.size(), 20) << "Expected exactly 20 factory presets";
}

// Test 2: Verify all required metadata fields are present
TEST_F(KaneMarcoAetherPresetsTest, RequiredMetadataFields) {
    for (const auto& preset : presets) {
        EXPECT_FALSE(preset.name.empty()) << "Preset " << preset.filename << " missing name";
        EXPECT_FALSE(preset.category.empty()) << "Preset " << preset.filename << " missing category";
    }
}

// Test 3: Verify all required parameters are present
TEST_F(KaneMarcoAetherPresetsTest, RequiredParametersPresent) {
    std::vector<std::string> requiredParams = {
        "exciter_noise_color", "exciter_gain", "exciter_attack",
        "exciter_decay", "exciter_sustain", "exciter_release",
        "resonator_mode_count", "resonator_brightness", "resonator_decay",
        "feedback_amount", "feedback_delay_time", "feedback_saturation", "feedback_mix",
        "filter_cutoff", "filter_resonance",
        "amp_attack", "amp_decay", "amp_sustain", "amp_release"
    };

    for (const auto& preset : presets) {
        for (const auto& param : requiredParams) {
            EXPECT_TRUE(preset.parameters.contains(param))
                << "Preset " << preset.filename << " missing parameter: " << param;
        }
    }
}

// Test 4: Verify all normalized parameters are in range [0, 1]
TEST_F(KaneMarcoAetherPresetsTest, ParameterRanges) {
    for (const auto& preset : presets) {
        // Exciter parameters
        EXPECT_TRUE(isParameterInRange(preset.parameters["exciter_noise_color"]))
            << preset.filename << ": exciter_noise_color out of range";
        EXPECT_TRUE(isParameterInRange(preset.parameters["exciter_gain"]))
            << preset.filename << ": exciter_gain out of range";

        // Resonator parameters
        EXPECT_TRUE(isParameterInRange(preset.parameters["resonator_brightness"]))
            << preset.filename << ": resonator_brightness out of range";
        EXPECT_TRUE(isParameterInRange(preset.parameters["resonator_decay"]))
            << preset.filename << ": resonator_decay out of range";

        // Feedback parameters
        EXPECT_TRUE(isParameterInRange(preset.parameters["feedback_amount"]))
            << preset.filename << ": feedback_amount out of range";
        // feedback_saturation ranges from 1.0 to 10.0 (saturation multiplier)
        float saturation = preset.parameters["feedback_saturation"];
        EXPECT_GE(saturation, 1.0f)
            << preset.filename << ": feedback_saturation too low (less than 1.0)";
        EXPECT_LE(saturation, 10.0f)
            << preset.filename << ": feedback_saturation too high (more than 10.0)";
        EXPECT_TRUE(isParameterInRange(preset.parameters["feedback_mix"]))
            << preset.filename << ": feedback_mix out of range";

        // Filter parameters
        EXPECT_TRUE(isParameterInRange(preset.parameters["filter_cutoff"]))
            << preset.filename << ": filter_cutoff out of range";
        EXPECT_TRUE(isParameterInRange(preset.parameters["filter_resonance"]))
            << preset.filename << ": filter_resonance out of range";
    }
}

// Test 5: Verify resonator mode count is reasonable (4-64 modes)
TEST_F(KaneMarcoAetherPresetsTest, ResonatorModeCount) {
    for (const auto& preset : presets) {
        // resonator_mode_count stores actual count (not normalized)
        float modeCount = preset.parameters["resonator_mode_count"];

        EXPECT_GE(modeCount, 4.0f) << preset.filename << ": mode count too low (less than 4)";
        EXPECT_LE(modeCount, 64.0f) << preset.filename << ": mode count too high (more than 64)";
    }
}

// Test 6: Verify categories are valid
TEST_F(KaneMarcoAetherPresetsTest, ValidCategories) {
    std::set<std::string> validCategories = {
        "Ambient", "Cinematic", "Texture", "Drone", "Bell", "Pad"
    };

    for (const auto& preset : presets) {
        EXPECT_TRUE(validCategories.count(preset.category))
            << preset.filename << ": invalid category '" << preset.category << "'";
    }
}

// Test 7: Verify category-specific preset count
TEST_F(KaneMarcoAetherPresetsTest, CategoryCounts) {
    std::map<std::string, int> categoryCounts;

    for (const auto& preset : presets) {
        categoryCounts[preset.category]++;
    }

    EXPECT_EQ(categoryCounts["Ambient"], 5) << "Expected 5 Ambient presets";
    EXPECT_EQ(categoryCounts["Cinematic"], 5) << "Expected 5 Cinematic presets";
    EXPECT_EQ(categoryCounts["Texture"], 4) << "Expected 4 Texture presets";
    EXPECT_EQ(categoryCounts["Drone"], 3) << "Expected 3 Drone presets";
    EXPECT_EQ(categoryCounts["Bell"], 2) << "Expected 2 Bell presets";
    EXPECT_EQ(categoryCounts["Pad"], 1) << "Expected 1 Pad preset";
}

// Test 8: Verify preset filenames are numbered correctly
TEST_F(KaneMarcoAetherPresetsTest, FilenameNumbering) {
    std::set<int> numbers;

    for (const auto& preset : presets) {
        // Extract number from filename (e.g., "01_Ethereal_Atmosphere.json" -> 1)
        std::string numStr = preset.filename.substr(0, 2);
        int num = std::stoi(numStr);
        numbers.insert(num);
    }

    EXPECT_EQ(numbers.size(), 20) << "Duplicate or missing preset numbers";
    EXPECT_EQ(*numbers.begin(), 1) << "Preset numbering should start at 1";
    EXPECT_EQ(*numbers.rbegin(), 20) << "Preset numbering should end at 20";
}

// Test 9: Verify version field is present
TEST_F(KaneMarcoAetherPresetsTest, VersionField) {
    for (const auto& preset : presets) {
        // Re-load JSON to check version field
        std::ifstream file(presetsDir / preset.filename);
        json presetJson;
        file >> presetJson;

        EXPECT_TRUE(presetJson.contains("version"))
            << preset.filename << ": missing version field";
        EXPECT_FALSE(presetJson["version"].empty())
            << preset.filename << ": version field is empty";
    }
}

// Test 10: Verify specific preset characteristics
TEST_F(KaneMarcoAetherPresetsTest, PresetCharacteristics) {
    for (const auto& preset : presets) {
        // Ambient presets should have longer releases
        if (preset.category == "Ambient") {
            float release = preset.parameters["amp_release"];
            EXPECT_GE(release, 1.0f)
                << preset.filename << ": Ambient presets should have release >= 1.0s";
        }

        // Texture presets should have faster attacks
        if (preset.category == "Texture") {
            float attack = preset.parameters["amp_attack"];
            EXPECT_LE(attack, 0.5f)
                << preset.filename << ": Texture presets should have fast attack <= 0.5s";
        }

        // Drone presets should have continuous sustain
        if (preset.category == "Drone") {
            float sustain = preset.parameters["amp_sustain"];
            EXPECT_GT(sustain, 0.9f)
                << preset.filename << ": Drone presets should have high sustain > 0.9";
        }

        // Bell presets should have fast attacks and long decays
        if (preset.category == "Bell") {
            float attack = preset.parameters["amp_attack"];
            float decay = preset.parameters["amp_decay"];
            EXPECT_LT(attack, 0.05f)
                << preset.filename << ": Bell presets should have very fast attack";
            EXPECT_GT(decay, 0.2f)
                << preset.filename << ": Bell presets should have long decay";
        }
    }
}

// Test 11: Verify exciter envelope parameters are sensible
TEST_F(KaneMarcoAetherPresetsTest, ExciterEnvelopeSanity) {
    for (const auto& preset : presets) {
        float attack = preset.parameters["exciter_attack"];
        float decay = preset.parameters["exciter_decay"];
        float sustain = preset.parameters["exciter_sustain"];
        float release = preset.parameters["exciter_release"];

        // Release should generally be longest or equal longest
        EXPECT_GT(release, 0.0f)
            << preset.filename << ": Release should be positive";

        // Attack shouldn't be longer than decay + sustain in most cases
        // (This is a soft check, allowing exceptions)
        if (preset.category != "Drone" && preset.category != "Texture") {
            EXPECT_LT(attack, 2.0f)
                << preset.filename << ": Attack unusually long for non-drone/texture";
        }
    }
}

// Test 12: Verify feedback delay times are in reasonable range
TEST_F(KaneMarcoAetherPresetsTest, FeedbackDelayRange) {
    for (const auto& preset : presets) {
        float delayTimeNorm = preset.parameters["feedback_delay_time"];
        // Delay time range: 1ms to 200ms
        float delayTimeMs = normalizeToActual(delayTimeNorm, 0.001f, 0.2f);

        EXPECT_GE(delayTimeMs, 0.001f)
            << preset.filename << ": Delay time too short (less than 1ms)";
        EXPECT_LE(delayTimeMs, 0.2f)
            << preset.filename << ": Delay time too long (more than 200ms)";
    }
}

// Test 13: Verify preset descriptions are present and meaningful
TEST_F(KaneMarcoAetherPresetsTest, PresetDescriptions) {
    for (const auto& preset : presets) {
        // Re-load JSON to check description field
        std::ifstream file(presetsDir / preset.filename);
        json presetJson;
        file >> presetJson;

        EXPECT_TRUE(presetJson.contains("description"))
            << preset.filename << ": missing description field";

        std::string description = presetJson["description"];
        EXPECT_GT(description.length(), 20)
            << preset.filename << ": description too short (should be > 20 chars)";
    }
}

// Test 14: Verify tags are present
TEST_F(KaneMarcoAetherPresetsTest, PresetTags) {
    for (const auto& preset : presets) {
        // Re-load JSON to check tags field
        std::ifstream file(presetsDir / preset.filename);
        json presetJson;
        file >> presetJson;

        EXPECT_TRUE(presetJson.contains("tags"))
            << preset.filename << ": missing tags field";

        EXPECT_TRUE(presetJson["tags"].is_array())
            << preset.filename << ": tags should be an array";

        EXPECT_GT(presetJson["tags"].size(), 0)
            << preset.filename << ": should have at least one tag";
    }
}

} // namespace KaneMarcoAetherTests
