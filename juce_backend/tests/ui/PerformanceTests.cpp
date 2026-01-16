#include "UITestSuite.cpp"
#include <gtest/gtest.h>
#include <memory>
#include <random>
#include <thread>
#include <chrono>

using namespace UITestFramework;
using namespace UITestFramework::Mock;

/**
 * @brief Comprehensive UI performance testing
 */
class UIPerformanceTest : public UITestFixture
{
protected:
    void SetUp() override
    {
        UITestFixture::SetUp();

        // Initialize performance monitoring
        performanceMonitor = std::make_unique<PerformanceMonitor>();
        performanceMonitor->startMonitoring();

        // Create performance test scenarios
        createPerformanceTestComponents();
    }

    void TearDown() override
    {
        performanceMonitor->stopMonitoring();
        performanceMonitor.reset();

        performanceTestComponents.clear();
        UITestFixture::TearDown();
    }

    void createPerformanceTestComponents()
    {
        const int numComponents = 100;

        for (int i = 0; i < numComponents; ++i)
        {
            auto component = std::make_unique<MockComponent>("PerfComponent" + juce::String(i));
            component->setSize(50 + (i % 10) * 5, 30 + (i % 5) * 3);
            performanceTestComponents.push_back(std::move(component));
        }
    }

    void simulateHeavyUIOperations()
    {
        // Simulate complex UI operations
        for (auto& component : performanceTestComponents)
        {
            component->repaint();
            component->resized();
        }

        processUIEvents(100);
    }

    void measureRenderingPerformance()
    {
        const int numFrames = 60; // 1 second at 60fps
        const double frameInterval = 1000.0 / 60.0; // 16.67ms per frame

        auto frameStartTime = std::chrono::high_resolution_clock::now();
        std::vector<double> frameTimes;

        for (int frame = 0; frame < numFrames; ++frame)
        {
            auto frameStart = std::chrono::high_resolution_clock::now();

            // Simulate frame rendering
            for (auto& component : performanceTestComponents)
            {
                component->repaint();
            }

            processUIEvents(10);

            auto frameEnd = std::chrono::high_resolution_clock::now();
            auto frameDuration = std::chrono::duration<double, std::milli>(frameEnd - frameStart).count();
            frameTimes.push_back(frameDuration);

            // Maintain frame rate
            auto elapsed = std::chrono::duration<double, std::milli>(frameEnd - frameStart).count();
            if (elapsed < frameInterval)
            {
                std::this_thread::sleep_for(std::chrono::milliseconds(static_cast<int>(frameInterval - elapsed)));
            }
        }

        auto totalTime = std::chrono::high_resolution_clock::now() - frameStartTime;
        auto totalMs = std::chrono::duration<double, std::milli>(totalTime).count();

        // Calculate performance metrics
        double averageFrameTime = std::accumulate(frameTimes.begin(), frameTimes.end(), 0.0) / frameTimes.size();
        double maxFrameTime = *std::max_element(frameTimes.begin(), frameTimes.end());
        double minFrameTime = *std::min_element(frameTimes.begin(), frameTimes.end());

        lastFrameMetrics = {
            totalMs,
            averageFrameTime,
            maxFrameTime,
            minFrameTime,
            static_cast<double>(frameTimes.size()) / (totalMs / 1000.0) // FPS
        };
    }

    struct FrameMetrics
    {
        double totalTimeMs = 0.0;
        double averageFrameTimeMs = 0.0;
        double maxFrameTimeMs = 0.0;
        double minFrameTimeMs = 0.0;
        double actualFPS = 0.0;
    };

    void measureMemoryUsageDuringOperations(std::function<void()> operation)
    {
        MemoryUsage before = TestUtils::getMemoryUsage();
        operation();
        MemoryUsage after = TestUtils::getMemoryUsage();

        lastMemoryMetrics = {
            before.usageBytes,
            after.usageBytes,
            after.usageBytes - before.usageBytes,
            static_cast<double>(after.usageBytes - before.usageBytes) / before.usageBytes * 100.0
        };
    }

    struct MemoryMetrics
    {
        int64_t beforeUsageBytes = 0;
        int64_t afterUsageBytes = 0;
        int64_t deltaBytes = 0;
        double deltaPercentage = 0.0;
    };

