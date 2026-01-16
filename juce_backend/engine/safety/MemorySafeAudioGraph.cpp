/*
  ==============================================================================
    MemorySafeAudioGraph.cpp

    Implementation of memory-safe audio graph with RAII patterns.
    Eliminates use-after-free and double-free vulnerabilities.
  ==============================================================================
*/

#include "audio/MemorySafeAudioGraph.h"
#include <algorithm>
#include <stdexcept>
#include <future>
#include <sstream>
#include <thread>

namespace SchillingerEcosystem::Audio {

//==============================================================================
// MemorySafeAudioNode Implementation

MemorySafeAudioNode::MemorySafeAudioNode(std::string nodeId,
                                       NodeType type,
                                       int numChannels,
                                       int bufferSize,
                                       double sampleRate)
    : nodeId_(std::move(nodeId))
    , nodeType_(type)
{
    // Initialize audio buffers with proper RAII
    try {
        inputBuffer_ = std::make_unique<juce::AudioBuffer<float>>(numChannels, bufferSize);
        outputBuffer_ = std::make_unique<juce::AudioBuffer<float>>(numChannels, bufferSize);
        scratchBuffer_ = std::make_unique<juce::AudioBuffer<float>>(numChannels, bufferSize);

        // Clear buffers to ensure clean state
        inputBuffer_->clear();
        outputBuffer_->clear();
        scratchBuffer_->clear();

        // Set state to ready
        currentState_.store(NodeState::Ready);

        #ifdef DEBUG
        creatorContext_ = "MemorySafeAudioNode constructor";
        lastAccessTime_.store(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now().time_since_epoch()).count());
        #endif

    } catch (const std::exception& e) {
        currentState_.store(NodeState::Error);
        juce::Logger::writeToLog("ERROR: Failed to create MemorySafeAudioNode " + nodeId_ + ": " + e.what());
        throw;
    }
}

MemorySafeAudioNode::~MemorySafeAudioNode() {
    // Ensure safe shutdown
    shutdown();

    #ifdef DEBUG
    lastAccessTime_.store(std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now().time_since_epoch()).count());
    #endif
}

bool MemorySafeAudioNode::initialize() {
    std::lock_guard<std::mutex> lock(stateMutex_);

    if (currentState_.load() == NodeState::Shutdown) {
        return false; // Cannot reinitialize after shutdown
    }

    // Wait for any ongoing processing to complete
    while (isProcessing_.load()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }

    // Reallocate buffers if needed
    if (!inputBuffer_ || !outputBuffer_ || !scratchBuffer_) {
        try {
            int numChannels = getChannelCount();
            int bufferSize = getBufferSize();

            if (numChannels <= 0 || bufferSize <= 0) {
                numChannels = 2;
                bufferSize = 1024;
            }

            inputBuffer_ = std::make_unique<juce::AudioBuffer<float>>(numChannels, bufferSize);
            outputBuffer_ = std::make_unique<juce::AudioBuffer<float>>(numChannels, bufferSize);
            scratchBuffer_ = std::make_unique<juce::AudioBuffer<float>>(numChannels, bufferSize);

            inputBuffer_->clear();
            outputBuffer_->clear();
            scratchBuffer_->clear();

        } catch (const std::exception& e) {
            currentState_.store(NodeState::Error);
            juce::Logger::writeToLog("ERROR: Failed to initialize buffers for node " + nodeId_ + ": " + e.what());
            return false;
        }
    }

    currentState_.store(NodeState::Ready);
    return true;
}

void MemorySafeAudioNode::shutdown() {
    std::lock_guard<std::mutex> lock(stateMutex_);

    // Signal shutdown
    currentState_.store(NodeState::Shutdown);

    // Wait for any processing to complete
    while (isProcessing_.load()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }

    // Cleanup connections safely
    cleanupConnections();

    // Reset state
    processCallback_ = nullptr;

    // Clear buffers (RAII handles deallocation)
    if (inputBuffer_) inputBuffer_->clear();
    if (outputBuffer_) outputBuffer_->clear();
    if (scratchBuffer_) scratchBuffer_->clear();

    #ifdef DEBUG
    memoryCorruptionDetected_.store(false);
    #endif
}

