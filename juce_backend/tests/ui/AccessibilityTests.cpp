#include "UITestSuite.cpp"
#include <gtest/gtest.h>
#include <memory>
#include <algorithm>

using namespace UITestFramework;
using namespace UITestFramework::Mock;

/**
 * @brief Comprehensive accessibility testing
 */
class AccessibilityTest : public AccessibilityTestFixture
{
};

/**
 * @brief Test accessibility manager initialization
 */
TEST_F(AccessibilityTest, InitializeAccessibilityManager)
{
    ASSERT_NO_THROW(accessibilityManager = std::make_unique<AccessibilityManager>());
    ASSERT_NE(accessibilityManager, nullptr);
    EXPECT_TRUE(accessibilityManager->isKeyboardNavigationEnabled());
    EXPECT_TRUE(accessibilityManager->isScreenReaderSupported());
}

/**
 * @brief Test component registration and management
 */
TEST_F(AccessibilityTest, ComponentRegistration)
{
    createTestAccessibleComponents();

    for (const auto& component : accessibleComponents)
    {
        // Verify component is registered with accessibility manager
        const AccessibilityInfo* info = accessibilityManager->getAccessibilityInfo(component.get());
        ASSERT_NE(info, nullptr);
        EXPECT_TRUE(info->isValid());
    }

    // Test getting all accessible components
    auto allComponents = accessibilityManager->getAllAccessibleComponents();
    EXPECT_EQ(allComponents.size(), accessibleComponents.size());

    // Test getting components by role
    auto buttons = accessibilityManager->getComponentsByRole(AccessibilityRole::Button);
    EXPECT_GT(buttons.size(), 0);
}

/**
 * @brief Test focus management
 */
TEST_F(AccessibilityTest, FocusManagement)
{
    createTestAccessibleComponents();
    ASSERT_FALSE(accessibleComponents.empty());

    // Test setting focus
    accessibilityManager->setFocus(accessibleComponents[0].get());
    EXPECT_EQ(accessibilityManager->getCurrentFocus(), accessibleComponents[0].get());
    EXPECT_TRUE(accessibleComponents[0]->hasFocus());

    // Test focus navigation
    bool navigationSuccess = accessibilityManager->navigateToNext();
    if (navigationSuccess && accessibleComponents.size() > 1)
    {
        EXPECT_EQ(accessibilityManager->getCurrentFocus(), accessibleComponents[1].get());
    }

    // Test clearing focus
    accessibilityManager->clearFocus();
    EXPECT_EQ(accessibilityManager->getCurrentFocus(), nullptr);
}

/**
 * @brief Test keyboard navigation
 */
TEST_F(AccessibilityTest, KeyboardNavigation)
{
    createTestAccessibleComponents();

    // Set up reading order
    std::vector<juce::Component*> readingOrder;
    for (const auto& component : accessibleComponents)
    {
        readingOrder.push_back(component.get());
    }
    accessibilityManager->setReadingOrder(readingOrder);

    // Test keyboard navigation
    accessibilityManager->setFocus(readingOrder[0]);
    EXPECT_TRUE(verifyKeyboardNavigation(readingOrder[0]));

    // Test arrow key navigation
    juce::KeyPress rightKey(juce::KeyPress::rightKey);
    bool rightNavigation = accessibilityManager->handleKeyPress(rightKey);

    juce::KeyPress leftKey(juce::KeyPress::leftKey);
    if (accessibilityManager->getCurrentFocus())
    {
        bool leftNavigation = accessibilityManager->handleKeyPress(leftKey);
    }

    // Test tab navigation
    juce::KeyPress tabKey(juce::KeyPress::tabKey);
    bool tabNavigation = accessibilityManager->handleKeyPress(tabKey);

    EXPECT_TRUE(tabNavigation || accessibleComponents.size() == 1);
}

/**
 * @brief Test screen reader support
 */
TEST_F(AccessibilityTest, ScreenReaderSupport)
{
    createTestAccessibleComponents();
    ASSERT_FALSE(accessibleComponents.empty());

    // Enable screen reader support
    accessibilityManager->enableScreenReaderSupport(true);
    EXPECT_TRUE(accessibilityManager->isScreenReaderSupported());

    // Test text announcements
    juce::String testMessage = "Test announcement for screen reader";
    accessibilityManager->announceText(testMessage);
    processUIEvents(100);

    // Test state change announcements
    auto component = accessibleComponents[0].get();
    accessibilityManager->announceStateChange(component, "unchecked", "checked");
    processUIEvents(100);

    // Test value change announcements
    accessibilityManager->announceValueChange(component, 50.0, 75.0);
    processUIEvents(100);

    // Test screen reader detection
    bool screenReaderActive = accessibilityManager->isScreenReaderActive();
    // Note: This may be false in testing environment
}

