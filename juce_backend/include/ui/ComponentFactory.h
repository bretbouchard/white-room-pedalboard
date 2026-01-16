#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <memory>
#include <functional>
#include <unordered_map>
#include "JIVEStyleManager.h"

namespace jive
{

/**
 * @brief Configuration structure for component customization
 *
 * ComponentConfig allows for customization of components while maintaining
 * theme consistency. All properties are optional and will fall back to
 * theme defaults if not specified.
 */
struct ComponentConfig
{
    // Colors (optional - will use theme defaults if not specified)
    std::optional<juce::Colour> backgroundColor;
    std::optional<juce::Colour> textColor;
    std::optional<juce::Colour> borderColor;
    std::optional<juce::Colour> accentColor;

    // Fonts (optional - will use theme defaults if not specified)
    std::optional<juce::Font> font;

    // Dimensions (optional - will use theme defaults if not specified)
    std::optional<int> width;
    std::optional<int> height;
    std::optional<float> borderRadius;
    std::optional<float> borderWidth;

    // Content
    juce::String text;
    juce::String tooltipText;

    // Behavior
    std::optional<bool> enabled;
    std::optional<bool> visible;
    std::optional<bool> focusable;

    // Custom styling callback for advanced customization
    std::function<void(juce::Component&)> customStyling;
};

/**
 * @brief Factory for creating consistently styled JUCE components using JIVE Stylesheets
 *
 * ComponentFactory provides a centralized way to create JUCE components that automatically
 * receive styling from the current JIVE theme. It ensures visual consistency across the
 * entire application while allowing for controlled customization when needed.
 *
 * Key features:
 * - Automatic theme application from current JIVEStyleManager
 * - Component-specific styling based on theme configuration
 * - Customization options while maintaining theme consistency
 * - Factory methods for common audio host components
 * - Support for dynamic theme switching
 * - Thread-safe operations
 *
 * Usage examples:
 * ```cpp
 * // Simple themed button
 * auto button = ComponentFactory::createButton("Play");
 *
 * // Custom styled slider
 * ComponentConfig config;
 * config.textColor = juce::Colours::red;
 * config.width = 200;
 * auto slider = ComponentFactory::createSlider(config);
 *
 * // Audio host-specific components
 * auto levelMeter = ComponentFactory::createLevelMeter();
 * auto pluginSlot = ComponentFactory::createPluginSlot("Reverb");
 * ```
 */
class ComponentFactory
{
public:
    /** @name Basic Component Factory Methods */
    //@{

