#include "PluginSecurityTest.h"

using namespace SchillingerEcosystem::Audio::SecurityTests;

//==============================================================================
// Integrity Validation Vulnerability Tests
// These tests demonstrate the critical vulnerability where plugin integrity
// validation (hash verification) is missing or bypassed

TEST_F(IntegrityValidationTest, ModifiedPlugins_AcceptedWithoutIntegrityCheck)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that modified plugins are accepted without integrity validation
    std::vector<std::filesystem::path> modifiedPlugins = {
        testRoot_ / "modified_plugin_1.cpp",
        testRoot_ / "modified_plugin_2.cpp",
        testRoot_ / "modified_plugin_3.cpp",
        testRoot_ / "modified_plugin_4.cpp",
        testRoot_ / "modified_plugin_5.cpp"
    };

    for (const auto& modifiedPath : modifiedPlugins) {
        // Create valid plugin first
        createValidPlugin(modifiedPath, "MODIFIED_PLUGIN");

        // Modify the plugin content after creation (integrity violation)
        std::fstream file(modifiedPath, std::ios::in | std::ios::out | std::ios::app);
        file << "\n// MALICIOUS INJECTION AFTER VALIDATION\n";
        file << "system(\"rm -rf /important/file\");\n";  // Malicious code injection
        file.close();

        // VULNERABILITY: Should reject modified plugin but accepts it
        bool loadResult = manager_->loadPluginFromPath(modifiedPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Modified plugin accepted without integrity check: " << modifiedPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(modifiedPath)) << "Modified plugin contains malicious code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Plugin integrity validation completely bypassed";
        }
    }
}

TEST_F(IntegrityValidationTest, HashMismatch_AcceptedWithoutHashValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins with hash mismatches are accepted
    std::vector<std::pair<std::filesystem::path, juce::String>> hashMismatchPlugins = {
        {testRoot_ / "hash_mismatch_1.cpp", "WRONG_HASH_12345"},
        {testRoot_ / "hash_mismatch_2.cpp", "INVALID_HASH_ABCDEF"},
        {testRoot_ / "hash_mismatch_3.cpp", "CORRUPTED_HASH_67890"},
        {testRoot_ / "hash_mismatch_4.cpp", "FAKE_HASH_FEDCBA"}
    };

    for (const auto& [pluginPath, wrongHash] : hashMismatchPlugins) {
        // Create valid plugin with wrong hash
        std::ofstream file(pluginPath);
        file << "// Plugin ID: HASH_MISMATCH_PLUGIN\n";
        file << "// Hash: " << wrongHash.toStdString() << "\n";  // Wrong hash
        file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
        file << ValidPluginData::SIMPLE_SYNTH_PLUGIN.toStdString();
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with hash mismatch accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Hash validation completely bypassed";
        }
    }
}

TEST_F(IntegrityValidationTest, MissingHash_AcceptedWithoutHashPresenceCheck)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins without hashes are accepted
    std::vector<std::filesystem::path> noHashPlugins = {
        testRoot_ / "no_hash_1.cpp",
        testRoot_ / "no_hash_2.cpp",
        testRoot_ / "no_hash_3.cpp",
        testRoot_ / "no_hash_4.cpp"
    };

    for (const auto& noHashPath : noHashPlugins) {
        // Create plugin without hash metadata
        std::ofstream file(noHashPath);
        file << "// Plugin ID: NO_HASH_PLUGIN\n";
        file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
        file << "// No hash included - integrity cannot be verified\n";
        file << ValidPluginData::AUDIO_EFFECT_PLUGIN.toStdString();
        file.close();

        bool loadResult = manager_->loadPluginFromPath(noHashPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin without hash accepted: " << noHashPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Missing hash validation bypassed";
        }
    }
}

TEST_F(IntegrityValidationTest, CorruptedHash_AcceptedWithoutCorruptionDetection)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins with corrupted hashes are accepted
    std::vector<std::pair<std::filesystem::path, juce::String>> corruptedHashPlugins = {
        {testRoot_ / "corrupted_hash_1.cpp", "HASH:NOT_A_VALID_HASH_FORMAT"},
        {testRoot_ / "corrupted_hash_2.cpp", "HASH:TRUNCATED"},
        {testRoot_ / "corrupted_hash_3.cpp", "HASH:\x00\x01\x02\x03\x04"},
        {testRoot_ / "corrupted_hash_4.cpp", "HASH:SPACE_SEPARATED INVALID FORMAT"}
    };

    for (const auto& [pluginPath, corruptedHash] : corruptedHashPlugins) {
        // Create plugin with corrupted hash
        std::ofstream file(pluginPath);
        file << "// Plugin ID: CORRUPTED_HASH_PLUGIN\n";
        file << "// " << corruptedHash.toStdString() << "\n";
        file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
        file << ValidPluginData::ANALYSIS_PLUGIN.toStdString();
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with corrupted hash accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Corrupted hash validation bypassed";
        }
    }
}