bool MemorySafeAudioNode::processAudio(const float* const* inputAudio,
                                     int numInputChannels,
                                     int numSamples,
                                     float* const* outputAudio,
                                     int numOutputChannels) {
    updateLastAccessTime();

    // Validate state
    if (!validateStateForOperation()) {
        return false;
    }

    // Try to acquire processing lock
    if (!tryAcquireProcessingLock()) {
        return false;
    }

    // Use RAII for processing lock management
    struct ProcessingLockGuard {
        std::atomic<bool>& isProcessing;
        std::atomic<uint32_t>& processingCount;
        ProcessingLockGuard(std::atomic<bool>& proc, std::atomic<uint32_t>& count)
            : isProcessing(proc), processingCount(count) {
            isProcessing.store(true);
            processingCount.fetch_add(1);
        }
        ~ProcessingLockGuard() {
            isProcessing.store(false);
            processingCount.fetch_sub(1);
        }
    } lockGuard(isProcessing_, processingCount_);

    try {
        bool success = processInternal(inputAudio, numInputChannels, numSamples,
                                    outputAudio, numOutputChannels);

        totalSamplesProcessed_.fetch_add(numSamples);
        return success;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Exception during processing in node " + nodeId_ + ": " + e.what());
        currentState_.store(NodeState::Error);
        return false;

    } catch (...) {
        juce::Logger::writeToLog("ERROR: Unknown exception during processing in node " + nodeId_);
        currentState_.store(NodeState::Error);
        return false;
    }
}

bool MemorySafeAudioNode::processInternal(const float* const* inputAudio,
                                        int numInputChannels,
                                        int numSamples,
                                        float* const* outputAudio,
                                        int numOutputChannels) {
    // Validate buffers exist
    if (!inputBuffer_ || !outputBuffer_ || !scratchBuffer_) {
        return false;
    }

    // Validate sample count
    if (numSamples <= 0 || numSamples > inputBuffer_->getNumSamples()) {
        return false;
    }

    // Copy input to internal buffer if provided
    if (inputAudio && numInputChannels > 0) {
        int channelsToCopy = std::min(numInputChannels, inputBuffer_->getNumChannels());
        for (int ch = 0; ch < channelsToCopy; ++ch) {
            if (inputAudio[ch]) {
                inputBuffer_->copyFrom(ch, 0, inputAudio[ch], 0, numSamples);
            }
        }
    }

    // Apply processing callback if set
    if (processCallback_) {
        try {
            // Prepare input channel pointers
            std::vector<const float*> inputChannels(inputBuffer_->getNumChannels());
            for (int ch = 0; ch < inputBuffer_->getNumChannels(); ++ch) {
                inputChannels[ch] = inputBuffer_->getReadPointer(ch);
            }

            // Prepare output channel pointers
            std::vector<float*> outputChannels(outputBuffer_->getNumChannels());
            for (int ch = 0; ch < outputBuffer_->getNumChannels(); ++ch) {
                outputChannels[ch] = outputBuffer_->getWritePointer(ch);
            }

            // Call user callback
            processCallback_(inputChannels.data(), inputChannels.size(), numSamples,
                           outputChannels.data(), outputChannels.size());

        } catch (const std::exception& e) {
            juce::Logger::writeToLog("ERROR: Processing callback failed in node " + nodeId_ + ": " + e.what());
            return false;
        }
    } else {
        // Default behavior: copy input to output
        *outputBuffer_ = *inputBuffer_;
    }

    // Copy to output if provided
    if (outputAudio && numOutputChannels > 0) {
        int channelsToCopy = std::min(numOutputChannels, outputBuffer_->getNumChannels());
        for (int ch = 0; ch < channelsToCopy; ++ch) {
            if (outputAudio[ch]) {
                std::copy(outputBuffer_->getReadPointer(ch),
                          outputBuffer_->getReadPointer(ch) + numSamples,
                          outputAudio[ch]);
            }
        }
    }

    return true;
}

void MemorySafeAudioNode::setProcessCallback(ProcessCallback callback) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    processCallback_ = std::move(callback);
}

