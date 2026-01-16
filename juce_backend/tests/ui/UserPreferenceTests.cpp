#include "UITestSuite.cpp"
#include <gtest/gtest.h>
#include <memory>
#include <filesystem>
#include <fstream>

using namespace UITestFramework;
using namespace UITestFramework::Mock;

/**
 * @brief Comprehensive user preference testing
 */
class UserPreferenceTest : public UITestFixture
{
protected:
    void SetUp() override
    {
        UITestFixture::SetUp();

        // Initialize preference system
        preferencesManager = std::make_unique<PreferencesManager>();
        userPreferenceEngine = std::make_unique<UserPreferenceEngine>(preferencesManager.get());

        // Set up test preferences file
        preferencesFile = tempDirectory.getChildFile("test_preferences.json");
        preferencesManager->setStorageFile(preferencesFile);
    }

    void TearDown() override
    {
        preferencesManager.reset();
        userPreferenceEngine.reset();

        if (preferencesFile.existsAsFile())
        {
            preferencesFile.deleteFile();
        }

        UITestFixture::TearDown();
    }

    void createTestPreferences()
    {
        // UI Preferences
        userPreferenceEngine->setPreference("ui.theme", "dark");
        userPreferenceEngine->setPreference("ui.fontSize", 14.0);
        userPreferenceEngine->setPreference("ui.language", "en");
        userPreferenceEngine->setPreference("ui.animationsEnabled", true);
        userPreferenceEngine->setPreference("ui.highContrastMode", false);

        // Audio Preferences
        userPreferenceEngine->setPreference("audio.sampleRate", 44100);
        userPreferenceEngine->setPreference("audio.bufferSize", 256);
        userPreferenceEngine->setPreference("audio.inputDevice", "Default");
        userPreferenceEngine->setPreference("audio.outputDevice", "Default");
        userPreferenceEngine->setPreference("audio.midiInputEnabled", true);

        // Workspace Preferences
        userPreferenceEngine->setPreference("workspace.autoSave", true);
        userPreferenceEngine->setPreference("workspace.autoSaveInterval", 300);
        userPreferenceEngine->setPreference("workspace.recentFiles", std::vector<juce::String>{"file1.wav", "file2.wav"});
        userPreferenceEngine->setPreference("workspace.defaultProjectPath", "/Users/test/projects");

        // Accessibility Preferences
        userPreferenceEngine->setPreference("accessibility.screenReaderEnabled", false);
        userPreferenceEngine->setPreference("accessibility.highContrast", false);
        userPreferenceEngine->setPreference("accessibility.largeText", false);
        userPreferenceEngine->setPreference("accessibility.keyboardNavigation", true);

        // Performance Preferences
        userPreferenceEngine->setPreference("performance.maxUndoLevels", 50);
        userPreferenceEngine->setPreference("performance.garbageCollectionInterval", 60000);
        userPreferenceEngine->setPreference("performance.memoryLimitMB", 1024);
    }

    void verifyPreferenceDefaults()
    {
        // Verify default values are set correctly
        EXPECT_EQ(userPreferenceEngine->getPreference("ui.theme", "light").toString(), "dark");
        EXPECT_DOUBLE_EQ(userPreferenceEngine->getPreference("ui.fontSize", 12.0), 14.0);
        EXPECT_EQ(userPreferenceEngine->getPreference("ui.language", "en").toString(), "en");
        EXPECT_TRUE(userPreferenceEngine->getPreference("ui.animationsEnabled", true));
        EXPECT_FALSE(userPreferenceEngine->getPreference("ui.highContrastMode", false));

        EXPECT_EQ(userPreferenceEngine->getPreference("audio.sampleRate", 48000), 44100);
        EXPECT_EQ(userPreferenceEngine->getPreference("audio.bufferSize", 512), 256);

        EXPECT_TRUE(userPreferenceEngine->getPreference("workspace.autoSave", false));
        EXPECT_EQ(userPreferenceEngine->getPreference("workspace.autoSaveInterval", 600), 300);
    }

