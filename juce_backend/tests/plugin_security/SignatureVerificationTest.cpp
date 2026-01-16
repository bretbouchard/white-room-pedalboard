#include "PluginSecurityTest.h"

using namespace SchillingerEcosystem::Audio::SecurityTests;

//==============================================================================
// Signature Verification Vulnerability Tests
// These tests demonstrate the critical vulnerability where plugin signature
// verification is bypassed or non-existent

TEST_F(SignatureVerificationTest, UnsignedPlugins_AcceptedWithoutVerification)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that unsigned plugins are accepted without verification
    for (const auto& unsignedPlugin : unsignedPlugins_) {
        std::filesystem::path pluginPath = testRoot_ / unsignedPlugin.toStdString();

        // VULNERABILITY: Should reject unsigned plugins but accepts them
        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Unsigned plugin was accepted without signature verification: " << unsignedPlugin.toStdString();

        if (loadResult) {
            EXPECT_TRUE(pluginWasLoaded(unsignedPlugin)) << "SECURITY BREACH: Unsigned plugin successfully loaded";
            ADD_FAILURE() << "SECURITY BREACH: Signature verification completely bypassed for unsigned plugin";
        }
    }
}

TEST_F(SignatureVerificationTest, TamperedPlugins_AcceptedWithModifiedSignatures)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create plugins with tampered signatures
    std::vector<std::pair<std::filesystem::path, juce::String>> tamperedPlugins = {
        {testRoot_ / "tampered_1.cpp", "SIGNATURE_TAMPERED_12345"},
        {testRoot_ / "tampered_2.cpp", "INVALID_SIGNATURE_FORMAT"},
        {testRoot_ / "tampered_3.cpp", "SIGNATURE_EXPIRED_2020"},
        {testRoot_ / "tampered_4.cpp", "REVOKED_SIGNATURE_ABCDEF"}
    };

    for (const auto& [pluginPath, tamperedSignature] : tamperedPlugins) {
        createValidPlugin(pluginPath, "TAMPERED_PLUGIN");

        // Tamper with the signature after creation
        std::fstream file(pluginPath, std::ios::in | std::ios::out);
        std::string content((std::istreambuf_iterator<char>(file)),
                           std::istreambuf_iterator<char>());
        file.close();

        // Replace valid signature with tampered one
        size_t pos = content.find("VALID_SIGNATURE_PLACEHOLDER");
        if (pos != std::string::npos) {
            content.replace(pos, juce::String("VALID_SIGNATURE_PLACEHOLDER").length(), tamperedSignature.toStdString());

            std::ofstream outFile(pluginPath);
            outFile << content;
            outFile.close();
        }

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with tampered signature was accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Tampered signature validation bypassed";
        }
    }
}

TEST_F(SignatureVerificationTest, ExpiredCertificates_AcceptedWithoutDateValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create plugins with expired certificates
    std::vector<std::pair<std::filesystem::path, juce::String>> expiredPlugins = {
        {testRoot_ / "expired_2019.cpp", "CERT_EXPIRED:2019-01-01"},
        {testRoot_ / "expired_2020.cpp", "CERT_EXPIRED:2020-12-31"},
        {testRoot_ / "expired_old.cpp", "CERT_EXPIRED:2015-06-15"}
    };

    for (const auto& [pluginPath, expiredCert] : expiredPlugins) {
        createValidPlugin(pluginPath, "EXPIRED_CERT_PLUGIN");

        // Add expired certificate information
        std::fstream file(pluginPath, std::ios::in | std::ios::out | std::ios::app);
        file << "\n// Certificate: " << expiredCert.toStdString() << "\n";
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with expired certificate was accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Expired certificate validation bypassed";
        }
    }
}

