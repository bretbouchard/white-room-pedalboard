#include <gtest/gtest.h>
#include <chrono>
#include <thread>
#include <json/json.h>

// Include our actual REST security components
#include "../../src/rest/RateLimiter.h"
#include "../../src/rest/JsonSecurityParser.h"
#include "../../src/rest/RequestValidator.h"

using namespace RestApi;
using namespace std::chrono_literals;

class RestSecurityComprehensiveTest : public ::testing::Test {
protected:
    void SetUp() override {
        rateLimiter = std::make_unique<RateLimiter>();
        jsonParser = std::make_unique<JsonSecurityParser>();
        requestValidator = std::make_unique<RequestValidator>();
    }

    void TearDown() override {
        rateLimiter.reset();
        jsonParser.reset();
        requestValidator.reset();
    }

    std::unique_ptr<RateLimiter> rateLimiter;
    std::unique_ptr<JsonSecurityParser> jsonParser;
    std::unique_ptr<RequestValidator> requestValidator;
};

// ===== RATE LIMITER TDD TESTS =====

TEST_F(RestSecurityComprehensiveTest, RateLimiter_AllowsInitialRequests) {
    // GIVEN: A new rate limiter with default configuration
    // WHEN: Making requests within the limit
    for (int i = 0; i < 10; ++i) {
        std::string clientId = "test_client_" + std::to_string(i);

        // THEN: All requests should be allowed
        EXPECT_TRUE(rateLimiter->isAllowed(clientId))
            << "Request " << i << " should be allowed";

        rateLimiter->recordRequest(clientId);
    }
}

TEST_F(RestSecurityComprehensiveTest, RateLimiter_EnforcesRateLimit) {
    // GIVEN: A rate limiter configured for low request rate
    RateLimiter::RateLimitConfig strictConfig;
    strictConfig.requestsPerMinute = 3;
    strictConfig.requestsPerHour = 10;
    RateLimiter strictLimiter(strictConfig);

    std::string clientId = "rate_limit_test";

    // WHEN: Making requests beyond the limit
    for (int i = 0; i < strictConfig.requestsPerMinute; ++i) {
        EXPECT_TRUE(strictLimiter.isAllowed(clientId))
            << "Request " << i << " should be allowed";
        strictLimiter.recordRequest(clientId);
    }

    // THEN: Additional requests should be rate limited
    EXPECT_FALSE(strictLimiter.isAllowed(clientId))
        << "Request beyond limit should be denied";

    // Check the status
    auto status = strictLimiter.checkRateLimit(clientId);
    EXPECT_FALSE(status.isAllowed);
    EXPECT_EQ(status.currentRequests, strictConfig.requestsPerMinute);
    EXPECT_EQ(status.remainingRequests, 0);
}

TEST_F(RestSecurityComprehensiveTest, RateLimiter_TracksClientsIndependently) {
    // GIVEN: Multiple clients
    std::string client1 = "client_1";
    std::string client2 = "client_2";

    // WHEN: Client 1 exceeds rate limit
    RateLimiter::RateLimitConfig strictConfig;
    strictConfig.requestsPerMinute = 2;
    RateLimiter strictLimiter(strictConfig);

    // Exhaust client 1's limit
    for (int i = 0; i < strictConfig.requestsPerMinute + 1; ++i) {
        strictLimiter.recordRequest(client1);
    }

    // THEN: Client 1 should be rate limited, client 2 should not
    EXPECT_FALSE(strictLimiter.isAllowed(client1))
        << "Client 1 should be rate limited";
    EXPECT_TRUE(strictLimiter.isAllowed(client2))
        << "Client 2 should not be affected by client 1's rate limiting";
}