/**
 * @brief Test high contrast mode
 */
TEST_F(AccessibilityTest, HighContrastMode)
{
    testHighContrastMode();
}

/**
 * @brief Test WCAG 2.1 compliance
 */
TEST_F(AccessibilityTest, WCAGCompliance)
{
    createTestAccessibleComponents();

    // Test each component for WCAG compliance
    for (const auto& component : accessibleComponents)
    {
        verifyWCAGCompliance(component.get());

        // Check specific WCAG requirements
        const AccessibilityInfo* info = accessibilityManager->getAccessibilityInfo(component.get());
        ASSERT_NE(info, nullptr);

        // 1.1.1 Non-text Content: All non-text content has alternative text
        EXPECT_FALSE(info->text.name.isEmpty());

        // 1.3.1 Info and Relationships: Component roles are properly defined
        EXPECT_NE(info->role, AccessibilityRole::None);

        // 1.4.3 Contrast: Minimum contrast ratio (tested in theme system)
        // 2.1.1 Keyboard: All functionality available from keyboard
        EXPECT_TRUE(AccessibilityUtils::isKeyboardAccessible(component.get()));

        // 2.4.3 Focus Order: Logical focus order
        EXPECT_TRUE(info->text.readingOrder >= -1);

        // 3.1.1 Language of Page: Language is programmatically determined
        // 4.1.2 Name, Role, Value: Components have accessible name, role, and value
        EXPECT_TRUE(info->isValid());
    }

    // Generate accessibility report
    accessibilityManager->generateAccessibilityReport();

    // Get accessibility issues
    auto issues = accessibilityManager->getAccessibilityIssues();
    for (const auto& issue : issues)
    {
        ADD_FAILURE() << "Accessibility issue found: " << issue;
    }
}

/**
 * @brief Test accessible button functionality
 */
TEST_F(AccessibilityTest, AccessibleButton)
{
    auto button = std::make_unique<AccessibleButton>("Test Button", accessibilityManager.get());
    button->setSize(120, 40);

    // Configure accessibility
    button->setAccessibilityRole(AccessibilityRole::Button);
    button->setAccessibilityName("Test Button");
    button->setAccessibilityDescription("A test button for accessibility testing");
    button->setAccessibilityKeyboardShortcut("Space");

    // Test button accessibility info
    EXPECT_EQ(button->getAccessibilityRole(), AccessibilityRole::Button);
    EXPECT_EQ(button->getAccessibilityName(), "Test Button");
    EXPECT_EQ(button->getAccessibilityDescription(), "A test button for accessibility testing");

    // Test button focus
    accessibilityManager->setFocus(button.get());
    EXPECT_TRUE(button->hasFocus());

    // Test button action
    bool actionPerformed = false;
    button->addAccessibilityAction(AccessibilityAction::Press, [&actionPerformed]() {
        actionPerformed = true;
    });

    accessibilityManager->handleKeyPress(juce::KeyPress::spaceKey);
    processUIEvents(50);

    EXPECT_TRUE(actionPerformed);

    // Test toggleable button
    button->setToggleable(true);
    button->setToggled(true);
    EXPECT_TRUE(button->isToggleable());
    EXPECT_TRUE(button->isToggled());

    button->setToggled(false);
    EXPECT_FALSE(button->isToggled());
}

/**
 * @brief Test accessible slider functionality
 */
TEST_F(AccessibilityTest, AccessibleSlider)
{
    auto slider = std::make_unique<AccessibleSlider>(
        juce::Slider::SliderStyle::LinearHorizontal,
        juce::Slider::TextEntryBoxPosition::NoTextBox,
        accessibilityManager.get()
    );
    slider->setSize(200, 40);
    slider->setRange(0.0, 100.0, 1.0);
    slider->setValue(50.0);

    // Configure accessibility
    slider->setAccessibilityRole(AccessibilityRole::Slider);
    slider->setAccessibilityName("Volume Slider");
    slider->setAccessibilityDescription("Controls the volume level");
    slider->setAccessibilityValueRange(0.0, 100.0, 1.0);
    slider->setAccessibilityValueLabels("Min", "Max");

    // Test slider accessibility info
    EXPECT_EQ(slider->getAccessibilityRole(), AccessibilityRole::Slider);
    EXPECT_EQ(slider->getAccessibilityName(), "Volume Slider");
    EXPECT_DOUBLE_EQ(slider->getAccessibilityNumericValue(), 50.0);

    // Test slider value changes
    slider->setValue(75.0);
    EXPECT_DOUBLE_EQ(slider->getAccessibilityNumericValue(), 75.0);

    // Test keyboard navigation
    accessibilityManager->setFocus(slider.get());

    // Test increment/decrement
    juce::KeyPress upKey(juce::KeyPress::upKey);
    bool incrementResult = accessibilityManager->handleKeyPress(upKey);

    juce::KeyPress downKey(juce::KeyPress::downKey);
    bool decrementResult = accessibilityManager->handleKeyPress(downKey);

    // Test screen reader announcements
    bool announcementTriggered = false;
    slider->addAccessibilityAction(AccessibilityAction::SetValue, [&announcementTriggered]() {
        announcementTriggered = true;
    });
}