TEST_F(SignatureVerificationTest, RevokedCertificates_AcceptedWithoutRevocationCheck)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create plugins with revoked certificates
    std::vector<std::pair<std::filesystem::path, juce::String>> revokedPlugins = {
        {testRoot_ / "revoked_1.cpp", "CERT_REVOKED:KEY_COMPROMISE"},
        {testRoot_ / "revoked_2.cpp", "CERT_REVOKED:CA_COMPROMISE"},
        {testRoot_ / "revoked_3.cpp", "CERT_REVOKED:AFFILIATION_CHANGED"}
    };

    for (const auto& [pluginPath, revokedCert] : revokedPlugins) {
        createValidPlugin(pluginPath, "REVOKED_CERT_PLUGIN");

        // Add revoked certificate information
        std::fstream file(pluginPath, std::ios::in | std::ios::out | std::ios::app);
        file << "\n// Certificate Status: " << revokedCert.toStdString() << "\n";
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with revoked certificate was accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Revoked certificate validation bypassed";
        }
    }
}

TEST_F(SignatureVerificationTest, WeakAlgorithms_AcceptedWithoutAlgorithmValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create plugins with weak signature algorithms
    std::vector<std::pair<std::filesystem::path, juce::String>> weakAlgorithmPlugins = {
        {testRoot_ / "weak_md5.cpp", "ALGORITHM:MD5"},
        {testRoot_ / "weak_sha1.cpp", "ALGORITHM:SHA1"},
        {testRoot_ / "weak_crc32.cpp", "ALGORITHM:CRC32"},
        {testRoot_ / "weak_des.cpp", "ALGORITHM:DES"}
    };

    for (const auto& [pluginPath, weakAlgorithm] : weakAlgorithmPlugins) {
        createValidPlugin(pluginPath, "WEAK_ALGORITHM_PLUGIN");

        // Add weak algorithm information
        std::fstream file(pluginPath, std::ios::in | std::ios::out | std::ios::app);
        file << "\n// Signature Algorithm: " << weakAlgorithm.toStdString() << "\n";
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with weak signature algorithm was accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Weak signature algorithm validation bypassed";
        }
    }
}

TEST_F(SignatureVerificationTest, SelfSignedCertificates_AcceptedWithoutChainValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create plugins with self-signed certificates
    std::vector<std::pair<std::filesystem::path, juce::String>> selfSignedPlugins = {
        {testRoot_ / "selfsigned_1.cpp", "CERT_TYPE:SELF_SIGNED"},
        {testRoot_ / "selfsigned_2.cpp", "CERT_CHAIN:ONLY_ROOT"},
        {testRoot_ / "selfsigned_3.cpp", "SIGNER:PLUGIN_AUTHOR"}
    };

    for (const auto& [pluginPath, selfSignedInfo] : selfSignedPlugins) {
        createValidPlugin(pluginPath, "SELF_SIGNED_PLUGIN");

        // Add self-signed certificate information
        std::fstream file(pluginPath, std::ios::in | std::ios::out | std::ios::app);
        file << "\n// Certificate Info: " << selfSignedInfo.toStdString() << "\n";
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with self-signed certificate was accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Self-signed certificate validation bypassed";
        }
    }
}

TEST_F(SignatureVerificationTest, InvalidFormats_AcceptedWithoutFormatValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create plugins with invalid signature formats
    std::vector<std::pair<std::filesystem::path, juce::String>> invalidFormatPlugins = {
        {testRoot_ / "format_invalid_1.cpp", "SIGNATURE:NOT_BASE64_ENCODED!@#$%"},
        {testRoot_ / "format_invalid_2.cpp", "SIGNATURE:TRUNCATED_SIGNATURE"},
        {testRoot_ / "format_invalid_3.cpp", "SIGNATURE:CORRUPTED_BINARY_SIGNATURE\x00\x01\x02"},
        {testRoot_ / "format_invalid_4.cpp", "SIGNATURE:EMPTY"}
    };

    for (const auto& [pluginPath, invalidFormat] : invalidFormatPlugins) {
        createValidPlugin(pluginPath, "INVALID_FORMAT_PLUGIN");

        // Add invalid format signature
        std::fstream file(pluginPath, std::ios::in | std::ios::out);
        std::string content((std::istreambuf_iterator<char>(file)),
                           std::istreambuf_iterator<char>());
        file.close();

        // Replace signature with invalid format
        size_t pos = content.find("VALID_SIGNATURE_PLACEHOLDER");
        if (pos != std::string::npos) {
            content.replace(pos, juce::String("VALID_SIGNATURE_PLACEHOLDER").length(), invalidFormat.toStdString());

            std::ofstream outFile(pluginPath);
            outFile << content;
            outFile.close();
        }

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with invalid signature format was accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Invalid signature format validation bypassed";
        }
    }
}

