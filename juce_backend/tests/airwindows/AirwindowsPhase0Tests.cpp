#include <gtest/gtest.h>
#include "airwindows/AirwindowsAlgorithms.h"
#include "airwindows/AirwindowsInventory.cpp"

using namespace schill::airwindows;

//==============================================================================
// PHASE 0: RESEARCH & PLANNING TESTS
//==============================================================================

class AirwindowsPhase0Test : public ::testing::Test {
protected:
    void SetUp() override {
        // Initialize Airwindows integration
        AirwindowsIntegration::initialize();
    }
};

// Test 0.1: Complete algorithm inventory
TEST_F(AirwindowsPhase0Test, ContainsAll300Algorithms) {
    const auto& inventory = AirwindowsInventoryManager::getInstance();
    auto allAlgorithms = inventory.getAllAlgorithms();

    // Verify we have the expected number of algorithms
    EXPECT_GE(allAlgorithms.size(), 280); // Should have at least 280+ algorithms
    EXPECT_LE(allAlgorithms.size(), 320); // Should not exceed 320 algorithms

    // Verify major algorithms are present
    EXPECT_TRUE(inventory.isAlgorithmRegistered("Everglade"));
    EXPECT_TRUE(inventory.isAlgorithmRegistered("Density"));
    EXPECT_TRUE(inventory.isAlgorithmRegistered("Cabs"));
    EXPECT_TRUE(inventory.isAlgorithmRegistered("GalacticReverb"));
    EXPECT_TRUE(inventory.isAlgorithmRegistered("ConsoleChannel"));
    EXPECT_TRUE(inventory.isAlgorithmRegistered("Tube"));
}

// Test 0.1: Algorithm categorization
TEST_F(AirwindowsPhase0Test, CorrectCategorization) {
    const auto& inventory = AirwindowsInventoryManager::getInstance();

    // Test reverb algorithms
    auto evergladeInfo = inventory.getAlgorithmInfo("Everglade");
    EXPECT_EQ(evergladeInfo.category, AirwindowsCategory::Reverb);
    EXPECT_EQ(evergladeInfo.displayName, "Everglade");
    EXPECT_GT(evergladeInfo.popularity, 5); // Should be reasonably popular

    // Test dynamics algorithms
    auto densityInfo = inventory.getAlgorithmInfo("Density");
    EXPECT_EQ(densityInfo.category, AirwindowsCategory::Dynamics);
    EXPECT_EQ(densityInfo.displayName, "Density");
    EXPECT_TRUE(densityInfo.isImplemented); // Density should be implemented

    // Test distortion algorithms
    auto cabsInfo = inventory.getAlgorithmInfo("Cabs");
    EXPECT_EQ(cabsInfo.category, AirwindowsCategory::Distortion);
    EXPECT_EQ(cabsInfo.displayName, "Cabs");
    EXPECT_GT(cabsInfo.popularity, 7); // Should be very popular
}

// Test 0.1: Complexity analysis
TEST_F(AirwindowsPhase0Test, ComplexityAnalysis) {
    const auto& inventory = AirwindowsInventoryManager::getInstance();

    // Test simple algorithms
    auto simpleAlgorithms = inventory.getAlgorithmsByComplexity(1);
    EXPECT_GT(simpleAlgorithms.size(), 20); // Should have many simple algorithms

    // Test complex algorithms
    auto complexAlgorithms = inventory.getAlgorithmsByComplexity(3);
    EXPECT_GT(complexAlgorithms.size(), 10); // Should have some complex algorithms

    // Verify complexity distribution
    int simpleCount = inventory.getAlgorithmsByComplexity(1).size();
    int mediumCount = inventory.getAlgorithmsByComplexity(2).size();
    int complexCount = inventory.getAlgorithmsByComplexity(3).size();

    int total = simpleCount + mediumCount + complexCount;
    EXPECT_EQ(total, inventory.getTotalAlgorithmCount());

    // Should have more simple/medium than complex
    EXPECT_GT(simpleCount + mediumCount, complexCount);
}

