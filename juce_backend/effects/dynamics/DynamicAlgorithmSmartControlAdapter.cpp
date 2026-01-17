#include "airwindows/DynamicAlgorithmSmartControlAdapter.h"
#include "airwindows/AirwindowsAlgorithms.h"
#include "../plugins/SmartPluginUI.h"
#include <JuceHeader.h>

using namespace SchillingerEcosystem::Plugins;

namespace schill {
namespace airwindows {

//==============================================================================
// Dynamic Algorithm Smart Control Adapter Implementation
//==============================================================================

std::vector<SmartControlConfig> DynamicAlgorithmSmartControlAdapter::generateSmartControls(
    const AlgorithmInfo& algorithmInfo)
{
    std::vector<SmartControlConfig> configs;

    std::cout << "🎛️ Generating smart controls for algorithm: " << algorithmInfo.displayName << std::endl;
    std::cout << "   Parameters: " << algorithmInfo.parameters.size() << std::endl;

    // Generate controls for each algorithm parameter
    for (const auto& param : algorithmInfo.parameters) {
        SmartControlConfig config;

        // Core parameter mapping
        config.parameterAddress = algorithmInfo.name + "." + param.name;
        config.displayName = param.displayName;
        config.shortName = generateShortName(param.displayName);
        config.description = param.description;

        // Smart priority classification
        config.priority = classifyParameterPriority(algorithmInfo.category, param);

        // Context analysis for workflow optimization
        config.context = analyzeParameterContext(algorithmInfo.category, param);

        // Control type selection based on parameter characteristics
        config.controlType = selectControlType(param);

        // Progressive disclosure layout
        config.compactBounds = generateBounds(config, SmartPluginUI::DisplayMode::Compact);
        config.normalBounds = generateBounds(config, SmartPluginUI::DisplayMode::Normal);
        config.advancedBounds = generateBounds(config, SmartPluginUI::DisplayMode::Advanced);

        // Visibility rules based on workflow and importance
        config.showByDefault = (config.priority <= ControlPriority::Important);
        config.showInCompactMode = (config.priority == ControlPriority::Essential);
        config.showInPerformanceMode = config.context.isPerformance;

        // Parameter relationships for smart suggestions
        config.relatedParameters = findRelatedParameters(algorithmInfo.category, param.name);
        config.conflictingParameters = findConflictingParameters(algorithmInfo.category, param.name);
        config.dependencyParameters = findDependencyParameters(algorithmInfo.category, param.name);

        configs.push_back(config);

        std::cout << "   ✅ Added: " << param.displayName
                  << " (Priority: " << static_cast<int>(config.priority) << ") "
                  << "Type: " << config.controlType << std::endl;
    }

    std::cout << "🎉 Generated " << configs.size() << " smart controls for "
              << algorithmInfo.displayName << std::endl;

    return configs;
}

std::unique_ptr<juce::Component> DynamicAlgorithmSmartControlAdapter::createSmartControl(
    const SmartControlConfig& config, AirwindowsAlgorithm* algorithm)
{
    if (!algorithm) {
        std::cerr << "❌ Algorithm is null, cannot create control" << std::endl;
        return nullptr;
    }

    std::unique_ptr<juce::Component> control;

    // Create control based on type
    if (config.controlType == "knob") {
        control = SmartControlFactory::createSmartKnob(config);
    } else if (config.controlType == "slider") {
        control = SmartControlFactory::createSmartSlider(config);
    } else if (config.controlType == "button") {
        control = SmartControlFactory::createSmartButton(config);
    } else if (config.controlType == "combobox") {
        control = SmartControlFactory::createSmartComboBox(config);
    } else {
        // Default to knob for unknown types
        control = SmartControlFactory::createSmartKnob(config);
    }

    if (control) {
        // Apply algorithm-specific styling
        applyAlgorithmStyling(control.get(), config);

        // Setup dynamic parameter binding
        setupDynamicParameterBinding(control.get(), config.parameterAddress.toStdString());

        std::cout << "🎛️ Created " << config.controlType << ": " << config.displayName << std::endl;
    }

    return control;
}

ParameterBinding DynamicAlgorithmSmartControlAdapter::createParameterBinding(
    const std::string& algorithmName,
    const std::string& parameterAddress)
{
    // Extract parameter name from address (format: "algorithm.parameter")
    auto dotPos = parameterAddress.find_last_of('.');
    std::string paramName = (dotPos != std::string::npos) ?
                           parameterAddress.substr(dotPos + 1) : parameterAddress;

    auto& registry = DynamicAlgorithmRegistry::getInstance();
    auto algorithmInfo = registry.getAlgorithmInfo(algorithmName);

    ParameterBinding binding;
    binding.algorithmName = algorithmName;
    binding.parameterAddress = parameterAddress;

    // Find parameter in algorithm info
    for (const auto& param : algorithmInfo.parameters) {
        if (param.name == paramName) {
            binding.parameterType = param.type;
            binding.minValue = std::to_string(param.minValue);
            binding.maxValue = std::to_string(param.maxValue);
            binding.defaultValue = std::to_string(param.defaultValue);
            binding.isAutomatable = param.automatable;
            binding.requiresSmoothedValue = param.smoothed;
            break;
        }
    }

    // Add parameter relationships
    binding.relatedParameters = findRelatedParameters(algorithmInfo.category, paramName);
    binding.conflictingParameters = findConflictingParameters(algorithmInfo.category, paramName);

    return binding;
}

bool DynamicAlgorithmSmartControlAdapter::updateControlBinding(
    juce::Component* control,
    const std::string& newAlgorithmName,
    const std::string& parameterAddress)
{
    if (!control) {
        return false;
    }

    // Create new parameter binding
    auto binding = createParameterBinding(newAlgorithmName, parameterAddress);

    // Update control based on its type
    if (auto* slider = dynamic_cast<juce::Slider*>(control)) {
        // Update slider range and value
        if (!binding.minValue.empty() && !binding.maxValue.empty()) {
            slider->setRange(std::stod(binding.minValue), std::stod(binding.maxValue));
        }
        if (!binding.defaultValue.empty()) {
            slider->setValue(std::stod(binding.defaultValue));
        }
        slider->setEnabled(true);
        return true;
    } else if (auto* button = dynamic_cast<juce::Button*>(control)) {
        // Update button state
        if (!binding.defaultValue.empty()) {
            button->setToggleState(std::stod(binding.defaultValue) > 0.5f,
                                 juce::dontSendNotification);
        }
        button->setEnabled(true);
        return true;
    }

    return false;
}

ControlStyling DynamicAlgorithmSmartControlAdapter::generateCategoryStyling(
    const std::string& category,
    ControlPriority priority)
{
    ControlStyling styling;
    styling.useCategoryStyling = true;

    // Category-based color coding
    if (category == "Reverb") {
        styling.primaryColor = juce::Colours::blue;
        styling.secondaryColor = juce::Colours::lightblue;
    } else if (category == "Dynamics") {
        styling.primaryColor = juce::Colours::green;
        styling.secondaryColor = juce::Colours::lightgreen;
    } else if (category == "Distortion") {
        styling.primaryColor = juce::Colours::red;
        styling.secondaryColor = juce::Colours::lightcoral;
    } else if (category == "EQ" || category == "Equalizer") {
        styling.primaryColor = juce::Colours::orange;
        styling.secondaryColor = juce::Colours::lightyellow;
    } else if (category == "Modulation") {
        styling.primaryColor = juce::Colours::purple;
        styling.secondaryColor = juce::Colours::plum;
    } else if (category == "Delay") {
        styling.primaryColor = juce::Colours::cyan;
        styling.secondaryColor = juce::Colours::lightcyan;
    } else {
        styling.primaryColor = juce::Colours::grey;
        styling.secondaryColor = juce::Colours::lightgrey;
    }

    // Priority-based styling adjustments
    switch (priority) {
        case ControlPriority::Essential:
            styling.borderWidth = 2.0f;
            styling.cornerRadius = 6.0f;
            break;
        case ControlPriority::Important:
            styling.borderWidth = 1.5f;
            styling.cornerRadius = 4.0f;
            break;
        case ControlPriority::Advanced:
            styling.borderWidth = 1.0f;
            styling.cornerRadius = 2.0f;
            break;
        default:
            styling.borderWidth = 0.5f;
            styling.cornerRadius = 1.0f;
            break;
    }

    styling.textColor = juce::Colours::white;
    styling.backgroundColor = juce::Colours::darkgrey.withAlpha(0.8f);

    return styling;
}

ParameterRelationships DynamicAlgorithmSmartControlAdapter::analyzeParameterRelationships(
    const AlgorithmInfo& algorithmInfo)
{
    ParameterRelationships relationships;

    std::cout << "🔍 Analyzing parameter relationships for: " << algorithmInfo.displayName << std::endl;

    for (const auto& param : algorithmInfo.parameters) {
        // Find related parameters
        relationships.relatedParameters[param.name] =
            findRelatedParameters(algorithmInfo.category, param.name);

        // Find conflicting parameters
        relationships.conflictingParameters[param.name] =
            findConflictingParameters(algorithmInfo.category, param.name);

        // Find dependency parameters
        relationships.dependencyParameters[param.name] =
            findDependencyParameters(algorithmInfo.category, param.name);

        // Classify essential vs advanced
        auto priority = classifyParameterPriority(algorithmInfo.category, param);
        if (priority <= ControlPriority::Important) {
            relationships.essentialParameters.insert(param.name);
        } else {
            relationships.advancedParameters.insert(param.name);
        }
    }

    // Create parameter groups
    if (algorithmInfo.category == "Reverb") {
        relationships.parameterGroups.emplace_back("Size", "Regen");
        relationships.parameterGroups.emplace_back("Predelay", "Size");
    } else if (algorithmInfo.category == "Dynamics") {
        relationships.parameterGroups.emplace_back("Threshold", "Ratio");
        relationships.parameterGroups.emplace_back("Attack", "Release");
    } else if (algorithmInfo.category == "Distortion") {
        relationships.parameterGroups.emplace_back("Drive", "Tone");
        relationships.parameterGroups.emplace_back("Drive", "Mix");
    }

    return relationships;
}

//==============================================================================
// Private Helper Methods
//==============================================================================

ControlPriority DynamicAlgorithmSmartControlAdapter::classifyParameterPriority(
    const std::string& category, const AlgorithmParameter& param)
{
    // Essential parameters - always visible
    if (param.name == "Mix" || param.name == "Drive" ||
        param.name == "Output" || param.name == "Enable" ||
        param.name == "Bypass") {
        return ControlPriority::Essential;
    }

    // Important parameters - visible in normal mode
    if (param.name == "Size" || param.name == "Tone" ||
        param.name == "Cutoff" || param.name == "Resonance" ||
        param.name == "Threshold" || param.name == "Ratio") {
        return ControlPriority::Important;
    }

    // Category-specific essential parameters
    if (category == "Reverb" && (param.name == "Size" || param.name == "Regen" ||
                                param.name == "Predelay")) {
        return ControlPriority::Essential;
    }

    if (category == "Dynamics" && (param.name == "Threshold" || param.name == "Ratio" ||
                                  param.name == "Attack" || param.name == "Release")) {
        return ControlPriority::Important;
    }

    if (category == "Distortion" && (param.name == "Drive" || param.name == "Gain" ||
                                    param.name == "Tone")) {
        return ControlPriority::Important;
    }

    // Advanced parameters
    if (param.name.find("Advanced") != std::string::npos ||
        param.name.find("Debug") != std::string::npos ||
        param.name.find("Internal") != std::string::npos) {
        return ControlPriority::Advanced;
    }

    // Default to important for algorithm parameters
    return ControlPriority::Important;
}

ControlContext DynamicAlgorithmSmartControlAdapter::analyzeParameterContext(
    const std::string& category, const AlgorithmParameter& param)
{
    ControlContext context;
    context.category = juce::String(category);

    // Performance-critical parameters
    context.isPerformance = (param.name == "Mix" || param.name == "Drive" ||
                            param.name == "Output" || param.name == "Threshold");

    // Frequently automated parameters
    context.isAutomation = (param.name == "Mix" || param.name == "Size" ||
                           param.name == "Drive" || param.name == "Tone");

    // Often modulated parameters
    context.isModulationTarget = (param.name == "Drive" || param.name == "Size" ||
                                 param.name == "Tone" || param.name == "Cutoff");

    // Affects sound directly (most algorithm parameters do)
    context.affectsAudio = true;

    // Parameters that need attention
    context.requiresAttention = (param.name == "Drive" || param.name == "Output" ||
                                param.name == "Threshold" || param.name == "Gain");

    // Workflow assignment
    if (category == "Reverb") {
        context.workflow = "Mixing";
    } else if (category == "Dynamics") {
        context.workflow = "Mixing";
    } else if (category == "Distortion") {
        context.workflow = "Sound Design";
    } else if (category == "EQ" || category == "Equalizer") {
        context.workflow = "Mixing";
    } else if (category == "Modulation") {
        context.workflow = "Sound Design";
    } else {
        context.workflow = "General";
    }

    // Typical range based on parameter type
    if (param.type == "float") {
        context.typicalRange = 0.3f;
    } else if (param.type == "int") {
        context.typicalRange = 0.2f;
    } else {
        context.typicalRange = 0.1f;
    }

    return context;
}

juce::String DynamicAlgorithmSmartControlAdapter::selectControlType(const AlgorithmParameter& param)
{
    // Boolean parameters get buttons
    if (param.type == "bool" || (param.minValue == 0.0f && param.maxValue == 1.0f)) {
        return "button";
    }

    // Enum parameters get combo boxes
    if (param.type == "enum") {
        return "combobox";
    }

    // Small ranges (0-1) get knobs
    if ((param.maxValue - param.minValue) <= 1.0f) {
        return "knob";
    }

    // Large ranges get sliders
    return "slider";
}

juce::String DynamicAlgorithmSmartControlAdapter::generateShortName(const juce::String& displayName)
{
    if (displayName.length() <= 4) {
        return displayName;
    }

    // Simple abbreviation
    auto words = juce::StringArray::fromTokens(displayName, " ", "");

    if (words.size() >= 2) {
        juce::String shortName;
        for (int i = 0; i < std::min(2, words.size()); ++i) {
            if (words[i].isNotEmpty()) {
                shortName += words[i][0];
            }
        }
        return shortName.toUpperCase();
    }

    // First 4 characters if no spaces
    return displayName.substring(0, 4).toUpperCase();
}

juce::StringArray DynamicAlgorithmSmartControlAdapter::findRelatedParameters(
    const std::string& category, const std::string& paramName)
{
    juce::StringArray related;

    if (paramName == "Drive") {
        related.add("Tone");
        related.add("Mix");
    }
    if (paramName == "Size") {
        related.add("Regen");
        related.add("Predelay");
    }
    if (paramName == "Tone") {
        related.add("Drive");
        related.add("Character");
    }
    if (paramName == "Threshold") {
        related.add("Ratio");
        related.add("Attack");
        related.add("Release");
    }
    if (paramName == "Mix") {
        related.add("Drive");
        related.add("Size");
        related.add("Output");
    }

    return related;
}

juce::StringArray DynamicAlgorithmSmartControlAdapter::findConflictingParameters(
    const std::string& category, const std::string& paramName)
{
    juce::StringArray conflicting;

    // Example: High drive might conflict with clean settings
    if (paramName == "Drive" && category == "Dynamics") {
        conflicting.add("Threshold");
    }

    // Example: High mix might conflict with dry processing
    if (paramName == "Mix") {
        conflicting.add("DryLevel");
    }

    return conflicting;
}

juce::StringArray DynamicAlgorithmSmartControlAdapter::findDependencyParameters(
    const std::string& category, const std::string& paramName)
{
    juce::StringArray dependencies;

    // Mix parameter often depends on other parameters being audible
    if (paramName == "Mix") {
        dependencies.add("Drive");
        dependencies.add("Size");
        dependencies.add("Level");
    }

    // Size often depends on predelay
    if (paramName == "Size") {
        dependencies.add("Predelay");
    }

    return dependencies;
}

void DynamicAlgorithmSmartControlAdapter::applyAlgorithmStyling(
    juce::Component* control, const SmartControlConfig& config)
{
    // Get category-based styling
    auto styling = generateCategoryStyling(config.context.category.toStdString(), config.priority);

    if (styling.useCategoryStyling) {
        // Apply category colors
        if (auto* slider = dynamic_cast<juce::Slider*>(control)) {
            slider->setColour(juce::Slider::thumbColourId, styling.primaryColor);
            slider->setColour(juce::Slider::trackColourId, styling.secondaryColor);
            slider->setColour(juce::Slider::rotarySliderFillColourId, styling.primaryColor);
        } else if (auto* button = dynamic_cast<juce::Button*>(control)) {
            button->setColour(juce::TextButton::buttonColourId, styling.primaryColor);
            button->setColour(juce::TextButton::buttonOnColourId, styling.secondaryColor);
        }
    }
}

void DynamicAlgorithmSmartControlAdapter::setupDynamicParameterBinding(
    juce::Component* control, const std::string& parameterAddress)
{
    // This would set up the parameter binding system
    // For now, we'll just store the parameter address in the component properties
    control->getProperties().set("parameterAddress", juce::String(parameterAddress));
    control->getProperties().set("dynamicBinding", true);

    std::cout << "🔗 Bound control to parameter: " << parameterAddress << std::endl;
}

juce::Rectangle<int> DynamicAlgorithmSmartControlAdapter::generateBounds(
    const SmartControlConfig& config, SmartPluginUI::DisplayMode mode)
{
    switch (mode) {
        case SmartPluginUI::DisplayMode::Compact:
            return juce::Rectangle<int>(0, 0, 40, 40);
        case SmartPluginUI::DisplayMode::Normal:
            return juce::Rectangle<int>(0, 0, 80, 60);
        case SmartPluginUI::DisplayMode::Advanced:
            return juce::Rectangle<int>(0, 0, 120, 80);
        default:
            return juce::Rectangle<int>(0, 0, 80, 60);
    }
}

//==============================================================================
// Dynamic Algorithm Smart Control Manager Implementation
//==============================================================================

DynamicAlgorithmSmartControlManager::DynamicAlgorithmSmartControlManager()
    : algorithmRegistry(nullptr)
    , hotReloadingEnabled(true)
    , initialized(false)
{
}

DynamicAlgorithmSmartControlManager::~DynamicAlgorithmSmartControlManager()
{
    shutdown();
}

bool DynamicAlgorithmSmartControlManager::initialize(DynamicAlgorithmRegistry* registry)
{
    if (initialized || !registry) {
        return false;
    }

    algorithmRegistry = registry;
    initialized = true;

    std::cout << "🔧 Dynamic Algorithm Smart Control Manager initialized" << std::endl;
    return true;
}

void DynamicAlgorithmSmartControlManager::shutdown()
{
    if (!initialized) {
        return;
    }

    unbindAllControls();
    clearAllControls();
    algorithmRegistry = nullptr;
    initialized = false;
}

bool DynamicAlgorithmSmartControlManager::isInitialized() const
{
    return initialized;
}

std::vector<SmartControlConfig> DynamicAlgorithmSmartControlManager::createControlsForAlgorithm(
    const std::string& algorithmName)
{
    if (!initialized || !algorithmRegistry) {
        return {};
    }

    auto algorithmInfo = algorithmRegistry->getAlgorithmInfo(algorithmName);
    if (algorithmInfo.name.empty()) {
        std::cerr << "❌ Algorithm not found: " << algorithmName << std::endl;
        return {};
    }

    auto configs = DynamicAlgorithmSmartControlAdapter::generateSmartControls(algorithmInfo);
    currentAlgorithmName = algorithmName;

    std::cout << "🎛️ Created " << configs.size() << " controls for algorithm: "
              << algorithmName << std::endl;

    return configs;
}

bool DynamicAlgorithmSmartControlManager::updateControlsForAlgorithmChange(
    const std::string& oldAlgorithmName, const std::string& newAlgorithmName)
{
    if (!initialized) {
        return false;
    }

    std::cout << "🔄 Updating controls from " << oldAlgorithmName
              << " to " << newAlgorithmName << std::endl;

    currentAlgorithmName = newAlgorithmName;

    // Update all bound controls
    bool allUpdated = true;
    for (auto& [control, oldParameterAddress] : controlBindings) {
        // Extract parameter name from old address
        auto dotPos = oldParameterAddress.find_last_of('.');
        std::string paramName = (dotPos != std::string::npos) ?
                               oldParameterAddress.substr(dotPos + 1) : oldParameterAddress;

        // Create new parameter address for new algorithm
        std::string newParameterAddress = newAlgorithmName + "." + paramName;

        // Update control binding
        if (!DynamicAlgorithmSmartControlAdapter::updateControlBinding(
                control, newAlgorithmName, newParameterAddress)) {
            allUpdated = false;
            std::cerr << "❌ Failed to update control for parameter: " << paramName << std::endl;
        } else {
            // Update binding in our map
            controlBindings[control] = newParameterAddress;
        }
    }

    if (allUpdated) {
        std::cout << "✅ Successfully updated all controls for new algorithm" << std::endl;
    } else {
        std::cout << "⚠️ Some controls failed to update" << std::endl;
    }

    return allUpdated;
}

void DynamicAlgorithmSmartControlManager::clearAllControls()
{
    controlBindings.clear();
    currentAlgorithmName.clear();
    std::cout << "🗑️ Cleared all dynamic algorithm controls" << std::endl;
}

bool DynamicAlgorithmSmartControlManager::bindControlToParameter(
    juce::Component* control, const std::string& parameterAddress)
{
    if (!control || parameterAddress.empty()) {
        return false;
    }

    controlBindings[control] = parameterAddress;

    // Setup dynamic parameter binding
    DynamicAlgorithmSmartControlAdapter::setupDynamicParameterBinding(control, parameterAddress);

    std::cout << "🔗 Bound control to parameter: " << parameterAddress << std::endl;
    return true;
}

bool DynamicAlgorithmSmartControlManager::unbindControl(juce::Component* control)
{
    if (!control) {
        return false;
    }

    auto it = controlBindings.find(control);
    if (it != controlBindings.end()) {
        std::cout << "🔓 Unbound control from parameter: " << it->second << std::endl;
        controlBindings.erase(it);
        return true;
    }

    return false;
}

void DynamicAlgorithmSmartControlManager::unbindAllControls()
{
    int count = static_cast<int>(controlBindings.size());
    controlBindings.clear();
    std::cout << "🔓 Unbound " << count << " controls" << std::endl;
}

bool DynamicAlgorithmSmartControlManager::handleAlgorithmReload(const std::string& algorithmName)
{
    if (!hotReloadingEnabled || !initialized) {
        return false;
    }

    if (algorithmName == currentAlgorithmName) {
        std::cout << "🔄 Handling algorithm reload for: " << algorithmName << std::endl;

        // Refresh all controls to pick up any parameter changes
        refreshAllControls();

        return true;
    }

    return false;
}

void DynamicAlgorithmSmartControlManager::enableHotReloading(bool enabled)
{
    hotReloadingEnabled = enabled;
    std::cout << "🔥 Hot reloading " << (enabled ? "enabled" : "disabled") << std::endl;
}

bool DynamicAlgorithmSmartControlManager::isHotReloadingEnabled() const
{
    return hotReloadingEnabled;
}

void DynamicAlgorithmSmartControlManager::onAlgorithmChanged(const std::string& newAlgorithmName)
{
    std::string oldAlgorithm = currentAlgorithmName;
    updateControlsForAlgorithmChange(oldAlgorithm, newAlgorithmName);
}

void DynamicAlgorithmSmartControlManager::onParameterChanged(
    const std::string& parameterAddress, float value)
{
    notifyControlChange(parameterAddress, value);
}

void DynamicAlgorithmSmartControlManager::onAlgorithmLoaded(const std::string& algorithmName)
{
    std::cout << "📥 Algorithm loaded: " << algorithmName << std::endl;
}

void DynamicAlgorithmSmartControlManager::onAlgorithmUnloaded(const std::string& algorithmName)
{
    std::cout << "📤 Algorithm unloaded: " << algorithmName << std::endl;

    if (algorithmName == currentAlgorithmName) {
        clearAllControls();
    }
}

void DynamicAlgorithmSmartControlManager::updateControlVisibility()
{
    // This would update control visibility based on current display mode
    // Implementation would depend on the specific UI framework being used
}

void DynamicAlgorithmSmartControlManager::refreshAllControls()
{
    for (auto& [control, parameterAddress] : controlBindings) {
        // Re-bind control to refresh its state
        auto dotPos = parameterAddress.find_last_of('.');
        if (dotPos != std::string::npos) {
            std::string algorithmName = parameterAddress.substr(0, dotPos);
            std::string paramName = parameterAddress.substr(dotPos + 1);

            DynamicAlgorithmSmartControlAdapter::updateControlBinding(
                control, algorithmName, parameterAddress);
        }
    }
}

void DynamicAlgorithmSmartControlManager::notifyControlChange(
    const std::string& parameterAddress, float newValue)
{
    // This would notify the algorithm about parameter changes
    std::cout << "📝 Parameter change: " << parameterAddress << " = " << newValue << std::endl;
}

} // namespace airwindows
} // namespace schill