#pragma once

#include "DynamicAlgorithmSystem.h"
#include "DynamicAlgorithmSmartControlAdapter.h"
#include "../plugins/SmartPluginUI.h"
#include <JuceHeader.h>
#include <yaml-cpp/yaml.h>

namespace schill {
namespace airwindows {

/**
 * @brief Enhanced YAML Specification Loader with Smart Control Integration
 *
 * This class extends the basic YAML parsing capabilities to directly generate
 * SmartControlConfig objects and provide comprehensive integration with the
 * smart control system. It maintains backward compatibility while adding
 * rich metadata extraction and intelligent control generation.
 *
 * Features:
 * - Parse algorithm specifications from YAML files
 * - Automatically generate SmartControlConfig objects
 * - Extract control hints and styling information
 * - Validate specifications for smart control compatibility
 * - Support for progressive disclosure rules
 * - Parameter relationship extraction
 * - Workflow-specific control optimizations
 */
class YAMLSmartControlLoader
{
public:
    /**
     * @brief Load algorithm specification with smart control integration
     * @param filePath Path to YAML specification file
     * @return AlgorithmInfo with smart control metadata
     */
    static std::optional<AlgorithmInfo> loadAlgorithmSpecification(const std::string& filePath);

    /**
     * @brief Generate smart controls from YAML specification
     * @param filePath Path to YAML specification file
     * @return Vector of smart control configurations
     */
    static std::vector<SchillingerEcosystem::Plugins::SmartControlConfig>
        generateSmartControlsFromYAML(const std::string& filePath);

    /**
     * @brief Extract algorithm metadata for UI generation
     * @param filePath Path to YAML specification file
     * @return UI metadata structure
     */
    static struct UIMetadata extractUIMetadata(const std::string& filePath);

    /**
     * @brief Validate YAML specification for smart control compatibility
     * @param filePath Path to YAML specification file
     * @return Validation result with detailed information
     */
    static struct ValidationResult validateForSmartControls(const std::string& filePath);

    /**
     * @brief Extract parameter relationships from YAML specification
     * @param filePath Path to YAML specification file
     * @return Parameter relationship analysis
     */
    static ParameterRelationships extractParameterRelationships(const std::string& filePath);

    /**
     * @brief Generate category-based styling information
     * @param filePath Path to YAML specification file
     * @return Category styling configuration
     */
    static ControlStyling extractCategoryStyling(const std::string& filePath);

    /**
     * @brief Create smart control presets from YAML specification
     * @param filePath Path to YAML specification file
     * @return Preset configurations for different display modes
     */
    static struct SmartControlPresets generateControlPresets(const std::string& filePath);

    /**
     * @brief Batch process multiple YAML files for smart control generation
     * @param directoryPath Directory containing YAML files
     * @return Map of algorithm names to smart control configurations
     */
    static std::unordered_map<std::string, std::vector<SchillingerEcosystem::Plugins::SmartControlConfig>>
        batchProcessDirectory(const std::string& directoryPath);

private:
    // Core parsing methods
    static AlgorithmInfo parseAlgorithmSection(const YAML::Node& node);
    static std::vector<AlgorithmParameter> parseParametersSection(const YAML::Node& node);
    static AlgorithmInfo parseImplementationSection(const YAML::Node& node, AlgorithmInfo& info);
    static AlgorithmInfo parseTestingSection(const YAML::Node& node, AlgorithmInfo& info);

    // Smart control specific parsing
    static SchillingerEcosystem::Plugins::SmartControlConfig
        createSmartControlConfig(const AlgorithmInfo& algorithmInfo, const AlgorithmParameter& param);

    static SchillingerEcosystem::Plugins::ControlPriority
        parseControlPriority(const YAML::Node& paramNode, const std::string& paramName);

    static SchillingerEcosystem::Plugins::ControlContext
        parseControlContext(const YAML::Node& paramNode, const std::string& category);

    static juce::StringArray parseRelatedParameters(const YAML::Node& paramNode);
    static juce::StringArray parseConflictingParameters(const YAML::Node& paramNode);
    static juce::StringArray parseDependencyParameters(const YAML::Node& paramNode);

    // Validation methods
    static bool validateAlgorithmSection(const YAML::Node& node);
    static bool validateParametersSection(const YAML::Node& node);
    static bool validateImplementationSection(const YAML::Node& node);
    static bool validateSmartControlCompatibility(const AlgorithmParameter& param);