    std::unique_ptr<PreferencesManager> preferencesManager;
    std::unique_ptr<UserPreferenceEngine> userPreferenceEngine;
    juce::File preferencesFile;
};

/**
 * @brief Test preference manager initialization
 */
TEST_F(UserPreferenceTest, InitializePreferences)
{
    ASSERT_NE(preferencesManager, nullptr);
    ASSERT_NE(userPreferenceEngine, nullptr);
    EXPECT_TRUE(preferencesManager->isInitialized());
    EXPECT_TRUE(userPreferenceEngine->isInitialized());
}

/**
 * @brief Test setting and getting preferences
 */
TEST_F(UserPreferenceTest, SetGetPreferences)
{
    // Test setting different types of preferences
    userPreferenceEngine->setPreference("test.string", "test_value");
    userPreferenceEngine->setPreference("test.integer", 42);
    userPreferenceEngine->setPreference("test.double", 3.14159);
    userPreferenceEngine->setPreference("test.boolean", true);
    userPreferenceEngine->setPreference("test.array", std::vector<int>{1, 2, 3});

    // Test getting preferences
    EXPECT_EQ(userPreferenceEngine->getPreference("test.string").toString(), "test_value");
    EXPECT_EQ(userPreferenceEngine->getPreference("test.integer"), 42);
    EXPECT_DOUBLE_EQ(userPreferenceEngine->getPreference("test.double"), 3.14159);
    EXPECT_TRUE(userPreferenceEngine->getPreference("test.boolean"));

    auto arrayValue = userPreferenceEngine->getPreference("test.array");
    EXPECT_TRUE(arrayValue.isArray());

    // Test preference existence
    EXPECT_TRUE(userPreferenceEngine->hasPreference("test.string"));
    EXPECT_FALSE(userPreferenceEngine->hasPreference("nonexistent.preference"));
}

/**
 * @brief Test preference default values
 */
TEST_F(UserPreferenceTest, DefaultValues)
{
    // Test getting preferences with defaults when not set
    EXPECT_EQ(userPreferenceEngine->getPreference("nonexistent.string", "default").toString(), "default");
    EXPECT_EQ(userPreferenceEngine->getPreference("nonexistent.int", 99), 99);
    EXPECT_DOUBLE_EQ(userPreferenceEngine->getPreference("nonexistent.double", 2.71828), 2.71828);
    EXPECT_FALSE(userPreferenceEngine->getPreference("nonexistent.bool", false));
}

/**
 * @brief Test preference persistence
 */
TEST_F(UserPreferenceTest, PreferencePersistence)
{
    createTestPreferences();

    // Save preferences
    EXPECT_TRUE(userPreferenceEngine->savePreferences());
    EXPECT_TRUE(preferencesFile.existsAsFile());

    // Create new preference engine instance and load
    auto newManager = std::make_unique<PreferencesManager>();
    auto newEngine = std::make_unique<UserPreferenceEngine>(newManager.get());
    newManager->setStorageFile(preferencesFile);

    EXPECT_TRUE(newEngine->loadPreferences());

    // Verify loaded preferences match saved preferences
    verifyPreferenceDefaults();

    // Cleanup
    newEngine.reset();
    newManager.reset();
}

/**
 * @brief Test preference validation
 */
TEST_F(UserPreferenceTest, PreferenceValidation)
{
    // Test validation rules
    auto validationRules = std::make_unique<PreferenceValidationRules>();

    // Add validation rules
    validationRules->addRule("ui.fontSize", [](const juce::var& value) -> bool {
        if (!value.isDouble()) return false;
        double size = static_cast<double>(value);
        return size >= 8.0 && size <= 72.0;
    });

    validationRules->addRule("audio.sampleRate", [](const juce::var& value) -> bool {
        if (!value.isInt()) return false;
        int rate = static_cast<int>(value);
        return rate == 44100 || rate == 48000 || rate == 96000;
    });

    userPreferenceEngine->setValidationRules(validationRules.get());

    // Test valid preferences
    EXPECT_TRUE(userPreferenceEngine->setPreference("ui.fontSize", 14.0));
    EXPECT_TRUE(userPreferenceEngine->setPreference("audio.sampleRate", 44100));

    // Test invalid preferences
    EXPECT_FALSE(userPreferenceEngine->setPreference("ui.fontSize", 100.0)); // Too large
    EXPECT_FALSE(userPreferenceEngine->setPreference("ui.fontSize", 5.0));   // Too small
    EXPECT_FALSE(userPreferenceEngine->setPreference("audio.sampleRate", 22050)); // Invalid rate
}

