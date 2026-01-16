#include <gtest/gtest.h>
#include <juce_core/juce_core.h>
#include <thread>
#include <chrono>
#include <atomic>
#include <memory>
#include "../src/websocket/ClientHealthMonitor.h"
#include "../src/websocket/WebSocketConnection.h"

class ClientHealthTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        healthMonitor = std::make_unique<ClientHealthMonitor>();
    }

    void TearDown() override
    {
        healthMonitor.reset();
    }

    std::unique_ptr<ClientHealthMonitor> healthMonitor;
};

// RED PHASE TESTS - These MUST FAIL initially

TEST_F(ClientHealthTest, MonitorsConnectionHealth)
{
    // Test basic health monitoring
    juce::String clientId = "test_client_1";

    // Register client for monitoring
    EXPECT_NO_THROW(healthMonitor->registerClient(clientId));
    EXPECT_TRUE(healthMonitor->isClientRegistered(clientId));

    // Client should start as healthy
    EXPECT_TRUE(healthMonitor->isClientHealthy(clientId));
    EXPECT_EQ(healthMonitor->getClientHealthStatus(clientId), ClientHealthMonitor::HealthStatus::Healthy);

    // Simulate client activity
    EXPECT_NO_THROW(healthMonitor->updateClientActivity(clientId));

    // Client should still be healthy
    EXPECT_TRUE(healthMonitor->isClientHealthy(clientId));
}

TEST_F(ClientHealthTest, DetectsClientTimeouts)
{
    // Test timeout detection
    juce::String clientId = "timeout_client";

    healthMonitor->registerClient(clientId);
    healthMonitor->setTimeoutThreshold(2000); // 2 second timeout for testing

    // Client is initially healthy
    EXPECT_TRUE(healthMonitor->isClientHealthy(clientId));

    // Wait for timeout period
    std::this_thread::sleep_for(std::chrono::milliseconds(2100));

    // Client should now be considered unhealthy due to timeout
    EXPECT_FALSE(healthMonitor->isClientHealthy(clientId));
    EXPECT_EQ(healthMonitor->getClientHealthStatus(clientId), ClientHealthMonitor::HealthStatus::Timeout);

    // Update activity - client should become healthy again
    healthMonitor->updateClientActivity(clientId);
    EXPECT_TRUE(healthMonitor->isClientHealthy(clientId));
    EXPECT_EQ(healthMonitor->getClientHealthStatus(clientId), ClientHealthMonitor::HealthStatus::Healthy);
}

TEST_F(ClientHealthTest, MonitorsMessageFrequency)
{
    // Test message frequency monitoring
    juce::String clientId = "frequency_client";

    healthMonitor->registerClient(clientId);
    healthMonitor->setMessageFrequencyThreshold(10, 1.0); // 10 messages per second

    // Send messages within frequency limit
    for (int i = 0; i < 5; ++i)
    {
        EXPECT_NO_THROW(healthMonitor->recordMessage(clientId, "test_message_" + juce::String(i)));
        std::this_thread::sleep_for(std::chrono::milliseconds(50)); // 50ms between messages
    }

    // Client should still be healthy
    EXPECT_TRUE(healthMonitor->isClientHealthy(clientId));

    // Send messages rapidly to exceed frequency limit
    for (int i = 0; i < 20; ++i)
    {
        healthMonitor->recordMessage(clientId, "rapid_message_" + juce::String(i));
    }

    // Client might be flagged for high frequency
    auto status = healthMonitor->getClientHealthStatus(clientId);
    EXPECT_TRUE(status == ClientHealthMonitor::HealthStatus::Healthy ||
                status == ClientHealthMonitor::HealthStatus::HighFrequency);
}

