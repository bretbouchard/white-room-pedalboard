#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <functional>
#include <memory>
#include <vector>
#include <unordered_map>
#include <atomic>
#include <mutex>

namespace jive
{

/**
 * @brief Easing functions for smooth animations
 */
enum class EasingType
{
    Linear,         // Constant speed
    EaseIn,         // Accelerating from zero velocity
    EaseOut,        // Decelerating to zero velocity
    EaseInOut,      // Acceleration then deceleration
    EaseInQuad,     // Quadratic easing in
    EaseOutQuad,    // Quadratic easing out
    EaseInOutQuad,  // Quadratic easing in/out
    EaseInCubic,    // Cubic easing in
    EaseOutCubic,   // Cubic easing out
    EaseInOutCubic, // Cubic easing in/out
    EaseInQuart,    // Quartic easing in
    EaseOutQuart,   // Quartic easing out
    EaseInOutQuart, // Quartic easing in/out
    EaseInQuint,    // Quintic easing in
    EaseOutQuint,   // Quintic easing out
    EaseInOutQuint, // Quintic easing in/out
    EaseInSine,     // Sinusoidal easing in
    EaseOutSine,    // Sinusoidal easing out
    EaseInOutSine,  // Sinusoidal easing in/out
    EaseInExpo,     // Exponential easing in
    EaseOutExpo,    // Exponential easing out
    EaseInOutExpo,  // Exponential easing in/out
    EaseInCirc,     // Circular easing in
    EaseOutCirc,    // Circular easing out
    EaseInOutCirc,  // Circular easing in/out
    EaseInBack,     // Back easing in (overshoot)
    EaseOutBack,    // Back easing out (overshoot)
    EaseInOutBack,  // Back easing in/out (overshoot)
    EaseInElastic,  // Elastic easing in
    EaseOutElastic, // Elastic easing out
    EaseInOutElastic, // Elastic easing in/out
    EaseInBounce,   // Bounce easing in
    EaseOutBounce,  // Bounce easing out
    EaseInOutBounce, // Bounce easing in/out
    Spring,         // Spring physics simulation
    Anticipate,     // Anticipation before main motion
    Overshoot       // Overshoot beyond target
};

/**
 * @brief Animation target types
 */
enum class AnimationTarget
{
    Position,       // Component position (x, y)
    Size,          // Component size (width, height)
    Scale,         // Component scale (x, y)
    Rotation,      // Component rotation angle
    Alpha,         // Component opacity
    Color,         // Color transition
    Bounds,        // Complete bounds rectangle
    CustomProperty // Custom property animation
};

/**
 * @brief Animation update callback function
 */
using AnimationUpdateCallback = std::function<void(float progress, float currentValue)>;

/**
 * @brief Animation completion callback function
 */
using AnimationCompletionCallback = std::function<void(bool wasCompleted)>;

/**
 * @brief Single animation keyframe
 */
struct Keyframe
{
    float time;           // Time position (0.0 to 1.0)
    float value;          // Value at this keyframe
    EasingType easing;    // Easing to next keyframe

    Keyframe(float t, float v, EasingType e = EasingType::Linear)
        : time(t), value(v), easing(e) {}
};

/**
 * @brief Animation properties
 */
struct AnimationProperties
{
    float duration = 1.0f;              // Duration in seconds
    float delay = 0.0f;                 // Delay before start
    EasingType easing = EasingType::EaseInOut; // Easing function
    bool autoReverse = false;           // Auto reverse on completion
    int repeatCount = 0;                // Number of repeats (-1 = infinite)
    float repeatDelay = 0.0f;           // Delay between repeats
    bool pingPong = false;              // Reverse direction on repeat
    float startTimeOffset = 0.0f;       // Start time offset
    bool respectReducedMotion = true;   // Respect user accessibility preference
    int priority = 0;                   // Animation priority (higher = more important)

