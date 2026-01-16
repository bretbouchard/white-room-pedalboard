#include "src/plugins/PluginLoader.h"
#include <iostream>

int main()
{
    std::cout << "🔍 Testing PluginLoader with Enhanced Scanning..." << std::endl;

    // Initialize JUCE
    juce::initialiseJuce_GUI();

    try {
        PluginLoader loader;

        std::cout << "🚀 Starting comprehensive plugin scan..." << std::endl;
        loader.scanForPlugins();

        auto plugins = loader.getAvailablePlugins();
        auto stats = loader.getScanStatistics();

        std::cout << "\n📊 COMPREHENSIVE PLUGIN SCAN RESULTS:" << std::endl;
        std::cout << "   Total plugins found in database: " << plugins.size() << std::endl;
        std::cout << "   Total files scanned: " << stats.totalPluginsScanned << std::endl;
        std::cout << "   Valid plugins found: " << stats.validPluginsFound << std::endl;
        std::cout << "   Failed to load: " << stats.failedToLoad << std::endl;
        std::cout << "   Scan time: " << stats.scanTimeSeconds << " seconds" << std::endl;

        // Count by format
        auto vst3Plugins = loader.getPluginsByFormat(PluginLoader::PluginFormat::VST3);
        auto vst2Plugins = loader.getPluginsByFormat(PluginLoader::PluginFormat::VST2);
        auto auPlugins = loader.getPluginsByFormat(PluginLoader::PluginFormat::AudioUnit);

        std::cout << "\n📈 BY FORMAT:" << std::endl;
        std::cout << "   VST3: " << vst3Plugins.size() << " plugins" << std::endl;
        std::cout << "   VST2: " << vst2Plugins.size() << " plugins" << std::endl;
        std::cout << "   AudioUnit: " << auPlugins.size() << " plugins" << std::endl;

        // Show first 10 plugins
        std::cout << "\n🎵 FIRST 10 PLUGINS FOUND:" << std::endl;
        for (size_t i = 0; i < std::min(size_t(10), plugins.size()); ++i) {
            const auto& plugin = plugins[i];
            std::cout << "   " << (i+1) << ". " << plugin.name.toStdString()
                     << " (" << plugin.filePath.toStdString() << ")" << std::endl;
        }

        // Success determination
        if (plugins.size() >= 100) {
            std::cout << "\n🎉 EXCELLENT: Found " << plugins.size() << " plugins!" << std::endl;
            std::cout << "✅ PluginLoader enhancement is working correctly!" << std::endl;
            return 0;
        } else if (plugins.size() >= 50) {
            std::cout << "\n✅ GOOD: Found " << plugins.size() << " plugins" << std::endl;
            return 0;
        } else if (plugins.size() > 0) {
            std::cout << "\n⚠️  PARTIAL: Only " << plugins.size() << " plugins found (expected 356+)" << std::endl;
            return 1;
        } else {
            std::cout << "\n❌ FAILED: No plugins found!" << std::endl;
            return 1;
        }

    } catch (const std::exception& e) {
        std::cerr << "❌ Test failed: " << e.what() << std::endl;
        juce::shutdownJuce_GUI();
        return 1;
    }

    juce::shutdownJuce_GUI();
    return 0;
}