/**
 * @brief Test preference categories
 */
TEST_F(UserPreferenceTest, PreferenceCategories)
{
    createTestPreferences();

    // Test getting preferences by category
    auto uiPrefs = userPreferenceEngine->getPreferencesInCategory("ui");
    EXPECT_GT(uiPrefs.size(), 0);
    EXPECT_TRUE(uiPrefs.contains("ui.theme"));
    EXPECT_TRUE(uiPrefs.contains("ui.fontSize"));

    auto audioPrefs = userPreferenceEngine->getPreferencesInCategory("audio");
    EXPECT_GT(audioPrefs.size(), 0);
    EXPECT_TRUE(audioPrefs.contains("audio.sampleRate"));
    EXPECT_TRUE(audioPrefs.contains("audio.bufferSize"));

    auto workspacePrefs = userPreferenceEngine->getPreferencesInCategory("workspace");
    EXPECT_GT(workspacePrefs.size(), 0);
    EXPECT_TRUE(workspacePrefs.contains("workspace.autoSave"));

    // Test non-existent category
    auto nonexistentPrefs = userPreferenceEngine->getPreferencesInCategory("nonexistent");
    EXPECT_EQ(nonexistentPrefs.size(), 0);
}

/**
 * @brief Test preference change notifications
 */
TEST_F(UserPreferenceTest, ChangeNotifications)
{
    bool notificationReceived = false;
    juce::String changedKey;
    juce::var oldValue, newValue;

    // Register change listener
    userPreferenceEngine->addChangeListener([&](const juce::String& key, const juce::var& oldVal, const juce::var& newVal) {
        notificationReceived = true;
        changedKey = key;
        oldValue = oldVal;
        newValue = newVal;
    });

    // Change a preference
    userPreferenceEngine->setPreference("test.preference", "initial_value");
    userPreferenceEngine->setPreference("test.preference", "changed_value");

    // Verify notification was received
    EXPECT_TRUE(notificationReceived);
    EXPECT_EQ(changedKey, "test.preference");
    EXPECT_EQ(oldValue.toString(), "initial_value");
    EXPECT_EQ(newValue.toString(), "changed_value");

    // Test removing listener
    notificationReceived = false;
    userPreferenceEngine->removeChangeListener([](const juce::String&, const juce::var&, const juce::var&) {});

    userPreferenceEngine->setPreference("test.preference", "another_change");
    EXPECT_FALSE(notificationReceived); // Listener was removed
}

/**
 * @brief Test preference import/export
 */
TEST_F(UserPreferenceTest, ImportExport)
{
    createTestPreferences();

    // Export preferences
    juce::File exportFile = tempDirectory.getChildFile("exported_preferences.json");
    EXPECT_TRUE(userPreferenceEngine->exportPreferences(exportFile));
    EXPECT_TRUE(exportFile.existsAsFile());

    // Clear current preferences
    userPreferenceEngine->clearAllPreferences();
    EXPECT_FALSE(userPreferenceEngine->hasPreference("ui.theme"));

    // Import preferences
    EXPECT_TRUE(userPreferenceEngine->importPreferences(exportFile));

    // Verify imported preferences
    verifyPreferenceDefaults();

    // Cleanup
    exportFile.deleteFile();
}

/**
 * @brief Test preference reset functionality
 */
