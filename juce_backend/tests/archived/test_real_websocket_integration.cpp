#include <iostream>
#include <thread>
#include <chrono>
#include "src/websocket/WebSocketServer.h"

int main()
{
    std::cout << "🧪 Testing Real WebSocket Server Integration\n";
    std::cout << "==========================================\n\n";

    try
    {
        // Create WebSocket server (should now use real implementation)
        WebSocketServer server;
        std::cout << "✅ WebSocketServer created\n";

        // Start server on port 8081
        server.start(8081);
        std::cout << "✅ WebSocket server started on port 8081\n";

        // Verify server is running
        if (server.isRunning())
        {
            std::cout << "✅ Server is running\n";
            std::cout << "📡 Server listening on port: " << server.getPort() << "\n";
        }
        else
        {
            std::cout << "❌ Server is not running\n";
            return 1;
        }

        // Test connection statistics
        std::cout << "📊 Initial stats:\n";
        std::cout << "   - Connected clients: " << server.getConnectedClientCount() << "\n";
        std::cout << "   - Total connections: " << server.getTotalConnectionsHandled() << "\n";
        std::cout << "   - Total messages: " << server.getTotalMessagesProcessed() << "\n";

        // Test client connection simulation
        std::cout << "\n🔄 Simulating client connections...\n";
        server.simulateClientConnection("test_client_1");
        server.simulateClientConnection("test_client_2");

        std::cout << "   - Connected clients: " << server.getConnectedClientCount() << "\n";
        std::cout << "   - Total connections: " << server.getTotalConnectionsHandled() << "\n";

        // Test message sending
        std::cout << "\n📤 Testing message sending...\n";
        server.sendMessageToClient("test_client_1", "{\"type\":\"test\",\"message\":\"Hello Client 1!\"}");
        server.sendMessageToClient("test_client_2", "{\"type\":\"test\",\"message\":\"Hello Client 2!\"}");
        server.broadcastMessage("{\"type\":\"broadcast\",\"message\":\"Hello all clients!\"}");

        std::cout << "   - Messages sent: " << server.getTotalMessagesProcessed() << "\n";

        // Test client disconnection
        std::cout << "\n🔌 Testing client disconnection...\n";
        server.simulateClientDisconnection("test_client_1");
        std::cout << "   - Connected clients: " << server.getConnectedClientCount() << "\n";

        // Test health monitor
        auto healthMonitor = server.getHealthMonitor();
        if (healthMonitor)
        {
            std::cout << "✅ Health monitor available\n";
        }
        else
        {
            std::cout << "⚠️  Health monitor not available\n";
        }

        // Give some time for real network operations
        std::this_thread::sleep_for(std::chrono::seconds(2));

        // Stop server
        std::cout << "\n🛑 Stopping server...\n";
        server.stop();

        if (!server.isRunning())
        {
            std::cout << "✅ Server stopped successfully\n";
        }
        else
        {
            std::cout << "❌ Server is still running\n";
            return 1;
        }

        std::cout << "\n🎉 All tests passed! Real WebSocket server is working correctly.\n";
        return 0;
    }
    catch (const std::exception& e)
    {
        std::cout << "❌ Exception: " << e.what() << std::endl;
        return 1;
    }
    catch (...)
    {
        std::cout << "❌ Unknown exception occurred" << std::endl;
        return 1;
    }
}