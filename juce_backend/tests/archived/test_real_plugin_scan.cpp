#include "external/JUCE/modules/juce_audio_processors/juce_audio_processors.h"
#include "external/JUCE/modules/juce_audio_devices/juce_audio_devices.h"
#include "external/JUCE/modules/juce_core/juce_core.h"
#include <iostream>

int main() {
    std::cout << "🔍 Testing REAL JUCE Plugin Scanning..." << std::endl;

    // Initialize JUCE
    juce::initialiseJuce_GUI();

    try {
        // Test VST3 format manager
        juce::AudioPluginFormatManager formatManager;
        formatManager.addDefaultFormats();

        std::cout << "✅ Plugin format managers initialized!" << std::endl;

        // Get VST3 format
        auto* vst3Format = formatManager.getFormat(0); // VST3 is usually first
        if (!vst3Format) {
            std::cerr << "❌ VST3 format not found!" << std::endl;
            return 1;
        }

        std::cout << "✅ VST3 format found: " << vst3Format->getName().toStdString() << std::endl;

        // Scan VST3 directory properly
        juce::FileSearchPath searchPaths;
        searchPaths.add("/Library/Audio/Plug-Ins/VST3");
        searchPaths.add("~/Library/Audio/Plug-Ins/VST3");

        std::cout << "🔍 Scanning VST3 plugins in: /Library/Audio/Plug-Ins/VST3" << std::endl;

        // Create known plugin list and scanner
        juce::KnownPluginList knownPluginList;
        juce::PluginDirectoryScanner scanner(knownPluginList, *vst3Format, searchPaths, true, juce::File());

        int foundCount = 0;
        juce::String pluginName;
        std::vector<juce::String> foundPlugins;

        // Scan for plugins with timeout
        auto startTime = juce::Time::getMillisecondCounter();
        while (scanner.scanNextFile(false, pluginName) && (juce::Time::getMillisecondCounter() - startTime < 30000)) {
            if (pluginName.isNotEmpty()) {
                foundPlugins.push_back(pluginName);
                foundCount++;
                std::cout << "🎵 Found plugin: " << pluginName.toStdString() << std::endl;

                // Limit to first 10 for testing
                if (foundCount >= 10) break;
            }
        }

        std::cout << "\n📊 SCAN RESULTS:" << std::endl;
        std::cout << "   Plugins found in scan: " << foundCount << std::endl;
        std::cout << "   Total in known list: " << knownPluginList.getNumTypes() << std::endl;

        // List all plugins found
        for (int i = 0; i < knownPluginList.getNumTypes() && i < 20; ++i) {
            auto* desc = knownPluginList.getType(i);
            if (desc) {
                std::cout << "   - " << desc->name.toStdString()
                         << " (" << desc->manufacturerName.toStdString() << ")" << std::endl;
            }
        }

        if (knownPluginList.getNumTypes() > 20) {
            std::cout << "   ... and " << (knownPluginList.getNumTypes() - 20) << " more plugins" << std::endl;
        }

        // Test loading one plugin
        if (knownPluginList.getNumTypes() > 0) {
            auto* desc = knownPluginList.getType(0);
            if (desc) {
                std::cout << "\n🧪 Testing plugin loading: " << desc->name.toStdString() << std::endl;

                juce::String error;
                auto instance = std::unique_ptr<juce::AudioPluginInstance>(
                    vst3Format->createInstanceFromDescription(*desc, 44100.0, 512, error));

                if (instance) {
                    std::cout << "✅ Plugin loaded successfully!" << std::endl;
                    std::cout << "   Parameters: " << instance->getParameters().size() << std::endl;
                    std::cout << "   Input channels: " << instance->getMainBusNumInputChannels() << std::endl;
                    std::cout << "   Output channels: " << instance->getMainBusNumOutputChannels() << std::endl;
                } else {
                    std::cout << "❌ Failed to load plugin: " << error.toStdString() << std::endl;
                }
            }
        }

        std::cout << "\n🎉 JUCE Plugin Scanning Test: " << (knownPluginList.getNumTypes() > 0 ? "SUCCESS!" : "FAILED") << std::endl;

    } catch (const std::exception& e) {
        std::cerr << "❌ Plugin scanning failed: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "❌ Unknown error during plugin scanning" << std::endl;
        return 1;
    }

    juce::shutdownJuce_GUI();
    return 0;
}