    AnimationUpdateCallback updateCallback;
    AnimationCompletionCallback completionCallback;
};

/**
 * @brief High-performance animation engine for real-time audio applications
 *
 * AnimationEngine provides a comprehensive animation system optimized for
 * DAW applications with real-time performance requirements. Features include:
 * - Multiple easing curves and timing functions
 * - Hardware-accelerated rendering when available
 * - Audio-thread safe operation
 * - Accessibility compliance (respects prefers-reduced-motion)
 * - Performance optimization for smooth 60fps animations
 * - Theme-aware animations
 */
class AnimationEngine
    : private juce::Timer
    , private juce::AudioThreadLocker
{
public:
    /**
     * @brief Animation instance
     */
    class Animation
    {
    public:
        Animation(AnimationEngine& engine,
                 juce::Component* target,
                 AnimationTarget targetType,
                 const AnimationProperties& properties);
        ~Animation();

        /** @name Animation Control */
        //@{
        /**
         * @brief Starts the animation
         */
        void start();

        /**
         * @brief Stops the animation
         * @param complete Whether to jump to final state
         */
        void stop(bool complete = false);

        /**
         * @brief Pauses the animation
         */
        void pause();

        /**
         * @brief Resumes the animation
         */
        void resume();

        /**
         * @brief Restarts the animation from beginning
         */
        void restart();

        /**
         * @brief Sets new target value (interpolates from current)
         * @param newTargetValue New target value
         */
        void setTargetValue(float newTargetValue);

        /**
         * @brief Sets animation progress manually
         * @param progress Progress value (0.0 to 1.0)
         */
        void setProgress(float progress);
        //@}

        /** @name State Queries */
        //@{
        /**
         * @brief Checks if animation is currently running
         * @return true if animation is running
         */
        bool isRunning() const { return isRunningFlag; }

        /**
         * @brief Checks if animation is paused
         * @return true if animation is paused
         */
        bool isPaused() const { return isPausedFlag; }

        /**
         * @brief Gets current animation progress
         * @return Progress value (0.0 to 1.0)
         */
        float getProgress() const { return currentProgress; }

        /**
         * @brief Gets current animated value
         * @return Current interpolated value
         */
        float getCurrentValue() const { return currentValue; }

        /**
         * @brief Gets animation target component
         * @return Pointer to target component
         */
        juce::Component* getTarget() const { return targetComponent; }

        /**
         * @brief Gets animation properties
         * @return Reference to animation properties
         */
        const AnimationProperties& getProperties() const { return properties; }
        //@}

    private:
        friend class AnimationEngine;

        void update(float deltaTime);
        void applyValue(float value);
        float calculateEasedProgress(float linearProgress) const;
        bool shouldRespectReducedMotion() const;

        AnimationEngine& engine;
        juce::Component* targetComponent;
        AnimationTarget targetType;
        AnimationProperties properties;

        // State
        std::atomic<bool> isRunningFlag{false};
        std::atomic<bool> isPausedFlag{false};
        float currentProgress = 0.0f;
        float currentValue = 0.0f;
        float startValue = 0.0f;
        float targetValue = 0.0f;
        float elapsedTime = 0.0f;
        int currentRepeat = 0;
        bool isReversing = false;

        // Keyframes for complex animations
        std::vector<Keyframe> keyframes;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(Animation)
    };

    /**
     * @brief Animation group for coordinating multiple animations
     */
    class AnimationGroup
    {
    public:
        AnimationGroup(AnimationEngine& engine);
        ~AnimationGroup();

        /** @name Group Management */
        //@{
        /**
         * @brief Adds an animation to the group
         * @param animation Animation to add
         */
        void addAnimation(Animation* animation);

        /**
         * @brief Removes an animation from the group
         * @param animation Animation to remove
         */
        void removeAnimation(Animation* animation);

        /**
         * @brief Starts all animations in the group
         */
        void startAll();

        /**
         * @brief Stops all animations in the group
         * @param complete Whether to complete animations
         */
        void stopAll(bool complete = false);

        /**
         * @brief Sets staggered start delays for group animations
         * @param staggerDelay Delay between each animation start
         */
        void setStagger(float staggerDelay);

        /**
         * @brief Gets number of animations in group
         * @return Animation count
         */
        size_t getAnimationCount() const { return animations.size(); }
        //@}

    private:
        AnimationEngine& engine;
        std::vector<Animation*> animations;
        float staggerDelay = 0.0f;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AnimationGroup)
    };

public:
    AnimationEngine();
    ~AnimationEngine() override;