/**
 * @brief Test focus indicator visibility
 */
TEST_F(AccessibilityTest, FocusIndicator)
{
    createTestAccessibleComponents();

    // Enable focus indicator
    accessibilityManager->setFocusIndicatorVisible(true);
    EXPECT_TRUE(accessibilityManager->isFocusIndicatorVisible());

    // Test minimum focus size
    accessibilityManager->setMinimumFocusSize({44, 44});
    auto minSize = accessibilityManager->getMinimumFocusSize();
    EXPECT_EQ(minSize.x, 44);
    EXPECT_EQ(minSize.y, 44);

    // Set focus and verify indicator
    accessibilityManager->setFocus(accessibleComponents[0].get());
    processUIEvents(50);

    // Focus indicator should be visible (visual verification would be in UI)
    EXPECT_TRUE(accessibleComponents[0]->hasFocus());
}

/**
 * @brief Test audio cues functionality
 */
TEST_F(AccessibilityTest, AudioCues)
{
    createTestAccessibleComponents();

    // Enable audio cues
    accessibilityManager->enableAudioCues(true);
    EXPECT_TRUE(accessibilityManager->areAudioCuesEnabled());

    // Test focus cue
    accessibilityManager->setFocus(accessibleComponents[0].get());
    accessibilityManager->playFocusCue();

    // Test action cue
    accessibilityManager->playActionCue(AccessibilityAction::Press);

    // Test success cue
    accessibilityManager->playSuccessCue();

    // Test error cue
    accessibilityManager->playErrorCue();

    processUIEvents(100);
}

/**
 * @brief Test accessibility in different UI scenarios
 */
TEST_F(AccessibilityTest, UIScenarios)
{
    // Test with modal dialog
    auto dialog = std::make_unique<AccessibleComponent>(accessibilityManager.get());
    dialog->setAccessibilityRole(AccessibilityRole::Dialog);
    dialog->setAccessibilityName("Test Dialog");
    dialog->setSize(400, 300);

    // Add dialog content
    auto dialogButton = std::make_unique<AccessibleButton("OK", accessibilityManager.get());
    dialog->addAndMakeVisible(dialogButton.get());
    dialogButton->setTopRightPosition(350, 250);

    accessibilityManager->registerComponent(dialog.get(), {
        dialog.get(),
        AccessibilityRole::Dialog,
        {"Test Dialog", "A test dialog for accessibility testing"}
    });

    // Test dialog focus management
    accessibilityManager->setFocus(dialog.get());
    EXPECT_EQ(accessibilityManager->getCurrentFocus(), dialog.get());

    // Test with menu
    auto menu = std::make_unique<AccessibleComponent>(accessibilityManager.get());
    menu->setAccessibilityRole(AccessibilityRole::Menu);
    menu->setAccessibilityName("Test Menu");
    menu->setSize(200, 150);

    // Add menu items
    for (int i = 0; i < 3; ++i)
    {
        auto menuItem = std::make_unique<AccessibleButton("Menu Item " + juce::String(i + 1), accessibilityManager.get());
        menu->addAndMakeVisible(menuItem.get());
        menuItem->setBounds(10, 10 + i * 30, 180, 25);
    }

    // Test menu navigation
    accessibilityManager->setFocus(menu.get());
    processUIEvents(50);
}

/**
 * @brief Test accessibility validation
 */
TEST_F(AccessibilityTest, Validation)
{
    createTestAccessibleComponents();

    // Test overall accessibility validation
    bool isValid = accessibilityManager->validateAccessibility();
    EXPECT_TRUE(isValid);

    // Test accessibility issues reporting
    auto issues = accessibilityManager->getAccessibilityIssues();
    if (!issues.empty())
    {
        for (const auto& issue : issues)
        {
            ADD_FAILURE() << "Accessibility validation issue: " << issue;
        }
    }
}