TEST_F(UserPreferenceTest, PreferenceReset)
{
    createTestPreferences();

    // Modify some preferences
    userPreferenceEngine->setPreference("ui.theme", "light");
    userPreferenceEngine->setPreference("audio.sampleRate", 48000);

    // Reset specific preference
    userPreferenceEngine->resetPreference("ui.theme");
    EXPECT_EQ(userPreferenceEngine->getPreference("ui.theme", "dark").toString(), "dark"); // Should be default

    // Reset category
    userPreferenceEngine->resetCategory("audio");
    EXPECT_EQ(userPreferenceEngine->getPreference("audio.sampleRate", 48000), 48000); // Should be default

    // Reset all preferences
    userPreferenceEngine->resetAllPreferences();
    EXPECT_FALSE(userPreferenceEngine->hasPreference("ui.theme"));
    EXPECT_FALSE(userPreferenceEngine->hasPreference("audio.sampleRate"));
}

/**
 * @brief Test preference migration
 */
TEST_F(UserPreferenceTest, PreferenceMigration)
{
    // Create old format preferences
    auto oldPrefs = std::make_unique<PreferencesManager>();
    auto oldEngine = std::make_unique<UserPreferenceEngine>(oldPrefs.get());
    juce::File oldPrefsFile = tempDirectory.getChildFile("old_preferences.json");
    oldManager->setStorageFile(oldPrefsFile);

    // Set old format preferences
    oldEngine->setPreference("theme", "dark");
    oldEngine->setPreference("fontSize", 14.0);
    oldEngine->setPreference("autosave", true);
    oldEngine->savePreferences();

    // Migrate to new format
    auto migrationRules = std::make_unique<PreferenceMigrationRules>();
    migrationRules->addMigration("theme", "ui.theme");
    migrationRules->addMigration("fontSize", "ui.fontSize");
    migrationRules->addMigration("autosave", "workspace.autoSave");

    EXPECT_TRUE(userPreferenceEngine->migratePreferences(oldPrefsFile, migrationRules.get()));

    // Verify migrated preferences
    EXPECT_EQ(userPreferenceEngine->getPreference("ui.theme").toString(), "dark");
    EXPECT_DOUBLE_EQ(userPreferenceEngine->getPreference("ui.fontSize"), 14.0);
    EXPECT_TRUE(userPreferenceEngine->getPreference("workspace.autoSave"));

    // Cleanup
    oldPrefsFile.deleteFile();
}

/**
 * @brief Test preference encryption
 */
TEST_F(UserPreferenceTest, PreferenceEncryption)
{
    // Enable encryption for sensitive preferences
    userPreferenceEngine->setEncryptionEnabled(true);
    userPreferenceEngine->addEncryptedPreference("security.password");
    userPreferenceEngine->addEncryptedPreference("security.apiKey");

    // Set encrypted preferences
    userPreferenceEngine->setPreference("security.password", "secret123");
    userPreferenceEngine->setPreference("security.apiKey", "abc123xyz789");

    // Save preferences (should encrypt sensitive data)
    EXPECT_TRUE(userPreferenceEngine->savePreferences());

    // Read the raw file to verify encryption
    std::string fileContent;
    std::ifstream file(preferencesFile.getFullPathName().toStdString());
    std::getline(file, fileContent);
    file.close();

    // Encrypted values should not appear as plain text
    EXPECT_EQ(fileContent.find("secret123"), std::string::npos);
    EXPECT_EQ(fileContent.find("abc123xyz789"), std::string::npos);

    // Load and decrypt
    auto newEngine = std::make_unique<UserPreferenceEngine>(preferencesManager.get());
    newEngine->setEncryptionEnabled(true);
    EXPECT_TRUE(newEngine->loadPreferences());

    // Verify decrypted values
    EXPECT_EQ(newEngine->getPreference("security.password").toString(), "secret123");
    EXPECT_EQ(newEngine->getPreference("security.apiKey").toString(), "abc123xyz789");
}

/**
 * @brief Test preference performance
 */
