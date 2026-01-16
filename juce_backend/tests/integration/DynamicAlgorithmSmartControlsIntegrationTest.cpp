#include <gtest/gtest.h>
#include <JuceHeader.h>
#include "airwindows/DynamicAlgorithmSystem.h"
#include "airwindows/DynamicAlgorithmSmartControlAdapter.h"
#include "plugins/SmartPluginUIWithDynamicAlgorithms.h"
#include "airwindows/YAMLSmartControlLoader.h"

using namespace SchillingerEcosystem::Plugins;
using namespace schill::airwindows;

class DynamicAlgorithmSmartControlsIntegrationTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        // Initialize test environment
        juce::ScopedJuceInitialiser juceInitialiser;

        // Create dynamic algorithm registry
        registry = &DynamicAlgorithmRegistry::getInstance();
        ASSERT_NE(registry, nullptr);

        // Create smart control manager
        smartControlManager = std::make_unique<DynamicAlgorithmSmartControlManager>();
        ASSERT_NE(smartControlManager, nullptr);

        // Initialize smart control manager
        bool initialized = smartControlManager->initialize(registry);
        ASSERT_TRUE(initialized);

        // Create test algorithm specifications
        createTestAlgorithmSpecifications();
    }

    void TearDown() override
    {
        // Clean up
        if (smartControlManager) {
            smartControlManager->shutdown();
            smartControlManager.reset();
        }

        // Clean up test files
        cleanupTestFiles();
    }

    void createTestAlgorithmSpecifications()
    {
        // Create test directory
        testDirectory = juce::File::getSpecialLocation(juce::File::tempDirectory)
                           .getChildFile("dynamic_algorithm_test_" + juce::Uuid().toString());
        testDirectory.createDirectory();

        // Create test Density specification
        createDensitySpecification();

        // Create test Everglade specification
        createEvergladeSpecification();
    }

    void createDensitySpecification()
    {
        std::string densitySpec = R"(
algorithm:
  name: "TestDensity"
  displayName: "Test Density"
  category: "Dynamics"
  complexity: 2
  popularity: 8
  description: "Test saturation algorithm for integration testing"
  version: "1.0"
  author: "Test Suite"
  tags: ["saturation", "harmonics", "density", "test"]
  license: "MIT"
  cpuUsage: 1.2
  latency: 0.0

parameters:
  - name: "Drive"
    displayName: "Drive"
    type: "float"
    minValue: 0.0
    maxValue: 1.0
    defaultValue: 0.5
    description: "Amount of saturation to apply"
    unit: ""
    automatable: true
    smoothed: true
    priority: "essential"
    workflow: "sound_design"

  - name: "Tone"
    displayName: "Tone"
    type: "float"
    minValue: 0.0
    maxValue: 1.0
    defaultValue: 0.5
    description: "Tonal character of saturation"
    unit: ""
    automatable: true
    smoothed: true
    priority: "important"
    workflow: "mixing"

  - name: "Mix"
    displayName: "Mix"
    type: "float"
    minValue: 0.0
    maxValue: 1.0
    defaultValue: 1.0
    description: "Dry/wet mix"
    unit: "%"
    automatable: true
    smoothed: true
    priority: "essential"
    workflow: "performance"
    relatedParameters: ["Drive"]
    conflictingParameters: ["CleanOutput"]

implementation:
  template: "dynamics"
  dspFunctions:
    - "densityProcess"
    - "applyHarmonics"
    - "applyToneControl"

testing:
  referenceImplementation: "external/TestDensity.vst3"
  qualityThreshold: 0.98
  performanceThreshold: 0.5
)";

        juce::File densityFile = testDirectory.getChildFile("TestDensity.yaml");
        densityFile.replaceWithText(densitySpec);
        densitySpecPath = densityFile.getFullPathName().toStdString();
    }

    void createEvergladeSpecification()
    {
        std::string evergladeSpec = R"(
algorithm:
  name: "TestEverglade"
  displayName: "Test Everglade Reverb"
  category: "Reverb"
  complexity: 3
  popularity: 9
  description: "Test reverb algorithm for integration testing"
  version: "1.0"
  author: "Test Suite"
  tags: ["reverb", "space", "natural", "ambient", "test"]
  license: "MIT"
  cpuUsage: 3.5
  latency: 1.2

parameters:
  - name: "Size"
    displayName: "Reverb Size"
    type: "float"
    minValue: 0.0
    maxValue: 1.0
    defaultValue: 0.5
    description: "Size of the reverb space"
    unit: ""
    automatable: true
    smoothed: true
    priority: "essential"
    workflow: "mixing"

  - name: "Regen"
    displayName: "Regeneration"
    type: "float"
    minValue: 0.0
    maxValue: 1.0
    defaultValue: 0.3
    description: "Regeneration amount for richer tails"
    unit: ""
    automatable: true
    smoothed: true
    priority: "important"
    workflow: "sound_design"

  - name: "Predelay"
    displayName: "Pre-delay"
    type: "float"
    minValue: 0.0
    maxValue: 1.0
    defaultValue: 0.1
    description: "Delay before reverb starts"
    unit: "ms"
    automatable: true
    smoothed: true
    priority: "advanced"
    workflow: "automation"

  - name: "Mix"
    displayName: "Mix"
    type: "float"
    minValue: 0.0
    maxValue: 1.0
    defaultValue: 0.8
    description: "Dry/wet mix"
    unit: "%"
    automatable: true
    smoothed: true
    priority: "essential"
    workflow: "performance"
    relatedParameters: ["Size", "Regen"]

implementation:
  template: "reverb"
  dspFunctions:
    - "processEarlyReflections"
    - "processDiffusion"
    - "processFilters"

testing:
  referenceImplementation: "external/TestEverglade.vst3"
  qualityThreshold: 0.95
  performanceThreshold: 1.0
)";

        juce::File evergladeFile = testDirectory.getChildFile("TestEverglade.yaml");
        evergladeFile.replaceWithText(evergladeSpec);
        evergladeSpecPath = evergladeFile.getFullPathName().toStdString();
    }

    void cleanupTestFiles()
    {
        if (testDirectory.exists()) {
            testDirectory.deleteRecursively();
        }
    }