// Test 0.1: Implementation priority matrix
TEST_F(AirwindowsPhase0Test, ImplementationPriorityMatrix) {
    const auto& inventory = AirwindowsInventoryManager::getInstance();
    auto priorities = inventory.getImplementationPriorities();

    // Should have priorities for unimplemented algorithms
    EXPECT_GT(priorities.size(), 0);

    // Priorities should be sorted by score (descending)
    for (size_t i = 1; i < priorities.size(); ++i) {
        EXPECT_GE(priorities[i-1].priorityScore, priorities[i].priorityScore);
    }

    // Top priority algorithms should have good scores
    if (!priorities.empty()) {
        EXPECT_GT(priorities[0].priorityScore, 0.5f);
        EXPECT_FALSE(priorities[0].algorithm.isImplemented);
    }

    // Popular algorithms should have higher priority scores
    bool foundHighPopularity = false;
    for (const auto& priority : priorities) {
        if (priority.algorithm.popularity >= 8) {
            EXPECT_GT(priority.priorityScore, 0.6f);
            foundHighPopularity = true;
        }
    }
    EXPECT_TRUE(foundHighPopularity);
}

// Test 0.1: Search functionality
TEST_F(AirwindowsPhase0Test, SearchFunctionality) {
    const auto& inventory = AirwindowsInventoryManager::getInstance();

    // Test search by name
    auto reverbResults = inventory.searchAlgorithms("reverb");
    EXPECT_GT(reverbResults.size(), 5); // Should find multiple reverb algorithms

    // Test search by category keyword
    auto dynamicsResults = inventory.searchAlgorithms("dynamics");
    EXPECT_GT(dynamicsResults.size(), 5);

    // Test search by functionality
    auto saturationResults = inventory.searchAlgorithms("saturation");
    EXPECT_GT(saturationResults.size(), 3);

    // Test case-insensitive search
    auto evergladeResults1 = inventory.searchAlgorithms("Everglade");
    auto evergladeResults2 = inventory.searchAlgorithms("everglade");
    EXPECT_EQ(evergladeResults1.size(), evergladeResults2.size());

    // Test partial matches
    auto cabResults = inventory.searchAlgorithms("cab");
    EXPECT_GT(cabResults.size(), 0);
}

// Test 0.2: Real-time switching architecture research
TEST_F(AirwindowsPhase0Test, SwitchingArchitectureRequirements) {
    // Test algorithm factory capabilities
    EXPECT_NO_THROW({
        auto factory = AirwindowsFactory::create("Density");
        EXPECT_NE(factory, nullptr);
    });

    // Test algorithm creation for implemented algorithms
    EXPECT_NO_THROW({
        auto algorithm = AirwindowsIntegration::createAlgorithm("Density");
        EXPECT_NE(algorithm, nullptr);
        EXPECT_TRUE(algorithm->getAlgorithmName() == "Density");
    });

    // Test algorithm creation for unimplemented algorithms
    EXPECT_NO_THROW({
        auto algorithm = AirwindowsIntegration::createAlgorithm("Everglade");
        // Currently should return nullptr for unimplemented algorithms
        EXPECT_EQ(algorithm, nullptr);
    });
}

// Test 0.2: Algorithm info accessibility
TEST_F(AirwindowsPhase0Test, AlgorithmInfoAccessibility) {
    // Test implemented algorithm info
    auto densityInfo = AirwindowsIntegration::getAlgorithmInfo("Density");
    EXPECT_EQ(densityInfo.name, "Density");
    EXPECT_EQ(densityInfo.displayName, "Density");
    EXPECT_EQ(densityInfo.category, AirwindowsCategory::Dynamics);
    EXPECT_TRUE(densityInfo.isImplemented);

    // Test unimplemented algorithm info
    auto evergladeInfo = AirwindowsIntegration::getAlgorithmInfo("Everglade");
    EXPECT_EQ(evergladeInfo.name, "Everglade");
    EXPECT_EQ(evergladeInfo.displayName, "Everglade");
    EXPECT_EQ(evergladeInfo.category, AirwindowsCategory::Reverb);
    EXPECT_FALSE(evergladeInfo.isImplemented);
}

