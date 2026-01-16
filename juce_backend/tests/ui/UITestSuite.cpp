#pragma once

#include <gtest/gtest.h>
#include <gtest/gtest-spi.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <vector>
#include <chrono>

// Include UI components under test
#include "../src/ui/AdvancedComponents/LayoutEngine.h"
#include "../src/ui/AdvancedComponents/AccessibilityManager.h"
#include "../src/ui/AdvancedComponents/ThemeManager.h"
#include "../src/ui/AdvancedComponents/PreferenceManager.h"
#include "../src/ui/AdvancedComponents/AnimationEngine.h"
#include "../src/ui/AdvancedComponents/UserPreferenceEngine.h"

using namespace SchillingerEcosystem::UI::AdvancedComponents;

namespace UITestFramework {

/**
 * @brief Test fixture base class for UI components
 */
class UITestFixture : public ::testing::Test
{
protected:
    void SetUp() override;
    void TearDown() override;

    // Test environment setup
    void initializeJUCEEnvironment();
    void cleanupJUCEEnvironment();
    void createTestWindow();
    void destroyTestWindow();

    // Mock component creation
    juce::Component* createMockComponent(const juce::String& name = "MockComponent");
    juce::Component* createMockButton(const juce::String& text = "MockButton");
    juce::Component* createMockSlider(const juce::String& name = "MockSlider");
    juce::Component* createMockComboBox(const juce::String& name = "MockComboBox");

    // Test utilities
    void processUIEvents(int timeoutMs = 100);
    bool waitForCondition(std::function<bool()> condition, int timeoutMs = 1000);
    void simulateKeyPress(const juce::KeyPress& key);
    void simulateMouseClick(const juce::Point<int>& position, int button = 1);
    void simulateMouseDrag(const juce::Point<int>& startPos, const juce::Point<int>& endPos, int button = 1);

    // Performance testing utilities
    void startPerformanceMeasurement();
    void stopPerformanceMeasurement();
    double getLastExecutionTime() const { return lastExecutionTimeMs; }
    int64_t getLastMemoryUsage() const { return lastMemoryUsageBytes; }

    // Accessibility testing utilities
    bool verifyAccessibilityProperties(juce::Component* component);
    bool verifyFocusOrder(const std::vector<juce::Component*>& expectedOrder);
    bool verifyKeyboardNavigation(juce::Component* root);

    // Visual regression testing utilities
    juce::Image captureComponentSnapshot(juce::Component* component);
    bool compareImages(const juce::Image& image1, const juce::Image& image2, double tolerance = 0.01);
    void saveImageForComparison(const juce::Image& image, const juce::String& filename);

    // Platform-specific testing
    bool isRunningOnWindows() const;
    bool isRunningOnMacOS() const;
    bool isRunningOnLinux() const;
    juce::Rectangle<int> getScreenBounds() const;

    // Multi-monitor testing
    std::vector<juce::Rectangle<int>> getMonitorBounds() const;
    void testMultiMonitorScenarios();

    // High-DPI testing
    void testHighDPIScenarios();
    float getDisplayScaleFactor() const;

private:
    std::unique_ptr<juce::MessageManager> messageManager;
    std::unique_ptr<juce::Component> testWindow;
    std::unique_ptr<juce::ApplicationProperties> appProperties;

    // Performance measurement
    std::chrono::high_resolution_clock::time_point performanceStart;
    double lastExecutionTimeMs = 0.0;
    int64_t lastMemoryUsageBytes = 0;

    // Test data
    std::vector<std::unique_ptr<juce::Component>> mockComponents;
    juce::File tempDirectory;
};

/**
 * @brief Test fixture for theme system testing
 */
class ThemeSystemTestFixture : public UITestFixture
{
protected:
    void SetUp() override;
    void TearDown() override;

    void createTestThemes();
    void verifyThemeConsistency(const Theme& theme);
    bool testThemeTransition(const Theme& fromTheme, const Theme& toTheme);

    std::unique_ptr<ThemeManager> themeManager;
    std::vector<Theme> testThemes;
};

/**
 * @brief Test fixture for layout engine testing
 */
class LayoutEngineTestFixture : public UITestFixture
{
protected:
    void SetUp() override;
    void TearDown() override;

    void createTestLayoutContainers();
    void createTestComponents();
    void verifyLayoutConstraints(const LayoutConstraints& constraints);
    void testLayoutPerformance();

    std::unique_ptr<FlexLayoutContainer> flexLayout;
    std::unique_ptr<GridLayoutContainer> gridLayout;
    std::unique_ptr<StackLayoutContainer> stackLayout;
    std::unique_ptr<ResponsiveLayoutManager> responsiveManager;
    std::vector<std::unique_ptr<juce::Component>> testComponents;
};

/**
 * @brief Test fixture for accessibility testing
 */
class AccessibilityTestFixture : public UITestFixture
{
protected:
    void SetUp() override;
    void TearDown() override;

    void createTestAccessibleComponents();
    void verifyWCAGCompliance(juce::Component* component);
    bool testScreenReaderCompatibility();
    void testHighContrastMode();