TEST_F(UserPreferenceTest, Performance)
{
    createTestPreferences();

    // Test large number of preference operations
    startPerformanceMeasurement();

    for (int i = 0; i < 1000; ++i)
    {
        juce::String key = "perf_test.pref_" + juce::String(i);
        juce::var value = i % 2 == 0 ? juce::var("string_" + juce::String(i)) : juce::var(i);

        userPreferenceEngine->setPreference(key, value);
        juce::var retrieved = userPreferenceEngine->getPreference(key);
        EXPECT_EQ(retrieved, value);
    }

    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 1000.0); // Should complete within 1 second

    // Test save/load performance
    startPerformanceMeasurement();
    EXPECT_TRUE(userPreferenceEngine->savePreferences());
    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 500.0); // Should save within 500ms

    startPerformanceMeasurement();
    EXPECT_TRUE(userPreferenceEngine->loadPreferences());
    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 500.0); // Should load within 500ms
}

/**
 * @brief Test preference memory management
 */
TEST_F(UserPreferenceTest, MemoryManagement)
{
    MemoryUsage baseline = TestUtils::getMemoryUsage();

    // Create many preferences
    for (int i = 0; i < 10000; ++i)
    {
        juce::String key = "memory_test.pref_" + juce::String(i);
        juce::var value = std::vector<juce::String>{
            "value1_" + juce::String(i),
            "value2_" + juce::String(i),
            "value3_" + juce::String(i)
        };
        userPreferenceEngine->setPreference(key, value);
    }

    MemoryUsage afterCreation = TestUtils::getMemoryUsage();

    // Clear preferences
    userPreferenceEngine->clearAllPreferences();
    MemoryUsage afterCleanup = TestUtils::getMemoryUsage();

    // Memory should be cleaned up
    EXPECT_LT(afterCleanup.usageDeltaBytes, afterCreation.usageDeltaBytes);
    EXPECT_LT(afterCleanup.usageDeltaBytes, 50 * 1024 * 1024); // Less than 50MB overhead
}

/**
 * @brief Test preference thread safety
 */