bool MemorySafeAudioNode::connectInput(WeakNodePtr inputNode) {
    if (auto sharedInput = inputNode.lock()) {
        std::unique_lock<std::shared_mutex> lock(connectionMutex_);

        // Check if already connected
        for (const auto& existingWeak : connectedInputs_) {
            if (auto existingShared = existingWeak.lock()) {
                if (existingShared->getId() == sharedInput->getId()) {
                    return false; // Already connected
                }
            }
        }

        connectedInputs_.push_back(inputNode);
        return true;
    }
    return false;
}

bool MemorySafeAudioNode::connectOutput(WeakNodePtr outputNode) {
    if (auto sharedOutput = outputNode.lock()) {
        std::unique_lock<std::shared_mutex> lock(connectionMutex_);

        // Check if already connected
        for (const auto& existingWeak : connectedOutputs_) {
            if (auto existingShared = existingWeak.lock()) {
                if (existingShared->getId() == sharedOutput->getId()) {
                    return false; // Already connected
                }
            }
        }

        connectedOutputs_.push_back(outputNode);
        return true;
    }
    return false;
}

void MemorySafeAudioNode::disconnectInput(const std::string& nodeId) {
    std::unique_lock<std::shared_mutex> lock(connectionMutex_);

    connectedInputs_.erase(
        std::remove_if(connectedInputs_.begin(), connectedInputs_.end(),
            [&nodeId](const WeakNodePtr& weakNode) {
                if (auto shared = weakNode.lock()) {
                    return shared->getId() == nodeId;
                }
                return true; // Remove expired weak pointers
            }),
        connectedInputs_.end());
}

void MemorySafeAudioNode::disconnectOutput(const std::string& nodeId) {
    std::unique_lock<std::shared_mutex> lock(connectionMutex_);

    connectedOutputs_.erase(
        std::remove_if(connectedOutputs_.begin(), connectedOutputs_.end(),
            [&nodeId](const WeakNodePtr& weakNode) {
                if (auto shared = weakNode.lock()) {
                    return shared->getId() == nodeId;
                }
                return true; // Remove expired weak pointers
            }),
        connectedOutputs_.end());
}

std::vector<std::string> MemorySafeAudioNode::getConnectedInputIds() const {
    std::shared_lock<std::shared_mutex> lock(connectionMutex_);
    std::vector<std::string> ids;

    for (const auto& weakNode : connectedInputs_) {
        if (auto shared = weakNode.lock()) {
            ids.push_back(shared->getId());
        }
    }

    return ids;
}

std::vector<std::string> MemorySafeAudioNode::getConnectedOutputIds() const {
    std::shared_lock<std::shared_mutex> lock(connectionMutex_);
    std::vector<std::string> ids;

    for (const auto& weakNode : connectedOutputs_) {
        if (auto shared = weakNode.lock()) {
            ids.push_back(shared->getId());
        }
    }

    return ids;
}

bool MemorySafeAudioNode::resizeBuffers(int newBufferSize) {
    if (newBufferSize <= 0) {
        return false;
    }

    std::lock_guard<std::mutex> lock(stateMutex_);

    // Wait for processing to complete
    while (isProcessing_.load()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }

    try {
        int numChannels = getChannelCount();
        if (numChannels <= 0) numChannels = 2;

        // Create new buffers
        auto newInputBuffer = std::make_unique<juce::AudioBuffer<float>>(numChannels, newBufferSize);
        auto newOutputBuffer = std::make_unique<juce::AudioBuffer<float>>(numChannels, newBufferSize);
        auto newScratchBuffer = std::make_unique<juce::AudioBuffer<float>>(numChannels, newBufferSize);

        // Copy existing data if possible
        if (inputBuffer_ && outputBuffer_ && scratchBuffer_) {
            int samplesToCopy = std::min(newBufferSize, inputBuffer_->getNumSamples());
            int channelsToCopy = std::min(numChannels, inputBuffer_->getNumChannels());

            for (int ch = 0; ch < channelsToCopy; ++ch) {
                newInputBuffer->copyFrom(ch, 0, *inputBuffer_, ch, 0, samplesToCopy);
                newOutputBuffer->copyFrom(ch, 0, *outputBuffer_, ch, 0, samplesToCopy);
                newScratchBuffer->copyFrom(ch, 0, *scratchBuffer_, ch, 0, samplesToCopy);
            }
        }

        // Swap buffers atomically
        inputBuffer_ = std::move(newInputBuffer);
        outputBuffer_ = std::move(newOutputBuffer);
        scratchBuffer_ = std::move(newScratchBuffer);

        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to resize buffers for node " + nodeId_ + ": " + e.what());
        return false;
    }
}

