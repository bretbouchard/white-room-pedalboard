/*
  ==============================================================================
    MemorySafeAudioGraph.h

    Memory-safe audio graph implementation using RAII patterns and smart pointers.
    Eliminates use-after-free and double-free vulnerabilities through proper
    resource management and lifecycle control.
  ==============================================================================
*/

#pragma once

#include <memory>
#include <vector>
#include <atomic>
#include <mutex>
#include <shared_mutex>
#include <unordered_map>
#include <string>
#include <functional>
#include <future>
#include <chrono>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>

namespace SchillingerEcosystem::Audio {

//==============================================================================
// Forward declarations
class MemorySafeAudioNode;
class AudioNodeProcessor;
class AudioGraphNodeFactory;

//==============================================================================
/**
 * Memory-safe audio node with RAII lifecycle management
 *
 * Key features:
 * - Unique ownership through std::unique_ptr
 * - Atomic state management for thread safety
 * - Automatic resource cleanup
 * - Processing state tracking
 * - Exception-safe operations
 */
class MemorySafeAudioNode {
public:
    enum class NodeState {
        Uninitialized,
        Ready,
        Processing,
        Error,
        Shutdown
    };

    enum class NodeType {
        Input,
        Output,
        Processor,
        Mixer,
        Effect,
        Generator
    };

    using NodePtr = std::unique_ptr<MemorySafeAudioNode>;
    using WeakNodePtr = std::weak_ptr<MemorySafeAudioNode>;
    using ProcessCallback = std::function<void(const float* const*, int, int, float* const*, int)>;

private:
    const std::string nodeId_;
    const NodeType nodeType_;
    std::atomic<NodeState> currentState_{NodeState::Uninitialized};

    // Audio buffers with automatic cleanup
    std::unique_ptr<juce::AudioBuffer<float>> inputBuffer_;
    std::unique_ptr<juce::AudioBuffer<float>> outputBuffer_;
    std::unique_ptr<juce::AudioBuffer<float>> scratchBuffer_;

    // Processing state
    std::atomic<bool> isProcessing_{false};
    std::atomic<uint32_t> processingCount_{0};
    std::atomic<uint64_t> totalSamplesProcessed_{0};

    // Connection management with weak references to prevent cycles
    std::vector<WeakNodePtr> connectedInputs_;
    std::vector<WeakNodePtr> connectedOutputs_;
    mutable std::shared_mutex connectionMutex_;

    // Thread-safe state management
    mutable std::mutex stateMutex_;
    ProcessCallback processCallback_;

    // Memory safety debugging (debug builds only)
    #ifdef DEBUG
    std::atomic<uint64_t> lastAccessTime_{0};
    std::string creatorContext_;
    std::atomic<bool> memoryCorruptionDetected_{false};
    #endif

public:
    /**
     * Construct a memory-safe audio node
     *
     * @param nodeId Unique identifier for this node
     * @param type Type of audio node
     * @param numChannels Number of audio channels
     * @param bufferSize Size of internal buffers in samples
     * @param sampleRate Audio sample rate
     */
    MemorySafeAudioNode(std::string nodeId,
                       NodeType type,
                       int numChannels = 2,
                       int bufferSize = 1024,
                       double sampleRate = 44100.0);

    /**
     * Destructor ensures proper cleanup of all resources
     */
    ~MemorySafeAudioNode();

    // Disable copying to ensure unique ownership
    MemorySafeAudioNode(const MemorySafeAudioNode&) = delete;
    MemorySafeAudioNode& operator=(const MemorySafeAudioNode&) = delete;

    // Enable moving for efficient transfer of ownership
    MemorySafeAudioNode(MemorySafeAudioNode&&) = default;
    MemorySafeAudioNode& operator=(MemorySafeAudioNode&&) = default;

    //==============================================================================
    // Memory-safe node lifecycle management

    /**
     * Initialize the node and allocate resources
     * @return true if initialization successful
     */
    bool initialize();

    /**
     * Safely shutdown the node and cleanup resources
     * Ensures no processing is active before cleanup
     */
    void shutdown();

    /**
     * Get current node state atomically
     */
    NodeState getState() const noexcept { return currentState_.load(); }

    /**
     * Check if node is ready for processing
     */
    bool isReady() const noexcept { return currentState_.load() == NodeState::Ready; }

    /**
     * Check if node is currently processing
     */
    bool isProcessing() const noexcept { return isProcessing_.load(); }

