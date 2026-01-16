#pragma once

#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <string>
#include <memory>
#include <json/json.h>

// Forward declarations
class RestApiServer;
class RequestValidator;
class JsonSecurityParser;
class RateLimiter;

namespace RestApiSecurityTests {

    // Test data constants
    constexpr int MAX_JSON_SIZE = 64 * 1024; // 64KB
    constexpr int MAX_NESTED_DEPTH = 10;
    constexpr int MAX_STRING_LENGTH = 1024;
    constexpr int MAX_REQUEST_RATE_PER_MINUTE = 60;

    // Malicious test payloads
    const std::string OVERSIZED_JSON = std::string(MAX_JSON_SIZE + 1, 'x');
    const std::string DEEPLY_NESTED_JSON = R"({"a":{"b":{"c":{"d":{"e":{"f":{"g":{"h":{"i":{"j":{"k":"value"}}}}}}}}}}}";
    const std::string MALICIOUS_SCRIPT_PAYLOAD = R"({"name":"<script>alert('xss')</script>"})";
    const std::string SQL_INJECTION_PAYLOAD = R"({"query":"'; DROP TABLE users; --"})";
    const std::string EXPLOIT_CRLF_INJECTION = R"({"data":"test\r\nSet-Cookie: evil=1"})";
    const std::string UNICODE_EXPLOIT = R"({"data":"\u0000\u0001\u0002"})";

    struct SecurityTestCase {
        std::string name;
        std::string payload;
        bool shouldPass;
        std::string expectedError;
    };

    class MockRestApiServer {
    public:
        MOCK_METHOD(bool, processRequest, (const std::string& json), ());
        MOCK_METHOD(std::string, getLastError, (), ());
        MOCK_METHOD(int, getRequestCount, (), ());
        MOCK_METHOD(bool, isRateLimited, (const std::string& clientIp), ());
    };

    class MockRequestValidator {
    public:
        MOCK_METHOD(bool, validateJsonSize, (const std::string& json), ());
        MOCK_METHOD(bool, validateJsonStructure, (const Json::Value& root), ());
        MOCK_METHOD(bool, sanitizeInput, (std::string& input), ());
        MOCK_METHOD(bool, validateSchema, (const Json::Value& data), ());
    };

    class MockJsonSecurityParser {
    public:
        MOCK_METHOD(bool, parseSecure, (const std::string& json, Json::Value& root), ());
        MOCK_METHOD(int, getDepth, (const Json::Value& root), ());
        MOCK_METHOD(bool, validateTypes, (const Json::Value& root), ());
        MOCK_METHOD(std::string, getParseError, (), ());
    };

    class MockRateLimiter {
    public:
        MOCK_METHOD(bool, isAllowed, (const std::string& clientId), ());
        MOCK_METHOD(void, recordRequest, (const std::string& clientId), ());
        MOCK_METHOD(int, getRemainingRequests, (const std::string& clientId), ());
        MOCK_METHOD(long long, getResetTime, (const std::string& clientId), ());
    };

    // Test fixtures
    class RestApiSecurityTest : public ::testing::Test {
    protected:
        void SetUp() override;
        void TearDown() override;

        // Test helpers
        void runSecurityTest(const SecurityTestCase& testCase);
        void testJsonPayload(const std::string& payload, bool shouldSucceed);
        void testRateLimiting(const std::string& clientIp, int requestCount);
        void testInputSanitization(const std::string& input, const std::string& expected);

        // Mock objects
        std::unique_ptr<MockRestApiServer> mockServer_;
        std::unique_ptr<MockRequestValidator> mockValidator_;
        std::unique_ptr<MockJsonSecurityParser> mockParser_;
        std::unique_ptr<MockRateLimiter> mockRateLimiter_;

        // Real objects under test
        std::unique_ptr<RestApiServer> server_;
        std::unique_ptr<RequestValidator> validator_;
        std::unique_ptr<JsonSecurityParser> parser_;
        std::unique_ptr<RateLimiter> rateLimiter_;
    };

    class JsonSecurityTest : public RestApiSecurityTest {
    protected:
        void SetUp() override;
        std::vector<SecurityTestCase> getJsonSecurityTestCases();
    };

    class InputValidationTest : public RestApiSecurityTest {
    protected:
        std::vector<SecurityTestCase> getInputValidationTestCases();
    };

    class RateLimitingTest : public RestApiSecurityTest {
    protected:
        void testRateLimitEnforcement();
        void testRateLimitExpiry();
        void testDifferentClientTracking();
    };

    class DatabaseSecurityTest : public RestApiSecurityTest {
    protected:
        void testSqlInjectionPrevention();
        void testPreparedStatementUsage();
        void testTransactionSecurity();
    };

    class XssPreventionTest : public RestApiSecurityTest {
    protected:
        void testScriptTagRemoval();
        void testEventHandlerRemoval();
        void testJavascriptProtocolRemoval();
    };

    class PerformanceTest : public RestApiSecurityTest {
    protected:
        void testValidationPerformance();
        void testParsingPerformance();
        void testRateLimitingPerformance();
    };
}

// Custom matchers for testing
MATCHER_P(IsValidJson, expected, "JSON should be valid") {
    Json::Value root;
    Json::Reader reader;
    return reader.parse(arg, root);
}

MATCHER_P(ContainsError, error_substring, "Error message should contain") {
    return arg.find(error_substring) != std::string::npos;
}

MATCHER_P(IsWithinSizeLimit, max_size, "String should be within size limit") {
    return arg.length() <= max_size;
}