bool MemorySafeAudioNode::setChannelCount(int newNumChannels) {
    if (newNumChannels <= 0) {
        return false;
    }

    std::lock_guard<std::mutex> lock(stateMutex_);

    // Wait for processing to complete
    while (isProcessing_.load()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }

    try {
        int bufferSize = getBufferSize();
        if (bufferSize <= 0) bufferSize = 1024;

        // Create new buffers
        auto newInputBuffer = std::make_unique<juce::AudioBuffer<float>>(newNumChannels, bufferSize);
        auto newOutputBuffer = std::make_unique<juce::AudioBuffer<float>>(newNumChannels, bufferSize);
        auto newScratchBuffer = std::make_unique<juce::AudioBuffer<float>>(newNumChannels, bufferSize);

        // Copy existing data if possible
        if (inputBuffer_ && outputBuffer_ && scratchBuffer_) {
            int channelsToCopy = std::min(newNumChannels, inputBuffer_->getNumChannels());
            int samplesToCopy = std::min(bufferSize, inputBuffer_->getNumSamples());

            for (int ch = 0; ch < channelsToCopy; ++ch) {
                newInputBuffer->copyFrom(ch, 0, *inputBuffer_, ch, 0, samplesToCopy);
                newOutputBuffer->copyFrom(ch, 0, *outputBuffer_, ch, 0, samplesToCopy);
                newScratchBuffer->copyFrom(ch, 0, *scratchBuffer_, ch, 0, samplesToCopy);
            }
        }

        // Swap buffers atomically
        inputBuffer_ = std::move(newInputBuffer);
        outputBuffer_ = std::move(newOutputBuffer);
        scratchBuffer_ = std::move(newScratchBuffer);

        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to set channel count for node " + nodeId_ + ": " + e.what());
        return false;
    }
}

int MemorySafeAudioNode::getBufferSize() const {
    return (inputBuffer_ && inputBuffer_->getNumSamples() > 0) ?
           inputBuffer_->getNumSamples() : 1024;
}

int MemorySafeAudioNode::getChannelCount() const {
    return (inputBuffer_ && inputBuffer_->getNumChannels() > 0) ?
           inputBuffer_->getNumChannels() : 2;
}

double MemorySafeAudioNode::getSampleRate() const {
    return 44100.0; // Default - can be enhanced with actual sample rate tracking
}

MemorySafeAudioNode::ProcessingStats MemorySafeAudioNode::getStats() const {
    return {
        totalSamplesProcessed_.load(),
        processingCount_.load(),
        isProcessing_.load(),
        currentState_.load()
    };
}

#ifdef DEBUG
bool MemorySafeAudioNode::validateMemoryIntegrity() const {
    // Check buffer pointers
    if (!inputBuffer_ || !outputBuffer_ || !scratchBuffer_) {
        memoryCorruptionDetected_.store(true);
        return false;
    }

    // Check buffer consistency
    if (inputBuffer_->getNumSamples() != outputBuffer_->getNumSamples() ||
        inputBuffer_->getNumSamples() != scratchBuffer_->getNumSamples()) {
        memoryCorruptionDetected_.store(true);
        return false;
    }

    if (inputBuffer_->getNumChannels() != outputBuffer_->getNumChannels() ||
        inputBuffer_->getNumChannels() != scratchBuffer_->getNumChannels()) {
        memoryCorruptionDetected_.store(true);
        return false;
    }

    return true;
}

void MemorySafeAudioNode::setCreatorContext(const std::string& context) {
    creatorContext_ = context;
}
#endif

