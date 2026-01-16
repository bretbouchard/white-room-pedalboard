#include <JUCEHeader.h>
#include "src/plugins/PluginLoader.h"
#include <iostream>

int main()
{
    std::cout << "🔍 Testing PluginLoader Implementation..." << std::endl;

    // Initialize JUCE
    juce::initialiseJuce_GUI();

    try {
        PluginLoader loader;

        std::cout << "🚀 Starting plugin scan..." << std::endl;
        loader.scanForPlugins();

        auto plugins = loader.getAvailablePlugins();
        auto stats = loader.getScanStatistics();

        std::cout << "\n📊 PLUGIN SCAN RESULTS:" << std::endl;
        std::cout << "   Total plugins found: " << plugins.size() << std::endl;
        std::cout << "   Total scanned: " << stats.totalPluginsScanned << std::endl;
        std::cout << "   Valid plugins: " << stats.validPluginsFound << std::endl;
        std::cout << "   Failed to load: " << stats.failedToLoad << std::endl;
        std::cout << "   Scan time: " << stats.scanTimeSeconds << " seconds" << std::endl;

        // Show first 10 plugins
        std::cout << "\n🎵 FIRST 10 PLUGINS FOUND:" << std::endl;
        for (size_t i = 0; i < std::min(size_t(10), plugins.size()); ++i) {
            const auto& plugin = plugins[i];
            std::cout << "   " << (i+1) << ". " << plugin.name.toStdString()
                     << " (" << plugin.filePath.toStdString() << ")" << std::endl;
        }

        // Count by format
        auto vst3Plugins = loader.getPluginsByFormat(PluginLoader::PluginFormat::VST3);
        auto auPlugins = loader.getPluginsByFormat(PluginLoader::PluginFormat::AudioUnit);

        std::cout << "\n📈 BY FORMAT:" << std::endl;
        std::cout << "   VST3: " << vst3Plugins.size() << " plugins" << std::endl;
        std::cout << "   AudioUnit: " << auPlugins.size() << " plugins" << std::endl;

        // Check for expected plugins
        std::vector<std::string> expectedPlugins = {
            "Airwindows Consolidated",
            "AmpliTube 5",
            "Choral",
            "Dexed"
        };

        std::cout << "\n🎯 EXPECTED PLUGIN CHECK:" << std::endl;
        int foundExpected = 0;
        for (const auto& expected : expectedPlugins) {
            bool found = false;
            for (const auto& plugin : plugins) {
                if (plugin.name.toStdString() == expected) {
                    found = true;
                    foundExpected++;
                    break;
                }
            }
            std::cout << "   " << (found ? "✅" : "❌") << " " << expected << std::endl;
        }

        // Success determination
        if (plugins.size() >= 4 && foundExpected >= 3) {
            std::cout << "\n🎉 SUCCESS: Found " << plugins.size() << " plugins including " << foundExpected << " expected plugins!" << std::endl;
            std::cout << "✅ PluginLoader fix is working correctly!" << std::endl;
        } else if (plugins.size() > 0) {
            std::cout << "\n⚠️  PARTIAL: Found " << plugins.size() << " plugins but only " << foundExpected << " expected ones" << std::endl;
        } else {
            std::cout << "\n❌ FAILED: No plugins found!" << std::endl;
        }

        // Test caching functionality
        std::cout << "\n🗄️  TESTING CACHE FUNCTIONALITY:" << std::endl;
        bool cacheValid = loader.isCacheValid();
        std::cout << "   Cache valid: " << (cacheValid ? "YES" : "NO") << std::endl;

        // Test second scan (should be faster if caching works)
        auto startTime = std::chrono::high_resolution_clock::now();
        loader.scanForPlugins();
        auto endTime = std::chrono::high_resolution_clock::now();
        auto secondScanTime = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime).count() / 1000.0;

        std::cout << "   Second scan time: " << secondScanTime << " seconds" << std::endl;
        std::cout << "   Cache working: " << (secondScanTime < 0.1 ? "YES" : "NO") << std::endl;

    } catch (const std::exception& e) {
        std::cerr << "❌ Test failed: " << e.what() << std::endl;
        juce::shutdownJuce_GUI();
        return 1;
    }

    juce::shutdownJuce_GUI();
    return 0;
}