    std::unique_ptr<AccessibilityManager> accessibilityManager;
    std::vector<std::unique_ptr<AccessibleComponent>> accessibleComponents;
};

/**
 * @brief Test fixture for animation testing
 */
class AnimationTestFixture : public UITestFixture
{
protected:
    void SetUp() override;
    void TearDown() override;

    void createTestAnimations();
    void verifyAnimationPerformance();
    void testAnimationThreadSafety();
    bool waitForAnimationCompletion(int timeoutMs = 5000);

    std::unique_ptr<AnimationEngine> animationEngine;
    std::vector<std::unique_ptr<Animation>> testAnimations;
    std::vector<std::unique_ptr<juce::Component>> animatedComponents;
};

/**
 * @brief Test fixture for cross-platform testing
 */
class CrossPlatformTestFixture : public UITestFixture
{
protected:
    void SetUp() override;
    void TearDown() override;

    void testPlatformSpecificFeatures();
    void testSystemIntegration();
    void testPlatformAccessibility();

    bool isDarkModeEnabled() const;
    juce::String getSystemFont() const;
    juce::String getSystemAccentColor() const;
};

/**
 * @brief Mock implementations for testing
 */
namespace Mock {

    /**
     * @brief Mock theme for testing
     */
    struct MockTheme
    {
        juce::String name;
        juce::Colour primaryColor = juce::Colours::blue;
        juce::Colour secondaryColor = juce::Colours::lightblue;
        juce::Colour backgroundColor = juce::Colours::white;
        juce::Colour textColor = juce::Colours::black;
        juce::Font defaultFont;
        float cornerRadius = 5.0f;
        float borderWidth = 1.0f;
        bool isDarkTheme = false;

        bool operator==(const MockTheme& other) const
        {
            return name == other.name &&
                   primaryColor == other.primaryColor &&
                   secondaryColor == other.secondaryColor &&
                   backgroundColor == other.backgroundColor &&
                   textColor == other.textColor &&
                   cornerRadius == other.cornerRadius &&
                   borderWidth == other.borderWidth &&
                   isDarkTheme == other.isDarkTheme;
        }
    };

    /**
     * @brief Mock accessibility info for testing
     */
    struct MockAccessibilityInfo
    {
        AccessibilityRole role = AccessibilityRole::None;
        juce::String name;
        juce::String description;
        juce::String value;
        std::unordered_set<AccessibilityState> states;

        bool isValid() const
        {
            return role != AccessibilityRole::None && !name.isEmpty();
        }
    };

    /**
     * @brief Mock animation for testing
     */
    class MockAnimation : public Animation
    {
    public:
        MockAnimation(juce::Component* target, Duration duration)
            : Animation(target, duration) {}

        void update(double progress) override;
        bool isComplete() const override { return progress >= 1.0; }

        double progress = 0.0;
        bool started = false;
        bool finished = false;
    };

    /**
     * @brief Mock component for testing
     */
    class MockComponent : public juce::Component
    {
    public:
        MockComponent(const juce::String& name = "MockComponent") : componentName(name) {}

        void paint(juce::Graphics& g) override;
        void resized() override;
        void mouseDown(const juce::MouseEvent& event) override;
        void mouseUp(const juce::MouseEvent& event) override;

        juce::String getComponentName() const override { return componentName; }

        // Test tracking
        bool wasPainted = false;
        bool wasResized = false;
        bool wasClicked = false;
        juce::Point<int> lastClickPosition;

    private:
        juce::String componentName;
    };

    /**
     * @brief Mock accessible component for testing
     */
    class MockAccessibleComponent : public AccessibleComponent
    {
    public:
        MockAccessibleComponent(AccessibilityManager* manager = nullptr,
                               ThemeManager* themeManager = nullptr)
            : AccessibleComponent(manager, themeManager) {}

        void paint(juce::Graphics& g) override;

        // Test tracking
        bool accessibilityAnnounced = false;
        juce::String lastAnnouncement;
    };

    /**
     * @brief Mock preferences provider for testing
     */
    class MockPreferencesProvider : public PreferencesProvider
    {
    public:
        juce::var getPreferenceValue(const juce::Identifier& key) const override;
        void setPreferenceValue(const juce::Identifier& key, const juce::var& value) override;
        bool hasPreference(const juce::Identifier& key) const override;
        void removePreference(const juce::Identifier& key) override;
        std::vector<juce::Identifier> getAllPreferenceKeys() const override;

        std::unordered_map<juce::Identifier, juce::var> preferences;
    };

} // namespace Mock

/**
 * @brief Test utilities and helpers
 */
namespace TestUtils {

    // Performance measurement
    struct PerformanceMetrics
    {
        double executionTimeMs = 0.0;
        int64_t memoryUsageBytes = 0;
        int64_t peakMemoryUsageBytes = 0;
        int cpuUsagePercent = 0;
        int frameRate = 0;
    };