TEST_F(UserPreferenceTest, ThreadSafety)
{
    const int numThreads = 4;
    const int operationsPerThread = 100;
    std::vector<std::thread> threads;
    std::atomic<int> successCount{0};

    for (int t = 0; t < numThreads; ++t)
    {
        threads.emplace_back([&, t]() {
            for (int i = 0; i < operationsPerThread; ++i)
            {
                try
                {
                    juce::String key = "thread_test.pref_" + juce::String(t) + "_" + juce::String(i);
                    juce::var value = (t * operationsPerThread) + i;

                    userPreferenceEngine->setPreference(key, value);
                    juce::var retrieved = userPreferenceEngine->getPreference(key);

                    if (retrieved == value)
                    {
                        successCount++;
                    }
                }
                catch (...)
                {
                    // Thread safety violation
                }
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }

    EXPECT_EQ(successCount, numThreads * operationsPerThread);
}

/**
 * @brief Test preference UI integration
 */
TEST_F(UserPreferenceTest, UIIntegration)
{
    createTestPreferences();

    // Create UI components bound to preferences
    auto themeComboBox = std::make_unique<juce::ComboBox>();
    auto fontSizeSlider = std::make_unique<juce::Slider>();
    auto animationsToggle = std::make_unique<juce::ToggleButton>("Enable Animations");

    // Bind UI components to preferences
    userPreferenceEngine->bindComboBox(themeComboBox.get(), "ui.theme", {
        {"light", "Light Theme"},
        {"dark", "Dark Theme"},
        {"auto", "Auto Theme"}
    });

    userPreferenceEngine->bindSlider(fontSizeSlider.get(), "ui.fontSize", 8.0, 72.0, 1.0);
    userPreferenceEngine->bindToggleButton(animationsToggle.get(), "ui.animationsEnabled");

    // Verify initial UI state reflects preferences
    EXPECT_EQ(themeComboBox->getSelectedId(), 2); // "dark" theme
    EXPECT_DOUBLE_EQ(fontSizeSlider->getValue(), 14.0);
    EXPECT_TRUE(animationsToggle->getToggleState());

    // Test UI changes update preferences
    themeComboBox->setSelectedId(1); // "light" theme
    processUIEvents(50);
    EXPECT_EQ(userPreferenceEngine->getPreference("ui.theme").toString(), "light");

    fontSizeSlider->setValue(16.0);
    processUIEvents(50);
    EXPECT_DOUBLE_EQ(userPreferenceEngine->getPreference("ui.fontSize"), 16.0);

    animationsToggle->setToggleState(false, juce::dontSendNotification);
    processUIEvents(50);
    EXPECT_FALSE(userPreferenceEngine->getPreference("ui.animationsEnabled"));

    // Test preference changes update UI
    userPreferenceEngine->setPreference("ui.theme", "auto");
    processUIEvents(50);
    EXPECT_EQ(themeComboBox->getSelectedId(), 3); // "auto" theme

    userPreferenceEngine->setPreference("ui.fontSize", 12.0);
    processUIEvents(50);
    EXPECT_DOUBLE_EQ(fontSizeSlider->getValue(), 12.0);
}

/**
 * @brief Test preference backup and restore
 */
TEST_F(UserPreferenceTest, BackupRestore)
{
    createTestPreferences();

    // Create backup
    juce::File backupFile = tempDirectory.getChildFile("preferences_backup.json");
    EXPECT_TRUE(userPreferenceEngine->createBackup(backupFile));
    EXPECT_TRUE(backupFile.existsAsFile());

    // Modify preferences
    userPreferenceEngine->setPreference("ui.theme", "light");
    userPreferenceEngine->setPreference("audio.sampleRate", 48000);

    // Restore from backup
    EXPECT_TRUE(userPreferenceEngine->restoreFromBackup(backupFile));

    // Verify restored preferences
    verifyPreferenceDefaults();

    // Cleanup
    backupFile.deleteFile();
}

/**
 * @brief Test preference schema validation
 */
TEST_F(UserPreferenceTest, SchemaValidation)
{
    // Define preference schema
    juce::var schema = juce::JSON::parse(R"({
        "type": "object",
        "properties": {
            "ui": {
                "type": "object",
                "properties": {
                    "theme": {"type": "string", "enum": ["light", "dark", "auto"]},
                    "fontSize": {"type": "number", "minimum": 8, "maximum": 72},
                    "animationsEnabled": {"type": "boolean"}
                },
                "required": ["theme", "fontSize"]
            },
            "audio": {
                "type": "object",
                "properties": {
                    "sampleRate": {"type": "integer", "enum": [44100, 48000, 96000]},
                    "bufferSize": {"type": "integer", "minimum": 64, "maximum": 2048}
                }
            }
        },
        "required": ["ui"]
    })");

    userPreferenceEngine->setSchema(schema);

    // Test valid preferences
    EXPECT_TRUE(userPreferenceEngine->setPreference("ui.theme", "dark"));
    EXPECT_TRUE(userPreferenceEngine->setPreference("ui.fontSize", 14.0));
    EXPECT_TRUE(userPreferenceEngine->setPreference("ui.animationsEnabled", true));
    EXPECT_TRUE(userPreferenceEngine->setPreference("audio.sampleRate", 44100));

    // Test invalid preferences
    EXPECT_FALSE(userPreferenceEngine->setPreference("ui.theme", "invalid"));
    EXPECT_FALSE(userPreferenceEngine->setPreference("ui.fontSize", 100.0)); // Too large
    EXPECT_FALSE(userPreferenceEngine->setPreference("audio.sampleRate", 22050)); // Not in enum

    // Test missing required preferences
    auto validationResult = userPreferenceEngine->validateAgainstSchema();
    EXPECT_TRUE(validationResult.isValid);

    userPreferenceEngine->clearPreference("ui.theme");
    validationResult = userPreferenceEngine->validateAgainstSchema();
    EXPECT_FALSE(validationResult.isValid);
    EXPECT_TRUE(validationResult.errors[0].contains("Required property 'ui.theme' missing"));
}

// Run user preference tests
int runUserPreferenceTests(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}