TEST_F(RestSecurityComprehensiveTest, RateLimiter_SupportsWhitelisting) {
    // GIVEN: A rate limiter with whitelist functionality
    std::string whitelistedClient = "whitelisted_client";
    std::string normalClient = "normal_client";

    // WHEN: Adding client to whitelist
    rateLimiter->whitelistClient(whitelistedClient);

    // THEN: Whitelisted client should bypass rate limiting
    for (int i = 0; i < 100; ++i) {
        EXPECT_TRUE(rateLimiter->isAllowed(whitelistedClient))
            << "Whitelisted client should always be allowed";
        rateLimiter->recordRequest(whitelistedClient);
    }

    // Normal client should still be rate limited
    RateLimiter::RateLimitConfig strictConfig;
    strictConfig.requestsPerMinute = 5;
    RateLimiter strictLimiter(strictConfig);

    for (int i = 0; i < strictConfig.requestsPerMinute + 1; ++i) {
        strictLimiter.recordRequest(normalClient);
    }
    EXPECT_FALSE(strictLimiter.isAllowed(normalClient))
        << "Normal client should be rate limited";
}

TEST_F(RestSecurityComprehensiveTest, RateLimiter_ProvidesStatistics) {
    // GIVEN: A rate limiter
    std::string clientId = "stats_client";

    // WHEN: Making some requests
    rateLimiter->recordRequest(clientId);
    rateLimiter->recordRequest(clientId);

    // THEN: Statistics should be available
    auto stats = rateLimiter->getStatistics();
    EXPECT_GT(stats.totalRequests, 0);
    EXPECT_GE(stats.activeClients, 1);
    EXPECT_EQ(stats.blockedRequests, 0); // No blocks yet
}

// ===== JSON SECURITY PARSER TDD TESTS =====

TEST_F(RestSecurityComprehensiveTest, JsonParser_AcceptsValidJson) {
    // GIVEN: Valid JSON payloads
    std::vector<std::string> validJsons = {
        R"({"name":"test","value":123})",
        R"({"array":[1,2,3,4,5]})",
        R"({"nested":{"object":{"value":true}}})",
        R"({"string":"normal string with spaces"})",
        R"({"empty_object":{}, "empty_array":[]})"
    };

    // WHEN: Parsing valid JSON
    for (const auto& json : validJsons) {
        Json::Value root;

        // THEN: All should parse successfully
        EXPECT_TRUE(jsonParser->parseSecure(json, root))
            << "Valid JSON should parse: " << json;

        EXPECT_FALSE(jsonParser->hasError())
            << "No error should be set for valid JSON";
    }
}

TEST_F(RestSecurityComprehensiveTest, JsonParser_RejectsOversizedJson) {
    // GIVEN: Configuration with small size limit
    JsonSecurityParser::ParserConfig strictConfig;
    strictConfig.maxJsonSize = 100; // Very small limit
    JsonSecurityParser strictParser(strictConfig);

    // WHEN: Parsing oversized JSON
    std::string oversizedJson = std::string(200, 'x') + R"({"test":"value"})";
    Json::Value root;

    // THEN: Should be rejected
    EXPECT_FALSE(strictParser.parseSecure(oversizedJson, root))
        << "Oversized JSON should be rejected";

    EXPECT_TRUE(strictParser.hasError())
        << "Error should be set for oversized JSON";

    auto error = strictParser.getLastError();
    EXPECT_NE(error.find("size"), std::string::npos)
        << "Error should mention size limit";
}

TEST_F(RestSecurityComprehensiveTest, JsonParser_RejectsMalformedJson) {
    // GIVEN: Malformed JSON payloads
    std::vector<std::string> malformedJsons = {
        R"({"name":"test", "value":)",  // Missing value
        R"({"name":"test", "value":})", // Extra closing brace
        R"({name:"test", "value":123})", // Missing quotes around keys
        R"({"name":"test", "value":unclosed_string)",  // Unclosed string
        R"({"name":"test", "value":123,})"  // Trailing comma
    };

    // WHEN: Parsing malformed JSON
    for (const auto& json : malformedJsons) {
        Json::Value root;

        // THEN: All should be rejected
        EXPECT_FALSE(jsonParser->parseSecure(json, root))
            << "Malformed JSON should be rejected: " << json;

        EXPECT_TRUE(jsonParser->hasError())
            << "Error should be set for malformed JSON";
    }
}