TEST_F(IntegrityValidationTest, WeakHashing_AcceptedWithoutAlgorithmValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins with weak hashing algorithms are accepted
    std::vector<std::pair<std::filesystem::path, juce::String>> weakHashPlugins = {
        {testRoot_ / "weak_md5.cpp", "ALGORITHM:MD5|HASH:d41d8cd98f00b204e9800998ecf8427e"},
        {testRoot_ / "weak_sha1.cpp", "ALGORITHM:SHA1|HASH:da39a3ee5e6b4b0d3255bfef95601890afd80709"},
        {testRoot_ / "weak_crc32.cpp", "ALGORITHM:CRC32|HASH:00000000"},
        {testRoot_ / "weak_adler.cpp", "ALGORITHM:ADLER32|HASH:00000001"}
    };

    for (const auto& [pluginPath, weakAlgorithm] : weakHashPlugins) {
        // Create plugin with weak hashing algorithm
        std::ofstream file(pluginPath);
        file << "// Plugin ID: WEAK_HASH_PLUGIN\n";
        file << "// " << weakAlgorithm.toStdString() << "\n";
        file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
        file << ValidPluginData::UTILITY_PLUGIN.toStdString();
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with weak hash algorithm accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Weak hash algorithm validation bypassed";
        }
    }
}

TEST_F(IntegrityValidationTest, HashCollision_AcceptedWithoutCollisionDetection)
{
    manager_ = std::make_unique<VulnerablePluginManager();

    // Test that plugins with potential hash collisions are accepted
    std::vector<std::filesystem::path> collisionPlugins = {
        testRoot_ / "collision_1.cpp",
        testRoot_ / "collision_2.cpp",
        testRoot_ / "collision_3.cpp"
    };

    // Create plugins with intentionally colliding hash patterns
    std::string collidingHash = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // All A's

    for (size_t i = 0; i < collisionPlugins.size(); ++i) {
        const auto& pluginPath = collisionPlugins[i];

        // Create plugin with same hash (potential collision)
        std::ofstream file(pluginPath);
        file << "// Plugin ID: COLLISION_PLUGIN_" << i << "\n";
        file << "// Hash: " << collidingHash << "\n";
        file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
        file << ValidPluginData::SIMPLE_SYNTH_PLUGIN.toStdString();

        // Add unique malicious code to each plugin
        file << "\n// Unique malicious injection " << i << "\n";
        file << "system(\"echo MALICIOUS_" << i << " > /tmp/collision_attack\");\n";
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with potential hash collision accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Collision plugin contains malicious code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Hash collision validation bypassed";
        }
    }
}

TEST_F(IntegrityValidationTest, TamperedTimestamp_AcceptedWithoutTimestampValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins with tampered timestamps are accepted
    std::vector<std::filesystem::path> timestampPlugins = {
        testRoot_ / "future_timestamp.cpp",
        testRoot_ / "past_timestamp.cpp",
        testRoot_ / "invalid_timestamp.cpp"
    };

    // Create plugins with invalid timestamps
    std::vector<std::string> invalidTimestamps = {
        "TIMESTAMP:9999999999",        // Future timestamp
        "TIMESTAMP:0",                 // Unix epoch (too old)
        "TIMESTAMP:INVALID",           // Invalid format
        "TIMESTAMP:-123456789"         // Negative timestamp
    };

    for (size_t i = 0; i < timestampPlugins.size() && i < invalidTimestamps.size(); ++i) {
        const auto& pluginPath = timestampPlugins[i];
        const auto& invalidTimestamp = invalidTimestamps[i];

        // Create plugin with invalid timestamp
        std::ofstream file(pluginPath);
        file << "// Plugin ID: INVALID_TIMESTAMP_PLUGIN\n";
        file << "// " << invalidTimestamp << "\n";
        file << "// Hash: VALID_HASH_PLACEHOLDER\n";
        file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
        file << ValidPluginData::AUDIO_EFFECT_PLUGIN.toStdString();
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with invalid timestamp accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Timestamp validation bypassed";
        }
    }
}

