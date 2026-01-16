#include "UITestSuite.cpp"
#include <gtest/gtest.h>
#include <memory>
#include <random>
#include <thread>
#include <chrono>

using namespace UITestFramework;
using namespace UITestFramework::Mock;

/**
 * @brief Comprehensive animation testing
 */
class AnimationTest : public AnimationTestFixture
{
};

/**
 * @brief Test animation engine initialization
 */
TEST_F(AnimationTest, InitializeAnimationEngine)
{
    ASSERT_NO_THROW(animationEngine = std::make_unique<AnimationEngine>());
    ASSERT_NE(animationEngine, nullptr);
    EXPECT_TRUE(animationEngine->isInitialized());
    EXPECT_EQ(animationEngine->getActiveAnimationCount(), 0);
}

/**
 * @brief Test basic animation creation and management
 */
TEST_F(AnimationTest, AnimationCreation)
{
    createTestAnimations();
    ASSERT_FALSE(testAnimations.empty());

    for (const auto& animation : testAnimations)
    {
        ASSERT_NE(animation, nullptr);
        EXPECT_FALSE(animation->isComplete());
        EXPECT_EQ(animation->getProgress(), 0.0);
    }

    EXPECT_EQ(animationEngine->getActiveAnimationCount(), static_cast<int>(testAnimations.size()));
}

/**
 * @brief Test animation progress and completion
 */
TEST_F(AnimationTest, AnimationProgress)
{
    createTestAnimations();
    ASSERT_FALSE(testAnimations.empty());

    auto animation = testAnimations[0].get();

    // Test progress updates
    animation->update(0.25);
    EXPECT_EQ(animation->getProgress(), 0.25);
    EXPECT_FALSE(animation->isComplete());

    animation->update(0.75);
    EXPECT_EQ(animation->getProgress(), 1.0); // Should clamp to 1.0
    EXPECT_TRUE(animation->isComplete());

    // Test complete animation doesn't progress further
    animation->update(0.5);
    EXPECT_TRUE(animation->isComplete());
}

/**
 * @brief Test animation duration and timing
 */
TEST_F(AnimationTest, AnimationDuration)
{
    createTestAnimations();

    for (const auto& animation : testAnimations)
    {
        auto duration = animation->getDuration();
        EXPECT_GT(duration.inMilliseconds(), 0);

        // Test timing calculations
        double progress = animationEngine->calculateProgress(animation.get(), duration.inMilliseconds() * 0.5);
        EXPECT_NEAR(progress, 0.5, 0.01);
    }
}

/**
 * @brief Test animation easing functions
 */
TEST_F(AnimationTest, EasingFunctions)
{
    createTestAnimations();

    // Test different easing types
    std::vector<EasingType> easingTypes = {
        EasingType::Linear,
        EasingType::EaseIn,
        EasingType::EaseOut,
        EasingType::EaseInOut,
        EasingType::EaseInQuad,
        EasingType::EaseOutQuad,
        EasingType::EaseInOutQuad,
        EasingType::EaseInCubic,
        EasingType::EaseOutCubic,
        EasingType::EaseInOutCubic
    };

    for (EasingType easingType : easingTypes)
    {
        // Test easing function bounds
        double easedValue = animationEngine->applyEasing(0.5, easingType);
        EXPECT_GE(easedValue, 0.0);
        EXPECT_LE(easedValue, 1.0);

        // Test easing function properties
        double easedStart = animationEngine->applyEasing(0.0, easingType);
        double easedEnd = animationEngine->applyEasing(1.0, easingType);

        EXPECT_DOUBLE_EQ(easedStart, 0.0);
        EXPECT_DOUBLE_EQ(easedEnd, 1.0);
    }
}

/**
 * @brief Test property animations
 */
TEST_F(AnimationTest, PropertyAnimations)
{
    createTestAnimatedComponents();
    ASSERT_FALSE(animatedComponents.empty());

    auto component = animatedComponents[0].get();
    juce::Rectangle<int> initialBounds(50, 50, 100, 50);

    component->setBounds(initialBounds);

    // Create position animation
    auto positionAnimation = animationEngine->createPropertyAnimation(
        component,
        "position",
        juce::Point<int>(150, 100),
        juce::Point<int>(250, 200),
        1000.0
    );

    ASSERT_NE(positionAnimation, nullptr);
    EXPECT_EQ(animationEngine->getActiveAnimationCount(), 1);

    // Create size animation
    auto sizeAnimation = animationEngine->createPropertyAnimation(
        component,
        "size",
        juce::Point<int>(100, 50),
        juce::Point<int>(200, 100),
        1000.0
    );

    EXPECT_EQ(animationEngine->getActiveAnimationCount(), 2);

    // Test animation progress
    animationEngine->update(500.0); // 500ms progress
    processUIEvents(50);

    auto currentBounds = component->getBounds();
    // Should be approximately halfway between start and end positions
    EXPECT_GT(currentBounds.getX(), 50);
    EXPECT_LT(currentBounds.getX(), 250);
    EXPECT_GT(currentBounds.getY(), 50);
    EXPECT_LT(currentBounds.getY(), 200);
}

