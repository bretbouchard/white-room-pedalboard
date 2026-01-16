#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <nlohmann/json.hpp>
#include <memory>
#include <unordered_map>
#include <string>

namespace jive
{

/**
 * @brief Professional theme types for DAW interface
 */
enum class ThemeType
{
    Dark,   // Professional studio appearance with subtle blues and grays
    Light,  // Clean, bright interface for daytime use
    Pro     // High-contrast professional theme for detailed work
};

/**
 * @brief Style manager for JIVE components with JSON-based theme system
 *
 * JIVEStyleManager provides centralized styling management for JIVE components,
 * supporting JSON-based themes and dynamic theme switching without component recreation.
 * Integrates seamlessly with JUCE LookAndFeel system for professional DAW appearance.
 */
class JIVEStyleManager
    : public juce::ChangeBroadcaster
    , public juce::ChangeListener
    , private juce::Timer
{
public:
    JIVEStyleManager();
    ~JIVEStyleManager() override;

    /** @name Theme Management */
    //@{
    /**
     * @brief Sets the current theme type and updates all components
     * @param themeType The theme type to apply
     */
    void setTheme(ThemeType themeType);

    /**
     * @brief Gets the current theme type
     * @return Current theme type
     */
    ThemeType getCurrentTheme() const { return currentTheme; }

    /**
     * @brief Loads theme configuration from JSON file
     * @param filePath Path to the JSON theme file
     * @return true if theme was loaded successfully
     */
    bool loadThemeFromFile(const juce::File& filePath);

    /**
     * @brief Loads theme configuration from JSON string
     * @param jsonString JSON string containing theme configuration
     * @return true if theme was loaded successfully
     */
    bool loadThemeFromString(const juce::String& jsonString);

    /**
     * @brief Applies a predefined theme
     * @param themeType The predefined theme to apply
     */
    void applyPredefinedTheme(ThemeType themeType);

    /**
     * @brief Reloads the current theme from file
     */
    void reloadCurrentTheme();
    //@}

    /** @name Component Styling */
    //@{
    /**
     * @brief Applies current theme to a specific component
     * @param component The component to style
     */
    void applyThemeToComponent(juce::Component& component);

    /**
     * @brief Registers a component for automatic theme updates
     * @param component Component to register for theme updates
     */
    void registerComponent(juce::Component& component);

    /**
     * @brief Unregisters a component from theme updates
     * @param component Component to unregister
     */
    void unregisterComponent(juce::Component& component);

    /**
     * @brief Updates all registered components with current theme
     */
    void updateAllComponents();
    //@}

    /** @name Style Access */
    //@{
    /**
     * @brief Gets a color value from current theme
     * @param colorName Name of the color property
     * @param defaultColor Default color if not found
     * @return Color value
     */
    juce::Colour getColor(const juce::String& colorName, juce::Colour defaultColor = juce::Colours::black) const;

    /**
     * @brief Gets a font value from current theme
     * @param fontName Name of the font property
     * @param defaultFont Default font if not found
     * @return Font value
     */
    juce::Font getFont(const juce::String& fontName, juce::Font defaultFont = juce::Font(14.0f)) const;

    /**
     * @brief Gets a numeric value from current theme
     * @param valueName Name of the numeric property
     * @param defaultValue Default value if not found
     * @return Numeric value
     */
    float getValue(const juce::String& valueName, float defaultValue = 0.0f) const;
    //@}

    /** @name JUCE Integration */
    //@{
    /**
     * @brief Gets the JUCE LookAndFeel for current theme
     * @return Reference to the JUCE LookAndFeel
     */
    juce::LookAndFeel_V4& getLookAndFeel() { return *lookAndFeel; }

    /**
     * @brief Applies current theme to a JUCE component tree
     * @param rootComponent Root component of the tree
     */
    void applyToComponentTree(juce::Component& rootComponent);
    //@}

    /** @name Custom Themes */
    //@{
    /**
     * @brief Saves current theme to JSON file
     * @param filePath Path to save the theme file
     * @return true if theme was saved successfully
     */
    bool saveCurrentTheme(const juce::File& filePath) const;

    /**
     * @brief Creates a custom theme with specified colors
     * @param themeName Name of the custom theme
     * @param baseColors Base color palette for the theme
     */
    void createCustomTheme(const juce::String& themeName,
                          const std::unordered_map<juce::String, juce::Colour>& baseColors);
    //@}

private:
    /** @name Private Methods */
    //@{
    void changeListenerCallback(juce::ChangeBroadcaster* source) override;
    void timerCallback() override;

    void initializeLookAndFeel();
    void updateLookAndFeel();
    void setupThemePaths();
    void createDefaultThemes();

    bool parseThemeFromJson(const nlohmann::json& json);
    nlohmann::json themeToJson() const;

    void notifyComponentsChanged();
    void refreshComponent(juce::Component& component);
    //@}

    /** @name Member Variables */
    //@{
    ThemeType currentTheme = ThemeType::Dark;
    std::unique_ptr<juce::LookAndFeel_V4> lookAndFeel;

    // Theme configuration storage
    nlohmann::json currentThemeConfig;
    std::unordered_map<ThemeType, nlohmann::json> predefinedThemes;

    // Component registration
    juce::Array<juce::WeakReference<juce::Component>> registeredComponents;
    juce::ListenerList<juce::ChangeListener> changeListeners;

    // Theme file paths
    juce::File themesDirectory;
    std::unordered_map<ThemeType, juce::File> themeFiles;

    // Update timing
    static constexpr int themeUpdateDelayMs = 100;
    bool themeNeedsUpdate = false;
    //@}

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(JIVEStyleManager)
};

/**
 * @brief Global style manager accessor
 * @return Reference to the global style manager instance
 */
JIVEStyleManager& getStyleManager();

} // namespace jive