TEST_F(RestSecurityComprehensiveTest, JsonParser_LimitsNestingDepth) {
    // GIVEN: Configuration with low depth limit
    JsonSecurityParser::ParserConfig strictConfig;
    strictConfig.maxNestedDepth = 3;
    JsonSecurityParser strictParser(strictConfig);

    // WHEN: Parsing deeply nested JSON
    std::string deeplyNested = R"({"level1":{"level2":{"level3":{"level4":{"level5":"deep"}}}}}";
    Json::Value root;

    // THEN: Should be rejected due to depth limit
    EXPECT_FALSE(strictParser.parseSecure(deeplyNested, root))
        << "Deeply nested JSON should be rejected";

    // Verify depth is calculated correctly
    int depth = strictParser.calculateDepth(root);
    EXPECT_GT(depth, strictConfig.maxNestedDepth);
}

TEST_F(RestSecurityComprehensiveTest, JsonParser_ProvidesMetrics) {
    // GIVEN: A JSON parser
    std::string testJson = R"({"name":"test","value":123})";

    // WHEN: Parsing multiple JSON objects
    for (int i = 0; i < 5; ++i) {
        Json::Value root;
        jsonParser->parseSecure(testJson, root);
    }

    // THEN: Metrics should be available
    auto metrics = jsonParser->getMetrics();
    EXPECT_GT(metrics.totalParseCount, 0);
    EXPECT_GT(metrics.totalBytesProcessed, 0);
    EXPECT_EQ(metrics.rejectedCount, 0); // All valid JSON so far
}

// ===== INPUT VALIDATOR TDD TESTS =====

TEST_F(RestSecurityComprehensiveTest, InputValidator_ValidatesAndSanitizes) {
    // GIVEN: An input validator
    std::string normalInput = "This is a normal input string";

    // WHEN: Validating normal input
    auto result = requestValidator->validateAndSanitize(normalInput);

    // THEN: Should pass validation
    EXPECT_TRUE(result.isValid)
        << "Normal input should be valid";

    EXPECT_EQ(result.sanitizedInput, normalInput)
        << "Normal input should not be changed";
}

TEST_F(RestSecurityComprehensiveTest, InputValidator_PreventsSqlInjection) {
    // GIVEN: SQL injection payloads
    std::vector<std::string> sqlInjectionPayloads = {
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' UNION SELECT * FROM passwords --",
        "admin'; DELETE FROM users; --",
        "' OR 1=1 #"
    };

    // WHEN: Validating SQL injection payloads
    for (const auto& payload : sqlInjectionPayloads) {
        auto result = requestValidator->validateAndSanitize(payload);

        // THEN: Should be flagged or sanitized
        // Note: The exact behavior depends on implementation
        // For TDD, we verify that something happens (either rejection or sanitization)
        EXPECT_TRUE(result.isValid == false || result.sanitizedInput != payload)
            << "SQL injection payload should be handled: " << payload;
    }
}

TEST_F(RestSecurityComprehensiveTest, InputValidator_HandlesHttpRequestValidation) {
    // GIVEN: HTTP request components
    std::string method = "POST";
    std::string path = "/api/data";
    std::string contentType = "application/json";
    std::string body = R"({"data":"test"})";
    std::unordered_map<std::string, std::string> headers = {
        {"Content-Type", "application/json"},
        {"Authorization", "Bearer token123"}
    };

    // WHEN: Validating HTTP request
    auto result = requestValidator->validateHttpRequest(method, path, contentType, body, headers);

    // THEN: Should pass basic validation
    EXPECT_TRUE(result.isValid)
        << "Valid HTTP request should pass validation";
}

