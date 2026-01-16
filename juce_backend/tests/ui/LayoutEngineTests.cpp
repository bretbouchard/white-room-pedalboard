#include "UITestSuite.cpp"
#include <gtest/gtest.h>
#include <memory>
#include <random>

using namespace UITestFramework;
using namespace UITestFramework::Mock;

/**
 * @brief Comprehensive layout engine testing
 */
class LayoutEngineTest : public LayoutEngineTestFixture
{
};

/**
 * @brief Test layout engine initialization
 */
TEST_F(LayoutEngineTest, InitializeLayoutEngine)
{
    ASSERT_NO_THROW(createTestLayoutContainers());

    ASSERT_NE(flexLayout, nullptr);
    ASSERT_NE(gridLayout, nullptr);
    ASSERT_NE(stackLayout, nullptr);
    ASSERT_NE(responsiveManager, nullptr);

    // Verify containers are properly initialized
    EXPECT_EQ(flexLayout->getItemCount(), 0);
    EXPECT_EQ(gridLayout->getItemCount(), 0);
    EXPECT_EQ(stackLayout->getItemCount(), 0);
}

/**
 * @brief Test flex layout container functionality
 */
TEST_F(LayoutEngineTest, FlexLayoutContainer)
{
    createTestLayoutContainers();
    createTestComponents();

    // Add components to flex layout
    for (const auto& component : testComponents)
    {
        flexLayout->addItem(component.get());
    }

    EXPECT_EQ(flexLayout->getItemCount(), static_cast<int>(testComponents.size()));

    // Test horizontal layout
    flexLayout->setLayoutDirection(LayoutDirection::Horizontal);
    flexLayout->setSize(600, 100);
    flexLayout->updateLayout();

    processUIEvents(100);

    // Verify components are laid out horizontally
    auto items = flexLayout->getVisibleItems();
    ASSERT_EQ(items.size(), testComponents.size());

    for (size_t i = 0; i < items.size(); ++i)
    {
        EXPECT_TRUE(items[i]->getBounds().getX() >= 0);
        EXPECT_TRUE(items[i]->getBounds().getX() < flexLayout->getWidth());
        EXPECT_TRUE(items[i]->isVisible());
    }
}

/**
 * @brief Test grid layout container functionality
 */
TEST_F(LayoutEngineTest, GridLayoutContainer)
{
    createTestLayoutContainers();
    createTestComponents();

    // Configure grid layout
    gridLayout->setColumns(3);
    gridLayout->setRows(2);
    EXPECT_EQ(gridLayout->getColumns(), 3);
    EXPECT_EQ(gridLayout->getRows(), 2);

    // Add components to specific grid positions
    for (size_t i = 0; i < std::min(testComponents.size(), size_t(6)); ++i)
    {
        int row = static_cast<int>(i) / 3;
        int col = static_cast<int>(i) % 3;
        gridLayout->placeItem(testComponents[i].get(), col, row);
    }

    gridLayout->setSize(600, 200);
    gridLayout->updateLayout();

    processUIEvents(100);

    // Verify grid positioning
    for (size_t i = 0; i < std::min(testComponents.size(), size_t(6)); ++i)
    {
        int expectedRow = static_cast<int>(i) / 3;
        int expectedCol = static_cast<int>(i) % 3;

        auto bounds = testComponents[i]->getBounds();
        EXPECT_GE(bounds.getX(), expectedCol * 200); // Approximate grid column width
        EXPECT_GE(bounds.getY(), expectedRow * 100); // Approximate grid row height
    }
}

/**
 * @brief Test stack layout container functionality
 */
TEST_F(LayoutEngineTest, StackLayoutContainer)
{
    createTestLayoutContainers();
    createTestComponents();

    // Add components to stack layout
    for (const auto& component : testComponents)
    {
        stackLayout->addItem(component.get());
    }

    stackLayout->setSize(400, 300);
    stackLayout->setHorizontalAlignment(Alignment::Center);
    stackLayout->setVerticalAlignment(Alignment::Center);
    stackLayout->updateLayout();

    processUIEvents(100);

    // Verify all components are centered and stacked
    for (const auto& component : testComponents)
    {
        auto bounds = component->getBounds();
        auto containerBounds = stackLayout->getLocalBounds();

        // Components should be centered within the container
        EXPECT_GE(bounds.getCentreX(), containerBounds.getCentreX() - 10);
        EXPECT_LE(bounds.getCentreX(), containerBounds.getCentreX() + 10);
        EXPECT_GE(bounds.getCentreY(), containerBounds.getCentreY() - 10);
        EXPECT_LE(bounds.getCentreY(), containerBounds.getCentreY() + 10);
    }
}