bool MemorySafeAudioNode::tryAcquireProcessingLock() {
    if (currentState_.load() != NodeState::Ready) {
        return false;
    }

    if (isProcessing_.load()) {
        return false; // Already processing
    }

    return true; // Ready to process
}

void MemorySafeAudioNode::cleanupConnections() {
    std::unique_lock<std::shared_mutex> lock(connectionMutex_);
    connectedInputs_.clear();
    connectedOutputs_.clear();
}

bool MemorySafeAudioNode::validateStateForOperation() const {
    NodeState state = currentState_.load();
    return state == NodeState::Ready;
}

void MemorySafeAudioNode::updateLastAccessTime() {
    #ifdef DEBUG
    lastAccessTime_.store(std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now().time_since_epoch()).count());
    #endif
}

//==============================================================================
// MemorySafeAudioGraph Implementation

MemorySafeAudioGraph::MemorySafeAudioGraph() {
    #ifdef DEBUG
    creatorContext_ = "MemorySafeAudioGraph constructor";
    #endif
}

MemorySafeAudioGraph::~MemorySafeAudioGraph() {
    requestShutdown();
    clear();
}

bool MemorySafeAudioGraph::addNode(NodePtr node) {
    if (!node) {
        return false;
    }

    std::unique_lock<std::shared_mutex> lock(nodesMutex_);

    std::string nodeId = node->getId();

    // Check if node already exists
    if (nodes_.find(nodeId) != nodes_.end()) {
        juce::Logger::writeToLog("WARNING: Node " + nodeId + " already exists in graph");
        return false;
    }

    try {
        // Add node to map
        nodes_[nodeId] = std::move(node);

        // Mark processing order as dirty
        processingOrderDirty_ = true;

        #ifdef DEBUG
        lastNodeModification_.store(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now().time_since_epoch()).count());
        #endif

        juce::Logger::writeToLog("Added node " + nodeId + " to audio graph");
        return true;

    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to add node " + nodeId + " to graph: " + e.what());
        return false;
    }
}

bool MemorySafeAudioGraph::removeNode(const std::string& nodeId) {
    std::unique_lock<std::shared_mutex> nodesLock(nodesMutex_);

    auto nodeIt = nodes_.find(nodeId);
    if (nodeIt == nodes_.end()) {
        return false; // Node not found
    }

    auto& node = nodeIt->second;
    if (!node) {
        nodes_.erase(nodeIt);
        return false;
    }

    // Wait for any processing to complete
    while (node->isProcessing()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }

    // Remove node from connections
    {
        std::unique_lock<std::shared_mutex> connectionsLock(connectionsMutex_);
        connections_.erase(nodeId);

        // Remove from other nodes' connections
        for (auto& [id, weakNode] : connections_) {
            if (auto sharedNode = weakNode.lock()) {
                sharedNode->disconnectOutput(nodeId);
                sharedNode->disconnectInput(nodeId);
            }
        }
    }

    // Shutdown the node safely
    node->shutdown();

    // Remove node from map (RAII handles cleanup)
    nodes_.erase(nodeIt);

    // Mark processing order as dirty
    processingOrderDirty_ = true;

    #ifdef DEBUG
    lastNodeModification_.store(std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now().time_since_epoch()).count());
    #endif

    juce::Logger::writeToLog("Removed node " + nodeId + " from audio graph");
    return true;
}

std::future<bool> MemorySafeAudioGraph::removeNodeAsync(const std::string& nodeId) {
    return std::async(std::launch::async, [this, nodeId]() -> bool {
        return removeNode(nodeId);
    });
}

std::weak_ptr<MemorySafeAudioNode> MemorySafeAudioGraph::getNode(const std::string& nodeId) {
    std::shared_lock<std::shared_mutex> lock(nodesMutex_);

    auto it = nodes_.find(nodeId);
    if (it != nodes_.end() && it->second) {
        return std::weak_ptr<MemorySafeAudioNode>(it->second);
    }

    return std::weak_ptr<MemorySafeAudioNode>();
}

bool MemorySafeAudioGraph::hasNode(const std::string& nodeId) const {
    std::shared_lock<std::shared_mutex> lock(nodesMutex_);
    return nodes_.find(nodeId) != nodes_.end();
}