    //==============================================================================
    // Memory-safe audio processing

    /**
     * Process audio with full memory safety guarantees
     *
     * @param inputAudio Input audio buffers
     * @param numInputChannels Number of input channels
     * @param numSamples Number of samples to process
     * @param outputAudio Output audio buffers
     * @param numOutputChannels Number of output channels
     * @return true if processing successful
     */
    bool processAudio(const float* const* inputAudio,
                     int numInputChannels,
                     int numSamples,
                     float* const* outputAudio,
                     int numOutputChannels);

    /**
     * Set custom processing callback
     * Callback must be exception-safe and not access freed memory
     */
    void setProcessCallback(ProcessCallback callback);

    //==============================================================================
    // Memory-safe connection management

    /**
     * Connect input from another node using weak references
     * Prevents circular references and use-after-free
     */
    bool connectInput(WeakNodePtr inputNode);

    /**
     * Connect output to another node
     */
    bool connectOutput(WeakNodePtr outputNode);

    /**
     * Disconnect input safely
     */
    void disconnectInput(const std::string& nodeId);

    /**
     * Disconnect output safely
     */
    void disconnectOutput(const std::string& nodeId);

    /**
     * Get all connected input nodes (safe snapshots)
     */
    std::vector<std::string> getConnectedInputIds() const;

    /**
     * Get all connected output nodes (safe snapshots)
     */
    std::vector<std::string> getConnectedOutputIds() const;

    //==============================================================================
    // Memory-safe configuration

    /**
     * Resize audio buffers safely
     * Ensures no processing is active during resize
     */
    bool resizeBuffers(int newBufferSize);

    /**
     * Set channel count safely
     */
    bool setChannelCount(int newNumChannels);

    /**
     * Set sample rate
     */
    bool setSampleRate(double newSampleRate);

    //==============================================================================
    // Memory-safe accessors

    /**
     * Get node ID
     */
    const std::string& getId() const noexcept { return nodeId_; }

    /**
     * Get node type
     */
    NodeType getType() const noexcept { return nodeType_; }

    /**
     * Get buffer size
     */
    int getBufferSize() const;

    /**
     * Get channel count
     */
    int getChannelCount() const;

    /**
     * Get sample rate
     */
    double getSampleRate() const;

    /**
     * Get processing statistics
     */
    struct ProcessingStats {
        uint64_t totalSamplesProcessed;
        uint32_t currentProcessingCount;
        bool isCurrentlyProcessing;
        NodeState currentState;
    };

    ProcessingStats getStats() const;

    //==============================================================================
    // Memory safety validation (debug builds)

    #ifdef DEBUG
    /**
     * Validate memory integrity (debug builds only)
     */
    bool validateMemoryIntegrity() const;

    /**
     * Set creator context for debugging
     */
    void setCreatorContext(const std::string& context);

    /**
     * Get last access time (for debugging)
     */
    uint64_t getLastAccessTime() const { return lastAccessTime_.load(); }
    #endif

private:
    //==============================================================================
    // Memory-safe internal operations

    /**
     * Acquire processing lock safely
     * Returns true if lock acquired, false if node is shutting down
     */
    bool tryAcquireProcessingLock();

    /**
     * Release processing lock
     */
    void releaseProcessingLock();

    /**
     * Cleanup connections safely
     */
    void cleanupConnections();

    /**
     * Validate node state for operation
     */
    bool validateStateForOperation() const;

    /**
     * Update last access time (debug builds)
     */
    void updateLastAccessTime();

    /**
     * Process audio with internal buffers
     */
    bool processInternal(const float* const* inputAudio,
                        int numInputChannels,
                        int numSamples,
                        float* const* outputAudio,
                        int numOutputChannels);
};

//==============================================================================
/**
 * Memory-safe audio graph with proper lifecycle management
 *
 * Eliminates use-after-free vulnerabilities through:
 * - Smart pointer-based node ownership
 * - Safe node removal during processing
 * - Atomic state management
 * - Exception-safe operations
 * - Comprehensive error handling
 */
class MemorySafeAudioGraph {
public:
    using NodePtr = std::unique_ptr<MemorySafeAudioNode>;
    using NodeMap = std::unordered_map<std::string, NodePtr>;
    using WeakNodeMap = std::unordered_map<std::string, std::weak_ptr<MemorySafeAudioNode>>;

private:
    // Node storage with unique ownership
    NodeMap nodes_;
    mutable std::shared_mutex nodesMutex_;

