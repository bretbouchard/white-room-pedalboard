#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include "ComponentFactory.h"
#include "JIVEStyleManager.h"

namespace jive
{

/**
 * @brief Compact transport controls component for song playback
 *
 * TransportControlsComponent provides a professional set of playback controls designed
 * to fit within the constrained space of a song placeholder. It offers all essential
 * transport functions with visual feedback and professional DAW-style appearance.
 *
 * Key features:
 * - Play/Pause, Stop, Record controls with visual feedback
 * - Loop mode toggle with clear indication
 * - Previous/Next navigation for seeking
 * - Tempo control with BPM display
 * - Volume control with meter visualization
 * - Time display (current/total)
 * - Keyboard shortcuts for all controls
 * - Integration with JIVE styling system
 * - Smooth animations and transitions
 * - Context menu for additional options
 * - Accessibility support with proper labeling
 */
class TransportControlsComponent : public juce::Component,
                                 public juce::Button::Listener,
                                 public juce::Slider::Listener,
                                 private juce::Timer
{
public:
    /** @name Construction and Initialization */
    //@{

    /**
     * @brief Constructs a TransportControlsComponent
     */
    TransportControlsComponent();

    /**
     * @brief Destructor
     */
    ~TransportControlsComponent() override;

    /**
     * @brief Initializes the component after construction
     */
    void initialize();

    //@}

    /** @name Playback Control */
    //@{

    /**
     * @brief Sets the playback state
     * @param playing Whether playback should be active
     */
    void setPlaying(bool playing);

    /**
     * @brief Gets the current playback state
     * @return True if currently playing
     */
    bool isPlaying() const { return isPlaying_; }

    /**
     * @brief Sets the recording state
     * @param recording Whether recording should be active
     */
    void setRecording(bool recording);

    /**
     * @brief Gets the current recording state
     * @return True if currently recording
     */
    bool isRecording() const { return isRecording_; }

    /**
     * @brief Sets the loop state
     * @param looping Whether loop mode should be active
     */
    void setLooping(bool looping);

    /**
     * @brief Gets the current loop state
     * @return True if loop mode is active
     */
    bool isLooping() const { return isLooping_; }

    /**
     * @brief Stops playback and resets position
     */
    void stop();

    /**
     * @brief Seeks to the beginning
     */
    void gotoStart();

    /**
     * @brief Seeks to the end
     */
    void gotoEnd();

    /**
     * @brief Jumps to previous position (marker or start)
     */
    void previous();

    /**
     * @brief Jumps to next position (marker or end)
     */
    void next();

    //@}

    /** @name Time Display */
    //@{

    /**
     * @brief Sets the current playback position
     * @param currentTime Current time in seconds
     */
    void setCurrentTime(double currentTime);

    /**
     * @brief Gets the current playback position
     * @return Current time in seconds
     */
    double getCurrentTime() const { return currentTime_; }

    /**
     * @brief Sets the total duration
     * @param totalDuration Total duration in seconds
     */
    void setTotalDuration(double totalDuration);

    /**
     * @brief Gets the total duration
     * @return Total duration in seconds
     */
    double getTotalDuration() const { return totalDuration_; }

    /**
     * @brief Sets whether to show time as remaining
     * @param showRemaining Whether to show remaining time
     */
    void setShowRemainingTime(bool showRemaining);

    /**
     * @brief Gets whether remaining time is shown
     * @return True if remaining time is shown
     */
    bool getShowRemainingTime() const { return showRemainingTime; }

    //@}

    /** @name Tempo Control */
    //@{

    /**
     * @brief Sets the tempo
     * @param bpm Tempo in beats per minute
     */
    void setTempo(double bpm);

    /**
     * @brief Gets the current tempo
     * @return Tempo in beats per minute
     */
    double getTempo() const { return tempo_; }

    /**
     * @brief Sets the tempo range
     * @param minBpm Minimum tempo
     * @param maxBpm Maximum tempo
     */
    void setTempoRange(double minBpm, double maxBpm);

    /**
     * @brief Gets the tempo range
     * @return Pair containing minimum and maximum tempo
     */
    std::pair<double, double> getTempoRange() const { return {minTempo, maxTempo}; }

    /**
     * @brief Taps tempo (calculates from user taps)
     */
    void tapTempo();

    //@}

    /** @name Volume Control */
    //@{

    /**
     * @brief Sets the volume level
     * @param volume Volume level (0.0 to 1.0)
     */
    void setVolume(double volume);

    /**
     * @brief Gets the current volume level
     * @return Volume level (0.0 to 1.0)
     */
    double getVolume() const { return volume_; }

    /**
     * @brief Sets the mute state
     * @param muted Whether audio should be muted
     */
    void setMuted(bool muted);

    /**
     * @brief Gets the mute state
     * @return True if muted
     */
    bool isMuted() const { return isMuted_; }

    /**
     * @brief Updates the level meter
     * @param leftLevel Left channel level (0.0 to 1.0)
     * @param rightLevel Right channel level (0.0 to 1.0)
     */
    void updateLevelMeter(double leftLevel, double rightLevel);

    //@}

    /** @name Appearance and Behavior */
    //@{

    /**
     * @brief Sets the control layout style
     * @param compact Whether to use compact layout
     */
    void setCompactLayout(bool compact);

    /**
     * @brief Gets whether compact layout is used
     * @return True if compact layout is active
     */
    bool isCompactLayout() const { return useCompactLayout; }

    /**
     * @brief Shows or hides specific controls
     * @param showTempo Whether to show tempo control
     * @param showVolume Whether to show volume control
     * @param showTime Whether to show time display
     */
    void setShowControls(bool showTempo, bool showVolume, bool showTime);

    /**
     * @brief Sets the color scheme
     * @param background Background color
     * @param foreground Foreground color
     * @param accent Accent color for active states
     */
    void setColorScheme(juce::Colour background, juce::Colour foreground, juce::Colour accent);

    //@}

    /** @name Events and Listeners */
    //@{

    /**
     * @brief Listener interface for transport events
     */
    class Listener
    {
    public:
        virtual ~Listener() = default;
        virtual void transportPlayRequested(TransportControlsComponent* transport) {}
        virtual void transportStopRequested(TransportControlsComponent* transport) {}
        virtual void transportPauseRequested(TransportControlsComponent* transport) {}
        virtual void transportRecordRequested(TransportControlsComponent* transport) {}
        virtual void transportLoopChanged(TransportControlsComponent* transport, bool isLooping) {}
        virtual void transportPreviousRequested(TransportControlsComponent* transport) {}
        virtual void transportNextRequested(TransportControlsComponent* transport) {}
        virtual void transportGotoStartRequested(TransportControlsComponent* transport) {}
        virtual void transportGotoEndRequested(TransportControlsComponent* transport) {}
        virtual void transportTempoChanged(TransportControlsComponent* transport, double newTempo) {}
        virtual void transportVolumeChanged(TransportControlsComponent* transport, double newVolume) {}
        virtual void transportMuteChanged(TransportControlsComponent* transport, bool isMuted) {}
        virtual void transportSeekRequested(TransportControlsComponent* transport, double position) {}
        virtual void transportTimeDoubleClicked(TransportControlsComponent* transport) {}
    };

    /**
     * @brief Adds a listener for transport events
     * @param listener Listener to add
     */
    void addListener(Listener* listener);

    /**
     * @brief Removes a listener for transport events
     * @param listener Listener to remove
     */
    void removeListener(Listener* listener);

    //@}

    /** @name Component Overrides */
    //@{
    void paint(juce::Graphics& g) override;
    void resized() override;
    void buttonClicked(juce::Button* button) override;
    void sliderValueChanged(juce::Slider* slider) override;
    void mouseDown(const juce::MouseEvent& event) override;
    void mouseDoubleClick(const juce::MouseEvent& event) override;
    bool keyPressed(const juce::KeyPress& key) override;
    void lookAndFeelChanged() override;
    //@}

private:
    /** @name Timer Override */
    //@{
    void timerCallback() override;
    //@}

    /** @name Private Methods */
    //@{

    /**
     * @brief Updates button states
     */
    void updateButtonStates();

    /**
     * @brief Updates time display
     */
    void updateTimeDisplay();

    /**
     * @brief Formats time for display
     * @param timeInSeconds Time in seconds
     * @param showNegative Whether to show negative sign
     * @return Formatted time string
     */
    juce::String formatTime(double timeInSeconds, bool showNegative = false) const;

    /**
     * @brief Calculates tempo from tap timing
     */
    void calculateTempoFromTaps();

    /**
     * @brief Updates level meter decay
     */
    void updateLevelMeterDecay();

    /**
     * @brief Draws the background
     * @param g Graphics context
     */
    void drawBackground(juce::Graphics& g);

    /**
     * @brief Draws the level meter
     * @param g Graphics context
     * @param bounds Meter bounds
     * @param level Level value (0.0 to 1.0)
     */
    void drawLevelMeter(juce::Graphics& g, const juce::Rectangle<int>& bounds, double level);

    /**
     * @brief Shows the context menu
     * @param position Position to show menu at
     */
    void showContextMenu(const juce::Point<int>& position);

    /**
     * @brief Updates the layout based on current settings
     */
    void updateLayout();

    //@}

    /** @name Member Variables */
    //@{

    // Transport controls
    std::unique_ptr<juce::TextButton> playButton;
    std::unique_ptr<juce::TextButton> stopButton;
    std::unique_ptr<juce::TextButton> recordButton;
    std::unique_ptr<juce::TextButton> loopButton;
    std::unique_ptr<juce::TextButton> previousButton;
    std::unique_ptr<juce::TextButton> nextButton;

    // Tempo control
    std::unique_ptr<juce::Slider> tempoSlider;
    std::unique_ptr<juce::Label> tempoLabel;
    double tempo_ = 120.0;
    double minTempo = 40.0;
    double maxTempo = 300.0;

    // Volume control
    std::unique_ptr<juce::Slider> volumeSlider;
    std::unique_ptr<juce::TextButton> muteButton;
    std::unique_ptr<juce::Component> levelMeterComponent;
    double volume_ = 0.8;
    double leftLevel = 0.0;
    double rightLevel = 0.0;
    double levelDecay = 0.95;

    // Time display
    std::unique_ptr<juce::Label> timeLabel;
    double currentTime_ = 0.0;
    double totalDuration_ = 180.0;
    bool showRemainingTime = false;

    // State
    bool isPlaying_ = false;
    bool isRecording_ = false;
    bool isLooping_ = false;
    bool isMuted_ = false;
    bool useCompactLayout = false;

    // Tap tempo
    juce::Array<juce::Time> tapTimes;
    static constexpr int maxTapTimes = 8;
    static constexpr double tapTimeout = 2.0; // seconds

    // Visual state
    bool isHovering = false;
    juce::Point<int> lastMousePos;

    // Colors
    juce::Colour backgroundColor;
    juce::Colour foregroundColor;
    juce::Colour accentColor;
    juce::Colour recordColor;
    juce::Colour levelMeterColor;

    // Control visibility
    bool showTempoControl = true;
    bool showVolumeControl = true;
    bool showTimeDisplay = true;

    // Animation
    bool isPulsingRecord = false;
    float recordPulse = 0.0f;

    // Listeners
    juce::ListenerList<Listener> listeners;

    // Layout constants
    static constexpr int buttonSize = 24;
    static constexpr int compactButtonSize = 20;
    static constexpr int spacing = 4;
    static constexpr int timeLabelWidth = 80;
    static constexpr int tempoSliderWidth = 60;
    static constexpr int volumeSliderWidth = 60;
    static constexpr int levelMeterWidth = 40;
    static constexpr int levelMeterHeight = 8;

    //@}

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(TransportControlsComponent)
};

} // namespace jive