TEST_F(ClientHealthTest, TracksConnectionDurations)
{
    // Test connection duration tracking
    juce::String clientId1 = "long_lived_client";
    juce::String clientId2 = "short_lived_client";

    healthMonitor->registerClient(clientId1);
    healthMonitor->registerClient(clientId2);

    auto startTime = std::chrono::high_resolution_clock::now();

    // Simulate different connection durations
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));

    healthMonitor->unregisterClient(clientId2);

    std::this_thread::sleep_for(std::chrono::milliseconds(1000));

    auto endTime = std::chrono::high_resolution_clock::now();

    // Check connection durations
    auto duration1 = healthMonitor->getClientConnectionDuration(clientId1);
    auto duration2 = healthMonitor->getClientConnectionDuration(clientId2);

    // Client 1 should have longer duration
    EXPECT_GT(duration1, duration2);

    // Client 2 duration should be approximately 1 second
    EXPECT_NEAR(duration2, 1000.0, 100.0); // 100ms tolerance
}

TEST_F(ClientHealthTest, ProvidesHealthStatistics)
{
    // Test health statistics collection
    juce::String clientId = "stats_client";

    healthMonitor->registerClient(clientId);

    // Simulate some activity
    healthMonitor->recordMessage(clientId, "message1");
    healthMonitor->recordMessage(clientId, "message2");
    healthMonitor->recordMessage(clientId, "message3");

    auto stats = healthMonitor->getClientStatistics(clientId);

    // This will fail until we implement statistics tracking
    EXPECT_EQ(stats.messageCount, 3);
    EXPECT_GT(stats.connectionTime, 0);
    EXPECT_EQ(stats.currentStatus, ClientHealthMonitor::HealthStatus::Healthy);
    EXPECT_GT(stats.lastActivityTime, 0);
}

TEST_F(ClientHealthTest, HandlesMultipleClients)
{
    // Test monitoring multiple clients simultaneously
    const int numClients = 10;
    juce::Array<juce::String> clientIds;

    // Register multiple clients
    for (int i = 0; i < numClients; ++i)
    {
        juce::String clientId = "multi_client_" + juce::String(i);
        clientIds.add(clientId);
        healthMonitor->registerClient(clientId);
    }

    EXPECT_EQ(healthMonitor->getRegisteredClientCount(), numClients);

    // Update activity for all clients
    for (const auto& clientId : clientIds)
    {
        healthMonitor->updateClientActivity(clientId);
        EXPECT_TRUE(healthMonitor->isClientHealthy(clientId));
    }

    // Get all client statuses
    auto allStatuses = healthMonitor->getAllClientStatuses();
    EXPECT_EQ(allStatuses.size(), numClients);

    // All clients should be healthy
    for (const auto& status : allStatuses)
    {
        EXPECT_EQ(status.healthStatus, ClientHealthMonitor::HealthStatus::Healthy);
    }
}

TEST_F(ClientHealthTest, HandlesRecoveryScenarios)
{
    // Test client recovery scenarios
    juce::String clientId = "recovery_client";

    healthMonitor->registerClient(clientId);
    healthMonitor->setTimeoutThreshold(1000); // 1 second timeout

    // Client is initially healthy
    EXPECT_TRUE(healthMonitor->isClientHealthy(clientId));

    // Simulate network issues - no activity
    std::this_thread::sleep_for(std::chrono::milliseconds(1100));

    // Client should be marked as timed out
    EXPECT_FALSE(healthMonitor->isClientHealthy(clientId));

    // Simulate recovery - client becomes active again
    healthMonitor->updateClientActivity(clientId);
    healthMonitor->recordMessage(clientId, "recovery_message");

    // Client should be healthy again
    EXPECT_TRUE(healthMonitor->isClientHealthy(clientId));

    // Verify recovery was tracked
    auto recoveryCount = healthMonitor->getClientRecoveryCount(clientId);
    EXPECT_GT(recoveryCount, 0);
}

TEST_F(ClientHealthTest, ProvidesCustomHealthCallbacks)
{
    // Test custom health change callbacks
    std::atomic<bool> callbackTriggered{false};
    juce::String callbackClientId;
    ClientHealthMonitor::HealthStatus callbackStatus;

    healthMonitor->setHealthChangeCallback([&](const juce::String& clientId,
                                              ClientHealthMonitor::HealthStatus status) {
        callbackTriggered = true;
        callbackClientId = clientId;
        callbackStatus = status;
    });

    juce::String clientId = "callback_client";
    healthMonitor->registerClient(clientId);
    healthMonitor->setTimeoutThreshold(500); // Short timeout for testing

    // Wait for timeout
    std::this_thread::sleep_for(std::chrono::milliseconds(600));

    // Check if callback was triggered
    EXPECT_TRUE(callbackTriggered);
    EXPECT_EQ(callbackClientId, clientId);
    EXPECT_EQ(callbackStatus, ClientHealthMonitor::HealthStatus::Timeout);
}

