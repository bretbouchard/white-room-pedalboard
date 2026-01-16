#include <gtest/gtest.h>
#include <iostream>

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);

    std::cout << "🧪 JUCE Backend Test Runner" << std::endl;
    std::cout << "=============================" << std::endl;

    int result = RUN_ALL_TESTS();

    if (result == 0) {
        std::cout << "\n✅ All tests passed!" << std::endl;
    } else {
        std::cout << "\n❌ Some tests failed!" << std::endl;
    }

    return result;
}