protected:
    DynamicAlgorithmRegistry* registry;
    std::unique_ptr<DynamicAlgorithmSmartControlManager> smartControlManager;
    juce::File testDirectory;
    std::string densitySpecPath;
    std::string evergladeSpecPath;
};

//==============================================================================
// Test 1: Dynamic Algorithm Registry Integration
//==============================================================================

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, LoadAlgorithmsFromSpecifications)
{
    // Load algorithms from test specifications
    bool scanSuccess = registry->scanDirectory(testDirectory.getFullPathName().toStdString());
    EXPECT_TRUE(scanSuccess) << "Failed to scan test directory";

    // Check that algorithms were loaded
    auto availableAlgorithms = registry->getAvailableAlgorithms();
    EXPECT_EQ(availableAlgorithms.size(), 2) << "Expected 2 algorithms to be loaded";

    // Verify TestDensity
    bool densityLoaded = registry->isAlgorithmAvailable("TestDensity");
    EXPECT_TRUE(densityLoaded) << "TestDensity should be loaded";

    // Verify TestEverglade
    bool evergladeLoaded = registry->isAlgorithmAvailable("TestEverglade");
    EXPECT_TRUE(evergladeLoaded) << "TestEverglade should be loaded";
}

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, GetAlgorithmInformation)
{
    // Load test algorithms
    registry->scanDirectory(testDirectory.getFullPathName().toStdString());

    // Get TestDensity information
    auto densityInfo = registry->getAlgorithmInfo("TestDensity");
    EXPECT_EQ(densityInfo.name, "TestDensity");
    EXPECT_EQ(densityInfo.displayName, "Test Density");
    EXPECT_EQ(densityInfo.category, "Dynamics");
    EXPECT_EQ(densityInfo.parameters.size(), 3) << "Density should have 3 parameters";

    // Get TestEverglade information
    auto evergladeInfo = registry->getAlgorithmInfo("TestEverglade");
    EXPECT_EQ(evergladeInfo.name, "TestEverglade");
    EXPECT_EQ(evergladeInfo.displayName, "Test Everglade Reverb");
    EXPECT_EQ(evergladeInfo.category, "Reverb");
    EXPECT_EQ(evergladeInfo.parameters.size(), 4) << "Everglade should have 4 parameters";
}

