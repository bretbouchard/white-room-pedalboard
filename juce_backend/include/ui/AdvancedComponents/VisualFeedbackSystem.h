#pragma once

#include "AnimationEngine.h"
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <functional>
#include <memory>
#include <vector>
#include <unordered_map>
#include <unordered_set>

namespace jive
{

/**
 * @brief Visual feedback types for user interactions
 */
enum class FeedbackType
{
    None,           // No visual feedback
    Hover,          // Hover state feedback
    Press,          // Press/active state feedback
    Focus,          // Focus state feedback
    Selection,      // Selection state feedback
    Success,        // Success state feedback
    Error,          // Error state feedback
    Warning,        // Warning state feedback
    Info,           // Information feedback
    Loading,        // Loading/processing feedback
    Disabled,       // Disabled state feedback
    DragOver,       // Drag over feedback
    DropTarget,     // Drop target feedback
    Connected,      // Connection state feedback
    Recording,      // Recording state feedback
    Playing,        // Playing state feedback
    Stopped,        // Stopped state feedback
    Paused          // Paused state feedback
};

/**
 * @brief Feedback intensity levels
 */
enum class FeedbackIntensity
{
    Subtle,         // Minimal feedback for professional appearance
    Normal,         // Standard feedback intensity
    Strong,         // Strong, obvious feedback
    Intense         // Maximum feedback for important interactions
};

/**
 * @brief Micro-interaction types
 */
enum class MicroInteraction
{
    None,           // No micro-interaction
    Ripple,         // Ripple effect from touch/click point
    Bounce,         // Small bounce animation
    Scale,          // Scale transformation
    Glow,           // Glow effect
    Shake,          // Shake animation (for errors)
    Pulse,          // Pulsing animation
    Slide,          // Slide animation
    Fade,           // Fade in/out animation
    Flip,           // 3D flip animation
    Rotate,         // Rotation animation
    Elastic,        // Elastic deformation
    Magnetic,       // Magnetic attraction effect
    Repel,          // Repulsion effect
    Vibrate         // Vibration effect (if available)
};

/**
 * @brief Visual feedback configuration
 */
struct FeedbackConfiguration
{
    FeedbackType type = FeedbackType::None;
    FeedbackIntensity intensity = FeedbackIntensity::Normal;
    MicroInteraction primaryInteraction = MicroInteraction::None;
    MicroInteraction secondaryInteraction = MicroInteraction::None;

    float duration = 0.3f;              // Animation duration
    float delay = 0.0f;                 // Start delay
    EasingType easing = EasingType::EaseOut;

    bool autoReverse = true;            // Auto reverse animation
    bool respectReducedMotion = true;   // Respect accessibility preference
    bool propagateToChildren = false;   // Apply to child components
    bool scaleWithDPI = true;          // Scale effect with DPI settings

    juce::Colour customColor;           // Custom feedback color (if applicable)
    float scaleFactor = 1.0f;           // Scale factor for size-based effects
    float intensity = 1.0f;             // Effect intensity multiplier

    // Audio feedback options
    bool playAudioFeedback = false;     // Play sound effect
    juce::String audioFeedbackId;       // Sound effect identifier
    float audioVolume = 0.5f;           // Audio volume (0.0 to 1.0)
};

/**
 * @brief Visual feedback event data
 */
struct FeedbackEvent
{
    FeedbackType type;
    juce::Component* target;
    juce::Point<float> position;        // Position relative to component
    juce::Time timestamp;
    juce::var userData;                // Additional event data
    bool isHandled = false;

    FeedbackEvent(FeedbackType t, juce::Component* comp, juce::Point<float> pos = {})
        : type(t), target(comp), position(pos), timestamp(juce::Time::getCurrentTime()) {}
};

/**
 * @brief Visual feedback renderer interface
 */
class VisualFeedbackRenderer
{
public:
    virtual ~VisualFeedbackRenderer() = default;