TEST_F(SignatureVerificationTest, MissingSignature_AcceptedWithoutPresenceCheck)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create plugins with completely missing signatures
    std::vector<std::filesystem::path> noSignaturePlugins = {
        testRoot_ / "no_signature_1.cpp",
        testRoot_ / "no_signature_2.cpp",
        testRoot_ / "no_signature_3.cpp"
    };

    for (const auto& pluginPath : noSignaturePlugins) {
        // Create plugin without any signature header
        std::ofstream file(pluginPath);
        file << "// Plugin without signature\n";
        file << "// This plugin lacks any signature metadata\n";
        file << ValidPluginData::SIMPLE_SYNTH_PLUGIN.toStdString();
        file.close();

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin without signature was accepted: " << pluginPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Missing signature validation bypassed";
        }
    }
}

TEST_F(SignatureVerificationTest, SignatureStripping_AcceptedWithoutValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create valid plugin, then strip signature
    std::filesystem::path strippedPlugin = testRoot_ / "stripped_signature.cpp";

    // First create with signature
    createValidPlugin(strippedPlugin, "STRIPPED_PLUGIN");

    // Then strip signature by reading and rewriting without signature
    std::ifstream inFile(strippedPlugin);
    std::string content((std::istreambuf_iterator<char>(inFile)),
                       std::istreambuf_iterator<char>());
    inFile.close();

    // Remove signature lines
    std::string strippedContent;
    std::istringstream stream(content);
    std::string line;
    while (std::getline(stream, line)) {
        if (line.find("// Signature:") == std::string::npos &&
            line.find("// Hash:") == std::string::npos) {
            strippedContent += line + "\n";
        }
    }

    std::ofstream outFile(strippedPlugin);
    outFile << strippedContent;
    outFile.close();

    bool loadResult = manager_->loadPluginFromPath(strippedPlugin.string());

    EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with stripped signature was accepted: " << strippedPlugin.string();

    if (loadResult) {
        ADD_FAILURE() << "SECURITY BREACH: Signature stripping attack succeeded";
    }
}

TEST_F(SignatureVerificationTest, MultipleSignatures_AcceptedWithoutValidation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create plugin with multiple conflicting signatures
    std::filesystem::path multiSignaturePlugin = testRoot_ / "multiple_signatures.cpp";

    std::ofstream file(multiSignaturePlugin);
    file << "// Plugin ID: MULTI_SIGNATURE_PLUGIN\n";
    file << "// Signature: FIRST_VALID_SIGNATURE_12345\n";
    file << "// Signature: SECOND_INVALID_SIGNATURE_67890\n";
    file << "// Signature: CONFLICTING_SIGNATURE_ABCDEF\n";
    file << "// Hash: FIRST_HASH_PLACEHOLDER\n";
    file << "// Hash: SECOND_HASH_PLACEHOLDER\n";
    file << ValidPluginData::SIMPLE_SYNTH_PLUGIN.toStdString();
    file.close();

    bool loadResult = manager_->loadPluginFromPath(multiSignaturePlugin.string());

    EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with multiple conflicting signatures was accepted: " << multiSignaturePlugin.string();

    if (loadResult) {
        ADD_FAILURE() << "SECURITY BREACH: Multiple signature validation bypassed";
    }
}