    /**
     * @brief Creates a themed button
     * @param text Button text
     * @param config Optional customization configuration
     * @return Unique pointer to styled button
     */
    static std::unique_ptr<juce::TextButton> createButton(
        const juce::String& text = "",
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a themed slider
     * @param config Optional customization configuration
     * @return Unique pointer to styled slider
     */
    static std::unique_ptr<juce::Slider> createSlider(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a themed label
     * @param text Label text
     * @param config Optional customization configuration
     * @return Unique pointer to styled label
     */
    static std::unique_ptr<juce::Label> createLabel(
        const juce::String& text = "",
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a themed combo box
     * @param config Optional customization configuration
     * @return Unique pointer to styled combo box
     */
    static std::unique_ptr<juce::ComboBox> createComboBox(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a themed text editor
     * @param config Optional customization configuration
     * @return Unique pointer to styled text editor
     */
    static std::unique_ptr<juce::TextEditor> createTextEditor(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a themed toggle button
     * @param text Button text
     * @param config Optional customization configuration
     * @return Unique pointer to styled toggle button
     */
    static std::unique_ptr<juce::ToggleButton> createToggleButton(
        const juce::String& text = "",
        const ComponentConfig& config = ComponentConfig{});

    //@}

    /** @name Audio Host Component Factory Methods */
    //@{

    /**
     * @brief Creates a DAW-style level meter
     * @param config Optional customization configuration
     * @return Unique pointer to styled level meter component
     */
    static std::unique_ptr<juce::Component> createLevelMeter(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a DAW-style knob component
     * @param config Optional customization configuration
     * @return Unique pointer to styled knob component
     */
    static std::unique_ptr<juce::Slider> createKnob(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a plugin slot component
     * @param pluginName Name of the plugin for the slot
     * @param config Optional customization configuration
     * @return Unique pointer to styled plugin slot component
     */
    static std::unique_ptr<juce::Component> createPluginSlot(
        const juce::String& pluginName = "",
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a transport button (play, stop, record, etc.)
     * @param type Type of transport button
     * @param config Optional customization configuration
     * @return Unique pointer to styled transport button
     */
    static std::unique_ptr<juce::TextButton> createTransportButton(
        const juce::String& type,
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a timeline ruler component
     * @param config Optional customization configuration
     * @return Unique pointer to styled timeline ruler component
     */
    static std::unique_ptr<juce::Component> createTimelineRuler(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a mixer channel strip component
     * @param channelName Name of the channel
     * @param config Optional customization configuration
     * @return Unique pointer to styled mixer channel component
     */
    static std::unique_ptr<juce::Component> createMixerChannel(
        const juce::String& channelName = "",
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a voice bus header component
     *
     * Voice bus headers display the name, controls, and status
     * of a voice bus (audio routing destination for synthesis voices).
     *
     * @param voiceBusName Name of the voice bus
     * @param config Optional customization configuration
     * @return Unique pointer to styled voice bus header component
     */
    static std::unique_ptr<juce::Component> createVoiceBusHeader(
        const juce::String& voiceBusName = "",
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a track header component (deprecated)
     *
     * @deprecated Use createVoiceBusHeader() instead
     */
    [[deprecated("Use createVoiceBusHeader() instead")]]
    static std::unique_ptr<juce::Component> createTrackHeader(
        const juce::String& trackName = "",
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a VU meter component
     * @param config Optional customization configuration
     * @return Unique pointer to styled VU meter component
     */
    static std::unique_ptr<juce::Component> createVUMeter(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a spectrum analyzer component
     * @param config Optional customization configuration
     * @return Unique pointer to styled spectrum analyzer component
     */
    static std::unique_ptr<juce::Component> createSpectrumAnalyzer(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a waveform display component
     * @param config Optional customization configuration
     * @return Unique pointer to styled waveform display component
     */
    static std::unique_ptr<juce::Component> createWaveformDisplay(
        const ComponentConfig& config = ComponentConfig{});

    //@}

    /** @name Container Factory Methods */
    //@{

    /**
     * @brief Creates a themed view port component
     * @param config Optional customization configuration
     * @return Unique pointer to styled view port
     */
    static std::unique_ptr<juce::Viewport> createViewport(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a themed group component
     * @param text Group title text
     * @param config Optional customization configuration
     * @return Unique pointer to styled group component
     */
    static std::unique_ptr<juce::GroupComponent> createGroupComponent(
        const juce::String& text = "",
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a themed tabbed component
     * @param config Optional customization configuration
     * @return Unique pointer to styled tabbed component
     */
    static std::unique_ptr<juce::TabbedComponent> createTabbedComponent(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a themed list box component
     * @param config Optional customization configuration
     * @return Unique pointer to styled list box component
     */
    static std::unique_ptr<juce::ListBox> createListBox(
        const ComponentConfig& config = ComponentConfig{});

    /**
     * @brief Creates a themed tree view component
     * @param config Optional customization configuration
     * @return Unique pointer to styled tree view component
     */
    static std::unique_ptr<juce::TreeView> createTreeView(
        const ComponentConfig& config = ComponentConfig{});

    //@}

    /** @name Utility Methods */
    //@{

    /**
     * @brief Applies current theme to an existing component
     * @param component Component to apply theme to
     * @param componentType Type of component for styling lookup
     */
    static void applyThemeToComponent(juce::Component& component,
                                     const juce::String& componentType = "");

    /**
     * @brief Registers a component for automatic theme updates
     * @param component Component to register for theme updates
     * @param componentType Type of component for styling lookup
     */
    static void registerComponentForThemeUpdates(juce::Component& component,
                                                const juce::String& componentType = "");

    /**
     * @brief Gets the current style manager
     * @return Reference to the current style manager
     */
    static JIVEStyleManager& getStyleManager();

    /**
     * @brief Creates a component configuration with common DAW styling
     * @param componentType Type of component to create config for
     * @return ComponentConfig with theme-appropriate defaults
     */
    static ComponentConfig createDAWConfig(const juce::String& componentType);

    /**
     * @brief Applies configuration to a component
     * @param component Component to configure
     * @param config Configuration to apply
     */
    static void applyConfiguration(juce::Component& component,
                                  const ComponentConfig& config);

    //@}

private:
    /** @name Private Helper Methods */
    //@{

    /**
     * @brief Gets a color value from theme or config
     * @param colorName Color name in theme
     * @param configColor Optional color from config
     * @param defaultColor Default color if neither found
     * @return Final color value
     */
    static juce::Colour getThemeColor(const juce::String& colorName,
                                     const std::optional<juce::Colour>& configColor,
                                     juce::Colour defaultColor = juce::Colours::black);

    /**
     * @brief Gets a font value from theme or config
     * @param fontName Font name in theme
     * @param configFont Optional font from config
     * @param defaultFont Default font if neither found
     * @return Final font value
     */
    static juce::Font getThemeFont(const juce::String& fontName,
                                  const std::optional<juce::Font>& configFont,
                                  juce::Font defaultFont = juce::Font(14.0f));

    /**
     * @brief Gets a numeric value from theme or config
     * @param valueName Value name in theme
     * @param configValue Optional value from config
     * @param defaultValue Default value if neither found
     * @return Final numeric value
     */
    static float getThemeValue(const juce::String& valueName,
                              const std::optional<float>& configValue,
                              float defaultValue = 0.0f);

    /**
     * @brief Applies component-specific styling from theme
     * @param component Component to style
     * @param componentType Type of component for theme lookup
     * @param config Optional configuration for customization
     */
    template<typename ComponentType>
    static void applyComponentStyling(ComponentType& component,
                                     const juce::String& componentType,
                                     const ComponentConfig& config);

    /**
     * @brief Creates a basic component with common setup
     * @tparam ComponentType Type of component to create
     * @param componentType String type for theme lookup
     * @param config Configuration to apply
     * @return Unique pointer to created component
     */
    template<typename ComponentType>
    static std::unique_ptr<ComponentType> createBasicComponent(
        const juce::String& componentType,
        const ComponentConfig& config);

    //@}

    // Static factory instance (not actually used for factory methods, but kept for potential future extension)
    static std::unique_ptr<ComponentFactory> instance;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ComponentFactory)
};

} // namespace jive