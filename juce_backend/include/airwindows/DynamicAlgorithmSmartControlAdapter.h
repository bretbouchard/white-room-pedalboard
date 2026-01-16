#pragma once

#include "plugins/SmartPluginUI.h"
#include "DynamicAlgorithmSystem.h"
#include <JuceHeader.h>

namespace schill {
namespace airwindows {

/**
 * @brief Bridge between Dynamic Algorithm System and Smart Controls
 *
 * This adapter converts algorithm specifications into SmartControlConfig objects,
 * enabling seamless integration between the dynamic algorithm architecture and
 * the existing smart control system.
 *
 * Key Features:
 * - Automatic smart control generation from algorithm specifications
 * - Category-based control classification and styling
 * - Parameter priority assessment for progressive disclosure
 * - Hot-reload capable parameter bindings
 * - Context-aware workflow optimization
 */
class DynamicAlgorithmSmartControlAdapter
{
public:
    /**
     * @brief Generate SmartControlConfig objects from algorithm specification
     * @param algorithmInfo Information about the algorithm
     * @return Vector of smart control configurations
     */
    static std::vector<SchillingerEcosystem::Plugins::SmartControlConfig>
        generateSmartControls(const AlgorithmInfo& algorithmInfo);

    /**
     * @brief Create a smart control for a specific algorithm parameter
     * @param config Smart control configuration
     * @param algorithm Instance of the algorithm
     * @return Created control component
     */
    static std::unique_ptr<juce::Component>
        createSmartControl(const SchillingerEcosystem::Plugins::SmartControlConfig& config,
                         AirwindowsAlgorithm* algorithm);

    /**
     * @brief Generate parameter bindings for dynamic algorithm switching
     * @param algorithmName Name of the algorithm
     * @param parameterAddress Address of the parameter
     * @return Parameter binding configuration
     */
    static struct ParameterBinding createParameterBinding(
        const std::string& algorithmName,
        const std::string& parameterAddress);

    /**
     * @brief Update control bindings when algorithm switches
     * @param control Control component to update
     * @param newAlgorithmName New algorithm name
     * @param parameterAddress Parameter address to bind
     * @return True if binding was successful
     */
    static bool updateControlBinding(juce::Component* control,
                                   const std::string& newAlgorithmName,
                                   const std::string& parameterAddress);

    /**
     * @brief Generate control styling based on algorithm category
     * @param category Algorithm category (Reverb, Dynamics, etc.)
     * @param priority Control priority level
     * @return Style configuration
     */
    static struct ControlStyling generateCategoryStyling(
        const std::string& category,
        SchillingerEcosystem::Plugins::ControlPriority priority);

    /**
     * @brief Analyze parameter relationships and generate control associations
     * @param algorithmInfo Algorithm information
     * @return Parameter relationship analysis
     */
    static struct ParameterRelationships analyzeParameterRelationships(
        const AlgorithmInfo& algorithmInfo);

    // Control creation helpers
    static void applyAlgorithmStyling(juce::Component* control,
                                    const SchillingerEcosystem::Plugins::SmartControlConfig& config);
    static void setupDynamicParameterBinding(juce::Component* control,
                                           const std::string& parameterAddress);

    // Utility methods
    static juce::Rectangle<int> generateBounds(const SchillingerEcosystem::Plugins::SmartControlConfig& config,
                                              SchillingerEcosystem::Plugins::SmartPluginUI::DisplayMode mode);

private:
    // Parameter classification methods
    static SchillingerEcosystem::Plugins::ControlPriority
        classifyParameterPriority(const std::string& category,
                                 const AlgorithmParameter& param);

    static SchillingerEcosystem::Plugins::ControlContext
        analyzeParameterContext(const std::string& category,
                              const AlgorithmParameter& param);

    static juce::String selectControlType(const AlgorithmParameter& param);
    static juce::String generateShortName(const juce::String& displayName);

    // Parameter relationship analysis
    static juce::StringArray findRelatedParameters(const std::string& category,
                                                  const std::string& paramName);
    static juce::StringArray findConflictingParameters(const std::string& category,
                                                      const std::string& paramName);
    static juce::StringArray findDependencyParameters(const std::string& category,
                                                     const std::string& paramName);
};

/**
 * @brief Parameter binding configuration for dynamic algorithm switching
 */
struct ParameterBinding
{
    std::string algorithmName;
    std::string parameterAddress;
    std::string parameterType;
    std::string minValue;
    std::string maxValue;
    std::string defaultValue;
    bool isAutomatable;
    bool requiresSmoothedValue;
    juce::StringArray relatedParameters;
    juce::StringArray conflictingParameters;
};

/**
 * @brief Control styling configuration
 */
struct ControlStyling
{
    juce::Colour primaryColor;
    juce::Colour secondaryColor;
    juce::Colour textColor;
    juce::Colour backgroundColor;
    float borderWidth;
    float cornerRadius;
    bool useCategoryStyling;
    juce::String iconPath;
};

/**
 * @brief Parameter relationship analysis results
 */
struct ParameterRelationships
{
    std::unordered_map<std::string, juce::StringArray> relatedParameters;
    std::unordered_map<std::string, juce::StringArray> conflictingParameters;
    std::unordered_map<std::string, juce::StringArray> dependencyParameters;
    std::vector<std::pair<std::string, std::string>> parameterGroups;
    std::unordered_set<std::string> essentialParameters;
    std::unordered_set<std::string> advancedParameters;
};

/**
 * @brief Dynamic algorithm smart control manager
 *
 * Manages the lifecycle and synchronization of smart controls with dynamic algorithms.
 * Handles hot-reloading, parameter binding updates, and UI synchronization.
 */
class DynamicAlgorithmSmartControlManager
{
public:
    DynamicAlgorithmSmartControlManager();
    ~DynamicAlgorithmSmartControlManager();

    // Initialization
    bool initialize(DynamicAlgorithmRegistry* registry);
    void shutdown();
    bool isInitialized() const;

    // Control management
    std::vector<SchillingerEcosystem::Plugins::SmartControlConfig>
        createControlsForAlgorithm(const std::string& algorithmName);

    bool updateControlsForAlgorithmChange(const std::string& oldAlgorithmName,
                                        const std::string& newAlgorithmName);

    void clearAllControls();

    // Parameter binding
    bool bindControlToParameter(juce::Component* control,
                               const std::string& parameterAddress);

    bool unbindControl(juce::Component* control);

    void unbindAllControls();

    // Hot-reload support
    bool handleAlgorithmReload(const std::string& algorithmName);

    void enableHotReloading(bool enabled);
    bool isHotReloadingEnabled() const;

    // Event handling
    void onAlgorithmChanged(const std::string& newAlgorithmName);
    void onParameterChanged(const std::string& parameterAddress, float value);
    void onAlgorithmLoaded(const std::string& algorithmName);
    void onAlgorithmUnloaded(const std::string& algorithmName);

private:
    DynamicAlgorithmRegistry* algorithmRegistry;
    std::unordered_map<juce::Component*, std::string> controlBindings;
    std::string currentAlgorithmName;
    bool hotReloadingEnabled;
    bool initialized;

    // Internal methods
    void updateControlVisibility();
    void refreshAllControls();
    void notifyControlChange(const std::string& parameterAddress, float newValue);
};

} // namespace airwindows
} // namespace schill