std::vector<std::string> MemorySafeAudioGraph::getNodeIds() const {
    std::shared_lock<std::shared_mutex> lock(nodesMutex_);
    std::vector<std::string> ids;

    ids.reserve(nodes_.size());
    for (const auto& [nodeId, node] : nodes_) {
        if (node) {
            ids.push_back(nodeId);
        }
    }

    return ids;
}

size_t MemorySafeAudioGraph::getNodeCount() const {
    std::shared_lock<std::shared_mutex> lock(nodesMutex_);
    return nodes_.size();
}

bool MemorySafeAudioGraph::processAudio(const float* const* inputAudio,
                                      int numInputChannels,
                                      int numSamples,
                                      float* const* outputAudio,
                                      int numOutputChannels) {
    if (shutdownRequested_.load()) {
        return false;
    }

    // Set processing state
    isGraphProcessing_.store(true);
    activeProcessingCount_.fetch_add(1);

    // RAII for processing state management
    struct GraphProcessingGuard {
        std::atomic<bool>& isProcessing;
        std::atomic<uint32_t>& activeCount;
        GraphProcessingGuard(std::atomic<bool>& proc, std::atomic<uint32_t>& count)
            : isProcessing(proc), activeCount(count) {}
        ~GraphProcessingGuard() {
            isProcessing.store(false);
            activeCount.fetch_sub(1);
        }
    } processingGuard(isGraphProcessing_, activeProcessingCount_);

    totalProcessCalls_.fetch_add(1);

    try {
        // Get processing order
        auto processingOrder = getProcessingOrderSnapshot();

        // Process nodes in order
        for (const std::string& nodeId : processingOrder) {
            if (shutdownRequested_.load()) {
                break;
            }

            if (!validateNodeForProcessing(nodeId)) {
                continue;
            }

            auto weakNode = getNode(nodeId);
            auto node = weakNode.lock();
            if (!node) {
                continue; // Node was removed during processing
            }

            // Process node
            bool success = node->processAudio(inputAudio, numInputChannels, numSamples,
                                            outputAudio, numOutputChannels);

            if (!success) {
                totalErrors_.fetch_add(1);
                juce::Logger::writeToLog("WARNING: Node " + nodeId + " failed processing");
            }
        }

        return true;

    } catch (const std::exception& e) {
        totalErrors_.fetch_add(1);
        juce::Logger::writeToLog("ERROR: Exception during graph processing: " + e.what());
        return false;

    } catch (...) {
        totalErrors_.fetch_add(1);
        juce::Logger::writeToLog("ERROR: Unknown exception during graph processing");
        return false;
    }
}

bool MemorySafeAudioGraph::connectNodes(const std::string& sourceNodeId,
                                      const std::string& destinationNodeId) {
    if (sourceNodeId == destinationNodeId) {
        return false; // Cannot connect node to itself
    }

    auto sourceWeak = getNode(sourceNodeId);
    auto destWeak = getNode(destinationNodeId);

    auto sourceShared = sourceWeak.lock();
    auto destShared = destWeak.lock();

    if (!sourceShared || !destShared) {
        return false; // One or both nodes don't exist
    }

    // Create connection
    if (!sourceShared->connectOutput(destWeak) ||
        !destShared->connectInput(sourceWeak)) {
        return false;
    }

    // Store connection
    {
        std::unique_lock<std::shared_mutex> lock(connectionsMutex_);
        connections_[destinationNodeId] = sourceWeak;
    }

    // Mark processing order as dirty
    processingOrderDirty_ = true;

    juce::Logger::writeToLog("Connected " + sourceNodeId + " -> " + destinationNodeId);
    return true;
}