// Test 0.3: Algorithm categories consistency
TEST_F(AirwindowsPhase0Test, AlgorithmCategoriesConsistency) {
    const auto& registry = AlgorithmRegistry::getInstance();
    auto categories = registry.getCategories();

    // Should have all major categories
    std::vector<std::string> expectedCategories = {
        "Reverb", "Dynamics", "Distortion", "EQ", "Modulation", "Delay", "Utility", "Specialized"
    };

    for (const auto& expectedCategory : expectedCategories) {
        auto it = std::find(categories.begin(), categories.end(), expectedCategory);
        EXPECT_NE(it, categories.end()) << "Missing category: " << expectedCategory;
    }

    // Each category should have algorithms
    for (const auto& category : categories) {
        auto algorithms = registry.getAlgorithmsByCategory(category);
        EXPECT_GT(algorithms.size(), 0) << "Category '" << category << "' has no algorithms";
    }
}

// Test 0.3: Parameter mapping consistency
TEST_F(AirwindowsPhase0Test, ParameterMappingConsistency) {
    auto densityAlgorithm = AirwindowsIntegration::createAlgorithm("Density");
    ASSERT_NE(densityAlgorithm, nullptr);

    // Test parameter count
    int paramCount = densityAlgorithm->getParameterCount();
    EXPECT_GT(paramCount, 0);
    EXPECT_LE(paramCount, 10); // Airwindows algorithms typically have few parameters

    // Test parameter names
    std::vector<std::string> expectedParams = {"Drive", "Tone", "Mix"};
    for (const auto& expectedParam : expectedParams) {
        bool found = false;
        for (int i = 0; i < paramCount; ++i) {
            if (densityAlgorithm->getParameterName(i) == expectedParam) {
                found = true;
                break;
            }
        }
        EXPECT_TRUE(found) << "Expected parameter '" << expectedParam << "' not found";
    }

    // Test parameter default values
    for (int i = 0; i < paramCount; ++i) {
        float defaultValue = densityAlgorithm->getParameterDefault(i);
        EXPECT_GE(defaultValue, 0.0f);
        EXPECT_LE(defaultValue, 1.0f);
    }
}

// Test 0.4: Real-time switching use cases
TEST_F(AirwindowsPhase0Test, RealtimeSwitchingUseCases) {
    // Test algorithm switching simulation
    auto densityAlgorithm = AirwindowsIntegration::createAlgorithm("Density");
    ASSERT_NE(densityAlgorithm, nullptr);

    // Simulate real-time parameter changes
    EXPECT_NO_THROW({
        densityAlgorithm->setParameterValue(0, 0.5f); // Drive
        densityAlgorithm->setParameterValue(1, 0.6f); // Tone
        densityAlgorithm->setParameterValue(2, 0.8f); // Mix

        // Verify parameters are set
        EXPECT_NEAR(densityAlgorithm->getParameterValue(0), 0.5f, 0.001f);
        EXPECT_NEAR(densityAlgorithm->getParameterValue(1), 0.6f, 0.001f);
        EXPECT_NEAR(densityAlgorithm->getParameterValue(2), 0.8f, 0.001f);
    });

    // Test processing without switching (single algorithm)
    EXPECT_NO_THROW({
        float testInput = 0.5f;
        float output = densityAlgorithm->processSample(testInput);
        EXPECT_FALSE(std::isnan(output));
        EXPECT_FALSE(std::isinf(output));
    });

    // Test algorithm reset
    EXPECT_NO_THROW({
        densityAlgorithm->reset();
        // Should return to default state
        float defaultValue = densityAlgorithm->getParameterDefault(0);
        EXPECT_NEAR(densityAlgorithm->getParameterValue(0), defaultValue, 0.001f);
    });
}

