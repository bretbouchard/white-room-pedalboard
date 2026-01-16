#include "src/schillinger/advanced/rhythm/ResultantRhythmEngine.h"
#include "src/schillinger/advanced/rhythm/RhythmPermutationGenerator.h"
#include "src/schillinger/advanced/rhythm/RhythmicStrataAnalyzer.h"
#include <iostream>
#include <chrono>
#include <numeric>

using namespace Schillinger::Advanced::Rhythm;

int main() {
    std::cout << "=== Testing Book III Rhythm Resultant Specialist ===" << std::endl;

    // Test ResultantRhythmEngine
    std::cout << "\n1. Testing ResultantRhythmEngine..." << std::endl;
    auto engine = std::make_unique<ResultantRhythmEngine>();

    auto start = std::chrono::high_resolution_clock::now();
    RhythmResultant resultant = engine->calculateResultant(3, 4, 12);
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    std::cout << "   Resultant calculation took: " << duration.count() << " μs" << std::endl;
    std::cout << "   Resultant is valid: " << (resultant.isValid ? "YES" : "NO") << std::endl;
    std::cout << "   Generators: " << resultant.generator1 << ", " << resultant.generator2 << std::endl;
    std::cout << "   Pattern length: " << resultant.pattern.size() << std::endl;
    std::cout << "   Density: " << resultant.density << std::endl;
    std::cout << "   Complexity: " << resultant.complexity << std::endl;

    // Test performance requirement
    engine->optimizeForRealtime(true);
    double processingTime = engine->getLastProcessingTime();
    std::cout << "   Processing time: " << processingTime << " ms" << std::endl;
    std::cout << "   Real-time capable: " << (processingTime < 1.0 ? "YES" : "NO") << std::endl;

    // Test RhythmPermutationGenerator
    std::cout << "\n2. Testing RhythmPermutationGenerator..." << std::endl;
    auto permGen = std::make_unique<RhythmPermutationGenerator>();

    RhythmPattern basePattern = permGen->createBasePattern(4, 4);
    std::cout << "   Base pattern size: " << basePattern.size() << std::endl;
    std::cout << "   Base pattern valid: " << (basePattern.isValid() ? "YES" : "NO") << std::endl;

    start = std::chrono::high_resolution_clock::now();
    auto permutations = permGen->generatePermutations(basePattern);
    end = std::chrono::high_resolution_clock::now();
    duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    std::cout << "   Generated " << permutations.size() << " permutations" << std::endl;
    std::cout << "   Permutation generation took: " << duration.count() << " μs" << std::endl;

    // Test RhythmicStrataAnalyzer
    std::cout << "\n3. Testing RhythmicStrataAnalyzer..." << std::endl;
    auto strataAnalyzer = std::make_unique<RhythmicStrataAnalyzer>();

    std::vector<RhythmLayer> layers = {
        strataAnalyzer->createRhythmLayer(0, "primary"),
        strataAnalyzer->createRhythmLayer(1, "secondary")
    };

    start = std::chrono::high_resolution_clock::now();
    RhythmicStrata strata = strataAnalyzer->constructStrata(layers);
    end = std::chrono::high_resolution_clock::now();
    duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    std::cout << "   Strata valid: " << (strata.isValid() ? "YES" : "NO") << std::endl;
    std::cout << "   Number of layers: " << strata.getLayerCount() << std::endl;
    std::cout << "   Number of strata: " << strata.getStrataCount() << std::endl;
    std::cout << "   Overall density: " << strata.overallDensity << std::endl;
    std::cout << "   Strata construction took: " << duration.count() << " μs" << std::endl;

    // Performance benchmark
    std::cout << "\n4. Performance Benchmark (1000 operations)..." << std::endl;
    const int iterations = 1000;

    // Use guaranteed valid coprime pairs for performance testing
    std::vector<std::pair<int, int>> validPairs = {{3,4}, {3,5}, {4,5}, {3,7}, {4,7}, {5,8}};

    start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < iterations; ++i) {
        auto pair = validPairs[i % validPairs.size()];
        int lcm = (pair.first * pair.second) / std::gcd(pair.first, pair.second);
        RhythmResultant testResultant = engine->calculateResultant(pair.first, pair.second, lcm);
        if (!testResultant.isValid) {
            std::cout << "   ERROR: Invalid resultant at iteration " << i << " with pair ("
                      << pair.first << ", " << pair.second << ")" << std::endl;
            break;
        }
    }
    end = std::chrono::high_resolution_clock::now();
    duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    std::cout << "   Total time for " << iterations << " resultants: " << duration.count() << " ms" << std::endl;
    std::cout << "   Average time per operation: " << (double)duration.count() / iterations << " ms" << std::endl;
    std::cout << "   Performance requirement met: " << ((double)duration.count() / iterations < 0.01 ? "YES" : "NO") << std::endl;

    // Test mathematical validation
    std::cout << "\n5. Mathematical Validation..." << std::endl;
    std::vector<RhythmResultant> testResultants;

    // Test specific coprime pairs
    std::vector<std::pair<int, int>> coprimePairs = {{3,4}, {3,5}, {4,5}, {5,6}, {3,7}, {4,7}};
    for (auto pair : coprimePairs) {
        int g1 = pair.first;
        int g2 = pair.second;
        int lcm = g1 * g2; // For coprime numbers, LCM = product
        RhythmResultant r = engine->calculateResultant(g1, g2, lcm);
        if (r.isValid) {
            testResultants.push_back(r);
        }
    }

    bool mathematicallyValid = engine->validateSchillingerMathematics(testResultants);
    std::cout << "   Generated " << testResultants.size() << " test resultants" << std::endl;
    std::cout << "   Mathematical validation: " << (mathematicallyValid ? "PASSED" : "FAILED") << std::endl;

    std::cout << "\n=== Test Summary ===" << std::endl;
    std::cout << "✓ ResultantRhythmEngine: " << (resultant.isValid ? "PASS" : "FAIL") << std::endl;
    std::cout << "✓ RhythmPermutationGenerator: " << (permutations.size() > 0 ? "PASS" : "FAIL") << std::endl;
    std::cout << "✓ RhythmicStrataAnalyzer: " << (strata.isValid() ? "PASS" : "FAIL") << std::endl;
    std::cout << "✓ Performance: " << ((double)duration.count() / iterations < 0.01 ? "PASS" : "FAIL") << std::endl;
    std::cout << "✓ Mathematics: " << (mathematicallyValid ? "PASS" : "FAIL") << std::endl;

    bool allTestsPassed = resultant.isValid &&
                         permutations.size() > 0 &&
                         strata.isValid() &&
                         ((double)duration.count() / iterations < 0.01) &&
                         mathematicallyValid;

    std::cout << "\nOverall Result: " << (allTestsPassed ? "🎉 ALL TESTS PASSED!" : "❌ Some tests failed") << std::endl;

    return allTestsPassed ? 0 : 1;
}