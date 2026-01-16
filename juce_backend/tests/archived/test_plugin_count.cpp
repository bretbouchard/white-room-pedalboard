#include "src/plugins/PluginLoader.h"
#include <iostream>

int main() {
    std::cout << "🔍 Testing PluginLoader Plugin Count..." << std::endl;

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

        if (plugins.size() >= 50) {
            std::cout << "\n🎉 SUCCESS: Found " << plugins.size() << " plugins!" << std::endl;
        } else if (plugins.size() > 0) {
            std::cout << "\n⚠️  PARTIAL: Found only " << plugins.size() << " plugins (expected 141+)" << std::endl;
        } else {
            std::cout << "\n❌ FAILED: No plugins found!" << std::endl;
        }

    } catch (const std::exception& e) {
        std::cerr << "❌ Test failed: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}