/**
 * @brief Test accessibility event system
 */
TEST_F(AccessibilityTest, EventSystem)
{
    createTestAccessibleComponents();
    ASSERT_FALSE(accessibleComponents.empty());

    // Test focus change listeners
    bool focusChanged = false;
    juce::Component* oldFocus = nullptr;
    juce::Component* newFocus = nullptr;

    accessibilityManager->addFocusChangeListener([&](juce::Component* oldF, juce::Component* newF) {
        focusChanged = true;
        oldFocus = oldF;
        newFocus = newF;
    });

    // Trigger focus change
    accessibilityManager->setFocus(accessibleComponents[0].get());
    processUIEvents(50);

    EXPECT_TRUE(focusChanged);
    EXPECT_EQ(newFocus, accessibleComponents[0].get());

    // Test accessibility state change listeners
    bool stateChanged = false;
    accessibilityManager->addAccessibilityListener([&](juce::Component* component, AccessibilityState state) {
        stateChanged = true;
    });

    // Trigger state change
    if (auto button = dynamic_cast<AccessibleButton*>(accessibleComponents[0].get()))
    {
        button->setToggled(true);
        processUIEvents(50);
    }

    // Test event listener removal
    accessibilityManager->removeFocusChangeListener([&](juce::Component*, juce::Component*) {});
    accessibilityManager->removeAccessibilityListener([&](juce::Component*, AccessibilityState) {});
}

/**
 * @brief Test accessibility with disabled components
 */
TEST_F(AccessibilityTest, DisabledComponents)
{
    auto component = std::make_unique<AccessibleComponent>(accessibilityManager.get());
    component->setAccessibilityRole(AccessibilityRole::Button);
    component->setAccessibilityName("Disabled Button");
    component->setEnabled(false);

    AccessibilityInfo info;
    info.component = component.get();
    info.role = AccessibilityRole::Button;
    info.text.name = "Disabled Button";
    info.states.insert(AccessibilityState::Disabled);

    accessibilityManager->registerComponent(component.get(), info);

    // Test that disabled component is not focusable
    bool shouldFocus = AccessibilityUtils::hasProperFocusHandling(component.get());
    EXPECT_FALSE(shouldFocus || !component->isEnabled());

    // Test that disabled state is properly communicated
    const AccessibilityInfo* registeredInfo = accessibilityManager->getAccessibilityInfo(component.get());
    ASSERT_NE(registeredInfo, nullptr);
    EXPECT_NE(registeredInfo->states.find(AccessibilityState::Disabled), registeredInfo->states.end());
}

/**
 * @brief Test accessibility performance
 */
TEST_F(AccessibilityTest, Performance)
{
    createTestAccessibleComponents();

    // Measure performance of accessibility operations
    auto performanceOperation = [&]() {
        // Test focus navigation performance
        for (int i = 0; i < 100; ++i)
        {
            accessibilityManager->navigateToNext();
            accessibilityManager->navigateToPrevious();
        }

        // Test component lookup performance
        for (const auto& component : accessibleComponents)
        {
            auto info = accessibilityManager->getAccessibilityInfo(component.get());
            ASSERT_NE(info, nullptr);
        }

        // Test accessibility validation performance
        accessibilityManager->validateAccessibility();
    };

    ASSERT_PERFORMANCE_WITHIN_THRESHOLD(performanceOperation, 500.0); // 500ms max
}

/**
 * @brief Test accessibility memory management
 */
TEST_F(AccessibilityTest, MemoryManagement)
{
    MemoryUsage baseline = TestUtils::getMemoryUsage();

    // Create and destroy many accessible components
    for (int i = 0; i < 100; ++i)
    {
        auto component = std::make_unique<AccessibleComponent>(accessibilityManager.get());
        component->setAccessibilityRole(AccessibilityRole::Button);
        component->setAccessibilityName("Button " + juce::String(i));

        AccessibilityInfo info;
        info.component = component.get();
        info.role = AccessibilityRole::Button;
        info.text.name = "Button " + juce::String(i);

        accessibilityManager->registerComponent(component.get(), info);

        // Component goes out of scope and is destroyed
    }

    MemoryUsage afterOperations = TestUtils::getMemoryUsage();

    // Memory usage should not increase significantly after cleanup
    EXPECT_LT(afterOperations.usageDeltaBytes, 5 * 1024 * 1024); // Less than 5MB
}

// Run accessibility tests
int runAccessibilityTests(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}