    // Processing state
    std::atomic<bool> isGraphProcessing_{false};
    std::atomic<uint32_t> activeProcessingCount_{0};
    std::atomic<bool> shutdownRequested_{false};

    // Graph structure with safe references
    WeakNodeMap connections_;
    mutable std::shared_mutex connectionsMutex_;

    // Processing order and optimization
    std::vector<std::string> processingOrder_;
    mutable std::mutex processingOrderMutex_;
    bool processingOrderDirty_{true};

    // Statistics and monitoring
    std::atomic<uint64_t> totalProcessCalls_{0};
    std::atomic<uint64_t> totalErrors_{0};

    // Memory safety debugging
    #ifdef DEBUG
    std::atomic<uint64_t> lastNodeModification_{0};
    std::string creatorContext_;
    #endif

public:
    /**
     * Construct memory-safe audio graph
     */
    MemorySafeAudioGraph();

    /**
     * Destructor ensures clean shutdown of all nodes
     */
    ~MemorySafeAudioGraph();

    // Disable copying to maintain unique ownership
    MemorySafeAudioGraph(const MemorySafeAudioGraph&) = delete;
    MemorySafeAudioGraph& operator=(const MemorySafeAudioGraph&) = delete;

    // Enable moving
    MemorySafeAudioGraph(MemorySafeAudioGraph&&) = default;
    MemorySafeAudioGraph& operator=(MemorySafeAudioGraph&&) = default;

    //==============================================================================
    // Memory-safe node management

    /**
     * Add a node to the graph with memory-safe ownership
     *
     * @param node Unique pointer to node (ownership transferred)
     * @return true if node added successfully
     */
    bool addNode(NodePtr node);

    /**
     * Remove a node safely from the graph
     * Ensures node is not processing before removal
     *
     * @param nodeId ID of node to remove
     * @return true if node removed successfully
     */
    bool removeNode(const std::string& nodeId);

    /**
     * Remove a node asynchronously during processing
     * Uses futures to ensure safe cleanup
     *
     * @param nodeId ID of node to remove
     * @return Future that completes when removal is done
     */
    std::future<bool> removeNodeAsync(const std::string& nodeId);

    /**
     * Get a weak reference to a node (safe for external access)
     */
    std::weak_ptr<MemorySafeAudioNode> getNode(const std::string& nodeId);

    /**
     * Check if node exists in graph
     */
    bool hasNode(const std::string& nodeId) const;

    /**
     * Get all node IDs (thread-safe snapshot)
     */
    std::vector<std::string> getNodeIds() const;

    /**
     * Get node count
     */
    size_t getNodeCount() const;

    //==============================================================================
    // Memory-safe processing

    /**
     * Process the entire audio graph safely
     * Handles node removal and state changes atomically
     *
     * @param inputAudio Input audio buffers
     * @param numInputChannels Number of input channels
     * @param numSamples Number of samples to process
     * @param outputAudio Output audio buffers
     * @param numOutputChannels Number of output channels
     * @return true if processing successful
     */
    bool processAudio(const float* const* inputAudio,
                     int numInputChannels,
                     int numSamples,
                     float* const* outputAudio,
                     int numOutputChannels);

    /**
     * Check if graph is currently processing
     */
    bool isProcessing() const noexcept { return isGraphProcessing_.load(); }

    /**
     * Request graph shutdown
     */
    void requestShutdown() { shutdownRequested_.store(true); }

    /**
     * Check if shutdown is requested
     */
    bool isShutdownRequested() const noexcept { return shutdownRequested_.load(); }

    //==============================================================================
    // Memory-safe connection management

    /**
     * Connect two nodes safely
     * Validates node existence and connection validity
     *
     * @param sourceNodeId Source node ID
     * @param destinationNodeId Destination node ID
     * @return true if connection successful
     */
    bool connectNodes(const std::string& sourceNodeId,
                     const std::string& destinationNodeId);

    /**
     * Disconnect two nodes safely
     *
     * @param sourceNodeId Source node ID
     * @param destinationNodeId Destination node ID
     * @return true if disconnection successful
     */
    bool disconnectNodes(const std::string& sourceNodeId,
                        const std::string& destinationNodeId);

    /**
     * Get all connections for a node
     */
    std::vector<std::string> getNodeConnections(const std::string& nodeId) const;

    //==============================================================================
    // Memory-safe configuration