//==============================================================================
// Test 2: Smart Control Generation
//==============================================================================

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, GenerateSmartControlsFromAlgorithmInfo)
{
    // Load test algorithms
    registry->scanDirectory(testDirectory.getFullPathName().toStdString());

    // Get TestDensity algorithm info
    auto densityInfo = registry->getAlgorithmInfo("TestDensity");

    // Generate smart controls
    auto densityControls = DynamicAlgorithmSmartControlAdapter::generateSmartControls(densityInfo);

    EXPECT_EQ(densityControls.size(), 3) << "Should generate 3 controls for Density";

    // Check Drive control
    auto driveControl = std::find_if(densityControls.begin(), densityControls.end(),
        [](const SmartControlConfig& config) {
            return config.parameterAddress == "TestDensity.Drive";
        });

    ASSERT_NE(driveControl, densityControls.end()) << "Drive control should be generated";
    EXPECT_EQ(driveControl->priority, ControlPriority::Essential);
    EXPECT_EQ(driveControl->controlType, "knob");
    EXPECT_TRUE(driveControl->showByDefault);
    EXPECT_TRUE(driveControl->showInPerformanceMode);

    // Check Mix control
    auto mixControl = std::find_if(densityControls.begin(), densityControls.end(),
        [](const SmartControlConfig& config) {
            return config.parameterAddress == "TestDensity.Mix";
        });

    ASSERT_NE(mixControl, densityControls.end()) << "Mix control should be generated";
    EXPECT_EQ(mixControl->priority, ControlPriority::Essential);
    EXPECT_TRUE(mixControl->context.isPerformance);
}

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, GenerateSmartControlsForDifferentCategories)
{
    // Load test algorithms
    registry->scanDirectory(testDirectory.getFullPathName().toStdString());

    // Generate controls for Dynamics algorithm
    auto densityInfo = registry->getAlgorithmInfo("TestDensity");
    auto densityControls = DynamicAlgorithmSmartControlAdapter::generateSmartControls(densityInfo);

    // Generate controls for Reverb algorithm
    auto evergladeInfo = registry->getAlgorithmInfo("TestEverglade");
    auto evergladeControls = DynamicAlgorithmSmartControlAdapter::generateSmartControls(evergladeInfo);

    // Verify category-based differences
    EXPECT_EQ(densityControls.size(), 3) << "Density should have 3 controls";
    EXPECT_EQ(evergladeControls.size(), 4) << "Everglade should have 4 controls";

    // Check styling differences
    auto densityStyling = DynamicAlgorithmSmartControlAdapter::generateCategoryStyling("Dynamics", ControlPriority::Essential);
    auto evergladeStyling = DynamicAlgorithmSmartControlAdapter::generateCategoryStyling("Reverb", ControlPriority::Essential);

    EXPECT_EQ(densityStyling.primaryColor, juce::Colours::green);
    EXPECT_EQ(evergladeStyling.primaryColor, juce::Colours::blue);
}

//==============================================================================
// Test 3: Smart Control Manager Integration
//==============================================================================

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, SmartControlManagerInitialization)
{
    // Smart control manager should be initialized in SetUp()
    EXPECT_TRUE(smartControlManager->isInitialized()) << "Smart control manager should be initialized";

    // Check hot-reloading is enabled by default
    EXPECT_TRUE(smartControlManager->isHotReloadingEnabled()) << "Hot-reloading should be enabled by default";
}

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, CreateControlsForAlgorithm)
{
    // Load test algorithms
    registry->scanDirectory(testDirectory.getFullPathName().toStdString());

    // Create controls for TestDensity
    auto densityControls = smartControlManager->createControlsForAlgorithm("TestDensity");
    EXPECT_EQ(densityControls.size(), 3) << "Should create 3 controls for TestDensity";

    // Create controls for TestEverglade
    auto evergladeControls = smartControlManager->createControlsForAlgorithm("TestEverglade");
    EXPECT_EQ(evergladeControls.size(), 4) << "Should create 4 controls for TestEverglade";
}

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, UpdateControlsForAlgorithmChange)
{
    // Load test algorithms
    registry->scanDirectory(testDirectory.getFullPathName().toStdString());

    // Create initial controls for Density
    auto densityControls = smartControlManager->createControlsForAlgorithm("TestDensity");
    EXPECT_EQ(densityControls.size(), 3);

    // Simulate control binding
    juce::Slider testSlider;
    bool bound = smartControlManager->bindControlToParameter(&testSlider, "TestDensity.Drive");
    EXPECT_TRUE(bound) << "Should successfully bind control to parameter";

    // Switch algorithms
    bool updateSuccess = smartControlManager->updateControlsForAlgorithmChange("TestDensity", "TestEverglade");
    EXPECT_TRUE(updateSuccess) << "Should successfully update controls for algorithm change";
}