/**
 * @brief Test color animations
 */
TEST_F(AnimationTest, ColorAnimations)
{
    createTestAnimatedComponents();

    auto component = animatedComponents[0].get();
    component->setColour(juce::Component::backgroundColourId, juce::Colours::red);

    // Create color animation
    auto colorAnimation = animationEngine->createColorAnimation(
        component,
        juce::Component::backgroundColourId,
        juce::Colours::red,
        juce::Colours::blue,
        1000.0
    );

    ASSERT_NE(colorAnimation, nullptr);

    // Test intermediate color
    animationEngine->update(500.0);
    processUIEvents(50);

    auto currentColor = component->findColour(juce::Component::backgroundColourId);
    // Should be a color between red and blue
    EXPECT_NE(currentColor, juce::Colours::red);
    EXPECT_NE(currentColor, juce::Colours::blue);
}

/**
 * @brief Test opacity animations
 */
TEST_F(AnimationTest, OpacityAnimations)
{
    createTestAnimatedComponents();

    auto component = animatedComponents[0].get();
    component->setAlpha(1.0f);

    // Create fade out animation
    auto fadeOutAnimation = animationEngine->createOpacityAnimation(
        component,
        1.0f,
        0.0f,
        500.0
    );

    ASSERT_NE(fadeOutAnimation, nullptr);

    // Test intermediate opacity
    animationEngine->update(250.0);
    processUIEvents(50);

    float currentOpacity = component->getAlpha();
    EXPECT_GT(currentOpacity, 0.0f);
    EXPECT_LT(currentOpacity, 1.0f);

    // Test completion
    animationEngine->update(250.0);
    processUIEvents(50);

    EXPECT_FLOAT_EQ(component->getAlpha(), 0.0f);
}

/**
 * @brief Test rotation animations
 */
TEST_F(AnimationTest, RotationAnimations)
{
    createTestAnimatedComponents();

    auto component = animatedComponents[0].get();
    component->setSize(100, 100);

    // Create rotation animation
    auto rotationAnimation = animationEngine->createRotationAnimation(
        component,
        0.0f,
        360.0f,
        2000.0
    );

    ASSERT_NE(rotationAnimation, nullptr);

    // Test intermediate rotation
    animationEngine->update(1000.0); // Halfway
    processUIEvents(50);

    // Rotation should be applied (visual verification would be in UI)
    EXPECT_EQ(animationEngine->getActiveAnimationCount(), 1);
}

/**
 * @brief Test animation sequences
 */
TEST_F(AnimationTest, AnimationSequences)
{
    createTestAnimatedComponents();
    ASSERT_GE(animatedComponents.size(), 2);

    auto component1 = animatedComponents[0].get();
    auto component2 = animatedComponents[1].get();

    // Create animation sequence
    auto sequence = animationEngine->createAnimationSequence();

    // Add animations to sequence
    auto anim1 = animationEngine->createPropertyAnimation(
        component1, "position",
        juce::Point<int>(0, 0), juce::Point<int>(100, 0), 500.0);

    auto anim2 = animationEngine->createPropertyAnimation(
        component2, "position",
        juce::Point<int>(0, 0), juce::Point<int>(0, 100), 500.0);

    sequence->addAnimation(anim1, 0.0);    // Start immediately
    sequence->addAnimation(anim2, 500.0);  // Start after 500ms

    EXPECT_EQ(animationEngine->getActiveAnimationCount(), 1);

    // Test sequence progression
    animationEngine->update(250.0);
    processUIEvents(50);

    // First animation should be active
    EXPECT_FALSE(anim1->isComplete());
    EXPECT_FALSE(anim2->isStarted());

    animationEngine->update(250.0);
    processUIEvents(50);

    // First animation should be complete, second should start
    EXPECT_TRUE(anim1->isComplete());
    EXPECT_TRUE(anim2->isStarted());
}