    std::unique_ptr<PerformanceMonitor> performanceMonitor;
    std::vector<std::unique_ptr<MockComponent>> performanceTestComponents;
    FrameMetrics lastFrameMetrics;
    MemoryMetrics lastMemoryMetrics;

    class PerformanceMonitor
    {
    public:
        void startMonitoring()
        {
            isMonitoring = true;
            monitoringStartTime = std::chrono::high_resolution_clock::now();
            peakMemoryUsage = TestUtils::getMemoryUsage().currentUsageBytes;
        }

        void stopMonitoring()
        {
            isMonitoring = false;
            monitoringEndTime = std::chrono::high_resolution_clock::now();
        }

        double getMonitoringDurationMs() const
        {
            if (!isMonitoring && monitoringStartTime.time_since_epoch().count() > 0)
            {
                auto duration = monitoringEndTime - monitoringStartTime;
                return std::chrono::duration<double, std::milli>(duration).count();
            }
            return 0.0;
        }

        int64_t getPeakMemoryUsage() const { return peakMemoryUsage; }
        bool isActive() const { return isMonitoring; }

    private:
        bool isMonitoring = false;
        std::chrono::high_resolution_clock::time_point monitoringStartTime;
        std::chrono::high_resolution_clock::time_point monitoringEndTime;
        int64_t peakMemoryUsage = 0;
    };
};

/**
 * @brief Test component creation and destruction performance
 */
TEST_F(UIPerformanceTest, ComponentCreationDestruction)
{
    const int numIterations = 1000;

    // Measure component creation performance
    startPerformanceMeasurement();

    std::vector<std::unique_ptr<juce::Component>> components;
    for (int i = 0; i < numIterations; ++i)
    {
        auto component = std::make_unique<MockComponent("TestComponent" + juce::String(i));
        component->setSize(100, 50);
        components.push_back(std::move(component));
    }

    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 500.0) // Should complete within 500ms
        << "Component creation took too long: " << getLastExecutionTime() << "ms";

    EXPECT_EQ(components.size(), numIterations);

    // Measure component destruction performance
    startPerformanceMeasurement();
    components.clear();
    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 100.0) // Should complete within 100ms
        << "Component destruction took too long: " << getLastExecutionTime() << "ms";
}

/**
 * @brief Test layout calculation performance
 */
TEST_F(UIPerformanceTest, LayoutCalculation)
{
    createTestLayoutContainers();

    // Add many components to layout
    for (auto& component : performanceTestComponents)
    {
        flexLayout->addItem(component.get());
    }

    EXPECT_EQ(flexLayout->getItemCount(), static_cast<int>(performanceTestComponents.size()));

    // Measure layout calculation performance
    startPerformanceMeasurement();

    for (int i = 0; i < 100; ++i)
    {
        flexLayout->setSize(800 + i * 10, 600 + i * 5);
        flexLayout->updateLayout();
        processUIEvents(10);
    }

    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 2000.0) // Should complete within 2 seconds
        << "Layout calculation took too long: " << getLastExecutionTime() << "ms";
}

/**
 * @brief Test rendering performance with many components
 */
TEST_F(UIPerformanceTest, RenderingPerformance)
{
    measureRenderingPerformance();

    // Verify frame rate meets minimum requirements
    EXPECT_GE(lastFrameMetrics.actualFPS, 30.0) // Should maintain at least 30 FPS
        << "Rendering performance too low: " << lastFrameMetrics.actualFPS << " FPS";

    // Verify frame time consistency
    EXPECT_LT(lastFrameMetrics.maxFrameTimeMs - lastFrameMetrics.minFrameTimeMs, 10.0)
        << "Frame time variance too high: " << (lastFrameMetrics.maxFrameTimeMs - lastFrameMetrics.minFrameTimeMs) << "ms";

    EXPECT_LT(lastFrameMetrics.averageFrameTimeMs, 33.3) // Should average under 33.3ms (30 FPS)
        << "Average frame time too high: " << lastFrameMetrics.averageFrameTimeMs << "ms";
}

/**
 * @brief Test memory usage during UI operations
 */