    // Utility methods
    static std::string readYAMLFile(const std::string& filePath);
    static juce::String getYAMLStringValue(const YAML::Node& node, const std::string& key, const juce::String& defaultValue = "");
    static float getYAMLFloatValue(const YAML::Node& node, const std::string& key, float defaultValue = 0.0f);
    static bool getYAMLBoolValue(const YAML::Node& node, const std::string& key, bool defaultValue = false);
    static std::vector<std::string> getYAMLStringArray(const YAML::Node& node, const std::string& key);
};

/**
 * @brief UI Metadata extracted from YAML specification
 */
struct UIMetadata
{
    juce::String algorithmDisplayName;
    juce::String algorithmDescription;
    juce::String algorithmCategory;
    juce::String algorithmAuthor;
    juce::String algorithmVersion;
    juce::StringArray algorithmTags;
    float cpuUsage = 0.0f;
    float latency = 0.0f;
    bool hasPresets = false;
    juce::StringArray presetNames;
    juce::StringArray displayModes;
    juce::StringArray workflowModes;
    bool supportsHotReloading = true;
    bool supportsMorphing = false;
    juce::String compatibleAlgorithms;
};

/**
 * @brief Validation result for smart control compatibility
 */
struct ValidationResult
{
    bool isValid = false;
    juce::StringArray errors;
    juce::StringArray warnings;
    juce::StringArray suggestions;
    int parameterCount = 0;
    int compatibleParameterCount = 0;
    juce::StringArray incompatibleParameters;
    float estimatedCpuUsage = 0.0f;
    bool requiresSpecialHandling = false;
    juce::String specialHandlingRequirements;
};

/**
 * @brief Smart control presets for different display modes
 */
struct SmartControlPresets
{
    std::vector<SchillingerEcosystem::Plugins::SmartControlConfig> compactModeControls;
    std::vector<SchillingerEcosystem::Plugins::SmartControlConfig> normalModeControls;
    std::vector<SchillingerEcosystem::Plugins::SmartControlConfig> advancedModeControls;
    std::vector<SchillingerEcosystem::Plugins::SmartControlConfig> performanceModeControls;
    std::vector<SchillingerEcosystem::Plugins::SmartControlConfig> mixingModeControls;
    std::vector<SchillingerEcosystem::Plugins::SmartControlConfig> soundDesignModeControls;
    std::vector<SchillingerEcosystem::Plugins::SmartControlConfig> automationModeControls;
};

/**
 * @brief Enhanced YAML algorithm loader with smart control generation
 *
 * This class provides a convenient wrapper around YAMLSmartControlLoader
 * for use within the dynamic algorithm system.
 */
class EnhancedYAMLAlgorithmLoader : public AlgorithmLoader
{
public:
    EnhancedYAMLAlgorithmLoader() = default;
    ~EnhancedYAMLAlgorithmLoader() override = default;

    // AlgorithmLoader interface
    bool load(const std::string& filePath) override;
    bool unload() override;
    std::unique_ptr<AirwindowsAlgorithm> createInstance() override;
    AlgorithmInfo getAlgorithmInfo() override;
    bool isLoaded() const override { return isLoaded_; }
    std::string getLoaderType() const override { return "EnhancedYAML"; }

    // Enhanced methods for smart control integration
    std::vector<SchillingerEcosystem::Plugins::SmartControlConfig> generateSmartControls() const;
    UIMetadata getUIMetadata() const;
    ValidationResult getValidationResult() const;
    bool supportsHotReloading() const override;
    bool supportsSmartControls() const { return true; }

private:
    bool isLoaded_ = false;
    AlgorithmInfo algorithmInfo_;
    std::string specificationFile_;
    mutable UIMetadata cachedUIMetadata_;
    mutable ValidationResult cachedValidationResult_;
    mutable bool uiMetadataCached_ = false;
    mutable bool validationResultCached_ = false;
};

/**
 * @brief Factory for creating enhanced YAML loaders
 */
namespace EnhancedYAMLLoaderFactory {
    /**
     * @brief Create enhanced YAML loader with smart control support
     * @param filePath Path to YAML specification
     * @return Created loader instance
     */
    std::unique_ptr<EnhancedYAMLAlgorithmLoader> createEnhancedLoader(const std::string& filePath);

    /**
     * @brief Test if file is compatible with enhanced loader
     * @param filePath Path to test
     * @return True if compatible
     */
    bool isCompatibleFile(const std::string& filePath);

    /**
     * @brief Get supported file extensions
     * @return Array of supported extensions
     */
    juce::StringArray getSupportedExtensions();
}

} // namespace airwindows
} // namespace schill