bool MemorySafeAudioGraph::disconnectNodes(const std::string& sourceNodeId,
                                         const std::string& destinationNodeId) {
    auto sourceWeak = getNode(sourceNodeId);
    auto destWeak = getNode(destinationNodeId);

    auto sourceShared = sourceWeak.lock();
    auto destShared = destWeak.lock();

    if (!sourceShared || !destShared) {
        return false;
    }

    // Remove connection
    sourceShared->disconnectOutput(destinationNodeId);
    destShared->disconnectInput(sourceNodeId);

    // Remove from connections map
    {
        std::unique_lock<std::shared_mutex> lock(connectionsMutex_);
        auto it = connections_.find(destinationNodeId);
        if (it != connections_.end()) {
            auto connectedSource = it->second.lock();
            if (connectedSource && connectedSource->getId() == sourceNodeId) {
                connections_.erase(it);
            }
        }
    }

    // Mark processing order as dirty
    processingOrderDirty_ = true;

    juce::Logger::writeToLog("Disconnected " + sourceNodeId + " -> " + destinationNodeId);
    return true;
}

std::vector<std::string> MemorySafeAudioGraph::getNodeConnections(const std::string& nodeId) const {
    auto nodeWeak = getNode(nodeId);
    auto node = nodeWeak.lock();

    if (!node) {
        return {};
    }

    return node->getConnectedOutputIds();
}

bool MemorySafeAudioGraph::validateGraphIntegrity() const {
    std::shared_lock<std::shared_mutex> nodesLock(nodesMutex_);

    // Validate all nodes
    for (const auto& [nodeId, node] : nodes_) {
        if (!node) {
            juce::Logger::writeToLog("ERROR: Null node found in graph: " + nodeId);
            return false;
        }

        if (node->getState() == MemorySafeAudioNode::NodeState::Error) {
            juce::Logger::writeToLog("WARNING: Node in error state: " + nodeId);
        }

        #ifdef DEBUG
        if (!node->validateMemoryIntegrity()) {
            juce::Logger::writeToLog("ERROR: Memory corruption detected in node: " + nodeId);
            return false;
        }
        #endif
    }

    return true;
}

MemorySafeAudioGraph::GraphStats MemorySafeAudioGraph::getStats() const {
    std::shared_lock<std::shared_mutex> nodesLock(nodesMutex_);
    std::shared_lock<std::shared_mutex> connectionsLock(connectionsMutex_);

    return {
        nodes_.size(),
        connections_.size(),
        totalProcessCalls_.load(),
        totalErrors_.load(),
        isGraphProcessing_.load(),
        activeProcessingCount_.load()
    };
}

void MemorySafeAudioGraph::clear() {
    // Request shutdown
    requestShutdown();

    // Wait for processing to complete
    while (isGraphProcessing_.load()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }

    std::unique_lock<std::shared_mutex> nodesLock(nodesMutex_);
    std::unique_lock<std::shared_mutex> connectionsLock(connectionsMutex_);

    // Shutdown all nodes safely
    for (auto& [nodeId, node] : nodes_) {
        if (node) {
            node->shutdown();
        }
    }

    // Clear all containers (RAII handles cleanup)
    nodes_.clear();
    connections_.clear();
    processingOrder_.clear();

    juce::Logger::writeToLog("Audio graph cleared");
}

void MemorySafeAudioGraph::updateProcessingOrder() {
    std::unique_lock<std::mutex> lock(processingOrderMutex_);

    processingOrder_.clear();

    // Get all node IDs
    auto nodeIds = getNodeIds();

    // Simple topological sort
    // For now, just use the order they were added
    // A real implementation would do proper dependency resolution
    processingOrder_ = nodeIds;

    processingOrderDirty_ = false;
}

std::vector<std::string> MemorySafeAudioGraph::getProcessingOrderSnapshot() const {
    std::shared_lock<std::mutex> lock(processingOrderMutex_);

    if (processingOrderDirty_) {
        // Need to update processing order
        lock.unlock();
        const_cast<MemorySafeAudioGraph*>(this)->updateProcessingOrder();
        lock.lock();
    }

    return processingOrder_;
}

bool MemorySafeAudioGraph::validateNodeForProcessing(const std::string& nodeId) {
    auto weakNode = getNode(nodeId);
    auto node = weakNode.lock();

    return node && node->isReady();
}

#ifdef DEBUG
void MemorySafeAudioGraph::setCreatorContext(const std::string& context) {
    creatorContext_ = context;
}

bool MemorySafeAudioGraph::validateAllNodesMemoryIntegrity() const {
    std::shared_lock<std::shared_mutex> lock(nodesMutex_);

    for (const auto& [nodeId, node] : nodes_) {
        if (node && !node->validateMemoryIntegrity()) {
            return false;
        }
    }

    return true;
}
#endif

