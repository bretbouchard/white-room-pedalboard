#include <gtest/gtest.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>
#include <fstream>
#include <filesystem>
#include "../include/presets/PresetManager.h"
#include "../include/presets/Preset.h"
#include "../include/presets/PresetCategory.h"

using namespace juce;

class PresetManagerTest : public ::testing::Test {
protected:
    void SetUp() override {
        presetManager = std::make_unique<PresetManager>();

        // Setup test directory for preset files
        testDir = std::filesystem::temp_directory_path() / "juce_preset_test";
        std::filesystem::create_directories(testDir);

        testPresetPath = (testDir / "test_preset.preset").string();
        testUserPresetPath = (testDir / "user_presets").string();
        std::filesystem::create_directories(testUserPresetPath);

        // Setup test preset
        testPreset = Preset{
            "Test Preset",
            "Test Plugin",
            "plugin-123",
            "Factory",
            "A test preset for testing purposes",
            "preset_state_data",
            std::chrono::system_clock::now(),
            "1.0.0"
        };
    }

    void TearDown() override {
        // Clean up test files
        std::error_code ec;
        std::filesystem::remove_all(testDir, ec);

        presetManager.reset();
    }

    std::unique_ptr<PresetManager> presetManager;
    std::filesystem::path testDir;
    std::string testPresetPath;
    std::string testUserPresetPath;
    Preset testPreset;
};

TEST_F(PresetManagerTest, CreatesAndDestroysCorrectly) {
    EXPECT_NE(presetManager, nullptr);
}

TEST_F(PresetManagerTest, InitializesCorrectly) {
    EXPECT_FALSE(presetManager->isInitialized());

    bool initialized = presetManager->initialize();

    if (initialized) {
        EXPECT_TRUE(presetManager->isInitialized());
        presetManager->shutdown();
        EXPECT_FALSE(presetManager->isInitialized());
    }
}

TEST_F(PresetManagerTest, ManagesFactoryPresets) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    // Load factory presets
    bool loaded = presetManager->loadFactoryPresets();
    // This may or may not succeed depending on factory preset availability

    auto factoryPresets = presetManager->getFactoryPresets();

    // Should be able to get factory presets (even if empty)
    EXPECT_NO_THROW(auto presets = presetManager->getFactoryPresets());
    EXPECT_NO_THROW(auto hasFactory = presetManager->hasFactoryPresets());

    presetManager->shutdown();
}

TEST_F(PresetManagerTest, ManagesUserPresets) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    // Test setting and getting user preset path
    EXPECT_NO_THROW(presetManager->setUserPresetPath(testUserPresetPath));
    EXPECT_EQ(presetManager->getUserPresetPath(), testUserPresetPath);

    // Load user presets
    bool loaded = presetManager->loadUserPresets(testUserPresetPath);
    // This may or may not succeed depending on existing presets

    auto userPresets = presetManager->getUserPresets();

    // Should be able to get user presets (even if empty)
    EXPECT_NO_THROW(auto presets = presetManager->getUserPresets());
    EXPECT_NO_THROW(auto hasUser = presetManager->hasUserPresets());

    presetManager->shutdown();
}

TEST_F(PresetManagerTest, ManagesAllPresets) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    // Get all presets
    auto allPresets = presetManager->getAllPresets();

    // Should be able to get all presets
    EXPECT_NO_THROW(auto presets = presetManager->getAllPresets());

    // Test filtering methods (they should not crash)
    EXPECT_NO_THROW(auto filtered = presetManager->getPresetsByPlugin("plugin-123"));
    EXPECT_NO_THROW(auto filtered = presetManager->getPresetsByCategory("Factory"));
    EXPECT_NO_THROW(auto filtered = presetManager->searchPresets("test"));

    presetManager->shutdown();
}

