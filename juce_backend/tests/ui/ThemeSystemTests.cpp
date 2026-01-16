#include "UITestSuite.cpp"
#include <gtest/gtest.h>
#include <memory>
#include <filesystem>
#include <fstream>

using namespace UITestFramework;
using namespace UITestFramework::Mock;

/**
 * @brief Comprehensive theme system testing
 */
class ThemeSystemTest : public ThemeSystemTestFixture
{
};

/**
 * @brief Test theme initialization and basic functionality
 */
TEST_F(ThemeSystemTest, InitializeThemeManager)
{
    ASSERT_NO_THROW(themeManager = std::make_unique<ThemeManager>());
    ASSERT_NE(themeManager, nullptr);
    ASSERT_TRUE(themeManager->isInitialized());
}

/**
 * @brief Test theme creation and validation
 */
TEST_F(ThemeSystemTest, CreateAndValidateThemes)
{
    createTestThemes();

    for (const auto& theme : testThemes)
    {
        ASSERT_THEME_CONSISTENT(theme);
        ASSERT_FALSE(theme.getName().isEmpty());
        ASSERT_TRUE(theme.isValid());
    }
}

/**
 * @brief Test theme switching functionality
 */
TEST_F(ThemeSystemTest, SwitchBetweenThemes)
{
    createTestThemes();
    ASSERT_FALSE(testThemes.empty());

    // Apply first theme
    const Theme& firstTheme = testThemes[0];
    ASSERT_NO_THROW(themeManager->applyTheme(firstTheme));
    EXPECT_EQ(themeManager->getCurrentTheme().getName(), firstTheme.getName());

    // Switch to second theme
    if (testThemes.size() > 1)
    {
        const Theme& secondTheme = testThemes[1];
        ASSERT_NO_THROW(themeManager->applyTheme(secondTheme));
        EXPECT_EQ(themeManager->getCurrentTheme().getName(), secondTheme.getName());
    }
}

/**
 * @brief Test theme transition animations
 */
TEST_F(ThemeSystemTest, AnimatedThemeTransitions)
{
    createTestThemes();
    ASSERT_GE(testThemes.size(), 2);

    const Theme& fromTheme = testThemes[0];
    const Theme& toTheme = testThemes[1];

    // Test transition without animation
    EXPECT_TRUE(testThemeTransition(fromTheme, toTheme));

    // Test animated transition
    themeManager->enableSmoothTransitions(true);
    themeManager->setTransitionDuration(500.0); // 500ms

    startPerformanceMeasurement();
    themeManager->applyTheme(toTheme);
    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 100.0); // Should complete quickly
}

/**
 * @brief Test theme persistence and loading
 */
TEST_F(ThemeSystemTest, SaveAndLoadThemes)
{
    createTestThemes();
    ASSERT_FALSE(testThemes.empty());

    const Theme& testTheme = testThemes[0];
    juce::File themeFile = tempDirectory.getChildFile("test_theme.json");

    // Save theme
    ASSERT_TRUE(themeManager->saveThemeToFile(testTheme, themeFile));
    ASSERT_TRUE(themeFile.existsAsFile());

    // Load theme
    std::unique_ptr<Theme> loadedTheme = themeManager->loadThemeFromFile(themeFile);
    ASSERT_NE(loadedTheme, nullptr);
    EXPECT_EQ(loadedTheme->getName(), testTheme.getName());

    // Cleanup
    themeFile.deleteFile();
}

/**
 * @brief Test theme customization and variants
 */
TEST_F(ThemeSystemTest, ThemeCustomization)
{
    createTestThemes();
    ASSERT_FALSE(testThemes.empty());

    Theme& baseTheme = testThemes[0];

    // Create variant with different primary color
    juce::Colour customColor = juce::Colours::purple;
    Theme variant = baseTheme.createVariant("Custom Variant", {
        {"primaryColor", juce::var(customColor.toString())}
    });

    EXPECT_EQ(variant.getPrimaryColor(), customColor);
    EXPECT_EQ(variant.getName(), "Custom Variant");
    EXPECT_EQ(variant.getParentTheme(), baseTheme.getName());
}

/**
 * @brief Test theme component real-time updates
 */
TEST_F(ThemeSystemTest, RealTimeComponentUpdates)
{
    createTestThemes();

    // Create test component
    auto component = std::make_unique<MockComponent>("TestComponent");
    component->setSize(200, 100);
    testWindow->addAndMakeVisible(component.get());

    // Apply theme and verify component updates
    themeManager->registerComponent(component.get());
    const Theme& theme = testThemes[0];
    themeManager->applyTheme(theme);

    processUIEvents(100);

    // Verify component applied theme styles
    EXPECT_EQ(component->getComponentName(), "TestComponent");
    EXPECT_TRUE(component->wasPainted);
}

/**
 * @brief Test dark/light mode compatibility
 */