TEST_F(ClientHealthTest, MonitorsResourceUsage)
{
    // Test resource usage monitoring
    juce::String clientId = "resource_client";

    healthMonitor->registerClient(clientId);
    healthMonitor->enableResourceMonitoring(true);

    // Simulate resource usage
    healthMonitor->recordResourceUsage(clientId, 1024, 512); // 1KB memory, 0.5KB bandwidth

    auto usage = healthMonitor->getClientResourceUsage(clientId);

    // This will fail until we implement resource monitoring
    EXPECT_EQ(usage.memoryUsage, 1024);
    EXPECT_EQ(usage.bandwidthUsage, 512);
    EXPECT_GT(usage.connectionTime, 0);

    // Check if client is within resource limits
    healthMonitor->setResourceLimits(clientId, 10240, 5120); // 10KB memory, 5KB bandwidth
    EXPECT_TRUE(healthMonitor->isClientWithinResourceLimits(clientId));

    // Exceed limits
    healthMonitor->recordResourceUsage(clientId, 20000, 10000); // Exceed both limits
    EXPECT_FALSE(healthMonitor->isClientWithinResourceLimits(clientId));
}

TEST_F(ClientHealthTest, ProvidesHealthReports)
{
    // Test comprehensive health reporting
    juce::String clientId1 = "report_client_1";
    juce::String clientId2 = "report_client_2";

    healthMonitor->registerClient(clientId1);
    healthMonitor->registerClient(clientId2);

    // Simulate different scenarios
    healthMonitor->recordMessage(clientId1, "message1");
    healthMonitor->recordMessage(clientId1, "message2");

    healthMonitor->recordMessage(clientId2, "message1");
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    healthMonitor->recordMessage(clientId2, "message2");

    auto healthReport = healthMonitor->generateHealthReport();

    // Verify report contents
    EXPECT_GT(healthReport.totalClients, 0);
    EXPECT_GT(healthReport.healthyClients, 0);
    EXPECT_GT(healthReport.totalMessages, 0);
    EXPECT_GT(healthReport.averageMessageRate, 0.0);

    // Report should contain client details
    EXPECT_FALSE(healthReport.clientDetails.empty());

    // Find our clients in the report
    bool foundClient1 = false, foundClient2 = false;
    for (const auto& client : healthReport.clientDetails)
    {
        if (client.clientId == clientId1)
        {
            foundClient1 = true;
            EXPECT_EQ(client.messageCount, 2);
        }
        else if (client.clientId == clientId2)
        {
            foundClient2 = true;
            EXPECT_EQ(client.messageCount, 2);
        }
    }

    EXPECT_TRUE(foundClient1);
    EXPECT_TRUE(foundClient2);
}

TEST_F(ClientHealthTest, MaintainsThreadSafety)
{
    // Test thread safety of health monitoring operations
    std::atomic<int> successfulOperations{0};
    std::vector<std::thread> threads;

    const int numClients = 20;
    const int operationsPerClient = 50;

    // Register clients
    for (int i = 0; i < numClients; ++i)
    {
        healthMonitor->registerClient("thread_client_" + juce::String(i));
    }

    // Perform concurrent operations
    for (int i = 0; i < numClients; ++i)
    {
        threads.emplace_back([&, i]() {
            juce::String clientId = "thread_client_" + juce::String(i);

            for (int j = 0; j < operationsPerClient; ++j)
            {
                try {
                    healthMonitor->updateClientActivity(clientId);
                    healthMonitor->recordMessage(clientId, "message_" + juce::String(j));
                    healthMonitor->isClientHealthy(clientId);
                    successfulOperations++;
                } catch (...) {
                    // Should not happen with proper thread safety
                }
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }

    EXPECT_EQ(successfulOperations.load(), numClients * operationsPerClient);
    EXPECT_EQ(healthMonitor->getRegisteredClientCount(), numClients);
}