/**
 * @brief Test layout constraints functionality
 */
TEST_F(LayoutEngineTest, LayoutConstraints)
{
    createTestComponents();
    ASSERT_FALSE(testComponents.empty());

    // Create layout with constraints
    LayoutConstraints constraints;
    constraints.minSize = {100.0f, 50.0f};
    constraints.maxSize = {300.0f, 150.0f};
    constraints.preferredSize = {200.0f, 100.0f};
    constraints.margin = 10.0f;
    constraints.padding = 5.0f;
    constraints.flexGrow = 1.0f;
    constraints.flexShrink = 0.5f;

    createTestLayoutContainers();
    flexLayout->addItem(testComponents[0].get(), constraints);

    // Test constraint validation
    EXPECT_TRUE(constraints.hasValidConstraints());
    EXPECT_EQ(constraints.getMarginTop(), 10.0f);
    EXPECT_EQ(constraints.getPaddingLeft(), 5.0f);
    EXPECT_TRUE(testComponents[0]->getPreferredSize() == juce::Point<float>(200.0f, 100.0f));

    // Test constraint-based sizing
    flexLayout->setSize(800, 100);
    flexLayout->updateLayout();
    processUIEvents(100);

    auto itemBounds = testComponents[0]->getBounds();
    EXPECT_GE(itemBounds.getWidth(), constraints.minSize.x);
    EXPECT_LE(itemBounds.getWidth(), constraints.maxSize.x);
    EXPECT_GE(itemBounds.getHeight(), constraints.minSize.y);
    EXPECT_LE(itemBounds.getHeight(), constraints.maxSize.y);
}

/**
 * @brief Test responsive layout manager
 */
TEST_F(LayoutEngineTest, ResponsiveLayoutManager)
{
    createTestLayoutContainers();
    createTestComponents();

    // Configure responsive manager
    responsiveManager->addBreakpoint("mobile", 0.0f);
    responsiveManager->addBreakpoint("tablet", 768.0f);
    responsiveManager->addBreakpoint("desktop", 1024.0f);

    // Register components with responsive manager
    for (size_t i = 0; i < testComponents.size(); ++i)
    {
        juce::String componentId = "component_" + juce::String(i);
        responsiveManager->registerComponent(componentId, testComponents[i].get());

        // Add layout variant for mobile breakpoint
        responsiveManager->addLayoutVariant(componentId, "mobile", [&, i]() {
            testComponents[i]->setSize(150, 100);
        });

        // Add layout variant for desktop breakpoint
        responsiveManager->addLayoutVariant(componentId, "desktop", [&, i]() {
            testComponents[i]->setSize(200, 150);
        });
    }

    // Test responsive updates
    responsiveManager->update(500.0f);  // Tablet width
    EXPECT_EQ(responsiveManager->getCurrentBreakpoint(), "tablet");

    responsiveManager->update(300.0f);  // Mobile width
    EXPECT_EQ(responsiveManager->getCurrentBreakpoint(), "mobile");

    // Verify mobile layout applied
    for (const auto& component : testComponents)
    {
        EXPECT_EQ(component->getWidth(), 150);
        EXPECT_EQ(component->getHeight(), 100);
    }

    responsiveManager->update(1200.0f);  // Desktop width
    EXPECT_EQ(responsiveManager->getCurrentBreakpoint(), "desktop");

    // Verify desktop layout applied
    for (const auto& component : testComponents)
    {
        EXPECT_EQ(component->getWidth(), 200);
        EXPECT_EQ(component->getHeight(), 150);
    }
}

/**
 * @brief Test layout performance
 */