    PerformanceMetrics measurePerformance(std::function<void()> operation);
    void assertPerformanceWithinBounds(const PerformanceMetrics& metrics,
                                      double maxTimeMs = 100.0,
                                      int64_t maxMemoryBytes = 10 * 1024 * 1024);

    // Visual testing utilities
    struct ImageComparisonResult
    {
        bool identical = false;
        double similarityScore = 0.0;
        juce::Rectangle<int> differenceRegion;
        int pixelDifferenceCount = 0;
    };

    ImageComparisonResult compareImages(const juce::Image& image1,
                                       const juce::Image& image2,
                                       double tolerance = 0.01);

    // Accessibility testing utilities
    struct WCAGViolation
    {
        juce::String description;
        juce::String guideline; // "WCAG 2.1 AA", "WCAG 2.1 AAA", etc.
        juce::String impact; // "Critical", "Serious", "Moderate", "Minor"
        juce::Component* component = nullptr;
    };

    std::vector<WCAGViolation> checkWCAGCompliance(juce::Component* component);

    // Keyboard navigation utilities
    struct NavigationPath
    {
        std::vector<juce::Component*> components;
        std::vector<juce::KeyPress> keySequence;
        bool isValid = false;
    };

    NavigationPath generateNavigationPath(juce::Component* start, juce::Component* end);
    bool executeNavigationPath(const NavigationPath& path);

    // Cross-platform utilities
    struct SystemCapabilities
    {
        juce::String operatingSystem;
        juce::String version;
        bool supportsTouch = false;
        bool supportsStylus = false;
        bool hasHighDPI = false;
        float displayScale = 1.0f;
        bool isDarkModeEnabled = false;
        std::vector<juce::Rectangle<int>> monitorBounds;
    };

    SystemCapabilities getSystemCapabilities();

    // Memory management utilities
    struct MemoryUsage
    {
        int64_t currentUsageBytes = 0;
        int64_t peakUsageBytes = 0;
        int64_t usageDeltaBytes = 0;
        double usagePercentage = 0.0;
    };

    MemoryUsage getMemoryUsage();
    MemoryUsage measureMemoryLeak(std::function<void()> operation);

    // Event simulation utilities
    struct MouseEventInfo
    {
        juce::Point<int> position;
        int button = 1; // 1 = left, 2 = middle, 3 = right
        juce::ModifierKeys modifiers;
        float pressure = 0.0f;
        juce::Time time = juce::Time::getCurrentTime();
    };

    struct KeyEventInfo
    {
        juce::KeyPress keyPress;
        juce::Time time = juce::Time::getCurrentTime();
    };

    void simulateMouseEvent(juce::Component* component, const MouseEventInfo& info);
    void simulateKeyEvent(juce::Component* component, const KeyEventInfo& info);

} // namespace TestUtils

/**
 * @brief Custom test assertions for UI testing
 */
#define ASSERT_COMPONENT_VISIBLE(component) \
    ASSERT_TRUE((component) != nullptr && (component)->isVisible()) << \
        "Component " << #component << " should be visible"

#define ASSERT_COMPONENT_HIDDEN(component) \
    ASSERT_TRUE((component) == nullptr || !(component)->isVisible()) << \
        "Component " << #component << " should be hidden"

#define ASSERT_COMPONENT_ENABLED(component) \
    ASSERT_TRUE((component) != nullptr && (component)->isEnabled()) << \
        "Component " << #component << " should be enabled"

#define ASSERT_COMPONENT_DISABLED(component) \
    ASSERT_TRUE((component) == nullptr || !(component)->isEnabled()) << \
        "Component " << #component << " should be disabled"

#define ASSERT_THEME_CONSISTENT(theme) \
    ASSERT_TRUE((theme).isValid()) << \
        "Theme should be valid and consistent"

#define ASSERT_LAYOUT_WITHIN_BOUNDS(component, bounds) \
    ASSERT_TRUE((component) != nullptr && (bounds).contains((component)->getBounds())) << \
        "Component " << #component << " should be within bounds"

#define ASSERT_ACCESSIBILITY_COMPLIANT(component) \
    ASSERT_NO_FATAL_FAILURE(verifyAccessibilityProperties(component)) << \
        "Component " << #component << " should be accessibility compliant"

#define ASSERT_PERFORMANCE_WITHIN_THRESHOLD(operation, maxTimeMs) \
    { \
        auto metrics = TestUtils::measurePerformance(operation); \
        TestUtils::assertPerformanceWithinBounds(metrics, maxTimeMs); \
    }

} // namespace UITestFramework

// Implementation of main test suite entry points
int runUITestSuite(int argc, char** argv);
int runThemeSystemTests(int argc, char** argv);
int runLayoutEngineTests(int argc, char** argv);
int runAccessibilityTests(int argc, char** argv);
int runAnimationTests(int argc, char** argv);
int runUserPreferenceTests(int argc, char** argv);
int runVisualRegressionTests(int argc, char** argv);
int runPerformanceTests(int argc, char** argv);
int runCrossPlatformTests(int argc, char** argv);