// Test 0.4: Timeline integration research
TEST_F(AirwindowsPhase0Test, TimelineIntegrationResearch) {
    // Test algorithm can handle timeline information (framework test)
    auto densityAlgorithm = AirwindowsIntegration::createAlgorithm("Density");
    ASSERT_NE(densityAlgorithm, nullptr);

    // Test sample rate and block size preparation
    EXPECT_NO_THROW({
        densityAlgorithm->prepareToPlay(44100.0, 512);
    });

    // Verify algorithm is ready for processing
    EXPECT_NO_THROW({
        float output = densityAlgorithm->processSample(0.1f);
        EXPECT_FALSE(std::isnan(output));
    });
}

// Integration test for complete Phase 0 research
TEST_F(AirwindowsPhase0Test, CompletePhase0Research) {
    // Test complete inventory analysis
    Phase0::analyzeCompleteInventory();

    // Test search functionality
    auto searchResults = Phase0::searchAlgorithms("reverb");
    EXPECT_GT(searchResults.size(), 0);

    // Test implementation recommendations
    auto recommendations = Phase0::getImplementationRecommendations();
    EXPECT_GT(recommendations.size(), 0);

    // Test inventory export
    EXPECT_NO_THROW({
        Phase0::exportInventoryForAnalysis("test_inventory.json");
    });

    // Test system integration
    EXPECT_TRUE(AirwindowsIntegration::isInitialized());
    EXPECT_GT(AirwindowsIntegration::getImplementedAlgorithmCount(), 0);
    EXPECT_GT(AirwindowsIntegration::getTotalAlgorithmCount(), 0);
    EXPECT_EQ(AirwindowsIntegration::getTotalAlgorithmCount(),
             AirwindowsInventoryManager::getInstance().getTotalAlgorithmCount());
}

// Performance test for Phase 0
TEST_F(AirwindowsPhase0Test, Phase0PerformanceRequirements) {
    const auto& inventory = AirwindowsInventoryManager::getInstance();

    // Test algorithm lookup performance
    auto startTime = std::chrono::high_resolution_clock::now();

    // Perform 1000 algorithm lookups
    for (int i = 0; i < 1000; ++i) {
        auto info = inventory.getAlgorithmInfo("Density");
        EXPECT_EQ(info.name, "Density");
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Should be very fast (less than 10ms for 1000 lookups)
    EXPECT_LT(duration.count(), 10000); // 10ms in microseconds

    // Test search performance
    startTime = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < 100; ++i) {
        auto results = inventory.searchAlgorithms("reverb");
        EXPECT_GT(results.size(), 0);
    }

    endTime = std::chrono::high_resolution_clock::now();
    duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);

    // Search should also be fast (less than 50ms for 100 searches)
    EXPECT_LT(duration.count(), 50000); // 50ms in microseconds
}

//==============================================================================
// MAIN ENTRY POINT FOR PHASE 0 TESTING
//==============================================================================

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);

    std::cout << "=== AIRWINDOWS PHASE 0: RESEARCH & PLANNING ===" << std::endl;
    std::cout << "Running comprehensive analysis of 300+ Airwindows algorithms" << std::endl;
    std::cout << "This test validates our research and planning foundation" << std::endl;
    std::cout << "=======================================================" << std::endl;

    int result = RUN_ALL_TESTS();

    std::cout << "=======================================================" << std::endl;
    if (result == 0) {
        std::cout << "✅ PHASE 0 COMPLETE: All research validation tests passed!" << std::endl;
        std::cout << "Ready to proceed to Phase 1: Foundation & Core Architecture" << std::endl;
    } else {
        std::cout << "❌ PHASE 0 FAILED: Some tests need attention before proceeding" << std::endl;
    }

    return result;
}