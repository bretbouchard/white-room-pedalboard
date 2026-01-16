#include "PluginSecurityTest.h"

using namespace SchillingerEcosystem::Audio::SecurityTests;

//==============================================================================
// Whitelist Validation Vulnerability Tests
// These tests demonstrate the critical vulnerability where plugin whitelist
// validation is missing or bypassed

TEST_F(WhitelistValidationTest, UnwhitelistedPaths_AcceptedWithoutValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins from unwhitelisted paths are accepted
    std::vector<std::filesystem::path> unwhitelistedPaths = {
        testRoot_ / "untrusted_location/plugin1.cpp",
        testRoot_ / "random_directory/plugin2.cpp",
        testRoot_ / "user_downloads/plugin3.cpp",
        testRoot_ / "temp_files/plugin4.cpp",
        testRoot_ / "unknown_source/plugin5.cpp"
    };

    for (const auto& unwhitelistedPath : unwhitelistedPaths) {
        std::filesystem::create_directories(unwhitelistedPath.parent_path());
        createValidPlugin(unwhitelistedPath, "UNWHITELISTED_PLUGIN");

        // VULNERABILITY: Should reject plugins from unwhitelisted paths but accepts them
        bool loadResult = manager_->loadPluginFromPath(unwhitelistedPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin from unwhitelisted path was accepted: " << unwhitelistedPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Whitelist validation completely bypassed";
        }
    }
}

TEST_F(WhitelistValidationTest, BlacklistedPaths_AcceptedDespiteBlacklist)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins from blacklisted paths are accepted
    std::vector<std::filesystem::path> blacklistedPaths = {
        testRoot_ / "blacklisted_dir/malicious1.cpp",
        testRoot_ / "blocked_location/plugin2.cpp",
        testRoot_ / "forbidden_source/plugin3.cpp",
        testRoot_ / "restricted_area/plugin4.cpp",
        testRoot_ / "dangerous_zone/plugin5.cpp"
    };

    for (const auto& blacklistedPath : blacklistedPaths) {
        std::filesystem::create_directories(blacklistedPath.parent_path());
        createMaliciousPlugin(blacklistedPath, MaliciousPayloads::ARBITRARY_CODE_EXECUTION);

        // VULNERABILITY: Should reject plugins from blacklisted paths but accepts them
        bool loadResult = manager_->loadPluginFromPath(blacklistedPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin from blacklisted path was accepted: " << blacklistedPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(blacklistedPath)) << "Blacklisted plugin contains malicious code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Blacklist validation completely bypassed";
        }
    }
}

TEST_F(WhitelistValidationTest, EmptyWhitelist_AcceptsAllPaths)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that when whitelist is empty, all paths are accepted (vulnerable behavior)
    std::vector<std::filesystem::path> randomPaths = {
        testRoot_ / "completely_random/plugin1.cpp",
        testRoot_ / "any_location/plugin2.cpp",
        testRoot_ / "somewhere_else/plugin3.cpp"
    };

    for (const auto& randomPath : randomPaths) {
        std::filesystem::create_directories(randomPath.parent_path());
        createValidPlugin(randomPath, "RANDOM_PATH_PLUGIN");

        bool loadResult = manager_->loadPluginFromPath(randomPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin from random path accepted with empty whitelist: " << randomPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Empty whitelist allows all paths";
        }
    }
}

TEST_F(WhitelistValidationTest, WhitespaceManipulation_BypassesWhitelistValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test path manipulation with whitespace to bypass whitelist
    std::filesystem::path validPath = testRoot_ / "whitelisted_directory";
    std::filesystem::create_directories(validPath);

    std::vector<std::filesystem::path> manipulatedPaths = {
        testRoot_ / "whitelisted_directory /../malicious.cpp",           // Space + traversal
        testRoot_ / "whitelisted_directory\t/../malicious.cpp",          // Tab + traversal
        testRoot_ / "whitelisted_directory\n/../malicious.cpp",          // Newline + traversal
        testRoot_ / " whitelisted_directory /malicious.cpp",            // Leading/trailing spaces
        testRoot_ / "whitelisted_directory/ /malicious.cpp"              // Space in directory name
    };

    for (const auto& manipulatedPath : manipulatedPaths) {
        createMaliciousPlugin(manipulatedPath, MaliciousPayloads::FILE_SYSTEM_ACCESS);

        bool loadResult = manager_->loadPluginFromPath(manipulatedPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Whitelist bypassed via whitespace manipulation: " << manipulatedPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Whitespace manipulation allowed whitelist bypass";
        }
    }
}