TEST_F(LayoutEngineTest, LayoutPerformance)
{
    createTestLayoutContainers();

    // Create many components for performance testing
    const int numComponents = 1000;
    std::vector<std::unique_ptr<juce::Component>> perfComponents;

    for (int i = 0; i < numComponents; ++i)
    {
        auto component = std::make_unique<MockComponent>("PerfComponent" + juce::String(i));
        component->setSize(50, 30);
        perfComponents.push_back(std::move(component));
    }

    // Test flex layout performance with many items
    startPerformanceMeasurement();

    for (const auto& component : perfComponents)
    {
        flexLayout->addItem(component.get());
    }

    flexLayout->setSize(2000, 1000);
    flexLayout->updateLayout();
    processUIEvents(500);

    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 1000.0); // Should complete within 1 second
    EXPECT_EQ(flexLayout->getItemCount(), numComponents);
}

/**
 * @brief Test layout memory management
 */
TEST_F(LayoutEngineTest, MemoryManagement)
{
    createTestLayoutContainers();

    MemoryUsage baseline = TestUtils::getMemoryUsage();

    // Create and destroy many layout items
    for (int i = 0; i < 100; ++i)
    {
        auto component = std::make_unique<MockComponent>("TempComponent" + juce::String(i));
        flexLayout->addItem(component.get());
        flexLayout->removeItem(component.get());
    }

    MemoryUsage afterOperations = TestUtils::getMemoryUsage();

    // Memory usage should not increase significantly
    EXPECT_LT(afterOperations.usageDeltaBytes, 10 * 1024 * 1024); // Less than 10MB
}

/**
 * @brief Test layout thread safety
 */
