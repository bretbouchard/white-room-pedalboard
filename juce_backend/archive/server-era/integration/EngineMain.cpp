#include "AudioEngine.h"
#include "WebSocketBridge.h"
#include <JuceHeader.h>

class SchillingerEcosystemBackendApplication : public juce::JUCEApplication
{
public:
    SchillingerEcosystemBackendApplication() {}

    const juce::String getApplicationName() override       { return "SchillingerEcosystem Backend"; }
    const juce::String getApplicationVersion() override    { return "2.0.0"; }
    bool moreThanOneInstanceAllowed() override             { return false; }

    void initialise (const juce::String& commandLine) override
    {
        juce::Logger::writeToLog("=== SchillingerEcosystem Backend Starting ===");
        juce::Logger::writeToLog("Version: " + getApplicationVersion());

        // Initialize audio engine
        audioEngine = std::make_unique<AudioEngine>();
        if (!audioEngine->initializeAudio())
        {
            juce::Logger::writeToLog("FATAL: Failed to initialize audio engine");
            quit();
            return;
        }

        // Initialize WebSocket bridge
        webSocketBridge = std::make_unique<WebSocketBridge>(*audioEngine);
        if (!webSocketBridge->startServer(8080))
        {
            juce::Logger::writeToLog("FATAL: Failed to start WebSocket server");
            quit();
            return;
        }

        juce::Logger::writeToLog("✓ Backend initialized successfully");
        juce::Logger::writeToLog("✓ Audio engine running");
        juce::Logger::writeToLog("✓ WebSocket server on port 8080");
        juce::Logger::writeToLog("✓ Ready for external UI connections");
    }

    void shutdown() override
    {
        juce::Logger::writeToLog("=== Shutting Down SchillingerEcosystem Backend ===");

        if (webSocketBridge)
        {
            webSocketBridge->stopServer();
            webSocketBridge.reset();
        }

        if (audioEngine)
        {
            audioEngine->shutdownAudio();
            audioEngine.reset();
        }

        juce::Logger::writeToLog("✓ Backend shut down complete");
    }

    void systemRequestedQuit() override
    {
        quit();
    }

    void anotherInstanceStarted (const juce::String& commandLine) override
    {
        // Handle multiple instances - we only allow one
        juce::Logger::writeToLog("Another instance attempted to start - ignoring");
    }

private:
    std::unique_ptr<AudioEngine> audioEngine;
    std::unique_ptr<WebSocketBridge> webSocketBridge;
};

//==============================================================================
// This macro generates the main() function that launches the app.
START_JUCE_APPLICATION (SchillingerEcosystemBackendApplication)