TEST_F(RestSecurityComprehensiveTest, InputValidator_EnforcesSizeLimits) {
    // GIVEN: Configuration with strict size limits
    RequestValidator::SecurityPolicy strictPolicy;
    strictPolicy.maxInputLength = 50; // Very small limit
    RequestValidator strictValidator(strictPolicy);

    // WHEN: Validating oversized input
    std::string oversizedInput(100, 'x');

    // THEN: Should be rejected
    auto result = strictValidator.validateAndSanitize(oversizedInput);
    EXPECT_FALSE(result.isValid)
        << "Oversized input should be rejected";

    EXPECT_FALSE(result.errors.empty())
        << "Error should be provided for oversized input";
}

// ===== INTEGRATION TDD TESTS =====

TEST_F(RestSecurityComprehensiveTest, Integration_EndToEndSecurityFlow) {
    // GIVEN: Complete security stack
    std::string clientIp = "192.168.1.100";
    std::string maliciousJson = R"({"query":"'; DROP TABLE users; --"})";

    // WHEN: Processing malicious request through full pipeline
    // 1. Rate limiting check
    bool rateLimitAllowed = rateLimiter->isAllowed(clientIp);
    EXPECT_TRUE(rateLimitAllowed) << "First request should pass rate limiting";

    // 2. JSON security parsing
    Json::Value parsedJson;
    bool jsonParseResult = jsonParser->parseSecure(maliciousJson, parsedJson);
    EXPECT_TRUE(jsonParseResult) << "JSON should parse (structure is valid)";

    // 3. Input validation (this is where SQL injection should be caught)
    auto validationResult = requestValidator->validateAndSanitize(maliciousJson);

    // THEN: Security should be enforced at appropriate level
    // The SQL injection attempt should be caught in validation
    EXPECT_TRUE(validationResult.isValid == false || validationResult.sanitizedInput != maliciousJson)
        << "SQL injection should be caught in validation";

    // Record the request for rate limiting
    rateLimiter->recordRequest(clientIp);
}

TEST_F(RestSecurityComprehensiveTest, Integration_PerformanceUnderLoad) {
    // GIVEN: Performance requirements
    const int NUM_REQUESTS = 100;
    const auto MAX_DURATION = 100ms; // Should handle 100 requests in 100ms

    // WHEN: Processing many requests
    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < NUM_REQUESTS; ++i) {
        std::string clientId = "perf_test_" + std::to_string(i % 10); // 10 different clients
        std::string json = R"({"id":)" + std::to_string(i) + R"(,"data":"test"})";

        // Rate limiting check
        rateLimiter->isAllowed(clientId);

        // JSON parsing
        Json::Value root;
        jsonParser->parseSecure(json, root);

        // Input validation
        requestValidator->validateAndSanitize(json);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    // THEN: Should meet performance requirements
    EXPECT_LT(duration.count(), MAX_DURATION.count())
        << "Should process " << NUM_REQUESTS << " requests in under " << MAX_DURATION.count() << "ms";

    // Calculate requests per second
    double requestsPerSecond = static_cast<double>(NUM_REQUESTS) / (duration.count() / 1000.0);
    EXPECT_GT(requestsPerSecond, 500) << "Should handle at least 500 requests per second";
}

// ===== ERROR HANDLING TDD TESTS =====

TEST_F(RestSecurityComprehensiveTest, ErrorHandling_GracefulDegradation) {
    // GIVEN: Various error conditions
    std::string emptyJson = "";
    std::string nullJson = "null";
    std::string hugeJson = std::string(1000000, 'x'); // 1MB

    // WHEN: Processing problematic inputs
    Json::Value root;

    // THEN: Should handle errors gracefully without crashing
    EXPECT_NO_THROW({
        jsonParser->parseSecure(emptyJson, root);
    }) << "Should handle empty JSON gracefully";

    EXPECT_NO_THROW({
        jsonParser->parseSecure(nullJson, root);
    }) << "Should handle null JSON gracefully";

    EXPECT_NO_THROW({
        jsonParser->parseSecure(hugeJson, root);
    }) << "Should handle huge JSON gracefully (likely rejected for size)";
}