/**
 * @brief Test animation groups (parallel animations)
 */
TEST_F(AnimationTest, AnimationGroups)
{
    createTestAnimatedComponents();
    ASSERT_GE(animatedComponents.size(), 2);

    auto component1 = animatedComponents[0].get();
    auto component2 = animatedComponents[1].get();

    // Create animation group
    auto group = animationEngine->createAnimationGroup();

    // Add parallel animations
    auto anim1 = animationEngine->createPropertyAnimation(
        component1, "position",
        juce::Point<int>(0, 0), juce::Point<int>(100, 0), 1000.0);

    auto anim2 = animationEngine->createPropertyAnimation(
        component2, "position",
        juce::Point<int>(0, 0), juce::Point<int>(0, 100), 1000.0);

    group->addAnimation(anim1);
    group->addAnimation(anim2);

    // Both animations should start immediately
    EXPECT_TRUE(anim1->isStarted());
    EXPECT_TRUE(anim2->isStarted());

    // Test parallel progression
    animationEngine->update(500.0);
    processUIEvents(50);

    // Both should be halfway through
    EXPECT_DOUBLE_EQ(anim1->getProgress(), 0.5);
    EXPECT_DOUBLE_EQ(anim2->getProgress(), 0.5);
}

/**
 * @brief Test animation cancellation and removal
 */
TEST_F(AnimationTest, AnimationCancellation)
{
    createTestAnimations();

    int initialCount = animationEngine->getActiveAnimationCount();
    ASSERT_GT(initialCount, 0);

    // Cancel an animation
    auto animation = testAnimations[0].get();
    animationEngine->cancelAnimation(animation);

    EXPECT_EQ(animationEngine->getActiveAnimationCount(), initialCount - 1);
    EXPECT_TRUE(animation->isComplete());

    // Cancel all animations
    animationEngine->cancelAllAnimations();
    EXPECT_EQ(animationEngine->getActiveAnimationCount(), 0);

    // All animations should be marked as complete
    for (const auto& anim : testAnimations)
    {
        EXPECT_TRUE(anim->isComplete());
    }
}

/**
 * @brief Test animation pausing and resuming
 */
TEST_F(AnimationTest, AnimationPauseResume)
{
    createTestAnimations();

    auto animation = testAnimations[0].get();

    // Start animation
    animationEngine->update(100.0);
    EXPECT_DOUBLE_EQ(animation->getProgress(), 0.1);
    EXPECT_FALSE(animation->isPaused());

    // Pause animation
    animationEngine->pauseAnimation(animation);
    EXPECT_TRUE(animation->isPaused());

    // Update while paused
    animationEngine->update(200.0);
    EXPECT_DOUBLE_EQ(animation->getProgress(), 0.1); // Should not change

    // Resume animation
    animationEngine->resumeAnimation(animation);
    EXPECT_FALSE(animation->isPaused());

    // Update after resume
    animationEngine->update(100.0);
    EXPECT_DOUBLE_EQ(animation->getProgress(), 0.2);
}

/**
 * @brief Test animation performance
 */
TEST_F(AnimationTest, Performance)
{
    createTestAnimations();
    verifyAnimationPerformance();
}

/**
 * @brief Test animation thread safety
 */
TEST_F(AnimationTest, ThreadSafety)
{
    testAnimationThreadSafety();
}

/**
 * @brief Test animation completion callbacks
 */
TEST_F(AnimationTest, CompletionCallbacks)
{
    createTestAnimations();

    bool callbackExecuted = false;
    auto animation = testAnimations[0].get();

    // Add completion callback
    animation->onComplete([&callbackExecuted]() {
        callbackExecuted = true;
    });

    // Complete the animation
    animation->update(1.0);
    processUIEvents(50);

    EXPECT_TRUE(callbackExecuted);
}

/**
 * @brief Test animation interpolation
 */
