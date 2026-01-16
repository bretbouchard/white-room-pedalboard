# WebSocket Security Tests
cmake_minimum_required(VERSION 3.16)

# WebSocket Security Vulnerability Simple Test - RED PHASE
add_executable(WebSocketSecurityVulnerabilitySimpleTest
    WebSocketSecurityVulnerabilitySimpleTest.cpp
)

# WebSocket Security Green Phase Test - GREEN PHASE
add_executable(WebSocketSecurityGreenPhaseTest
    WebSocketSecurityGreenPhaseTest.cpp
)

# WebSocket Security Refactor Phase Test - REFACTOR PHASE
add_executable(WebSocketSecurityRefactorTest
    WebSocketSecurityRefactorTest.cpp
)

# Include directories for WebSocket security tests
target_include_directories(WebSocketSecurityVulnerabilitySimpleTest
    PRIVATE
        ${NLOHMANN_JSON_INCLUDE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/websocket_security
)

target_include_directories(WebSocketSecurityGreenPhaseTest
    PRIVATE
        ${NLOHMANN_JSON_INCLUDE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/websocket_security
)

target_include_directories(WebSocketSecurityRefactorTest
    PRIVATE
        ${NLOHMANN_JSON_INCLUDE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/websocket_security
)

# Link libraries for WebSocket security tests
target_link_libraries(WebSocketSecurityVulnerabilitySimpleTest
    PRIVATE
        # Testing framework
        $<$<TARGET_EXISTS:GTest::GTest>:GTest::GTest>
        $<$<TARGET_EXISTS:GTest::Main>:GTest::Main>
        $<$<NOT:$<TARGET_EXISTS:GTest::GTest>>:gtest>
        $<$<NOT:$<TARGET_EXISTS:GTest::Main>>:gtest_main>
        $<$<TARGET_EXISTS:nlohmann_json::nlohmann_json>:nlohmann_json::nlohmann_json>
        # Required for gtest on macOS
        pthread
)

target_link_libraries(WebSocketSecurityGreenPhaseTest
    PRIVATE
        # Testing framework
        $<$<TARGET_EXISTS:GTest::GTest>:GTest::GTest>
        $<$<TARGET_EXISTS:GTest::Main>:GTest::Main>
        $<$<NOT:$<TARGET_EXISTS:GTest::GTest>>:gtest>
        $<$<NOT:$<TARGET_EXISTS:GTest::Main>>:gtest_main>
        $<$<TARGET_EXISTS:nlohmann_json::nlohmann_json>:nlohmann_json::nlohmann_json>
        # Required for gtest on macOS
        pthread
)

target_link_libraries(WebSocketSecurityRefactorTest
    PRIVATE
        # Testing framework
        $<$<TARGET_EXISTS:GTest::GTest>:GTest::GTest>
        $<$<TARGET_EXISTS:GTest::Main>:GTest::Main>
        $<$<NOT:$<TARGET_EXISTS:GTest::GTest>>:gtest>
        $<$<NOT:$<TARGET_EXISTS:GTest::Main>>:gtest_main>
        $<$<TARGET_EXISTS:nlohmann_json::nlohmann_json>:nlohmann_json::nlohmann_json>
        # Required for gtest on macOS
        pthread
)

# Add tests to CTest
add_test(NAME WebSocketSecurityVulnerabilitySimpleTest COMMAND WebSocketSecurityVulnerabilitySimpleTest)
add_test(NAME WebSocketSecurityGreenPhaseTest COMMAND WebSocketSecurityGreenPhaseTest)
add_test(NAME WebSocketSecurityRefactorTest COMMAND WebSocketSecurityRefactorTest)

# Set test properties
set_tests_properties(WebSocketSecurityVulnerabilitySimpleTest PROPERTIES
    TIMEOUT 30  # 30 second timeout for vulnerability tests
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

set_tests_properties(WebSocketSecurityGreenPhaseTest PROPERTIES
    TIMEOUT 30  # 30 second timeout for green phase tests
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

set_tests_properties(WebSocketSecurityRefactorTest PROPERTIES
    TIMEOUT 30  # 30 second timeout for refactor phase tests
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

message(STATUS "✓ WebSocket Security Vulnerability Minimal Tests (RED Phase) configured")