    /**
     * @brief Renders visual feedback for a component
     * @param g Graphics context
     * @param component Component to render feedback for
     * @param config Feedback configuration
     * @param animationProgress Current animation progress (0.0 to 1.0)
     */
    virtual void renderFeedback(juce::Graphics& g,
                               juce::Component& component,
                               const FeedbackConfiguration& config,
                               float animationProgress) = 0;

    /**
     * @brief Gets the bounds for feedback rendering
     * @param component Target component
     * @param config Feedback configuration
     * @return Bounds for feedback rendering
     */
    virtual juce::Rectangle<float> getFeedbackBounds(juce::Component& component,
                                                   const FeedbackConfiguration& config) = 0;
};

/**
 * @brief Ripple effect renderer
 */
class RippleEffectRenderer : public VisualFeedbackRenderer
{
public:
    void renderFeedback(juce::Graphics& g,
                       juce::Component& component,
                       const FeedbackConfiguration& config,
                       float animationProgress) override;

    juce::Rectangle<float> getFeedbackBounds(juce::Component& component,
                                           const FeedbackConfiguration& config) override;

    /**
     * @brief Sets ripple origin point
     * @param origin Origin point for ripple effect
     */
    void setOrigin(const juce::Point<float>& origin) { rippleOrigin = origin; }

private:
    juce::Point<float> rippleOrigin;
};

/**
 * @brief Glow effect renderer
 */
class GlowEffectRenderer : public VisualFeedbackRenderer
{
public:
    void renderFeedback(juce::Graphics& g,
                       juce::Component& component,
                       const FeedbackConfiguration& config,
                       float animationProgress) override;

    juce::Rectangle<float> getFeedbackBounds(juce::Component& component,
                                           const FeedbackConfiguration& config) override;