TEST_F(UIPerformanceTest, MemoryUsage)
{
    measureMemoryUsageDuringOperations([this]() {
        simulateHeavyUIOperations();

        // Create additional components
        for (int i = 0; i < 500; ++i)
        {
            auto component = std::make_unique<MockComponent>("MemoryTestComponent" + juce::String(i));
            component->setSize(100, 50);
            performanceTestComponents.push_back(std::move(component));
        }

        processUIEvents(100);
    });

    // Memory usage should be reasonable
    EXPECT_LT(lastMemoryMetrics.deltaBytes, 100 * 1024 * 1024) // Less than 100MB increase
        << "Memory usage increased too much: " << (lastMemoryMetrics.deltaBytes / 1024 / 1024) << "MB";

    EXPECT_LT(lastMemoryMetrics.deltaPercentage, 50.0) // Less than 50% increase
        << "Memory usage percentage increase too high: " << lastMemoryMetrics.deltaPercentage << "%";
}

/**
 * @brief Test animation performance
 */
TEST_F(UIPerformanceTest, AnimationPerformance)
{
    createTestAnimations();

    const int animationFrames = 120; // 2 seconds at 60fps
    const double frameInterval = 1000.0 / 60.0;

    startPerformanceMeasurement();

    for (int frame = 0; frame < animationFrames; ++frame)
    {
        auto frameStart = std::chrono::high_resolution_clock::now();

        // Update all animations
        for (auto& animation : testAnimations)
        {
            animation->update(1.0 / 60.0); // 60fps update
        }

        // Process UI updates
        processUIEvents(5);

        auto frameEnd = std::chrono::high_resolution_clock::now();
        auto frameDuration = std::chrono::duration<double, std::milli>(frameEnd - frameStart).count();

        // Maintain frame rate
        if (frameDuration < frameInterval)
        {
            std::this_thread::sleep_for(std::chrono::milliseconds(static_cast<int>(frameInterval - frameDuration)));
        }
    }

    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 2500.0) // Should complete within 2.5 seconds
        << "Animation performance too low: " << getLastExecutionTime() << "ms";
}

/**
 * @brief Test event handling performance
 */
TEST_F(UIPerformanceTest, EventHandlingPerformance)
{
    createTestLayoutContainers();

    // Add components to layout
    for (auto& component : performanceTestComponents)
    {
        flexLayout->addItem(component.get());
        testWindow->addAndMakeVisible(component.get());
    }

    flexLayout->updateLayout();

    const int numEvents = 1000;
    std::vector<std::unique_ptr<juce::MouseEvent>> mouseEvents;

    // Generate mouse events
    for (int i = 0; i < numEvents; ++i)
    {
        auto event = std::make_unique<juce::MouseEvent>(
            juce::Point<int>(rand() % 800, rand() % 600),
            juce::ModifierKeys(),
            juce::Time::getCurrentTime(),
            0.0f,
            0.0f,
            juce::MouseEvent::EventType::mouseMove,
            1
        );
        mouseEvents.push_back(std::move(event));
    }

    // Measure event handling performance
    startPerformanceMeasurement();

    for (const auto& event : mouseEvents)
    {
        testWindow->mouseMove(*event);
        processUIEvents(1);
    }

    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 1000.0) // Should complete within 1 second
        << "Event handling too slow: " << getLastExecutionTime() << "ms";
}

/**
 * @brief Test theme switching performance
 */
TEST_F(UIPerformanceTest, ThemeSwitchingPerformance)
{
    createTestThemes();

    const int numThemeSwitches = 50;

    // Measure theme switching performance
    startPerformanceMeasurement();

    for (int i = 0; i < numThemeSwitches; ++i)
    {
        const Theme& theme = testThemes[i % testThemes.size()];
        themeManager->applyTheme(theme);
        processUIEvents(20);
    }

    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 2000.0) // Should complete within 2 seconds
        << "Theme switching too slow: " << getLastExecutionTime() << "ms";

    // Average theme switch time should be reasonable
    double averageSwitchTime = getLastExecutionTime() / numThemeSwitches;
    EXPECT_LT(averageSwitchTime, 40.0) // Should average under 40ms per switch
        << "Average theme switch time too high: " << averageSwitchTime << "ms";
}

/**
 * @brief Test accessibility performance impact
 */