TEST_F(AnimationTest, Interpolation)
{
    // Test linear interpolation
    auto linearResult = animationEngine->interpolate(0.0f, 100.0f, 0.5, EasingType::Linear);
    EXPECT_FLOAT_EQ(linearResult, 50.0f);

    // Test ease-in interpolation
    auto easeInResult = animationEngine->interpolate(0.0f, 100.0f, 0.5, EasingType::EaseInQuad);
    EXPECT_LT(easeInResult, 50.0f); // Should be less than linear

    // Test ease-out interpolation
    auto easeOutResult = animationEngine->interpolate(0.0f, 100.0f, 0.5, EasingType::EaseOutQuad);
    EXPECT_GT(easeOutResult, 50.0f); // Should be greater than linear

    // Test color interpolation
    auto red = juce::Colours::red;
    auto blue = juce::Colours::blue;
    auto interpolatedColor = animationEngine->interpolateColor(red, blue, 0.5);

    EXPECT_NE(interpolatedColor, red);
    EXPECT_NE(interpolatedColor, blue);
    EXPECT_GT(interpolatedColor.getRed(), 0);
    EXPECT_LT(interpolatedColor.getRed(), 255);
}

/**
 * @brief Test animation with different frame rates
 */
TEST_F(AnimationTest, VariableFrameRate)
{
    createTestAnimations();

    auto animation = testAnimations[0].get();
    double totalTime = 1000.0; // 1 second animation

    // Simulate different update intervals
    std::vector<double> intervals = {16.67, 33.33, 50.0, 100.0}; // 60fps, 30fps, 20fps, 10fps

    for (double interval : intervals)
    {
        animation->reset();
        double elapsedTime = 0.0;

        while (elapsedTime < totalTime)
        {
            animation->update(interval / totalTime); // Convert to progress
            elapsedTime += interval;
        }

        EXPECT_TRUE(animation->isComplete());
    }
}

/**
 * @brief Test animation memory management
 */
TEST_F(AnimationTest, MemoryManagement)
{
    MemoryUsage baseline = TestUtils::getMemoryUsage();

    // Create and destroy many animations
    for (int i = 0; i < 1000; ++i)
    {
        auto animation = animationEngine->createPropertyAnimation(
            createMockComponent("TempComponent" + juce::String(i)),
            "position",
            juce::Point<int>(0, 0),
            juce::Point<int>(100, 100),
            1000.0
        );

        // Animation goes out of scope and should be cleaned up
    }

    animationEngine->update(100.0); // Force cleanup of completed animations

    MemoryUsage afterOperations = TestUtils::getMemoryUsage();

    // Memory usage should not increase significantly
    EXPECT_LT(afterOperations.usageDeltaBytes, 10 * 1024 * 1024); // Less than 10MB
}

/**
 * @brief Test animation with audio thread safety
 */
TEST_F(AnimationTest, AudioThreadSafety)
{
    createTestAnimations();

    // Test that animations don't block audio thread
    std::atomic<bool> audioThreadRunning{true};
    std::atomic<int> audioThreadIterations{0};

    // Simulate audio thread
    std::thread audioThread([&]() {
        auto startTime = std::chrono::high_resolution_clock::now();
        while (audioThreadRunning)
        {
            // Simulate audio processing
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
            audioThreadIterations++;

            auto currentTime = std::chrono::high_resolution_clock::now();
            auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(currentTime - startTime);
            if (elapsed.count() > 1000) // Run for 1 second
                break;
        }
    });

    // Run animations in main thread
    startPerformanceMeasurement();
    animationEngine->update(1000.0); // 1 second of animation
    stopPerformanceMeasurement();

    audioThreadRunning = false;
    audioThread.join();

    // Audio thread should have continued running
    EXPECT_GT(audioThreadIterations, 0);
    EXPECT_LT(getLastExecutionTime(), 100.0); // Animation update should be fast
}

/**
 * @brief Test animation error handling
 */
TEST_F(AnimationTest, ErrorHandling)
{
    // Test with null component
    auto nullAnimation = animationEngine->createPropertyAnimation(
        nullptr,
        "position",
        juce::Point<int>(0, 0),
        juce::Point<int>(100, 100),
        1000.0
    );

    EXPECT_EQ(nullAnimation, nullptr);

    // Test with invalid property name
    auto component = createMockComponent("TestComponent");
    auto invalidAnimation = animationEngine->createPropertyAnimation(
        component,
        "invalidProperty",
        juce::Point<int>(0, 0),
        juce::Point<int>(100, 100),
        1000.0
    );

    EXPECT_EQ(invalidAnimation, nullptr);

    // Test with invalid duration
    auto invalidDurationAnimation = animationEngine->createPropertyAnimation(
        component,
        "position",
        juce::Point<int>(0, 0),
        juce::Point<int>(100, 100),
        -100.0 // Negative duration
    );

    EXPECT_EQ(invalidDurationAnimation, nullptr);
}

// Run animation tests
int runAnimationTests(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}