    /**
     * @brief Sets glow radius
     * @param radius Glow radius in pixels
     */
    void setGlowRadius(float radius) { glowRadius = radius; }

private:
    float glowRadius = 10.0f;
};

/**
 * @brief Comprehensive visual feedback system for audio host interfaces
 *
 * VisualFeedbackSystem provides professional visual feedback for all user interactions,
 * with performance optimization for real-time audio applications. Features include:
 * - Multiple feedback types and intensities
 * - Micro-interactions for enhanced UX
 * - Theme-aware feedback rendering
 * - Accessibility compliance
 * - Audio feedback integration
 * - Performance optimization for smooth 60fps feedback
 * - Custom feedback renderers
 */
class VisualFeedbackSystem
    : public juce::MouseListener
    , public juce::KeyListener
    , public juce::Timer
    , public juce::ChangeBroadcaster
{
public:
    /**
     * @brief Feedback component that renders visual feedback
     */
    class FeedbackComponent : public juce::Component
                           , private juce::Timer
    {
    public:
        FeedbackComponent(VisualFeedbackSystem& system,
                         juce::Component& target,
                         const FeedbackConfiguration& config);
        ~FeedbackComponent() override;

        /** @name Feedback Control */
        //@{
        /**
         * @brief Starts feedback animation
         * @param triggerPosition Position where feedback was triggered
         */
        void startFeedback(const juce::Point<float>& triggerPosition = {});

        /**
         * @brief Stops feedback animation
         * @param complete Whether to complete animation
         */
        void stopFeedback(bool complete = false);

        /**
         * @brief Updates feedback configuration
         * @param newConfig New feedback configuration
         */
        void updateConfiguration(const FeedbackConfiguration& newConfig);

        /**
         * @brief Gets current feedback configuration
         * @return Reference to current configuration
         */
        const FeedbackConfiguration& getConfiguration() const { return config; }
        //@}

        /** @name State Queries */
        //@{
        /**
         * @brief Checks if feedback is currently active
         * @return true if feedback is active
         */
        bool isFeedbackActive() const { return isFeedbackActiveFlag; }

        /**
         * @brief Gets current animation progress
         * @return Animation progress (0.0 to 1.0)
         */
        float getAnimationProgress() const { return animationProgress; }

        /**
         * @brief Gets target component
         * @return Reference to target component
         */
        juce::Component& getTargetComponent() const { return targetComponent; }
        //@}

    private:
        void timerCallback() override;
        void paint(juce::Graphics& g) override;
        void resized() override;

        VisualFeedbackSystem& system;
        juce::Component& targetComponent;
        FeedbackConfiguration config;

        std::unique_ptr<AnimationEngine::Animation> animation;
        std::unique_ptr<VisualFeedbackRenderer> renderer;

        bool isFeedbackActiveFlag = false;
        float animationProgress = 0.0f;
        juce::Point<float> triggerPosition;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(FeedbackComponent)
    };

public:
    VisualFeedbackSystem();
    ~VisualFeedbackSystem() override;

    /** @name Feedback Registration */
    //@{
    /**
     * @brief Registers a component for visual feedback
     * @param component Component to register
     * @param config Feedback configuration
     */
    void registerComponent(juce::Component& component,
                          const FeedbackConfiguration& config = {});

    /**
     * @brief Unregisters a component from visual feedback
     * @param component Component to unregister
     */
    void unregisterComponent(juce::Component& component);

    /**
     * @brief Updates feedback configuration for a component
     * @param component Target component
     * @param config New feedback configuration
     */
    void updateComponentConfiguration(juce::Component& component,
                                    const FeedbackConfiguration& config);

    /**
     * @brief Gets feedback configuration for a component
     * @param component Target component
     * @return Feedback configuration (empty if not registered)
     */
    FeedbackConfiguration getComponentConfiguration(juce::Component& component) const;
    //@}

    /** @name Feedback Triggering */
    //@{
    /**
     * @brief Triggers visual feedback for a component
     * @param component Target component
     * @param feedbackType Type of feedback to trigger
     * @param position Position where feedback was triggered
     */
    void triggerFeedback(juce::Component& component,
                        FeedbackType feedbackType,
                        const juce::Point<float>& position = {});

    /**
     * @brief Triggers custom feedback with configuration
     * @param component Target component
     * @param config Custom feedback configuration
     * @param position Position where feedback was triggered
     */
    void triggerCustomFeedback(juce::Component& component,
                              const FeedbackConfiguration& config,
                              const juce::Point<float>& position = {});

    /**
     * @brief Triggers micro-interaction for a component
     * @param component Target component
     * @param interaction Micro-interaction type
     * @param position Position where interaction was triggered
     */
    void triggerMicroInteraction(juce::Component& component,
                                MicroInteraction interaction,
                                const juce::Point<float>& position = {});

    /**
     * @brief Clears all active feedback for a component
     * @param component Target component
     * @param complete Whether to complete animations
     */
    void clearFeedback(juce::Component& component, bool complete = false);

    /**
     * @brief Clears all active feedback
     * @param complete Whether to complete animations
     */
    void clearAllFeedback(bool complete = false);
    //@}

    /** @name Presets and Templates */
    //@{
    /**
     * @brief Gets preset configuration for a feedback type
     * @param type Feedback type
     * @param intensity Feedback intensity
     * @return Preset configuration
     */
    FeedbackConfiguration getPresetConfiguration(FeedbackType type,
                                                 FeedbackIntensity intensity = FeedbackIntensity::Normal) const;

    /**
     * @brief Creates a custom preset configuration
     * @param baseType Base feedback type
     * @param modifications Configuration modifications
     * @return Custom configuration
     */
    FeedbackConfiguration createCustomPreset(FeedbackType baseType,
                                            std::function<void(FeedbackConfiguration&)> modifications) const;

    /**
     * @brief Applies theme-aware styling to configuration
     * @param config Configuration to modify
     * @param component Target component for context
     */
    void applyThemeStyling(FeedbackConfiguration& config, juce::Component& component) const;
    //@}

    /** @name Global Settings */
    //@{
    /**
     * @brief Sets global feedback intensity multiplier
     * @param multiplier Intensity multiplier (1.0 = normal)
     */
    void setGlobalIntensityMultiplier(float multiplier);

    /**
     * @brief Gets global intensity multiplier
     * @return Current intensity multiplier
     */
    float getGlobalIntensityMultiplier() const { return globalIntensityMultiplier; }

    /**
     * @brief Enables/disables all visual feedback
     * @param enabled Whether feedback should be enabled
     */
    void setFeedbackEnabled(bool enabled);

    /**
     * @brief Checks if visual feedback is enabled
     * @return true if feedback is enabled
     */
    bool isFeedbackEnabled() const { return feedbackEnabled; }

    /**
     * @brief Sets whether to respect reduced motion preference
     * @param respect Whether to respect reduced motion
     */
    void setRespectReducedMotion(bool respect);

    /**
     * @brief Gets reduced motion setting
     * @return true if reduced motion is respected
     */
    bool getRespectReducedMotion() const { return respectReducedMotion; }

    /**
     * @brief Enables audio feedback
     * @param enabled Whether audio feedback should be enabled
     */
    void setAudioFeedbackEnabled(bool enabled);

    /**
     * @brief Checks if audio feedback is enabled
     * @return true if audio feedback is enabled
     */
    bool isAudioFeedbackEnabled() const { return audioFeedbackEnabled; }
    //@}

    /** @name Performance Optimization */
    //@{
    /**
     * @brief Sets maximum number of concurrent feedback animations
     * @param maxFeedback Maximum concurrent feedback animations
     */
    void setMaxConcurrentFeedback(int maxFeedback);

    /**
     * @brief Gets current number of active feedback animations
     * @return Number of active feedback animations
     */
    int getActiveFeedbackCount() const;

    /**
     * @brief Enables high-performance mode for smooth feedback
     * @param enabled Whether high-performance mode should be enabled
     */
    void setHighPerformanceMode(bool enabled);

    /**
     * @brief Gets performance metrics
     * @return Map of performance metrics
     */
    std::unordered_map<juce::String, float> getPerformanceMetrics() const;
    //@}

    /** @name Custom Renderers */
    //@{
    /**
     * @brief Registers a custom feedback renderer
     * @param interactionType Interaction type to handle
     * @param renderer Custom renderer implementation
     */
    void registerRenderer(MicroInteraction interactionType,
                         std::unique_ptr<VisualFeedbackRenderer> renderer);

    /**
     * @brief Gets renderer for an interaction type
     * @param interactionType Interaction type
     * @return Renderer pointer (may be null)
     */
    VisualFeedbackRenderer* getRenderer(MicroInteraction interactionType) const;
    //@}

    /** @name Event Listeners */
    //@{
    /**
     * @brief Adds feedback event listener
     * @param listener Listener to add
     */
    void addFeedbackListener(juce::ChangeListener* listener);

    /**
     * @brief Removes feedback event listener
     * @param listener Listener to remove
     */
    void removeFeedbackListener(juce::ChangeListener* listener);

    /**
     * @brief Processes feedback event
     * @param event Feedback event to process
     * @return true if event was handled
     */
    bool processFeedbackEvent(const FeedbackEvent& event);
    //@}

private:
    /** @name MouseListener Overrides */
    //@{
    void mouseEnter(juce::MouseEvent& event) override;
    void mouseExit(juce::MouseEvent& event) override;
    void mouseDown(juce::MouseEvent& event) override;
    void mouseUp(juce::MouseEvent& event) override;
    void mouseDrag(juce::MouseEvent& event) override;
    void mouseMove(juce::MouseEvent& event) override;
    void mouseWheelMove(juce::MouseEvent& event, const juce::MouseWheelDetails& wheel) override;
    //@}

    /** @name KeyListener Overrides */
    //@{
    bool keyPressed(const juce::KeyPress& key, juce::Component* originatingComponent) override;
    bool keyStateChanged(bool isKeyDown, juce::Component* originatingComponent) override;
    //@}

    /** @name Private Methods */
    //@{
    void timerCallback() override;

    // Component management
    void updateComponentListeners(juce::Component& component, bool add);
    FeedbackComponent* getFeedbackComponent(juce::Component& target) const;
    void removeFeedbackComponent(FeedbackComponent* feedback);

    // Feedback creation
    std::unique_ptr<VisualFeedbackRenderer> createDefaultRenderer(MicroInteraction type) const;
    void playAudioFeedback(const FeedbackConfiguration& config) const;

    // Performance optimization
    void pruneInactiveFeedback();
    void updatePerformanceMetrics();
    bool shouldCreateFeedback(juce::Component& component, const FeedbackConfiguration& config) const;
    //@}

    /** @name Member Variables */
    //@{
    // Component registration
    std::unordered_map<juce::Component*, FeedbackConfiguration> componentConfigs;
    std::vector<std::unique_ptr<FeedbackComponent>> feedbackComponents;
    juce::Array<juce::WeakReference<juce::Component>> registeredComponents;

    // Custom renderers
    std::unordered_map<MicroInteraction, std::unique_ptr<VisualFeedbackRenderer>> customRenderers;

    // Global settings
    float globalIntensityMultiplier = 1.0f;
    bool feedbackEnabled = true;
    bool respectReducedMotion = true;
    bool audioFeedbackEnabled = false;
    int maxConcurrentFeedback = 50;
    bool highPerformanceMode = false;

    // Performance tracking
    std::vector<float> frameTimeHistory;
    int frameCounter = 0;
    mutable std::mutex feedbackMutex;

    // Event handling
    juce::ListenerList<juce::ChangeListener> feedbackListeners;
    std::vector<FeedbackEvent> pendingEvents;
    //@}

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(VisualFeedbackSystem)
};

/**
 * @brief Global visual feedback system accessor
 * @return Reference to the global visual feedback system
 */
VisualFeedbackSystem& getVisualFeedbackSystem();

/**
 * @brief Utility functions for common feedback patterns
 */
namespace FeedbackUtils
{
    /**
     * @brief Creates a button hover feedback configuration
     * @param intensity Feedback intensity
     * @return Button hover configuration
     */
    FeedbackConfiguration createButtonHoverFeedback(FeedbackIntensity intensity = FeedbackIntensity::Normal);

