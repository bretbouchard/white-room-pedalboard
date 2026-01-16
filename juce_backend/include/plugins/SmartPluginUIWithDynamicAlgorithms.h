#pragma once

#include "SmartPluginUI.h"
#include "../airwindows/DynamicAlgorithmSystem.h"
#include "../airwindows/DynamicAlgorithmSmartControlAdapter.h"
#include <JuceHeader.h>

namespace SchillingerEcosystem::Plugins {

/**
 * @brief Enhanced Smart Plugin UI with Dynamic Algorithm Integration
 *
 * This class extends the existing SmartPluginUI to seamlessly integrate with
 * the dynamic algorithm system. It maintains all existing functionality while
 * adding hot-swappable algorithm controls, category-based styling, and intelligent
 * parameter binding.
 *
 * Key Features:
 * - All existing SmartPluginUI functionality preserved
 * - Dynamic algorithm switching without UI disruption
 * - Automatic smart control generation from algorithm specifications
 * - Category-based control styling and organization
 * - Hot-reload capable parameter bindings
 * - Real-time algorithm morphing capabilities
 * - Progressive disclosure for algorithm-specific controls
 */
class SmartPluginUIWithDynamicAlgorithms : public SmartPluginUI
{
public:
    /**
     * @brief Constructor for dynamic algorithm-enabled smart UI
     * @param plugin Plugin instance (can be null for algorithm-only UI)
     * @param algorithmRegistry Dynamic algorithm registry
     * @param analyzer Usage analyzer for smart features
     */
    SmartPluginUIWithDynamicAlgorithms(PluginInstance* plugin = nullptr,
                                       schill::airwindows::DynamicAlgorithmRegistry* algorithmRegistry = nullptr,
                                       UsageAnalyzer* analyzer = nullptr);

    virtual ~SmartPluginUIWithDynamicAlgorithms();

    //==============================================================================
    // Dynamic Algorithm Integration
    //==============================================================================

    /**
     * @brief Initialize dynamic algorithm system
     * @param algorithmRegistry Registry to use for dynamic algorithms
     * @return True if initialization succeeded
     */
    bool initializeDynamicAlgorithms(schill::airwindows::DynamicAlgorithmRegistry* algorithmRegistry);

    /**
     * @brief Set current algorithm and update UI accordingly
     * @param algorithmName Name of the algorithm to load
     * @param preserveParameterValues Whether to preserve similar parameter values
     * @return True if algorithm was loaded successfully
     */
    bool setCurrentAlgorithm(const juce::String& algorithmName, bool preserveParameterValues = true);

    /**
     * @brief Get current algorithm name
     */
    juce::String getCurrentAlgorithm() const { return currentAlgorithmName; }

    /**
     * @brief Get available algorithms from registry
     */
    juce::StringArray getAvailableAlgorithms() const;

    /**
     * @brief Get algorithms by category
     */
    juce::StringArray getAlgorithmsByCategory(const juce::String& category) const;

    /**
     * @brief Enable/disable algorithm hot-swapping
     */
    void enableAlgorithmHotSwapping(bool enabled);

    /**
     * @brief Check if hot-swapping is enabled
     */
    bool isAlgorithmHotSwappingEnabled() const { return hotSwappingEnabled; }

    //==============================================================================
    // Enhanced Smart Control Features
    //==============================================================================

    /**
     * @brief Generate smart controls for current algorithm
     * This overrides the base class method to use dynamic algorithm specifications
     */
    void generateSmartControlLayout() override;

    /**
     * @brief Add algorithm-specific controls to existing layout
     * @param algorithmName Algorithm to generate controls for
     */
    void addAlgorithmControls(const juce::String& algorithmName);

    /**
     * @brief Create algorithm selector control
     */
    void createAlgorithmSelector();

    /**
     * @brief Create algorithm category filter
     */
    void createAlgorithmCategoryFilter();

    /**
     * @brief Get algorithm information for current algorithm
     */
    schill::airwindows::AlgorithmInfo getCurrentAlgorithmInfo() const;

