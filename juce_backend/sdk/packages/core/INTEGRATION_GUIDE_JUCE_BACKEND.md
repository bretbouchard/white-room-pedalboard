# 🎛️ JUCE Backend Integration Guide

## Overview

This guide helps the JUCE backend team integrate the new Schillinger SDK features into the existing C++ audio engine and JUCE-based applications.

## 🆕 **NEW FEATURES TO INTEGRATE**

### 1. Audio/MIDI Export Engine

#### **Architecture**
The new AudioExportEngine is a TypeScript-based export system that needs to be bridged to JUCE's audio processing capabilities.

#### **Integration Approach**

**Option A: Node.js Bridge (Recommended)**
```cpp
// AudioExportBridge.h
#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>

class AudioExportBridge : public juce::Thread, public juce::ChangeBroadcaster
{
public:
    AudioExportBridge();
    ~AudioExportBridge() override;

    // Export composition to various formats
    struct ExportRequest
    {
        juce::String compositionJson;  // Serialized composition from TypeScript
        juce::String format;          // wav, mp3, flac, etc.
        juce::String outputPath;
        AudioExportOptions options;
    };

    struct AudioExportOptions
    {
        int sampleRate = 48000;
        int bitDepth = 24;
        int channels = 2;
        double quality = 0.9;
        bool normalize = true;
        double headroomDB = -3.0;
    };

    // Export methods
    juce::String exportComposition(const ExportRequest& request);
    bool exportAsync(const ExportRequest& request);
    double getExportProgress() const;
    bool isExporting() const;

    // Event callbacks
    std::function<void(double progress)> onProgressUpdate;
    std::function<void(const juce::String& result)> onExportComplete;
    std::function<void(const juce::String& error)> onExportError;

private:
    void run() override;

    class NodeProcess;
    std::unique_ptr<NodeProcess> nodeProcess;
    juce::Atomic<double> exportProgress{0.0};
    juce::Atomic<bool> isCurrentlyExporting{false};
};

// AudioExportBridge.cpp
#include "AudioExportBridge.h"
#include <juce_core/juce_core.h>

class AudioExportBridge::NodeProcess
{
public:
    NodeProcess()
    {
        // Initialize Node.js process with Schillinger SDK
        juce::String nodeScript = R"(
const { AudioExportEngine } = require('@schillinger-sdk/core');
const exporter = new AudioExportEngine();

// Listen for messages from JUCE
process.on('message', async (message) => {
    try {
        if (message.type === 'export') {
            const exportId = await exporter.exportComposition(
                message.composition,
                message.format,
                message.options
            );

            // Monitor progress
            exporter.on('progressUpdated', ({ progress }) => {
                process.send({ type: 'progress', progress });
            });

            exporter.on('exportCompleted', ({ result }) => {
                process.send({ type: 'completed', result });
            });
        }
    } catch (error) {
        process.send({ type: 'error', error: error.message });
    }
});
        )";

        // Start Node.js process
        childProcess.start("node", { "-e", nodeScript });
    }

    bool sendMessage(const juce::String& message)
    {
        return childProcess.write(message.toStdString() + "\n");
    }

private:
    juce::ChildProcess childProcess;
};

AudioExportBridge::AudioExportBridge() : juce::Thread("AudioExportBridge")
{
    nodeProcess = std::make_unique<NodeProcess>();
}

AudioExportBridge::~AudioExportBridge()
{
    stopThread(1000);
}

juce::String AudioExportBridge::exportComposition(const ExportRequest& request)
{
    // Send export request to Node.js process
    juce::DynamicObject message;
    message.setProperty("type", "export");
    message.setProperty("composition", request.compositionJson);
    message.setProperty("format", request.format);
    message.setProperty("options", request.options.toJson());

    nodeProcess->sendMessage(JSON::toString(message));

    // Wait for completion (synchronous version)
    while (isCurrentlyExporting.get())
    {
        juce::Thread::sleep(10);
    }

    return lastExportResult;
}

void AudioExportBridge::run()
{
    while (!threadShouldExit())
    {
        if (isCurrentlyExporting.get())
        {
            // Process Node.js messages
            processNodeMessages();
        }

        wait(10);
    }
}
```