TEST_F(UIPerformanceTest, AccessibilityPerformanceImpact)
{
    // Test performance with accessibility enabled vs disabled
    auto accessibilityManager = std::make_unique<AccessibilityManager>();

    // Measure baseline performance (accessibility disabled)
    startPerformanceMeasurement();
    simulateHeavyUIOperations();
    double baselineTime = getLastExecutionTime();

    // Enable accessibility
    accessibilityManager->enableKeyboardNavigation(true);
    accessibilityManager->enableScreenReaderSupport(true);

    // Register components for accessibility
    for (auto& component : performanceTestComponents)
    {
        AccessibilityInfo info;
        info.component = component.get();
        info.role = AccessibilityRole::Button;
        info.text.name = component->getComponentName();
        accessibilityManager->registerComponent(component.get(), info);
    }

    // Measure performance with accessibility enabled
    startPerformanceMeasurement();
    simulateHeavyUIOperations();

    // Test accessibility operations
    for (auto& component : performanceTestComponents)
    {
        accessibilityManager->setFocus(component.get());
        accessibilityManager->navigateToNext();
    }

    double accessibilityTime = getLastExecutionTime();

    // Accessibility performance impact should be minimal
    double performanceImpact = (accessibilityTime - baselineTime) / baselineTime * 100.0;
    EXPECT_LT(performanceImpact, 20.0) // Less than 20% performance impact
        << "Accessibility performance impact too high: " << performanceImpact << "%";
}

/**
 * @brief Test multi-threaded UI operations
 */