TEST_F(WhitelistValidationTest, CaseSensitivity_BypassesWhitelistValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create a whitelisted directory
    std::filesystem::path whitelistedPath = testRoot_ / "AudioPlugins";
    std::filesystem::create_directories(whitelistedPath);

    // Test case variations to bypass whitelist
    std::vector<std::filesystem::path> caseVariations = {
        testRoot_ / "audioplugins/malicious.cpp",           // All lowercase
        testRoot_ / "AUDIOPLUGINS/malicious.cpp",           // All uppercase
        testRoot_ / "AudioPlugins/malicious.cpp",           // Mixed case (original)
        testRoot_ / "aUdIoPlUgInS/malicious.cpp",           // Random case
        testRoot_ / "audioPLUGINs/malicious.cpp"            // Partial case
    };

    for (const auto& casePath : caseVariations) {
        std::filesystem::create_directories(casePath.parent_path());
        createMaliciousPlugin(casePath, MaliciousPayloads::PRIVILEGE_ESCALATION);

        bool loadResult = manager_->loadPluginFromPath(casePath.string());

        // Only the exact case should be allowed, others should be rejected
        bool isValidCase = (casePath.filename().parent_path().string() == "AudioPlugins");

        EXPECT_EQ(loadResult, isValidCase) << "CRITICAL: Case sensitivity bypass in whitelist validation: " << casePath.string();

        if (loadResult && !isValidCase) {
            ADD_FAILURE() << "SECURITY BREACH: Case manipulation allowed whitelist bypass";
        }
    }
}

TEST_F(WhitelistValidationTest, SymbolicLinks_BypassWhitelistValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create a whitelisted directory
    std::filesystem::path whitelistedPath = testRoot_ / "whitelisted_plugins";
    std::filesystem::create_directories(whitelistedPath);

    // Create malicious plugin outside whitelist
    std::filesystem::path maliciousPath = testRoot_ / "malicious_location/evil_plugin.cpp";
    std::filesystem::create_directories(maliciousPath.parent_path());
    createMaliciousPlugin(maliciousPath, MaliciousPayloads::NETWORK_ACCESS);

    // Create symbolic link from whitelisted directory to malicious plugin
    std::filesystem::path symlinkPath = whitelistedPath / "legitimate_looking_plugin.cpp";

    try {
        std::filesystem::create_symlink(maliciousPath, symlinkPath);

        bool loadResult = manager_->loadPluginFromPath(symlinkPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Symbolic link allowed whitelist bypass: " << symlinkPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(maliciousPath)) << "Symbolic link points to malicious code but was accepted";
            ADD_FAILURE() << "SECURITY BREACH: Symbolic link used to bypass whitelist validation";
        }

        // Clean up symlink
        std::filesystem::remove(symlinkPath);

    } catch (const std::exception& e) {
        // Symlink creation failed (possibly due to filesystem restrictions)
        // This is not a test failure
        GTEST_SKIP() << "Symlink creation not supported on this filesystem";
    }
}

TEST_F(WhitelistValidationTest, PathNormalization_BypassesWhitelistValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create whitelisted directory
    std::filesystem::path whitelistedPath = testRoot_ / "plugins";
    std::filesystem::create_directories(whitelistedPath);

    // Test path normalization attacks
    std::vector<std::filesystem::path> normalizedPaths = {
        testRoot_ / "plugins/../../../malicious/plugin.cpp",      // Multiple parent traversal
        testRoot_ / "plugins/./../../evil/plugin.cpp",            // Current dir + parent traversal
        testRoot_ / "./plugins/../backdoor/plugin.cpp",           // Mixed path elements
        testRoot_ / "plugins//../../..////malicious/plugin.cpp",   // Multiple slashes + traversal
        testRoot_ / "plugins/././../outside/plugin.cpp"            // Multiple current dir references
    };

    for (const auto& normPath : normalizedPaths) {
        createMaliciousPlugin(normPath, MaliciousPayloads::SYSTEM_CONFIGURATION);

        bool loadResult = manager_->loadPluginFromPath(normPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Path normalization bypassed whitelist: " << normPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Path normalization used to bypass whitelist validation";
        }
    }
}