**Option B: Direct C++ Implementation**
```cpp
// Direct C++ AudioExport implementation
class CppAudioExport
{
public:
    struct AudioFormat
    {
        enum Type { WAV, MP3, FLAC, AAC, OGG };
        Type type;
        int sampleRate;
        int bitDepth;
        int channels;
    };

    bool exportToWAV(const juce::AudioBuffer<float>& audio,
                     const juce::String& filePath,
                     const AudioFormat& format)
    {
        // Implement WAV export using JUCE's AudioFormatWriter
        juce::WavAudioFormat wavFormat;
        std::unique_ptr<juce::AudioFormatWriter> writer;

        writer.reset(wavFormat.createWriterFor(
            new juce::FileOutputStream(filePath),
            format.sampleRate,
            format.channels,
            format.bitDepth,
            {}, 0));

        if (writer != nullptr)
        {
            writer->writeFromAudioBuffer(audio, 0, audio.getNumSamples());
            return true;
        }

        return false;
    }

    bool exportToMP3(const juce::AudioBuffer<float>& audio,
                      const juce::String& filePath,
                      int bitrate = 320)
    {
        // Implement MP3 export using LAME or similar library
        // This requires additional dependency management
        return false; // Placeholder
    }
};
```

#### **Usage in JUCE Plugin**
```cpp
// In your AudioProcessor class
class SchillingerAudioProcessor : public juce::AudioProcessor
{
private:
    std::unique_ptr<AudioExportBridge> exportBridge;

public:
    SchillingerAudioProcessor()
    {
        exportBridge = std::make_unique<AudioExportBridge>();

        // Set up export callbacks
        exportBridge->onProgressUpdate = [this](double progress)
        {
            // Update UI or handle progress
            sendChangeMessage();
        };

        exportBridge->onExportComplete = [this](const juce::String& result)
        {
            juce::Logger::writeToLog("Export completed: " + result);
        };
    }

    void exportComposition()
    {
        // Convert current JUCE state to TypeScript composition format
        auto compositionJson = convertToCompositionJson();

        AudioExportBridge::ExportRequest request;
        request.compositionJson = compositionJson;
        request.format = "wav";
        request.outputPath = getExportPath();
        request.options.sampleRate = 48000;
        request.options.bitDepth = 24;

        exportBridge->exportAsync(request);
    }

private:
    juce::String convertToCompositionJson()
    {
        // Convert JUCE audio/MIDI data to Schillinger SDK format
        juce::DynamicObject composition;
        composition.setProperty("tempo", currentTempo);
        composition.setProperty("timeSignature", "4/4");
        composition.setProperty("key", "C major");

        // Add tracks, notes, etc.
        // ... conversion logic ...

        return JSON::toString(composition);
    }
};
```

### 2. Real-Time Collaboration Integration

#### **WebSocket Bridge for Real-Time Updates**
```cpp
// CollaborationBridge.h
#pragma once
#include <juce_websockets/juce_websockets.h>

class CollaborationBridge : public juce::Thread,
                            private juce::WebSocketServer::Listener
{
public:
    CollaborationBridge(int port = 8080);
    ~CollaborationBridge() override;

    struct CollaborativeOperation
    {
        juce::String type;        // 'create', 'edit', 'delete', etc.
        juce::String targetId;    // element ID
        juce::String targetType;  // 'note', 'clip', 'track', etc.
        juce::var data;
        juce::String userId;
        juce::String sessionId;
        juce::Time timestamp;
    };

    // Session management
    juce::String createSession(const juce::String& sessionName);
    bool joinSession(const juce::String& sessionId, const juce::String& userId);
    void leaveSession(const juce::String& sessionId, const juce::String& userId);

    // Operation handling
    void broadcastOperation(const CollaborativeOperation& operation);
    void handleOperation(const CollaborativeOperation& operation);

    // Event callbacks
    std::function<void(const CollaborativeOperation&)> onOperationReceived;
    std::function<void(const juce::String& userId)> onUserJoined;
    std::function<void(const juce::String& userId)> onUserLeft;

private:
    // WebSocket server implementation
    void connectionMade(juce::WebSocket* connection) override;
    void connectionClosed(juce::WebSocket* connection) override;
    void messageReceived(juce::WebSocket* connection, const juce::MemoryBlock& message) override;

    void run() override;

    juce::WebSocketServer webSocketServer;
    juce::HashMap<juce::String, juce::WebSocket*> activeConnections;
    juce::HashMap<juce::String, juce::String> userSessions;
};

// CollaborationBridge.cpp
#include "CollaborationBridge.h"

CollaborationBridge::CollaborationBridge(int port)
    : juce::Thread("CollaborationBridge"), webSocketServer(port, "SchillingerCollaboration")
{
    webSocketServer.addListener(this);
    startThread();
}

CollaborationBridge::~CollaborationBridge()
{
    stopThread(1000);
    webSocketServer.stop();
}

void CollaborationBridge::connectionMade(juce::WebSocket* connection)
{
    juce::Logger::writeToLog("New WebSocket connection: " + connection->getIPAddress().toString());

    // Send welcome message
    connection->sendMessage("{\"type\":\"welcome\",\"message\":\"Connected to Schillinger Collaboration\"}");
}

void CollaborationBridge::messageReceived(juce::WebSocket* connection, const juce::MemoryBlock& message)
{
    try
    {
        auto messageText = message.toString();
        auto json = JSON::parse(messageText);

        auto* obj = json.getDynamicObject();
        if (obj)
        {
            CollaborativeOperation operation;
            operation.type = obj->getProperty("type").toString();
            operation.targetId = obj->getProperty("targetId").toString();
            operation.targetType = obj->getProperty("targetType").toString();
            operation.data = obj->getProperty("data");
            operation.userId = obj->getProperty("userId").toString();
            operation.sessionId = obj->getProperty("sessionId").toString();
            operation.timestamp = juce::Time::getCurrentTime();

            // Handle the operation
            handleOperation(operation);

            // Broadcast to other clients
            broadcastOperation(operation);
        }
    }
    catch (const std::exception& e)
    {
        juce::Logger::writeToLog("Error processing WebSocket message: " + juce::String(e.what()));
    }
}

void CollaborationBridge::broadcastOperation(const CollaborativeOperation& operation)
{
    auto operationJson = JSON::toString(operation.toJson());

    for (auto& [key, connection] : activeConnections)
    {
        // Don't send back to the original sender
        if (key != operation.userId)
        {
            connection->sendMessage(operationJson);
        }
    }
}
```