    /** @name Animation Creation */
    //@{
    /**
     * @brief Creates a simple value animation
     * @param component Target component
     * @param targetType Animation target type
     * @param fromValue Start value
     * @param toValue End value
     * @param properties Animation properties
     * @return Smart pointer to animation
     */
    std::unique_ptr<Animation> createAnimation(juce::Component* component,
                                            AnimationTarget targetType,
                                            float fromValue,
                                            float toValue,
                                            const AnimationProperties& properties = {});

    /**
     * @brief Creates a position animation
     * @param component Target component
     * @param fromPosition Start position
     * @param toPosition End position
     * @param properties Animation properties
     * @return Smart pointer to animation
     */
    std::unique_ptr<Animation> createPositionAnimation(juce::Component* component,
                                                      const juce::Point<float>& fromPosition,
                                                      const juce::Point<float>& toPosition,
                                                      const AnimationProperties& properties = {});

    /**
     * @brief Creates a size animation
     * @param component Target component
     * @param fromSize Start size
     * @param toSize End size
     * @param properties Animation properties
     * @return Smart pointer to animation
     */
    std::unique_ptr<Animation> createSizeAnimation(juce::Component* component,
                                                  const juce::Point<float>& fromSize,
                                                  const juce::Point<float>& toSize,
                                                  const AnimationProperties& properties = {});

    /**
     * @brief Creates a color animation
     * @param component Target component
     * @param fromColor Start color
     * @param toColor End color
     * @param properties Animation properties
     * @return Smart pointer to animation
     */
    std::unique_ptr<Animation> createColorAnimation(juce::Component* component,
                                                   juce::Colour fromColor,
                                                   juce::Colour toColor,
                                                   const AnimationProperties& properties = {});

    /**
     * @brief Creates a keyframe animation
     * @param component Target component
     * @param targetType Animation target type
     * @param keyframes Vector of keyframes
     * @param properties Animation properties
     * @return Smart pointer to animation
     */
    std::unique_ptr<Animation> createKeyframeAnimation(juce::Component* component,
                                                      AnimationTarget targetType,
                                                      const std::vector<Keyframe>& keyframes,
                                                      const AnimationProperties& properties = {});

    /**
     * @brief Creates an animation group
     * @return Smart pointer to animation group
     */
    std::unique_ptr<AnimationGroup> createAnimationGroup();
    //@}

    /** @name Engine Control */
    //@{
        /**
     * @brief Updates all animations (called automatically)
     */
    void update();

    /**
     * @brief Sets global animation speed multiplier
     * @param multiplier Speed multiplier (1.0 = normal speed)
     */
    void setGlobalSpeedMultiplier(float multiplier);

    /**
     * @brief Gets global animation speed multiplier
     * @return Current speed multiplier
     */
    float getGlobalSpeedMultiplier() const { return globalSpeedMultiplier; }

    /**
     * @brief Enables/disables all animations
     * @param enabled Whether animations should be enabled
     */
    void setAnimationsEnabled(bool enabled);

    /**
     * @brief Checks if animations are enabled
     * @return true if animations are enabled
     */
    bool areAnimationsEnabled() const { return animationsEnabled; }

    /**
     * @brief Sets maximum number of concurrent animations
     * @param maxAnimations Maximum concurrent animations
     */
    void setMaxConcurrentAnimations(int maxAnimations);

    /**
     * @brief Gets current number of running animations
     * @return Number of running animations
     */
    int getRunningAnimationCount() const;
    //@}

