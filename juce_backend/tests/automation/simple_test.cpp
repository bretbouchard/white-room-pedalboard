#include "../../src/automation/ParameterAutomationCore.h"
#include <iostream>

int main() {
    automation::ParameterAutomationCore core;
    auto laneId = core.createAutomationLane("test");
    std::cout << "Created lane with ID: " << laneId.value << std::endl;
    std::cout << "Number of lanes: " << core.getNumAutomationLanes() << std::endl;
    return 0;
}