//==============================================================================
// Test 4: YAML Smart Control Loader Integration
//==============================================================================

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, LoadAlgorithmFromYAML)
{
    // Load algorithm using enhanced YAML loader
    auto algorithmInfo = YAMLSmartControlLoader::loadAlgorithmSpecification(densitySpecPath);
    EXPECT_TRUE(algorithmInfo.has_value()) << "Should successfully load algorithm from YAML";

    if (algorithmInfo) {
        EXPECT_EQ(algorithmInfo->name, "TestDensity");
        EXPECT_EQ(algorithmInfo->category, "Dynamics");
        EXPECT_EQ(algorithmInfo->parameters.size(), 3);
    }
}

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, GenerateSmartControlsFromYAML)
{
    // Generate smart controls directly from YAML
    auto smartControls = YAMLSmartControlLoader::generateSmartControlsFromYAML(densitySpecPath);
    EXPECT_EQ(smartControls.size(), 3) << "Should generate 3 smart controls from YAML";

    // Verify Drive control
    auto driveControl = std::find_if(smartControls.begin(), smartControls.end(),
        [](const SmartControlConfig& config) {
            return config.displayName == "Drive";
        });
    EXPECT_NE(driveControl, smartControls.end()) << "Drive control should be generated";
}

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, ValidateYAMLForSmartControls)
{
    // Validate YAML specification for smart control compatibility
    auto validationResult = YAMLSmartControlLoader::validateForSmartControls(densitySpecPath);
    EXPECT_TRUE(validationResult.isValid) << "YAML should be valid for smart controls";
    EXPECT_EQ(validationResult.parameterCount, 3) << "Should validate 3 parameters";
    EXPECT_EQ(validationResult.compatibleParameterCount, 3) << "All parameters should be compatible";
    EXPECT_FALSE(validationResult.requiresSpecialHandling) << "Should not require special handling";
}

//==============================================================================
// Test 5: Parameter Relationship Analysis
//==============================================================================

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, AnalyzeParameterRelationships)
{
    // Load test algorithms
    registry->scanDirectory(testDirectory.getFullPathName().toStdString());

    // Get algorithm info
    auto densityInfo = registry->getAlgorithmInfo("TestDensity");
    auto evergladeInfo = registry->getAlgorithmInfo("TestEverglade");

    // Analyze parameter relationships
    auto densityRelationships = DynamicAlgorithmSmartControlAdapter::analyzeParameterRelationships(densityInfo);
    auto evergladeRelationships = DynamicAlgorithmSmartControlAdapter::analyzeParameterRelationships(evergladeInfo);

    // Verify relationship analysis
    EXPECT_TRUE(densityRelationships.relatedParameters.find("Mix") != densityRelationships.relatedParameters.end());
    EXPECT_TRUE(evergladeRelationships.relatedParameters.find("Mix") != evergladeRelationships.relatedParameters.end());

    // Check essential parameters
    EXPECT_TRUE(densityRelationships.essentialParameters.count("Drive"));
    EXPECT_TRUE(densityRelationships.essentialParameters.count("Mix"));
    EXPECT_TRUE(evergladeRelationships.essentialParameters.count("Size"));
    EXPECT_TRUE(evergladeRelationships.essentialParameters.count("Mix"));
}

//==============================================================================
// Test 6: Category-based Styling
//==============================================================================

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, CategoryBasedStyling)
{
    // Test Dynamics category styling
    auto dynamicsStyling = DynamicAlgorithmSmartControlAdapter::generateCategoryStyling("Dynamics", ControlPriority::Essential);
    EXPECT_EQ(dynamicsStyling.primaryColor, juce::Colours::green);
    EXPECT_EQ(dynamicsStyling.borderWidth, 2.0f);
    EXPECT_EQ(dynamicsStyling.cornerRadius, 6.0f);

    // Test Reverb category styling
    auto reverbStyling = DynamicAlgorithmSmartControlAdapter::generateCategoryStyling("Reverb", ControlPriority::Essential);
    EXPECT_EQ(reverbStyling.primaryColor, juce::Colours::blue);
    EXPECT_EQ(reverbStyling.borderWidth, 2.0f);
    EXPECT_EQ(reverbStyling.cornerRadius, 6.0f);

    // Test Distortion category styling
    auto distortionStyling = DynamicAlgorithmSmartControlAdapter::generateCategoryStyling("Distortion", ControlPriority::Advanced);
    EXPECT_EQ(distortionStyling.primaryColor, juce::Colours::red);
    EXPECT_EQ(distortionStyling.borderWidth, 1.0f);
    EXPECT_EQ(distortionStyling.cornerRadius, 2.0f);

    // Verify useCategoryStyling flag
    EXPECT_TRUE(dynamicsStyling.useCategoryStyling);
    EXPECT_TRUE(reverbStyling.useCategoryStyling);
    EXPECT_TRUE(distortionStyling.useCategoryStyling);
}