    /** @name Performance Optimization */
    //@{
    /**
     * @brief Enables high-performance mode for smooth animations
     * @param enabled Whether high-performance mode should be enabled
     */
    void setHighPerformanceMode(bool enabled);

    /**
     * @brief Gets current performance metrics
     * @return Map of performance metrics
     */
    std::unordered_map<juce::String, float> getPerformanceMetrics() const;

    /**
     * @brief Sets target frame rate for animations
     * @param targetFps Target frame rate (default: 60)
     */
    void setTargetFrameRate(float targetFps);

    /**
     * @brief Gets actual frame rate
     * @return Current frame rate
     */
    float getActualFrameRate() const { return actualFrameRate; }
    //@}

    /** @name Accessibility */
    //@{
    /**
     * @brief Sets whether to respect reduced motion preference
     * @param respect Whether to respect reduced motion
     */
    void setRespectReducedMotion(bool respect);

    /**
     * @brief Gets reduced motion preference
     * @return true if reduced motion should be respected
     */
    bool getRespectReducedMotion() const { return respectReducedMotion; }

    /**
     * @brief Sets reduced motion behavior
     * @param skipAnimations Whether to skip animations entirely
     * @param instantTransitions Whether to use instant transitions
     */
    void setReducedMotionBehavior(bool skipAnimations, bool instantTransitions = true);
    //@}

    /** @name Static Utilities */
    //@{
    /**
     * @brief Applies easing function to a value
     * @param progress Linear progress (0.0 to 1.0)
     * @param easing Easing type to apply
     * @return Eased progress value
     */
    static float applyEasing(float progress, EasingType easing);

    /**
     * @brief Interpolates between two values
     * @param from Start value
     * @param to End value
     * @param progress Progress (0.0 to 1.0)
     * @return Interpolated value
     */
    static float interpolate(float from, float to, float progress);

    /**
     * @brief Interpolates between two colors
     * @param from Start color
     * @param to End color
     * @param progress Progress (0.0 to 1.0)
     * @return Interpolated color
     */
    static juce::Colour interpolateColor(juce::Colour from, juce::Colour to, float progress);

    /**
     * @brief Checks if system prefers reduced motion
     * @return true if reduced motion is preferred
     */
    static bool systemPrefersReducedMotion();
    //@}

private:
    /** @name Private Methods */
    //@{
    void timerCallback() override;
    void updatePerformanceMetrics();
    void pruneCompletedAnimations();
    void registerAnimation(Animation* animation);
    void unregisterAnimation(Animation* animation);

    // Spring physics helpers
    static float springEasing(float progress, float tension = 0.3f, float friction = 0.1f);

    // Performance helpers
    void optimizeForAudioThread();
    bool shouldOptimizeForPerformance() const;
    //@}

    /** @name Member Variables */
    //@{
    // Animation management
    std::vector<std::unique_ptr<Animation>> animations;
    std::vector<std::unique_ptr<AnimationGroup>> animationGroups;
    mutable std::mutex animationMutex;

    // Engine settings
    float globalSpeedMultiplier = 1.0f;
    bool animationsEnabled = true;
    bool highPerformanceMode = false;
    bool respectReducedMotion = true;
    bool skipAnimationsForReducedMotion = false;
    bool useInstantTransitionsForReducedMotion = true;
    int maxConcurrentAnimations = 100;
    float targetFrameRate = 60.0f;

    // Performance tracking
    float actualFrameRate = 0.0f;
    juce::uint32 lastFrameTime = 0;
    std::vector<float> frameTimeHistory;
    int frameCounter = 0;

    // Thread safety
    std::atomic<bool> isUpdating{false};
    juce::CriticalSection updateCriticalSection;
    //@}

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AnimationEngine)
};

/**
 * @brief Global animation engine accessor
 * @return Reference to the global animation engine
 */
AnimationEngine& getAnimationEngine();

} // namespace jive