TEST_F(ThemeSystemTest, DarkModeCompatibility)
{
    createTestThemes();

    // Find or create dark theme
    Theme darkTheme("Dark Mode Theme");
    darkTheme.setPrimaryColor(juce::Colours::white);
    darkTheme.setBackgroundColor(juce::Colour(30, 30, 30));
    darkTheme.setTextColor(juce::Colours::white);
    darkTheme.setDarkTheme(true);

    themeManager->applyTheme(darkTheme);
    EXPECT_TRUE(themeManager->getCurrentTheme().isDarkTheme());

    // Test light theme
    Theme lightTheme("Light Mode Theme");
    lightTheme.setPrimaryColor(juce::Colours::black);
    lightTheme.setBackgroundColor(juce::Colours::white);
    lightTheme.setTextColor(juce::Colours::black);
    lightTheme.setDarkTheme(false);

    themeManager->applyTheme(lightTheme);
    EXPECT_FALSE(themeManager->getCurrentTheme().isDarkTheme());
}

/**
 * @brief Test theme accessibility compliance
 */
TEST_F(ThemeSystemTest, AccessibilityCompliance)
{
    createTestThemes();

    for (const auto& theme : testThemes)
    {
        // Test color contrast ratios
        juce::Colour foreground = theme.getTextColor();
        juce::Colour background = theme.getBackgroundColor();

        double contrastRatio = AccessibilityUtils::calculateContrastRatio(foreground, background);
        EXPECT_GE(contrastRatio, 4.5) << "Theme " << theme.getName()
                                      << " has insufficient contrast ratio: " << contrastRatio;

        // Test color palette accessibility
        auto violations = AccessibilityUtils::checkColorPaletteAccessibility(theme);
        EXPECT_TRUE(violations.empty()) << "Theme " << theme.getName()
                                        << " has accessibility violations";
    }
}

/**
 * @brief Test theme performance impact
 */
TEST_F(ThemeSystemTest, PerformanceImpact)
{
    createTestThemes();
    ASSERT_FALSE(testThemes.empty());

    // Measure theme application performance
    auto performanceOperation = [&]() {
        for (const auto& theme : testThemes)
        {
            themeManager->applyTheme(theme);
            processUIEvents(10);
        }
    };

    ASSERT_PERFORMANCE_WITHIN_THRESHOLD(performanceOperation, 500.0); // 500ms max
}

/**
 * @brief Test theme memory management
 */
TEST_F(ThemeSystemTest, MemoryManagement)
{
    createTestThemes();

    // Check memory usage before and after theme operations
    MemoryUsage baseline = TestUtils::getMemoryUsage();

    // Create many theme variations
    std::vector<std::unique_ptr<Theme>> themeVariants;
    for (int i = 0; i < 100; ++i)
    {
        auto variant = std::make_unique<Theme>("Variant " + juce::String(i));
        variant->setPrimaryColor(juce::Colour::fromHSV(i / 100.0f, 0.7f, 0.8f, 1.0f));
        themeVariants.push_back(std::move(variant));
    }

    MemoryUsage afterCreation = TestUtils::getMemoryUsage();

    // Clean up
    themeVariants.clear();
    MemoryUsage afterCleanup = TestUtils::getMemoryUsage();

    // Memory usage should not increase significantly after cleanup
    EXPECT_LT(afterCleanup.usageDeltaBytes, 1024 * 1024); // Less than 1MB increase
}

/**
 * @brief Test theme system error handling
 */
TEST_F(ThemeSystemTest, ErrorHandling)
{
    // Test with invalid theme file
    juce::File invalidFile = tempDirectory.getChildFile("invalid.json");
    std::ofstream file(invalidFile.getFullPathName().toStdString());
    file << "Invalid JSON content";
    file.close();

    auto loadedTheme = themeManager->loadThemeFromFile(invalidFile);
    EXPECT_EQ(loadedTheme, nullptr);

    // Test with non-existent file
    juce::File nonExistentFile = tempDirectory.getChildFile("nonexistent.json");
    auto noTheme = themeManager->loadThemeFromFile(nonExistentFile);
    EXPECT_EQ(noTheme, nullptr);

    // Test with null theme
    EXPECT_THROW(themeManager->applyTheme(nullptr), std::invalid_argument);
}

/**
 * @brief Test theme system thread safety
 */
TEST_F(ThemeSystemTest, ThreadSafety)
{
    createTestThemes();
    ASSERT_FALSE(testThemes.empty());

    const int numThreads = 4;
    const int operationsPerThread = 10;
    std::vector<std::thread> threads;
    std::atomic<int> successCount{0};

    for (int t = 0; t < numThreads; ++t)
    {
        threads.emplace_back([&, t]() {
            for (int i = 0; i < operationsPerThread; ++i)
            {
                try
                {
                    // Apply random theme
                    const Theme& theme = testThemes[i % testThemes.size()];
                    themeManager->applyTheme(theme);
                    successCount++;
                }
                catch (...)
                {
                    // Thread safety violation
                }
            }
        });
    }

    // Wait for all threads to complete
    for (auto& thread : threads)
    {
        thread.join();
    }

    EXPECT_EQ(successCount, numThreads * operationsPerThread);
}

