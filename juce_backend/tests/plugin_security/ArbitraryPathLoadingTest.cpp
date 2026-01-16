#include "PluginSecurityTest.h"

using namespace SchillingerEcosystem::Audio::SecurityTests;

//==============================================================================
// Arbitrary Path Loading Vulnerability Tests
// These tests demonstrate the critical vulnerability where plugins can be loaded
// from any arbitrary path without validation

TEST_F(ArbitraryPathLoadingTest, LoadFromSystemDirectory_AllowsPrivilegeEscalation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test loading from system directories
    std::vector<std::filesystem::path> dangerousPaths = {
        "/etc/",           // System configuration
        "/usr/bin/",       // System binaries
        "/var/log/",       // System logs
        "/tmp/",           // Temporary files
        "/home/",          // User directories
        "/root/",          // Root directory
        "/boot/",          // Boot files
        "/proc/",          // Process information
        "/sys/",           // System information
        "/dev/"            // Device files
    };

    for (const auto& dangerousPath : dangerousPaths) {
        std::filesystem::path maliciousPlugin = dangerousPath / "malicious_audio_plugin.so";

        // VULNERABILITY: Should reject system directory paths but accepts them
        bool loadResult = manager_->loadPluginFromPath(maliciousPlugin.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin loading allowed from dangerous system path: " << maliciousPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Malicious plugin loaded from system directory: " << maliciousPath.string();
        }
    }
}

TEST_F(ArbitraryPathLoadingTest, LoadFromUserHomeDirectory_AllowsDataExfiltration)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test loading from user directories (potential for data exfiltration)
    std::vector<std::filesystem::path> userPaths = {
        std::filesystem::path(getenv("HOME")) / ".config/",
        std::filesystem::path(getenv("HOME")) / ".ssh/",
        std::filesystem::path(getenv("HOME")) / ".gnupg/",
        std::filesystem::path(getenv("HOME")) / "Downloads/",
        std::filesystem::path(getenv("HOME")) / "Documents/",
        std::filesystem::path(getenv("HOME")) / ".local/share/"
    };

    for (const auto& userPath : userPaths) {
        // Create a malicious plugin in user directory
        std::filesystem::path maliciousPlugin = userPath / "audio_plugin.cpp";
        createMaliciousPlugin(maliciousPlugin, MaliciousPayloads::DATA_EXFILTRATION);

        bool loadResult = manager_->loadPluginFromPath(maliciousPlugin.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin loading allowed from user data directory: " << userPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(maliciousPlugin)) << "Plugin contains malicious code but was still loaded";
            ADD_FAILURE() << "SECURITY BREACH: Data exfiltration plugin loaded from user directory";
        }
    }
}

TEST_F(ArbitraryPathLoadingTest, LoadFromNetworkPaths_AllowsRemoteCodeExecution)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test loading from network paths (potential for remote code execution)
    std::vector<juce::String> networkPaths = {
        "http://malicious.com/plugin.so",
        "https://attacker.evil/audio_plugin.dll",
        "ftp://hacker.net/processor.vst3",
        "smb://malicious.network/plugin.dylib",
        "//unc.attacker.com/plugin.vst"
    };

    for (const auto& networkPath : networkPaths) {
        bool loadResult = manager_->loadPluginFromPath(networkPath);

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin loading allowed from network path: " << networkPath;

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Remote plugin loaded from network location";
        }
    }
}

TEST_F(ArbitraryPathLoadingTest, LoadFromRelativePaths_AllowsDirectoryTraversal)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test directory traversal attacks using relative paths
    std::vector<juce::String> traversalPaths = {
        "../../../etc/passwd",           // System file access
        "../../root/.ssh/id_rsa",       // SSH key access
        "../../../var/log/auth.log",    // Log file access
        "./../../home/user/.bashrc",    // User configuration
        "../../../../boot/vmlinuz",      // Kernel access
        "../../../proc/version",        // Process information
        "./../../../etc/shadow",         // Shadow file access
        "../../var/lib/mysql/user.MYD", // Database access
        "../../../etc/sudoers",          // Sudoers file access
        "./../../root/.bash_history"     // Root command history
    };

    for (const auto& traversalPath : traversalPaths) {
        bool loadResult = manager_->loadPluginFromPath(traversalPath);

        EXPECT_FALSE(loadResult) << "CRITICAL: Directory traversal allowed via path: " << traversalPath;

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Directory traversal attack succeeded";
        }
    }
}

TEST_F(ArbitraryPathLoadingTest, LoadFromTempDirectory_AllowsMaliciousCodeInjection)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create malicious plugins in temporary directory
    std::vector<std::filesystem::path> tempMaliciousPlugins = {
        tempPath_ / "temp_injection.cpp",
        tempPath_ / "malicious_temp_plugin.so",
        tempPath_ / "/tmp/hidden_plugin.dll"
    };

    for (const auto& tempPlugin : tempMaliciousPlugins) {
        createMaliciousPlugin(tempPlugin, MaliciousPayloads::MEMORY_CORRUPTION);

        bool loadResult = manager_->loadPluginFromPath(tempPlugin.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin loading allowed from temporary directory: " << tempPlugin.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(tempPlugin)) << "Temporary plugin contains malicious code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Malicious plugin loaded from temporary directory";
        }
    }
}