TEST_F(WhitelistValidationTest, UnicodeManipulation_BypassesWhitelistValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create whitelisted directory
    std::filesystem::path whitelistedPath = testRoot_ / "plugins";
    std::filesystem::create_directories(whitelistedPath);

    // Test Unicode manipulation attacks
    std::vector<std::filesystem::path> unicodePaths = {
        testRoot_ / "plugins⁄malicious.cpp",                     // Unicode slash
        testRoot_ / "plugins․malicious.cpp",                     // Unicode dot
        testRoot_ / "plugins⁄../evil.cpp",                       // Unicode + traversal
        testRoot_ / "plugins　/malicious.cpp",                   // Full-width space
        testRoot_ / "plugins\u200bmalicious.cpp",                // Zero-width space
        testRoot_ / "plugins\u202emalicious.cpp"                 // Right-to-left override
    };

    for (const auto& unicodePath : unicodePaths) {
        createMaliciousPlugin(unicodePath, MaliciousPayloads::DATA_EXFILTRATION);

        bool loadResult = manager_->loadPluginFromPath(unicodePath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Unicode manipulation bypassed whitelist: " << unicodePath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Unicode manipulation used to bypass whitelist validation";
        }
    }
}

TEST_F(WhitelistValidationTest, WhitelistTampering_AcceptsModifiedWhitelist)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that whitelist tampering is not detected
    std::filesystem::path whitelistFile = testRoot_ / "plugin_whitelist.txt";

    // Create initial whitelist
    std::ofstream whitelist(whitelistFile);
    whitelist << "/usr/local/lib/audio/plugins/\n";
    whitelist << "/opt/audio/plugins/\n";
    whitelist.close();

    // Tamper with whitelist (add malicious paths)
    std::ofstream tamperedWhitelist(whitelistFile, std::ios::app);
    tamperedWhitelist << "/etc/malicious/\n";
    tamperedWhitelist << "/tmp/backdoor/\n";
    tamperedWhitelist << "/home/evil/\n";
    tamperedWhitelist.close();

    // Create plugins in malicious whitelisted paths
    std::vector<std::filesystem::path> maliciousPaths = {
        testRoot_ / "etc/malicious/plugin.cpp",
        testRoot_ / "tmp/backdoor/plugin.cpp",
        testRoot_ / "home/evil/plugin.cpp"
    };

    for (const auto& maliciousPath : maliciousPaths) {
        std::filesystem::create_directories(maliciousPath.parent_path());
        createMaliciousPlugin(maliciousPath, MaliciousPayloads::PROCESS_INJECTION);

        bool loadResult = manager_->loadPluginFromPath(maliciousPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Tampered whitelist allowed malicious plugin: " << maliciousPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Whitelist tampering allowed malicious plugin loading";
        }
    }
}

TEST_F(WhitelistValidationTest, WildcardAbuse_BypassesWhitelistValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test wildcard pattern abuse in whitelist validation
    std::vector<std::filesystem::path> wildcardPaths = {
        testRoot_ / "plugins/*/malicious.cpp",                  // Wildcard in path
        testRoot_ / "plugins/**/backdoor.cpp",                  // Recursive wildcard
        testRoot_ / "*/any_plugin.cpp",                         // Leading wildcard
        testRoot_ / "plugins/plugin?.cpp",                      // Single character wildcard
        testRoot_ / "plugins/[abc]malicious.cpp"                // Character class wildcard
    };

    for (const auto& wildcardPath : wildcardPaths) {
        createMaliciousPlugin(wildcardPath, MaliciousPayloads::MEMORY_CORRUPTION);

        bool loadResult = manager_->loadPluginFromPath(wildcardPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Wildcard patterns allowed whitelist bypass: " << wildcardPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Wildcard abuse used to bypass whitelist validation";
        }
    }
}