TEST_F(RestSecurityComprehensiveTest, ErrorHandling_ThreadSafety) {
    // GIVEN: Multiple threads accessing security components
    const int NUM_THREADS = 10;
    const int REQUESTS_PER_THREAD = 50;
    std::vector<std::thread> threads;

    // WHEN: Concurrent access to rate limiter
    for (int t = 0; t < NUM_THREADS; ++t) {
        threads.emplace_back([this, t, REQUESTS_PER_THREAD]() {
            for (int i = 0; i < REQUESTS_PER_THREAD; ++i) {
                std::string clientId = "thread_" + std::to_string(t);
                rateLimiter->isAllowed(clientId);
                rateLimiter->recordRequest(clientId);

                std::string json = R"({"thread":)" + std::to_string(t) + R"(,"request":)" + std::to_string(i) + "}";
                Json::Value root;
                jsonParser->parseSecure(json, root);

                requestValidator->validateAndSanitize(json);
            }
        });
    }

    // THEN: Should complete without crashes or data races
    for (auto& thread : threads) {
        thread.join();
    }

    // Verify statistics are reasonable
    auto stats = rateLimiter->getStatistics();
    EXPECT_EQ(stats.totalRequests, NUM_THREADS * REQUESTS_PER_THREAD);
}

// ===== CONFIGURATION TDD TESTS =====

TEST_F(RestSecurityComprehensiveTest, Configuration_CustomRateLimitConfig) {
    // GIVEN: Custom rate limit configuration
    RateLimiter::RateLimitConfig customConfig;
    customConfig.requestsPerMinute = 10;
    customConfig.requestsPerHour = 100;
    customConfig.requestsPerDay = 1000;
    customConfig.burstCapacity = 5;
    customConfig.enableBurst = true;

    RateLimiter customLimiter(customConfig);

    // WHEN: Testing custom configuration
    auto retrievedConfig = customLimiter.getConfig();

    // THEN: Configuration should be preserved
    EXPECT_EQ(retrievedConfig.requestsPerMinute, customConfig.requestsPerMinute);
    EXPECT_EQ(retrievedConfig.requestsPerHour, customConfig.requestsPerHour);
    EXPECT_EQ(retrievedConfig.requestsPerDay, customConfig.requestsPerDay);
    EXPECT_EQ(retrievedConfig.burstCapacity, customConfig.burstCapacity);
    EXPECT_EQ(retrievedConfig.enableBurst, customConfig.enableBurst);
}

TEST_F(RestSecurityComprehensiveTest, Configuration_CustomJsonParserConfig) {
    // GIVEN: Custom JSON parser configuration
    JsonSecurityParser::ParserConfig customConfig;
    customConfig.maxJsonSize = 1024; // 1KB
    customConfig.maxNestedDepth = 5;
    customConfig.maxStringLength = 100;
    customConfig.allowUnicodeControlChars = false;
    customConfig.strictTypeChecking = true;

    JsonSecurityParser customParser(customConfig);

    // WHEN: Testing custom configuration
    auto retrievedConfig = customParser.getConfig();

    // THEN: Configuration should be preserved
    EXPECT_EQ(retrievedConfig.maxJsonSize, customConfig.maxJsonSize);
    EXPECT_EQ(retrievedConfig.maxNestedDepth, customConfig.maxNestedDepth);
    EXPECT_EQ(retrievedConfig.maxStringLength, customConfig.maxStringLength);
    EXPECT_EQ(retrievedConfig.allowUnicodeControlChars, customConfig.allowUnicodeControlChars);
    EXPECT_EQ(retrievedConfig.strictTypeChecking, customConfig.strictTypeChecking);
}

// Main function for running tests
int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}