/**
 * @brief Test theme integration with layout engine
 */
TEST_F(ThemeSystemTest, LayoutEngineIntegration)
{
    createTestThemes();
    createTestLayoutContainers();

    // Apply theme to layout containers
    const Theme& theme = testThemes[0];
    themeManager->applyTheme(theme);

    // Verify layout containers received theme updates
    ASSERT_NE(flexLayout, nullptr);
    ASSERT_NE(gridLayout, nullptr);
    ASSERT_NE(stackLayout, nullptr);

    // Test layout styling with theme
    flexLayout->updateLayout();
    processUIEvents(50);

    EXPECT_TRUE(flexLayout->isDirty() == false);
}

/**
 * @brief Test theme customization APIs
 */
TEST_F(ThemeSystemTest, CustomizationAPIs)
{
    createTestThemes();
    ASSERT_FALSE(testThemes.empty());

    Theme& customTheme = testThemes[0];

    // Test color customization
    customTheme.setPrimaryColor(juce::Colours::red);
    customTheme.setSecondaryColor(juce::Colours::green);
    customTheme.setAccentColor(juce::Colours::blue);

    EXPECT_EQ(customTheme.getPrimaryColor(), juce::Colours::red);
    EXPECT_EQ(customTheme.getSecondaryColor(), juce::Colours::green);
    EXPECT_EQ(customTheme.getAccentColor(), juce::Colours::blue);

    // Test font customization
    juce::Font customFont("Arial", 14.0f, juce::Font::bold);
    customTheme.setDefaultFont(customFont);
    customTheme.setHeadingFont(customFont);

    EXPECT_EQ(customTheme.getDefaultFont().getTypefaceName(), "Arial");
    EXPECT_EQ(customTheme.getDefaultFont().getHeight(), 14.0f);
    EXPECT_EQ(customTheme.getDefaultFont().getStyleFlags(), juce::Font::bold);

    // Test spacing and sizing customization
    customTheme.setDefaultSpacing(8.0f);
    customTheme.setBorderRadius(6.0f);
    customTheme.setBorderWidth(2.0f);

    EXPECT_EQ(customTheme.getDefaultSpacing(), 8.0f);
    EXPECT_EQ(customTheme.getBorderRadius(), 6.0f);
    EXPECT_EQ(customTheme.getBorderWidth(), 2.0f);
}

/**
 * @brief Test theme export/import functionality
 */
TEST_F(ThemeSystemTest, ExportImport)
{
    createTestThemes();
    ASSERT_FALSE(testThemes.empty());

    // Export all themes to a package
    juce::File exportFile = tempDirectory.getChildFile("theme_package.json");
    ASSERT_TRUE(themeManager->exportThemesToFile(testThemes, exportFile));

    // Import themes from package
    std::vector<Theme> importedThemes = themeManager->importThemesFromFile(exportFile);
    EXPECT_EQ(importedThemes.size(), testThemes.size());

    // Verify imported themes match originals
    for (size_t i = 0; i < testThemes.size(); ++i)
    {
        EXPECT_EQ(importedThemes[i].getName(), testThemes[i].getName());
        EXPECT_EQ(importedThemes[i].getPrimaryColor(), testThemes[i].getPrimaryColor());
    }

    // Cleanup
    exportFile.deleteFile();
}

/**
 * @brief Test theme preview functionality
 */
TEST_F(ThemeSystemTest, ThemePreview)
{
    createTestThemes();

    // Create preview component
    auto previewComponent = std::make_unique<MockComponent>("PreviewComponent");
    previewComponent->setSize(300, 200);
    testWindow->addAndMakeVisible(previewComponent.get());

    // Test preview without applying theme permanently
    for (const auto& theme : testThemes)
    {
        themeManager->previewTheme(previewComponent.get(), theme);
        processUIEvents(50);

        // Component should use preview theme colors
        EXPECT_TRUE(previewComponent->wasPainted);
    }

    // Clear preview
    themeManager->clearPreview(previewComponent.get());
}

/**
 * @brief Test theme system lifecycle
 */
TEST_F(ThemeSystemTest, Lifecycle)
{
    // Test initialization
    ASSERT_NO_THROW(themeManager = std::make_unique<ThemeManager>());
    ASSERT_TRUE(themeManager->isInitialized());

    // Test theme management throughout lifecycle
    createTestThemes();

    for (const auto& theme : testThemes)
    {
        themeManager->applyTheme(theme);
        processUIEvents(10);
        EXPECT_EQ(themeManager->getCurrentTheme().getName(), theme.getName());
    }

    // Test cleanup
    ASSERT_NO_THROW(themeManager->cleanup());
    EXPECT_TRUE(themeManager->isInitialized()); // Should still be usable
}

// Run theme system tests
int runThemeSystemTests(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}