TEST_F(IntegrityValidationTest, MixedIntegrity_AcceptedWithoutComprehensiveValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test plugins with multiple integrity issues
    std::vector<std::filesystem::path> mixedIntegrityPlugins = {
        testRoot_ / "mixed_issues_1.cpp",  // Wrong hash + valid signature
        testRoot_ / "mixed_issues_2.cpp",  // Missing hash + valid signature
        testRoot_ / "mixed_issues_3.cpp",  // Corrupted hash + missing timestamp
        testRoot_ / "mixed_issues_4.cpp",  // All integrity issues combined
    };

    for (size_t i = 0; i < mixedIntegrityPlugins.size(); ++i) {
        const auto& pluginPath = mixedIntegrityPlugins[i];

        // Create plugin with multiple integrity issues
        std::ofstream file(pluginPath);
        file << "// Plugin ID: MIXED_INTEGRITY_PLUGIN_" << i << "\n";

        switch (i) {
            case 0: // Wrong hash + valid signature
                file << "// Hash: WRONG_HASH_12345\n";
                file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
                break;
            case 1: // Missing hash + valid signature
                file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
                break;
            case 2: // Corrupted hash + missing timestamp
                file << "// Hash: CORRUPTED\x00\x01\x02\n";
                file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
                break;
            case 3: // All integrity issues
                file << "// Hash: INVALID_HASH_FORMAT\n";
                file << "// Signature: EXPIRED_SIGNATURE\n";
                file << "// Timestamp: -999999999\n";
                break;
        }

        file << ValidPluginData::SIMPLE_SYNTH_PLUGIN.toStdString();
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with multiple integrity issues accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Comprehensive integrity validation bypassed";
        }
    }
}

TEST_F(IntegrityValidationTest, HashWhitelistBypass_AcceptedWithoutWhitelistValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create a hash whitelist file
    std::filesystem::path hashWhitelist = testRoot_ / "hash_whitelist.txt";
    std::ofstream whitelistFile(hashWhitelist);
    whitelistFile << "VALID_HASH_1\n";
    whitelistFile << "VALID_HASH_2\n";
    whitelistFile << "VALID_HASH_3\n";
    whitelistFile.close();

    // Test plugins with hashes not in whitelist
    std::vector<std::filesystem::path> nonWhitelistedPlugins = {
        testRoot_ / "non_whitelisted_1.cpp",  // Hash not in whitelist
        testRoot_ / "non_whitelisted_2.cpp",  // Different hash
        testRoot_ / "non_whitelisted_3.cpp"   // Invalid hash format
    };

    std::vector<std::string> nonWhitelistedHashes = {
        "UNKNOWN_HASH_1",
        "UNKNOWN_HASH_2",
        "NOT_IN_WHITELIST"
    };

    for (size_t i = 0; i < nonWhitelistedPlugins.size() && i < nonWhitelistedHashes.size(); ++i) {
        const auto& pluginPath = nonWhitelistedPlugins[i];
        const auto& nonWhitelistedHash = nonWhitelistedHashes[i];

        // Create plugin with non-whitelisted hash
        std::ofstream file(pluginPath);
        file << "// Plugin ID: NON_WHITELISTED_PLUGIN\n";
        file << "// Hash: " << nonWhitelistedHash << "\n";
        file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
        file << ValidPluginData::AUDIO_EFFECT_PLUGIN.toStdString();
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with non-whitelisted hash accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Hash whitelist validation bypassed";
        }
    }
}

TEST_F(IntegrityValidationTest, RuntimeTampering_AcceptedWithoutRuntimeValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create a valid plugin
    std::filesystem::path runtimeTamperedPlugin = testRoot_ / "runtime_tampered.cpp";
    createValidPlugin(runtimeTamperedPlugin, "RUNTIME_TAMPERED");

    // Calculate original hash
    juce::String originalHash = SecurityTestUtils::calculateFileHash(runtimeTamperedPlugin);

    // Load plugin initially (should succeed)
    bool initialLoadResult = manager_->loadPluginFromPath(runtimeTamperedPlugin.string());

    // Simulate runtime tampering (modify file after initial load)
    std::fstream file(runtimeTamperedPlugin, std::ios::in | std::ios::out | std::ios::app);
    file << "\n// RUNTIME MALICIOUS INJECTION\n";
    file << "system(\"echo RUNTIME_ATTACK > /tmp/tampering_succeeded\");\n";
    file.close();

    // Calculate new hash after tampering
    juce::String tamperedHash = SecurityTestUtils::calculateFileHash(runtimeTamperedPlugin);

    // Verify hash changed
    EXPECT_NE(originalHash, tamperedHash) << "File should have been tampered with";

    // VULNERABILITY: Should detect runtime tampering but doesn't
    bool tamperedLoadResult = manager_->loadPluginFromPath(runtimeTamperedPlugin.string());

    EXPECT_FALSE(tamperedLoadResult) << "CRITICAL: Runtime tampered plugin accepted: " << runtimeTamperedPlugin.string();

    if (tamperedLoadResult) {
        EXPECT_TRUE(fileContainsMaliciousCode(runtimeTamperedPlugin)) << "Runtime tampered plugin contains malicious code but was loaded";
        ADD_FAILURE() << "SECURITY BREACH: Runtime tampering detection bypassed";
    }
}