#### **Integration with AudioProcessor**
```cpp
// In your AudioProcessor
class SchillingerAudioProcessor : public juce::AudioProcessor
{
private:
    std::unique_ptr<CollaborationBridge> collaborationBridge;

public:
    SchillingerAudioProcessor()
    {
        collaborationBridge = std::make_unique<CollaborationBridge>();

        // Set up collaboration callbacks
        collaborationBridge->onOperationReceived = [this](const auto& operation)
        {
            handleCollaborativeOperation(operation);
        };
    }

private:
    void handleCollaborativeOperation(const CollaborationBridge::CollaborativeOperation& operation)
    {
        if (operation.type == "note")
        {
            // Handle note operations
            handleNoteOperation(operation);
        }
        else if (operation.type == "track")
        {
            // Handle track operations
            handleTrackOperation(operation);
        }
        else if (operation.type == "parameter")
        {
            // Handle parameter automation
            handleParameterOperation(operation);
        }
    }

    void handleNoteOperation(const CollaborationBridge::CollaborativeOperation& operation)
    {
        auto* data = operation.data.getDynamicObject();
        if (!data) return;

        int pitch = data->getProperty("pitch");
        double startTime = data->getProperty("startTime");
        double duration = data->getProperty("duration");
        int velocity = data->getProperty("velocity");

        // Update internal note data
        updateNote(pitch, startTime, duration, velocity);

        // Trigger UI update
        sendChangeMessage();
    }
};
```

### 3. Error Handling Integration

#### **Error Attribution System**
```cpp
// ErrorAttributionBridge.h
#pragma once
#include <juce_core/juce_core.h>

class ErrorAttributionBridge
{
public:
    struct ErrorContext
    {
        juce::String componentId;
        juce::String errorDescription;
        juce::StringArray contributors;
        juce::Time timestamp;
        juce::String operationHistory;
    };

    struct RecoveryRecommendation
    {
        juce::String action;
        juce::String responsible;
        int estimatedTimeMinutes;
        juce::String description;
    };

    // Generate detailed error attribution
    ErrorContext generateErrorContext(
        const juce::String& componentId,
        const juce::String& errorDescription,
        const juce::Array<Operation>& operations);

    // Get recovery recommendations
    juce::Array<RecoveryRecommendation> getRecoveryRecommendations(const ErrorContext& context);

    // Log error with full attribution
    void logError(const ErrorContext& context);

private:
    struct ContributorProfile
    {
        juce::String userId;
        juce::String name;
        juce::String role;
        double reliability; // 0-100
        double quality;     // 0-100
        juce::String motivation; // 'passionate', 'professional', 'minimal', 'paycheck_only'
    };

    juce::HashMap<juce::String, ContributorProfile> contributorProfiles;
};

// Usage in AudioProcessor
void SchillingerAudioProcessor::processError(juce::AudioProcessor* processor,
                                             const juce::String& componentId,
                                             const juce::String& errorDescription)
{
    ErrorAttributionBridge errorBridge;

    // Collect operations that led to the error
    juce::Array<Operation> errorOperations;
    collectErrorOperations(componentId, errorOperations);

    // Generate error context
    auto errorContext = errorBridge.generateErrorContext(componentId, errorDescription, errorOperations);

    // Log with full attribution
    errorBridge.logError(errorContext);

    // Get recovery recommendations
    auto recommendations = errorBridge.getRecoveryRecommendations(errorContext);

    // Implement recovery
    for (const auto& recommendation : recommendations)
    {
        if (recommendation.responsible == "system")
        {
            implementSystemRecovery(recommendation);
        }
        else
        {
            notifyUser(recommendation);
        }
    }
}
```