//==============================================================================
// AudioGraphNodeFactory Implementation

std::unique_ptr<MemorySafeAudioNode> AudioGraphNodeFactory::createInputNode(
    const std::string& nodeId,
    int numChannels,
    int bufferSize,
    double sampleRate) {
    try {
        auto node = std::make_unique<MemorySafeAudioNode>(nodeId,
                                                         MemorySafeAudioNode::NodeType::Input,
                                                         numChannels,
                                                         bufferSize,
                                                         sampleRate);
        node->initialize();
        return node;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to create input node " + nodeId + ": " + e.what());
        return nullptr;
    }
}

std::unique_ptr<MemorySafeAudioNode> AudioGraphNodeFactory::createOutputNode(
    const std::string& nodeId,
    int numChannels,
    int bufferSize,
    double sampleRate) {
    try {
        auto node = std::make_unique<MemorySafeAudioNode>(nodeId,
                                                         MemorySafeAudioNode::NodeType::Output,
                                                         numChannels,
                                                         bufferSize,
                                                         sampleRate);
        node->initialize();
        return node;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to create output node " + nodeId + ": " + e.what());
        return nullptr;
    }
}

std::unique_ptr<MemorySafeAudioNode> AudioGraphNodeFactory::createProcessorNode(
    const std::string& nodeId,
    MemorySafeAudioNode::ProcessCallback callback,
    int numChannels,
    int bufferSize,
    double sampleRate) {
    try {
        auto node = std::make_unique<MemorySafeAudioNode>(nodeId,
                                                         MemorySafeAudioNode::NodeType::Processor,
                                                         numChannels,
                                                         bufferSize,
                                                         sampleRate);
        node->initialize();
        node->setProcessCallback(std::move(callback));
        return node;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to create processor node " + nodeId + ": " + e.what());
        return nullptr;
    }
}

std::unique_ptr<MemorySafeAudioNode> AudioGraphNodeFactory::createMixerNode(
    const std::string& nodeId,
    int numChannels,
    int bufferSize,
    double sampleRate) {
    try {
        auto node = std::make_unique<MemorySafeAudioNode>(nodeId,
                                                         MemorySafeAudioNode::NodeType::Mixer,
                                                         numChannels,
                                                         bufferSize,
                                                         sampleRate);
        node->initialize();
        return node;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to create mixer node " + nodeId + ": " + e.what());
        return nullptr;
    }
}

std::unique_ptr<MemorySafeAudioNode> AudioGraphNodeFactory::createEffectNode(
    const std::string& nodeId,
    int numChannels,
    int bufferSize,
    double sampleRate) {
    try {
        auto node = std::make_unique<MemorySafeAudioNode>(nodeId,
                                                         MemorySafeAudioNode::NodeType::Effect,
                                                         numChannels,
                                                         bufferSize,
                                                         sampleRate);
        node->initialize();
        return node;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to create effect node " + nodeId + ": " + e.what());
        return nullptr;
    }
}

//==============================================================================
// ScopedAudioGraphManager Implementation

ScopedAudioGraphManager::ScopedAudioGraphManager()
    : initialized_(false) {
    try {
        graph_ = std::make_unique<MemorySafeAudioGraph>();
        initialized_ = true;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to create scoped audio graph: " + e.what());
        graph_.reset();
        initialized_ = false;
    }
}

ScopedAudioGraphManager::~ScopedAudioGraphManager() {
    if (initialized_ && graph_) {
        graph_->requestShutdown();
        graph_->clear();
        graph_.reset();
        initialized_ = false;
    }
}

void ScopedAudioGraphManager::reset() {
    if (initialized_ && graph_) {
        graph_->requestShutdown();
        graph_->clear();
        graph_.reset();
    }

    try {
        graph_ = std::make_unique<MemorySafeAudioGraph>();
        initialized_ = true;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("ERROR: Failed to reset scoped audio graph: " + e.what());
        graph_.reset();
        initialized_ = false;
    }
}

} // namespace SchillingerEcosystem::Audio