    //==============================================================================
    // Algorithm Morphing and Real-time Switching
    //==============================================================================

    /**
     * @brief Morph between algorithms with crossfade
     * @param fromAlgorithm Source algorithm name
     * @param toAlgorithm Target algorithm name
     * @param crossfadeTimeMs Crossfade duration in milliseconds
     */
    void morphBetweenAlgorithms(const juce::String& fromAlgorithm,
                               const juce::String& toAlgorithm,
                               int crossfadeTimeMs = 1000);

    /**
     * @brief Enable real-time algorithm morphing
     */
    void enableRealtimeMorphing(bool enabled);

    /**
     * @brief Get morphing status
     */
    bool isMorphingActive() const { return isCurrentlyMorphing; }

    /**
     * @brief Set morphing interpolation curve
     */
    void setMorphingInterpolationCurve(const juce::String& curveType); // "linear", "exponential", "logarithmic"

    //==============================================================================
    // Enhanced UI Features
    //==============================================================================

    /**
     * @brief Create algorithm info panel
     */
    void createAlgorithmInfoPanel();

    /**
     * @brief Create algorithm preset browser
     */
    void createAlgorithmPresetBrowser();

    /**
     * @brief Create algorithm performance monitor
     */
    void createAlgorithmPerformanceMonitor();

    /**
     * @brief Show/hide algorithm-specific panels
     */
    void showAlgorithmInfoPanel(bool show);
    void showAlgorithmPresetBrowser(bool show);
    void showAlgorithmPerformanceMonitor(bool show);

    //==============================================================================
    // Category-based Organization
    //==============================================================================

    /**
     * @brief Group controls by algorithm category
     */
    void organizeControlsByCategory();

    /**
     * @brief Apply category-based styling to all controls
     */
    void applyCategoryBasedStyling();

    /**
     * @brief Get current algorithm category
     */
    juce::String getCurrentAlgorithmCategory() const;

    //==============================================================================
    // Hot-reload and Development Features
    //==============================================================================

    /**
     * @brief Enable development mode with hot-reload
     */
    void enableDevelopmentMode(bool enabled);

    /**
     * @brief Reload current algorithm (for development)
     */
    bool reloadCurrentAlgorithm();

    /**
     * @brief Show algorithm development tools
     */
    void showAlgorithmDevelopmentTools(bool show);

    //==============================================================================
    // Component interface overrides
    //==============================================================================
    void paint(juce::Graphics& g) override;
    void resized() override;
    void visibilityChanged() override;

    //==============================================================================
    // Event handling for dynamic algorithms
    //==============================================================================

    /**
     * @brief Handle algorithm change events
     */
    void onAlgorithmChanged(const juce::String& newAlgorithm);

    /**
     * @brief Handle algorithm parameter changes
     */
    void onAlgorithmParameterChanged(const juce::String& parameterAddress, float newValue);

    /**
     * @brief Handle algorithm load events
     */
    void onAlgorithmLoaded(const juce::String& algorithmName);

    /**
     * @brief Handle algorithm unload events
     */
    void onAlgorithmUnloaded(const juce::String& algorithmName);

private:
    //==============================================================================
    // Dynamic algorithm management
    //==============================================================================
    schill::airwindows::DynamicAlgorithmRegistry* algorithmRegistry;
    std::unique_ptr<schill::airwindows::DynamicAlgorithmSmartControlManager> smartControlManager;
    juce::String currentAlgorithmName;
    bool hotSwappingEnabled;
    bool isCurrentlyMorphing;
    bool developmentModeEnabled;

    //==============================================================================
    // Enhanced UI components
    //==============================================================================
    std::unique_ptr<juce::ComboBox> algorithmSelector;
    std::unique_ptr<juce::ComboBox> categoryFilter;
    std::unique_ptr<juce::TextButton> morphButton;
    std::unique_ptr<juce::Slider> morphAmountSlider;
    std::unique_ptr<juce::Label> algorithmInfoLabel;
    std::unique_ptr<juce::Component> algorithmInfoPanel;
    std::unique_ptr<juce::Component> algorithmPresetBrowser;
    std::unique_ptr<juce::Component> algorithmPerformanceMonitor;