### 4. Performance Optimization

#### **Memory Management**
```cpp
// Optimized audio buffer management
class OptimizedAudioProcessor : public juce::AudioProcessor
{
private:
    // Pre-allocated buffers for real-time use
    juce::AudioBuffer<float> scratchBuffer;
    juce::HeapBlock<char> tempStorage;

public:
    OptimizedAudioProcessor() : scratchBuffer(2, 4096)
    {
        tempStorage.malloc(1024 * 1024); // 1MB temp storage
    }

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override
    {
        juce::ScopedNoDenormals noDenormals;

        // Use pre-allocated scratch buffer
        scratchBuffer.setSize(buffer.getNumChannels(), buffer.getNumSamples(), false, false, true);

        // Process with Schillinger SDK
        processWithSchillingerSDK(buffer, scratchBuffer);

        // Copy result back
        buffer.makeCopyOf(scratchBuffer);
    }
};
```

#### **Real-Time Performance**
```cpp
// Lock-free operation queue for real-time safety
class LockFreeOperationQueue
{
private:
    struct Operation
    {
        enum Type { Note, Parameter, Track, Effect };
        Type type;
        juce::var data;
        juce::Atomic<int> refCount;
    };

    static constexpr int QueueSize = 1024;
    juce::AbstractFifo fifo{ QueueSize };
    std::array<Operation, QueueSize> queue;
    juce::Atomic<int> readPos{0};
    juce::Atomic<int> writePos{0};

public:
    bool pushOperation(Operation::Type type, const juce::var& data)
    {
        int writePos1, writePos2;
        auto numToWrite = fifo.getFreeSpace(writePos1, writePos2);

        if (numToWrite > 0)
        {
            auto& operation = queue[writePos1];
            operation.type = type;
            operation.data = data;
            operation.refCount = 1;

            fifo.finishedWrite(1);
            return true;
        }

        return false;
    }

    bool popOperation(Operation& operation)
    {
        int readPos1, readPos2;
        auto numToRead = fifo.getNumReady(readPos1, readPos2);

        if (numToRead > 0)
        {
            operation = queue[readPos1];
            fifo.finishedRead(1);
            return true;
        }

        return false;
    }
};
```

## 🔧 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Core Integration**
- [ ] Set up Node.js bridge for AudioExportEngine
- [ ] Implement WebSocket server for collaboration
- [ ] Create error attribution system
- [ ] Add performance optimizations

### **Phase 2: Testing & Validation**
- [ ] Unit tests for all bridge classes
- [ ] Integration tests with JUCE audio processing
- [ ] Performance benchmarks
- [ ] Memory leak detection

### **Phase 3: Production Deployment**
- [ ] Error handling and logging
- [ ] Configuration management
- [ ] Documentation and examples
- [ ] User acceptance testing

## 🚀 **PERFORMANCE TARGETS**

- **Audio Export**: Real-time with <100ms latency
- **Collaboration**: <10ms operation latency
- **Error Attribution**: <50ms analysis time
- **Memory Usage**: <500MB for typical compositions
- **CPU Usage**: <10% on modern hardware

## 📞 **SUPPORT & RESOURCES**

### **Technical Documentation**
- API reference for all bridge classes
- Performance optimization guidelines
- Memory management best practices
- Real-time audio programming tips

### **Code Examples**
- Complete audio export implementation
- WebSocket collaboration server
- Error attribution integration
- Performance monitoring

### **Testing Framework**
- Unit test templates
- Integration test scenarios
- Performance benchmarking tools
- Memory leak detection

---

*This guide is specifically for the JUCE backend team integrating the new Schillinger SDK features into existing C++ audio applications.*