TEST_F(ArbitraryPathLoadingTest, LoadFromHiddenDirectories_AllowsStealthMaliciousPlugins)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test loading from hidden directories (stealth malicious plugins)
    std::vector<std::filesystem::path> hiddenPaths = {
        testRoot_ / ".hidden_malware/plugin.cpp",
        testRoot_ / "..secret/audio_processor.so",
        testRoot_ / ".cache/hidden_plugin.dll",
        testRoot_ / ".local/share/evil_processor.vst3"
    };

    for (const auto& hiddenPath : hiddenPaths) {
        std::filesystem::create_directories(hiddenPath.parent_path());
        createMaliciousPlugin(hiddenPath, MaliciousPayloads::PROCESS_INJECTION);

        bool loadResult = manager_->loadPluginFromPath(hiddenPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin loading allowed from hidden directory: " << hiddenPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(hiddenPath)) << "Hidden plugin contains malicious code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Malicious plugin loaded from hidden directory";
        }
    }
}

TEST_F(ArbitraryPathLoadingTest, LoadFromCompressedArchives_AllowsZipBombAttacks)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test loading from compressed archives (potential zip bomb attacks)
    std::vector<juce::String> archivePaths = {
        "/malicious/plugin.zip!/exploit.so",
        "/payload/plugin.tar.gz!/rootkit.dll",
        "/weaponized/plugin.7z!/trojan.vst3",
        "/compressed/plugin.rar!/backdoor.dylib"
    };

    for (const auto& archivePath : archivePaths) {
        bool loadResult = manager_->loadPluginFromPath(archivePath);

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin loading allowed from compressed archive: " << archivePath;

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Potential zip bomb plugin loaded from archive";
        }
    }
}

TEST_F(ArbitraryPathLoadingTest, LoadFromSymbolicLinks_AllowsLinkFollowingAttacks)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Create symbolic links to sensitive files
    std::filesystem::path sensitiveFile = testRoot_ / "sensitive_data.txt";
    std::ofstream sensitive(sensitiveFile);
    sensitive << "SENSITIVE_INFORMATION_THAT_SHOULD_NOT_BE_ACCESSED";
    sensitive.close();

    std::vector<std::filesystem::path> symlinks = {
        testRoot_ / "plugin_symlink.so",
        testRoot_ / "audio_link.vst3",
        testRoot_ / "processor_link.dll"
    };

    for (const auto& symlink : symlinks) {
        // Create symbolic link to sensitive file
        std::filesystem::create_symlink(sensitiveFile, symlink);

        bool loadResult = manager_->loadPluginFromPath(symlink.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin loading allowed through symbolic link: " << symlink.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Plugin loaded through symbolic link to sensitive file";
        }

        // Clean up symlink
        std::filesystem::remove(symlink);
    }
}

TEST_F(ArbitraryPathLoadingTest, LoadFromDeviceFiles_AllowsDeviceExploitation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test loading from device files (device exploitation)
    std::vector<std::filesystem::path> devicePaths = {
        "/dev/null",           // Null device
        "/dev/zero",           // Zero device
        "/dev/random",         // Random device
        "/dev/urandom",        // Urandom device
        "/dev/mem",            // Memory device (if accessible)
        "/dev/kmem",           // Kernel memory device
        "/dev/port",           // Port device
        "/dev/full"            // Full device
    };

    for (const auto& devicePath : devicePaths) {
        // Skip if device doesn't exist
        if (!std::filesystem::exists(devicePath)) continue;

        bool loadResult = manager_->loadPluginFromPath(devicePath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin loading allowed from device file: " << devicePath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Plugin loaded from device file - potential device exploitation";
        }
    }
}

TEST_F(ArbitraryPathLoadingTest, LoadFromVirtualFileSystems_AllowsVirtualizationEscape)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test loading from virtual file systems
    std::vector<std::filesystem::path> virtualPaths = {
        "/proc/version",           // Process information
        "/sys/kernel/version",     // Kernel information
        "/proc/meminfo",           // Memory information
        "/proc/cpuinfo",           // CPU information
        "/proc/self/environ"       // Process environment
    };

    for (const auto& virtualPath : virtualPaths) {
        // Skip if file doesn't exist
        if (!std::filesystem::exists(virtualPath)) continue;

        bool loadResult = manager_->loadPluginFromPath(virtualPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin loading allowed from virtual file system: " << virtualPath.string();

        if (loadResult) {
            ADD_FAILURE() << "SECURITY BREACH: Plugin loaded from virtual file system - potential virtualization escape";
        }
    }
}