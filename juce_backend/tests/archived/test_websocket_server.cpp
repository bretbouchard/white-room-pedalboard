#include "websocket/RealWebSocketServer.h"
#include <iostream>
#include <thread>
#include <chrono>

int main()
{
    std::cout << "Testing Real WebSocket Server..." << std::endl;

    // Create the server
    RealWebSocketServer server;

    // Set message callback
    server.setMessageCallback([](const juce::String& clientId, const juce::String& message) {
        std::cout << "Message from " << clientId << ": " << message << std::endl;
    });

    // Set connection callback
    server.setConnectionCallback([](const juce::String& clientId, bool connected) {
        std::cout << "Client " << clientId << " " << (connected ? "connected" : "disconnected") << std::endl;
    });

    // Start server
    std::cout << "Starting server on port 8080..." << std::endl;
    server.start(8080);

    if (!server.isRunning())
    {
        std::cerr << "ERROR: Server failed to start!" << std::endl;
        return 1;
    }

    std::cout << "Server started successfully! Running for 10 seconds..." << std::endl;

    // Let it run for testing
    std::this_thread::sleep_for(std::chrono::seconds(10));

    std::cout << "Connections handled: " << server.getTotalConnectionsHandled() << std::endl;
    std::cout << "Messages processed: " << server.getTotalMessagesProcessed() << std::endl;

    // Stop server
    server.stop();

    std::cout << "Server stopped. Test completed." << std::endl;
    return 0;
}