    /**
     * @brief Creates a button press feedback configuration
     * @param intensity Feedback intensity
     * @return Button press configuration
     */
    FeedbackConfiguration createButtonPressFeedback(FeedbackIntensity intensity = FeedbackIntensity::Normal);

    /**
     * @brief Creates a focus feedback configuration
     * @param intensity Feedback intensity
     * @return Focus feedback configuration
     */
    FeedbackConfiguration createFocusFeedback(FeedbackIntensity intensity = FeedbackIntensity::Normal);

    /**
     * @brief Creates an error feedback configuration
     * @param intensity Feedback intensity
     * @return Error feedback configuration
     */
    FeedbackConfiguration createErrorFeedback(FeedbackIntensity intensity = FeedbackIntensity::Normal);

    /**
     * @brief Creates a success feedback configuration
     * @param intensity Feedback intensity
     * @return Success feedback configuration
     */
    FeedbackConfiguration createSuccessFeedback(FeedbackIntensity intensity = FeedbackIntensity::Normal);

    /**
     * @brief Creates a loading feedback configuration
     * @param intensity Feedback intensity
     * @return Loading feedback configuration
     */
    FeedbackConfiguration createLoadingFeedback(FeedbackIntensity intensity = FeedbackIntensity::Normal);

    /**
     * @brief Applies feedback configuration to a component
     * @param component Target component
     * @param config Feedback configuration
     */
    void applyFeedbackToComponent(juce::Component& component, const FeedbackConfiguration& config);

    /**
     * @brief Removes feedback from a component
     * @param component Target component
     */
    void removeFeedbackFromComponent(juce::Component& component);
}

} // namespace jive