//==============================================================================
// Test 7: Error Handling and Edge Cases
//==============================================================================

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, HandleMissingAlgorithm)
{
    // Try to get information for non-existent algorithm
    auto missingInfo = registry->getAlgorithmInfo("NonExistentAlgorithm");
    EXPECT_TRUE(missingInfo.name.empty()) << "Should return empty info for missing algorithm";

    // Try to create controls for non-existent algorithm
    auto missingControls = smartControlManager->createControlsForAlgorithm("NonExistentAlgorithm");
    EXPECT_TRUE(missingControls.empty()) << "Should return empty controls for missing algorithm";

    // Try to load non-existent YAML file
    auto missingAlgorithmInfo = YAMLSmartControlLoader::loadAlgorithmSpecification("nonexistent.yaml");
    EXPECT_FALSE(missingAlgorithmInfo.has_value()) << "Should not load non-existent file";
}

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, HandleInvalidYAML)
{
    // Create invalid YAML file
    juce::File invalidFile = testDirectory.getChildFile("Invalid.yaml");
    invalidFile.replaceWithText("invalid: yaml: content: [unclosed");

    // Try to load invalid YAML
    auto invalidAlgorithmInfo = YAMLSmartControlLoader::loadAlgorithmSpecification(invalidFile.getFullPathName().toStdString());
    EXPECT_FALSE(invalidAlgorithmInfo.has_value()) << "Should fail to load invalid YAML";

    // Validate invalid YAML
    auto validationResult = YAMLSmartControlLoader::validateForSmartControls(invalidFile.getFullPathName().toStdString());
    EXPECT_FALSE(validationResult.isValid) << "Invalid YAML should fail validation";
}

//==============================================================================
// Test 8: Performance and Memory Management
//==============================================================================

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, PerformanceMetrics)
{
    // Load algorithms
    registry->scanDirectory(testDirectory.getFullPathName().toStdString());

    // Get performance statistics
    auto stats = registry->getStatistics();
    EXPECT_EQ(stats.totalAlgorithms, 2) << "Should have 2 total algorithms";
    EXPECT_EQ(stats.loadedAlgorithms, 2) << "Should have 2 loaded algorithms";
    EXPECT_EQ(stats.categories, 2) << "Should have 2 categories (Dynamics, Reverb)";

    // Check category counts
    EXPECT_EQ(stats.algorithmCountByCategory["Dynamics"], 1);
    EXPECT_EQ(stats.algorithmCountByCategory["Reverb"], 1);

    // Check loaded status
    EXPECT_TRUE(stats.loadedStatusByAlgorithm["TestDensity"]);
    EXPECT_TRUE(stats.loadedStatusByAlgorithm["TestEverglade"]);
}

//==============================================================================
// Test 9: Integration Workflow Test
//==============================================================================

TEST_F(DynamicAlgorithmSmartControlsIntegrationTest, CompleteIntegrationWorkflow)
{
    // Step 1: Load algorithms from specifications
    bool scanSuccess = registry->scanDirectory(testDirectory.getFullPathName().toStdString());
    ASSERT_TRUE(scanSuccess) << "Failed to scan algorithm directory";

    // Step 2: Create smart controls for first algorithm
    auto densityControls = smartControlManager->createControlsForAlgorithm("TestDensity");
    ASSERT_EQ(densityControls.size(), 3) << "Failed to create controls for TestDensity";

    // Step 3: Create UI components from smart controls
    std::vector<std::unique_ptr<juce::Component>> uiComponents;
    for (const auto& config : densityControls) {
        auto component = DynamicAlgorithmSmartControlAdapter::createSmartControl(config, nullptr);
        if (component) {
            uiComponents.push_back(std::move(component));
        }
    }
    EXPECT_EQ(uiComponents.size(), 3) << "Should create 3 UI components";

    // Step 4: Bind components to parameters
    for (size_t i = 0; i < uiComponents.size(); ++i) {
        bool bound = smartControlManager->bindControlToParameter(uiComponents[i].get(), densityControls[i].parameterAddress.toStdString());
        EXPECT_TRUE(bound) << "Failed to bind UI component to parameter";
    }

    // Step 5: Switch algorithms (hot-swap test)
    bool switchSuccess = smartControlManager->updateControlsForAlgorithmChange("TestDensity", "TestEverglade");
    EXPECT_TRUE(switchSuccess) << "Failed to switch algorithms";

    // Step 6: Verify new controls are available
    auto evergladeControls = smartControlManager->createControlsForAlgorithm("TestEverglade");
    EXPECT_EQ(evergladeControls.size(), 4) << "Should create 4 controls for TestEverglade";

    // Step 7: Clean up
    smartControlManager->unbindAllControls();
    smartControlManager->clearAllControls();
}