TEST_F(UIPerformanceTest, MultiThreadedOperations)
{
    const int numThreads = 4;
    const int operationsPerThread = 100;

    std::vector<std::thread> threads;
    std::atomic<int> successCount{0};
    std::atomic<int> totalOperations{0};

    startPerformanceMeasurement();

    for (int t = 0; t < numThreads; ++t)
    {
        threads.emplace_back([&, t]() {
            for (int i = 0; i < operationsPerThread; ++i)
            {
                try
                {
                    // Simulate UI operations
                    int componentIndex = (t * operationsPerThread + i) % performanceTestComponents.size();
                    auto& component = performanceTestComponents[componentIndex];

                    component->repaint();
                    component->setSize(component->getWidth() + 1, component->getHeight() + 1);
                    processUIEvents(5);

                    successCount++;
                    totalOperations++;
                }
                catch (...)
                {
                    totalOperations++;
                }
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }

    stopPerformanceMeasurement();

    EXPECT_EQ(successCount, totalOperations);
    EXPECT_EQ(totalOperations, numThreads * operationsPerThread);

    EXPECT_LT(getLastExecutionTime(), 5000.0) // Should complete within 5 seconds
        << "Multi-threaded operations too slow: " << getLastExecutionTime() << "ms";
}

/**
 * @brief Test long-running application performance
 */
TEST_F(UIPerformanceTest, LongRunningPerformance)
{
    const int testDurationSeconds = 10;
    const int operationsPerSecond = 60;

    auto startTime = std::chrono::high_resolution_clock::now();
    auto endTime = startTime + std::chrono::seconds(testDurationSeconds);

    std::atomic<bool> testRunning{true};
    std::atomic<int> operationCount{0};
    std::vector<double> operationTimes;

    std::thread workerThread([&]() {
        while (testRunning)
        {
            auto operationStart = std::chrono::high_resolution_clock::now();

            // Perform UI operation
            int componentIndex = operationCount % performanceTestComponents.size();
            auto& component = performanceTestComponents[componentIndex];

            component->repaint();
            processUIEvents(5);

            auto operationEnd = std::chrono::high_resolution_clock::now();
            auto operationDuration = std::chrono::duration<double, std::milli>(operationEnd - operationStart).count();
            operationTimes.push_back(operationDuration);

            operationCount++;

            // Rate limiting
            std::this_thread::sleep_for(std::chrono::milliseconds(1000 / operationsPerSecond));
        }
    });

    // Run for specified duration
    while (std::chrono::high_resolution_clock::now() < endTime)
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    testRunning = false;
    workerThread.join();

    // Analyze performance
    EXPECT_GE(operationCount, testDurationSeconds * operationsPerSecond * 0.9); // At least 90% of expected operations

    if (!operationTimes.empty())
    {
        double averageOperationTime = std::accumulate(operationTimes.begin(), operationTimes.end(), 0.0) / operationTimes.size();
        double maxOperationTime = *std::max_element(operationTimes.begin(), operationTimes.end());

        EXPECT_LT(averageOperationTime, 50.0) // Average operation time under 50ms
            << "Average operation time too high: " << averageOperationTime << "ms";

        EXPECT_LT(maxOperationTime, 200.0) // Max operation time under 200ms
            << "Max operation time too high: " << maxOperationTime << "ms";
    }
}

/**
 * @brief Test memory leak detection
 */
TEST_F(UIPerformanceTest, MemoryLeakDetection)
{
    MemoryUsage baseline = TestUtils::getMemoryUsage();

    // Perform operations that could potentially leak memory
    for (int iteration = 0; iteration < 10; ++iteration)
    {
        // Create and destroy components
        std::vector<std::unique_ptr<juce::Component>> tempComponents;
        for (int i = 0; i < 100; ++i)
        {
            auto component = std::make_unique<MockComponent>("TempComponent" + juce::String(i));
            component->setSize(100, 50);
            tempComponents.push_back(std::move(component));
        }

        // Perform UI operations
        for (auto& component : tempComponents)
        {
            component->repaint();
            processUIEvents(5);
        }

        // Components should be destroyed when going out of scope
    }

    // Force garbage collection
    processUIEvents(1000);

    MemoryUsage afterOperations = TestUtils::getMemoryUsage();

    // Memory usage should not increase significantly
    int64_t memoryIncrease = afterOperations.currentUsageBytes - baseline.currentUsageBytes;
    EXPECT_LT(memoryIncrease, 10 * 1024 * 1024) // Less than 10MB increase
        << "Potential memory leak detected: " << (memoryIncrease / 1024 / 1024) << "MB increase";
}

/**
 * @brief Test resource cleanup performance
 */
TEST_F(UIPerformanceTest, ResourceCleanupPerformance)
{
    const int numResources = 1000;

    // Create resources
    std::vector<std::unique_ptr<juce::Image>> images;
    std::vector<std::unique_ptr<juce::Font>> fonts;

    for (int i = 0; i < numResources; ++i)
    {
        // Create images
        auto image = std::make_unique<juce::Image>(juce::Image::PixelFormat::ARGB, 100, 100, true);
        images.push_back(std::move(image));

        // Create fonts
        auto font = std::make_unique<juce::Font>(12.0f + i % 10);
        fonts.push_back(std::move(font));
    }

    // Measure cleanup performance
    startPerformanceMeasurement();

    images.clear();
    fonts.clear();

    stopPerformanceMeasurement();

    EXPECT_LT(getLastExecutionTime(), 1000.0) // Should cleanup within 1 second
        << "Resource cleanup too slow: " << getLastExecutionTime() << "ms";
}

/**
 * @brief Test performance under stress conditions
 */
TEST_F(UIPerformanceTest, StressTestPerformance)
{
    // Create stress conditions with many components and animations
    const int stressComponents = 500;
    std::vector<std::unique_ptr<MockComponent>> stressComponents;

    for (int i = 0; i < stressComponents; ++i)
    {
        auto component = std::make_unique<MockComponent>("StressComponent" + juce::String(i));
        component->setSize(20 + i % 30, 20 + i % 20);
        component->setTopLeftPosition(rand() % 800, rand() % 600);
        stressComponents.push_back(std::move(component));
    }

    // Add to window
    for (auto& component : stressComponents)
    {
        testWindow->addAndMakeVisible(component.get());
    }

    // Measure performance under stress
    measureRenderingPerformance();

    // Even under stress, should maintain reasonable performance
    EXPECT_GE(lastFrameMetrics.actualFPS, 15.0) // Should maintain at least 15 FPS under stress
        << "Performance under stress too low: " << lastFrameMetrics.actualFPS << " FPS";

    EXPECT_LT(lastFrameMetrics.averageFrameTimeMs, 66.7) // Should average under 66.7ms (15 FPS)
        << "Average frame time under stress too high: " << lastFrameMetrics.averageFrameTimeMs << "ms";
}

// Run performance tests
int runPerformanceTests(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}