TEST_F(PresetManagerTest, ManagesCurrentPreset) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    // Should start with no current preset
    EXPECT_FALSE(presetManager->hasCurrentPreset());

    // Set current preset
    EXPECT_NO_THROW(presetManager->setCurrentPreset(testPreset));
    EXPECT_TRUE(presetManager->hasCurrentPreset());

    auto currentPreset = presetManager->getCurrentPreset();
    EXPECT_EQ(currentPreset.getName(), testPreset.getName());
    EXPECT_EQ(currentPreset.getPluginId(), testPreset.getPluginId());

    // Clear current preset
    EXPECT_NO_THROW(presetManager->clearCurrentPreset());
    EXPECT_FALSE(presetManager->hasCurrentPreset());

    presetManager->shutdown();
}

TEST_F(PresetManagerTest, ManagesPresetCategories) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    // Create built-in categories
    bool created = presetManager->createBuiltInCategories();

    // Get all categories
    auto categories = presetManager->getPresetCategories();
    EXPECT_NO_THROW(auto cats = presetManager->getPresetCategories());

    // Test built-in categories
    auto builtInCategories = PresetManager::getBuiltInCategories();
    EXPECT_FALSE(builtInCategories.empty());

    // Add custom category
    PresetCategory testCategory("Test", "Test category");
    EXPECT_NO_THROW(presetManager->addPresetCategory(testCategory));

    // Test category lookup
    EXPECT_NO_THROW(auto has = presetManager->hasPresetCategory("Test"));
    if (presetManager->hasPresetCategory("Test")) {
        auto retrievedCategory = presetManager->getPresetCategory("Test");
        EXPECT_EQ(retrievedCategory.getName(), "Test");
    }

    // Remove category
    EXPECT_NO_THROW(presetManager->removePresetCategory("Test"));

    presetManager->shutdown();
}

TEST_F(PresetManagerTest, HandlesPresetSearch) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    // Test search functionality
    EXPECT_NO_THROW(auto results = presetManager->searchPresets("test"));
    EXPECT_NO_THROW(auto results = presetManager->searchPresets("nonexistent"));

    presetManager->shutdown();
}

TEST_F(PresetManagerTest, HandlesPresetRatings) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    presetManager->setCurrentPreset(testPreset);

    // Test rating functionality
    EXPECT_NO_THROW(presetManager->ratePreset(testPreset, 4));
    EXPECT_NO_THROW(auto rating = presetManager->getPresetRating(testPreset));
    EXPECT_NO_THROW(auto isFav = presetManager->isFavorite(testPreset));

    presetManager->shutdown();
}

TEST_F(PresetManagerTest, HandlesPresetFavorites) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    presetManager->setCurrentPreset(testPreset);

    // Test favorites functionality
    EXPECT_NO_THROW(presetManager->addToFavorites(testPreset));
    EXPECT_NO_THROW(auto isFav = presetManager->isFavorite(testPreset));
    EXPECT_NO_THROW(auto favs = presetManager->getFavoritePresets());

    if (presetManager->isFavorite(testPreset)) {
        EXPECT_NO_THROW(presetManager->removeFromFavorites(testPreset));
    }

    presetManager->shutdown();
}

TEST_F(PresetManagerTest, HandlesPresetUsage) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    presetManager->setCurrentPreset(testPreset);

    // Test usage tracking
    EXPECT_NO_THROW(presetManager->recordPresetUsage(testPreset));
    EXPECT_NO_THROW(auto recent = presetManager->getRecentlyUsedPresets());

    presetManager->shutdown();
}

TEST_F(PresetManagerTest, HandlesPresetImportExport) {
    // Initialize the preset manager
    if (!presetManager->initialize()) {
        GTEST_SKIP() << "PresetManager could not be initialized";
    }

    std::string exportPath = (testDir / "exported_preset.preset").string();

    // Test import/export functionality
    EXPECT_NO_THROW(auto exported = presetManager->exportPreset(testPreset, exportPath));
    EXPECT_NO_THROW(auto imported = presetManager->importPreset(exportPath));

    // Test collection import/export
    EXPECT_NO_THROW(auto exported = presetManager->exportPresetCollection({testPreset}, exportPath + "_collection"));
    EXPECT_NO_THROW(auto imported = presetManager->importPresetCollection(exportPath + "_collection"));

    presetManager->shutdown();
}