    //==============================================================================
    // Algorithm morphing state
    //==============================================================================
    juce::String morphSourceAlgorithm;
    juce::String morphTargetAlgorithm;
    float currentMorphAmount = 0.0f;
    float morphInterpolationSpeed = 0.01f;
    juce::String morphInterpolationCurve = "linear";

    //==============================================================================
    // Enhanced layout management
    //==============================================================================
    std::unordered_map<juce::String, std::vector<SmartControlConfig>> algorithmControlConfigs;
    std::unordered_map<juce::String, std::vector<std::unique_ptr<juce::Component>>> algorithmControlComponents;
    std::unordered_map<juce::String, std::unordered_map<juce::String, float>> algorithmParameterValues;

    //==============================================================================
    // Internal methods
    //==============================================================================

    // Algorithm management
    void updateAlgorithmSelector();
    void updateCategoryFilter();
    void loadAlgorithmControls(const juce::String& algorithmName);
    void unloadCurrentAlgorithmControls();
    void preserveParameterValues(const juce::String& fromAlgorithm, const juce::String& toAlgorithm);

    // Enhanced control generation
    void generateDynamicSmartControls(const schill::airwindows::AlgorithmInfo& algorithmInfo);
    void bindAlgorithmControls(const juce::String& algorithmName);
    void unbindAlgorithmControls(const juce::String& algorithmName);

    // Algorithm morphing
    void startAlgorithmMorph(const juce::String& fromAlgorithm, const juce::String& toAlgorithm);
    void updateMorphing();
    float interpolateParameterValue(float fromValue, float toValue, float amount);
    void applyMorphingToControls();

    // UI creation helpers
    void createAlgorithmSelectionUI();
    void createMorphingControls();
    void createAlgorithmInfoUI();
    void createCategoryFilterUI();

    // Layout helpers
    void arrangeDynamicControls();
    void resizeAlgorithmPanels();
    void updateControlSpacing();

    // Event handling
    void onAlgorithmSelectorChanged();
    void onCategoryFilterChanged();
    void onMorphButtonClicked();
    void onMorphAmountChanged();
    void onDevelopmentToolAction(const juce::String& action);

    // Utility methods
    schill::airwindows::AlgorithmInfo getAlgorithmInfo(const juce::String& algorithmName) const;
    juce::StringArray getAlgorithmCategories() const;
    bool isAlgorithmCompatible(const juce::String& algorithm1, const juce::String& algorithm2) const;
    void showAlgorithmLoadError(const juce::String& algorithmName, const juce::String& error);
};

//==============================================================================
// Factory for creating enhanced smart UI with dynamic algorithms
//==============================================================================

namespace SmartPluginUIFactory {
    /**
     * @brief Create smart UI with dynamic algorithm support
     * @param plugin Plugin instance (optional)
     * @param algorithmRegistry Algorithm registry
     * @param analyzer Usage analyzer (optional)
     * @return Created smart UI instance
     */
    std::unique_ptr<SmartPluginUIWithDynamicAlgorithms> createDynamicSmartUI(
        PluginInstance* plugin = nullptr,
        schill::airwindows::DynamicAlgorithmRegistry* algorithmRegistry = nullptr,
        UsageAnalyzer* analyzer = nullptr);

    /**
     * @brief Create smart UI specifically for algorithm browsing and selection
     * @param algorithmRegistry Algorithm registry
     * @return Created algorithm browser UI
     */
    std::unique_ptr<SmartPluginUIWithDynamicAlgorithms> createAlgorithmBrowser(
        schill::airwindows::DynamicAlgorithmRegistry* algorithmRegistry);
}

} // namespace SchillingerEcosystem::Plugins