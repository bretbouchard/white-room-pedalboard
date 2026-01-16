#define JUCE_WEB_BROWSER 0
#define JUCE_USE_CURL 0
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>
#include <iostream>
#include <thread>
#include <chrono>

// Include our real WebSocket server
#include "websocket/RealWebSocketServer.h"

class WebSocketTestApp : public juce::JUCEApplicationBase
{
public:
    const juce::String getApplicationName() override       { return "WebSocket Test"; }
    const juce::String getApplicationVersion() override    { return "1.0.0"; }
    bool moreThanOneInstanceAllowed() override             { return false; }

    void initialise(const juce::String& commandLine) override
    {
        std::cout << "🧪 Testing Real WebSocket Server Implementation" << std::endl;

        // Create the real WebSocket server
        webSocketServer = std::make_unique<RealWebSocketServer>();

        // Set message callback to test real functionality
        webSocketServer->setMessageCallback([](const juce::String& clientId, const juce::String& message) {
            std::cout << "📨 Message from " << clientId << ": " << message << std::endl;
        });

        // Set connection callback to test real client management
        webSocketServer->setConnectionCallback([](const juce::String& clientId, bool connected) {
            std::cout << "👤 Client " << clientId << " " << (connected ? "CONNECTED" : "DISCONNECTED") << std::endl;
        });

        // Start the real WebSocket server on port 8080
        std::cout << "🚀 Starting real WebSocket server on port 8080..." << std::endl;
        webSocketServer->start(8080);

        // Verify the server actually started
        if (!webSocketServer->isRunning())
        {
            std::cerr << "❌ CRITICAL: Real WebSocket server failed to bind to port 8080!" << std::endl;
            std::cerr << "This is the same issue the Flutter team identified." << std::endl;
            quit();
        }

        std::cout << "✅ SUCCESS: Real WebSocket server is running on port 8080!" << std::endl;
        std::cout << "🔗 Server is accepting real WebSocket connections." << std::endl;
        std::cout << "📡 You can now test it with a WebSocket client." << std::endl;

        // Test the server for 15 seconds using a simple timer
        std::thread([this]() {
            std::this_thread::sleep_for(std::chrono::seconds(15));

            // Report final statistics
            std::cout << "\n📊 FINAL VERIFICATION RESULTS:" << std::endl;
            std::cout << "   Total connections handled: " << webSocketServer->getTotalConnectionsHandled() << std::endl;
            std::cout << "   Total messages processed: " << webSocketServer->getTotalMessagesProcessed() << std::endl;
            std::cout << "   Current connected clients: " << webSocketServer->getConnectedClientCount() << std::endl;

            if (webSocketServer->getTotalConnectionsHandled() == 0)
            {
                std::cout << "⚠️  WARNING: No connections were made during test period." << std::endl;
                std::cout << "   This may be expected if no WebSocket clients connected." << std::endl;
            }
            else
            {
                std::cout << "✅ WebSocket server successfully accepted real connections!" << std::endl;
            }

            juce::MessageManager::callAsync([this]() {
                systemRequestedQuit();
            });
        }).detach();
    }

    void shutdown() override
    {
        if (webSocketServer)
        {
            std::cout << "🛑 Stopping WebSocket server..." << std::endl;
            webSocketServer->stop();
        }
        std::cout << "🧹 Test completed." << std::endl;
    }

    void anotherInstanceStarted(const juce::String& commandLine) override
    {
        // Not implemented for this test
    }

    void systemRequestedQuit() override
    {
        if (webSocketServer)
        {
            webSocketServer->stop();
        }
        quit();
    }

    void suspended() override
    {
        // Not implemented for this test
    }

    void resumed() override
    {
        // Not implemented for this test
    }

    void unhandledException(const std::exception* e, const juce::String& sourceFilename, int lineNumber) override
    {
        std::cerr << "Unhandled exception: " << e->what() << " in " << sourceFilename << ":" << lineNumber << std::endl;
    }

private:
    std::unique_ptr<RealWebSocketServer> webSocketServer;
};

START_JUCE_APPLICATION (WebSocketTestApp)