#include "audio/DropoutPrevention.h"
#include <memory>
#include <iostream>

using namespace SchillingerEcosystem::Audio;

int main() {
    std::cout << "=== DropoutPrevention Namespace Qualification Test ===" << std::endl;

    // Test 1: Initialization
    auto dropout = std::make_unique<DropoutPrevention>();
    if (dropout->initialize()) {
        std::cout << "✓ PASS: DropoutPrevention initialized successfully" << std::endl;
    } else {
        std::cout << "✗ FAIL: DropoutPrevention initialization failed" << std::endl;
        return 1;
    }

    // Test 2: Namespace Qualification
    DropoutPrevention::BufferStrategy strategy = DropoutPrevention::BufferStrategy::Adaptive;
    DropoutPrevention::ThreadPriority priority = DropoutPrevention::ThreadPriority::RealTime;
    DropoutPrevention::DropoutLevel level = DropoutPrevention::DropoutLevel::None;

    try {
        dropout->setBufferStrategy(strategy);
        dropout->setAudioThreadPriority(priority);
        std::cout << "✓ PASS: Namespace qualification working correctly" << std::endl;
    } catch (...) {
        std::cout << "✗ FAIL: Namespace qualification error" << std::endl;
        return 1;
    }

    // Test 3: Buffer Metrics
    auto metrics = dropout->getCurrentBufferMetrics();
    if (metrics.bufferLevel >= 0.0 && metrics.bufferLevel <= 1.0) {
        std::cout << "✓ PASS: Buffer metrics working correctly" << std::endl;
    } else {
        std::cout << "✗ FAIL: Invalid buffer metrics" << std::endl;
        return 1;
    }

    // Test 4: Utility Namespace Functions
    using namespace DropoutPreventionUtils;

    try {
        auto recStrategy = getRecommendedStrategy(0.5, 0.9);
        auto recPriority = getRecommendedPriority(0.4, 3.0);
        auto message = getDropoutMessage(DropoutPrevention::DropoutLevel::Minor);
        auto strategyMsg = getBufferStrategyMessage(DropoutPrevention::BufferStrategy::Fixed);
        std::cout << "✓ PASS: Utility namespace functions working correctly" << std::endl;
    } catch (...) {
        std::cout << "✗ FAIL: Utility namespace functions error" << std::endl;
        return 1;
    }

    std::cout << "\n🎯 SUCCESS: All namespace qualification tests passed!" << std::endl;
    std::cout << "📊 Build Status: Beyond 68% blocking point" << std::endl;

    return 0;
}