TEST_F(LayoutEngineTest, ThreadSafety)
{
    createTestLayoutContainers();
    createTestComponents();

    const int numThreads = 4;
    std::vector<std::thread> threads;
    std::atomic<int> successCount{0};

    for (int t = 0; t < numThreads; ++t)
    {
        threads.emplace_back([&, t]() {
            for (int i = 0; i < 10; ++i)
            {
                try
                {
                    flexLayout->updateLayout();
                    successCount++;
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

    EXPECT_EQ(successCount, numThreads * 10);
}

/**
 * @brief Test layout with dynamic content
 */
TEST_F(LayoutEngineTest, DynamicContent)
{
    createTestLayoutContainers();

    // Add components dynamically
    std::vector<std::unique_ptr<juce::Component>> dynamicComponents;

    for (int i = 0; i < 10; ++i)
    {
        auto component = std::make_unique<MockComponent>("Dynamic" + juce::String(i));
        component->setSize(100 + i * 10, 50);

        flexLayout->addItem(component.get());
        dynamicComponents.push_back(std::move(component));

        flexLayout->updateLayout();
        processUIEvents(10);

        // Verify layout updated correctly
        EXPECT_EQ(flexLayout->getItemCount(), i + 1);
    }

    // Remove components dynamically
    for (int i = 0; i < 5; ++i)
    {
        if (!dynamicComponents.empty())
        {
            flexLayout->removeItem(dynamicComponents.back().get());
            dynamicComponents.pop_back();

            flexLayout->updateLayout();
            processUIEvents(10);

            EXPECT_EQ(flexLayout->getItemCount(), static_cast<int>(dynamicComponents.size()));
        }
    }
}

/**
 * @brief Test layout with nested containers
 */
TEST_F(LayoutEngineTest, NestedContainers)
{
    createTestLayoutContainers();

    // Create nested layout structure
    auto outerContainer = std::make_unique<FlexLayoutContainer>();
    outerContainer->setLayoutDirection(LayoutDirection::Vertical);

    auto innerContainer1 = std::make_unique<FlexLayoutContainer>();
    innerContainer1->setLayoutDirection(LayoutDirection::Horizontal);

    auto innerContainer2 = std::make_unique<FlexLayoutContainer>();
    innerContainer2->setLayoutDirection(LayoutDirection::Horizontal);

    // Add components to inner containers
    createTestComponents();

    for (size_t i = 0; i < testComponents.size() / 2; ++i)
    {
        innerContainer1->addItem(testComponents[i].get());
    }

    for (size_t i = testComponents.size() / 2; i < testComponents.size(); ++i)
    {
        innerContainer2->addItem(testComponents[i].get());
    }

    // Add inner containers to outer container
    outerContainer->addItem(innerContainer1.get());
    outerContainer->addItem(innerContainer2.get());

    // Test nested layout
    outerContainer->setSize(800, 600);
    outerContainer->updateLayout();
    processUIEvents(100);

    // Verify all components are positioned correctly
    for (const auto& component : testComponents)
    {
        auto bounds = component->getBounds();
        EXPECT_GE(bounds.getX(), 0);
        EXPECT_GE(bounds.getY(), 0);
        EXPECT_TRUE(bounds.getWidth() > 0);
        EXPECT_TRUE(bounds.getHeight() > 0);
    }
}

/**
 * @brief Test layout with overflow handling
 */
TEST_F(LayoutEngineTest, OverflowHandling)
{
    createTestLayoutContainers();
    createTestComponents();

    // Configure layout to handle overflow
    flexLayout->setLayoutDirection(LayoutDirection::Horizontal);
    flexLayout->setWrapMode(WrapMode::Wrap);
    flexLayout->setSize(300, 200); // Small container

    // Add many components that will overflow
    for (const auto& component : testComponents)
    {
        component->setSize(100, 50); // Components larger than container
        flexLayout->addItem(component.get());
    }

    flexLayout->updateLayout();
    processUIEvents(100);

    // Verify overflow is handled (components should wrap or be clipped)
    auto visibleItems = flexLayout->getVisibleItems();
    EXPECT_GT(visibleItems.size(), 0);

    for (const auto& item : visibleItems)
    {
        auto bounds = item->getBounds();
        EXPECT_GE(bounds.getX(), 0);
        EXPECT_LE(bounds.getRight(), flexLayout->getWidth());
        EXPECT_GE(bounds.getY(), 0);
        EXPECT_LE(bounds.getBottom(), flexLayout->getHeight());
    }
}

/**
 * @brief Test layout accessibility integration
 */
TEST_F(LayoutEngineTest, AccessibilityIntegration)
{
    createTestLayoutContainers();
    createTestAccessibleComponents();

    // Configure accessibility
    auto accessibilityManager = std::make_unique<AccessibilityManager>();

    // Register components for accessibility
    for (size_t i = 0; i < testComponents.size(); ++i)
    {
        AccessibilityInfo info;
        info.role = AccessibilityRole::Button;
        info.text.name = "Button " + juce::String(i + 1);
        info.text.description = "Test button " + juce::String(i + 1);

        accessibilityManager->registerComponent(testComponents[i].get(), info);
    }

    // Test layout updates maintain accessibility
    flexLayout->addItem(testComponents[0].get());
    flexLayout->updateLayout();
    processUIEvents(50);

    // Verify accessibility info is still valid
    const AccessibilityInfo* info = accessibilityManager->getAccessibilityInfo(testComponents[0].get());
    ASSERT_NE(info, nullptr);
    EXPECT_TRUE(info->isValid());
}

/**
 * @brief Test layout animation support
 */
TEST_F(LayoutEngineTest, AnimationSupport)
{
    createTestLayoutContainers();
    createTestComponents();

    // Enable layout animations
    flexLayout->enableAnimations(true);
    flexLayout->setAnimationDuration(300.0);

    // Add component and verify smooth layout
    flexLayout->addItem(testComponents[0].get());
    auto initialBounds = testComponents[0]->getBounds();

    flexLayout->updateLayout();
    processUIEvents(350); // Wait for animation to complete

    auto finalBounds = testComponents[0]->getBounds();

    // Bounds should have changed smoothly (not jumped)
    EXPECT_NE(initialBounds, finalBounds);
    EXPECT_TRUE(finalBounds.getWidth() > 0);
    EXPECT_TRUE(finalBounds.getHeight() > 0);
}

/**
 * @brief Test layout debugging utilities
 */
TEST_F(LayoutEngineTest, DebuggingUtilities)
{
    createTestLayoutContainers();
    createTestComponents();

    // Enable debug mode
    flexLayout->setDebugMode(true);
    gridLayout->setDebugMode(true);

    // Add components and update layout
    for (const auto& component : testComponents)
    {
        flexLayout->addItem(component.get());
    }

    flexLayout->updateLayout();
    processUIEvents(50);

    // Test debug information retrieval
    auto debugInfo = flexLayout->getDebugInfo();
    EXPECT_FALSE(debugInfo.isEmpty());

    // Test layout bounds visualization
    juce::Image debugImage = flexLayout->createDebugSnapshot();
    EXPECT_TRUE(debugImage.isValid());
}

// Run layout engine tests
int runLayoutEngineTests(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}