    /**
     * Set buffer size for all nodes safely
     * Waits for processing to complete before changing
     */
    bool setGraphBufferSize(int newBufferSize);

    /**
     * Set sample rate for all nodes safely
     */
    bool setGraphSampleRate(double newSampleRate);

    /**
     * Optimize processing order
     */
    void optimizeProcessingOrder();

    //==============================================================================
    // Memory safety and monitoring

    /**
     * Validate graph integrity
     * Checks for memory safety violations
     */
    bool validateGraphIntegrity() const;

    /**
     * Get graph statistics
     */
    struct GraphStats {
        size_t totalNodes;
        size_t totalConnections;
        uint64_t totalProcessCalls;
        uint64_t totalErrors;
        bool isCurrentlyProcessing;
        uint32_t activeProcessingCount;
    };

    GraphStats getStats() const;

    /**
     * Clear all nodes safely
     * Ensures no processing is active before cleanup
     */
    void clear();

    #ifdef DEBUG
    /**
     * Set creator context for debugging
     */
    void setCreatorContext(const std::string& context);

    /**
     * Validate all node memory integrity
     */
    bool validateAllNodesMemoryIntegrity() const;
    #endif

private:
    //==============================================================================
    // Memory-safe internal operations

    /**
     * Update processing order based on connections
     */
    void updateProcessingOrder();

    /**
     * Get processing order snapshot
     */
    std::vector<std::string> getProcessingOrderSnapshot() const;

    /**
     * Validate node before processing
     */
    bool validateNodeForProcessing(const std::string& nodeId);

    /**
     * Cleanup disconnected nodes safely
     */
    void cleanupDisconnectedNodes();
};

//==============================================================================
/**
 * Factory for creating memory-safe audio nodes
 * Provides consistent creation patterns and ensures proper initialization
 */
class AudioGraphNodeFactory {
public:
    /**
     * Create input node
     */
    static std::unique_ptr<MemorySafeAudioNode> createInputNode(
        const std::string& nodeId,
        int numChannels = 2,
        int bufferSize = 1024,
        double sampleRate = 44100.0);

    /**
     * Create output node
     */
    static std::unique_ptr<MemorySafeAudioNode> createOutputNode(
        const std::string& nodeId,
        int numChannels = 2,
        int bufferSize = 1024,
        double sampleRate = 44100.0);

    /**
     * Create processor node with custom callback
     */
    static std::unique_ptr<MemorySafeAudioNode> createProcessorNode(
        const std::string& nodeId,
        MemorySafeAudioNode::ProcessCallback callback,
        int numChannels = 2,
        int bufferSize = 1024,
        double sampleRate = 44100.0);

    /**
     * Create mixer node
     */
    static std::unique_ptr<MemorySafeAudioNode> createMixerNode(
        const std::string& nodeId,
        int numChannels = 2,
        int bufferSize = 1024,
        double sampleRate = 44100.0);

    /**
     * Create effect node
     */
    static std::unique_ptr<MemorySafeAudioNode> createEffectNode(
        const std::string& nodeId,
        int numChannels = 2,
        int bufferSize = 1024,
        double sampleRate = 44100.0);
};

//==============================================================================
/**
 * RAII Audio Graph Manager
 * Provides scoped management of audio graph lifecycle
 */
class ScopedAudioGraphManager {
private:
    std::unique_ptr<MemorySafeAudioGraph> graph_;
    bool initialized_;

public:
    /**
     * Create scoped graph manager
     */
    explicit ScopedAudioGraphManager();

    /**
     * Destructor ensures clean shutdown
     */
    ~ScopedAudioGraphManager();

    // Disable copying
    ScopedAudioGraphManager(const ScopedAudioGraphManager&) = delete;
    ScopedAudioGraphManager& operator=(const ScopedAudioGraphManager&) = delete;

    // Enable moving
    ScopedAudioGraphManager(ScopedAudioGraphManager&&) = default;
    ScopedAudioGraphManager& operator=(ScopedAudioGraphManager&&) = default;

    /**
     * Get managed graph
     */
    MemorySafeAudioGraph& getGraph() { return *graph_; }

    /**
     * Get managed graph (const)
     */
    const MemorySafeAudioGraph& getGraph() const { return *graph_; }

    /**
     * Check if manager is initialized
     */
    bool isInitialized() const { return initialized_; }

    /**
     * Reset graph (shutdown and create new)
     */
    void reset();
};

} // namespace SchillingerEcosystem::Audio