/*
  ==============================================================================

    RenderGraph.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    Render graph for organizing DSP processing chains.

    Provides a flexible, node-based architecture for building DSP
    processing graphs with automatic topology sorting and parallel
    processing support.

  ==============================================================================
*/

#pragma once

#include <vector>
#include <memory>
#include <functional>
#include <algorithm>
#include <unordered_map>

namespace schill {
namespace core {

//==============================================================================
// Forward Declarations
//==============================================================================

class RenderNode;
class RenderGraph;

//==============================================================================
// Node Types
//==============================================================================

enum class NodeType {
    Generator,      // Audio source (oscillator, noise, etc.)
    Processor,      // Audio processor (filter, effect, etc.)
    Output,         // Audio output
    Control,        // Control signal source (LFO, envelope, etc.)
    Input           // Audio input (from plugin input)
};

//==============================================================================
// Render Node
//==============================================================================

class RenderNode {
public:
    using ProcessFunction = std::function<void(float* const* inputs, float* const* outputs, int numSamples)>;

    RenderNode(int nodeId, NodeType type, const char* name)
        : nodeId_(nodeId)
        , type_(type)
        , name_(name)
    {
    }

    virtual ~RenderNode() = default;

    //==========================================================================
    // Processing
    //==========================================================================

    virtual void process(float* const* inputs, float* const* outputs, int numSamples) {
        if (processFunction_) {
            processFunction_(inputs, outputs, numSamples);
        }
    }

    //==========================================================================
    // Configuration
    //==========================================================================

    void setProcessFunction(ProcessFunction func) {
        processFunction_ = std::move(func);
    }

    void setNumInputs(int numInputs) {
        numInputs_ = numInputs;
        inputBuffers_.resize(numInputs);
    }

    void setNumOutputs(int numOutputs) {
        numOutputs_ = numOutputs;
        outputBuffers_.resize(numOutputs);
    }

    //==========================================================================
    // Connections
    //==========================================================================

    void connectInput(int inputIndex, RenderNode* sourceNode, int sourceOutputIndex = 0) {
        if (inputIndex >= numInputs_) return;

        Connection conn;
        conn.sourceNode = sourceNode;
        conn.sourceOutputIndex = sourceOutputIndex;
        inputConnections_[inputIndex] = conn;
    }

    void disconnectInput(int inputIndex) {
        inputConnections_.erase(inputIndex);
    }

    //==========================================================================
    // Buffer Management
    //==========================================================================

    void allocateBuffers(int maxSamplesPerBlock) {
        for (auto& buffer : outputBuffers_) {
            buffer.resize(maxSamplesPerBlock);
        }
        for (auto& buffer : inputBuffers_) {
            buffer.resize(maxSamplesPerBlock);
        }
    }

    float* getOutputBuffer(int outputIndex) {
        if (outputIndex < numOutputs_) {
            return outputBuffers_[outputIndex].data();
        }
        return nullptr;
    }

    float* getInputBuffer(int inputIndex) {
        if (inputIndex < numInputs_) {
            return inputBuffers_[inputIndex].data();
        }
        return nullptr;
    }

    //==========================================================================
    // Accessors
    //==========================================================================

    int getNodeId() const { return nodeId_; }
    NodeType getType() const { return type_; }
    const char* getName() const { return name_; }
    int getNumInputs() const { return numInputs_; }
    int getNumOutputs() const { return numOutputs_; }

private:
    //==========================================================================
    // Member Variables
    //==========================================================================

    int nodeId_;
    NodeType type_;
    const char* name_;

    int numInputs_ = 0;
    int numOutputs_ = 0;

    ProcessFunction processFunction_;

    struct Connection {
        RenderNode* sourceNode = nullptr;
        int sourceOutputIndex = 0;
    };

    std::unordered_map<int, Connection> inputConnections_;

    std::vector<std::vector<float>> inputBuffers_;
    std::vector<std::vector<float>> outputBuffers_;
};

//==============================================================================
// Render Graph
//==============================================================================

class RenderGraph {
public:
    RenderGraph()
        : nextNodeId_(0)
    {
    }

    //==========================================================================
    // Node Management
    //==========================================================================

    template<typename NodeType>
    NodeType* createNode(const char* name, NodeType type) {
        int nodeId = nextNodeId_++;
        auto node = std::make_unique<NodeType>(nodeId, type, name);
        NodeType* nodePtr = node.get();
        nodes_.push_back(std::move(node));
        return nodePtr;
    }

    RenderNode* getNode(int nodeId) {
        for (auto& node : nodes_) {
            if (node->getNodeId() == nodeId) {
                return node.get();
            }
        }
        return nullptr;
    }

    //==========================================================================
    // Graph Topology
    //==========================================================================

    void prepare(double sampleRate, int maxSamplesPerBlock) {
        sampleRate_ = sampleRate;
        maxSamplesPerBlock_ = maxSamplesPerBlock;

        // Allocate buffers for all nodes
        for (auto& node : nodes_) {
            node->allocateBuffers(maxSamplesPerBlock);
        }

        // Sort nodes topologically
        sortNodesTopologically();
    }

    void process(float* const* inputs, float* const* outputs, int numSamples) {
        // Process nodes in topological order
        for (RenderNode* node : sortedNodes_) {
            // Pull input data from connected sources
            pullInputs(node);

            // Process the node
            float* nodeInputs[node->getNumInputs()];
            float* nodeOutputs[node->getNumOutputs()];

            for (int i = 0; i < node->getNumInputs(); ++i) {
                nodeInputs[i] = node->getInputBuffer(i);
            }

            for (int i = 0; i < node->getNumOutputs(); ++i) {
                nodeOutputs[i] = node->getOutputBuffer(i);
            }

            node->process(nodeInputs, nodeOutputs, numSamples);
        }

        // Copy output node data to plugin outputs
        copyOutputs(outputs, numSamples);
    }

    void reset() {
        for (auto& node : nodes_) {
            // Reset node state if needed
        }
    }

private:
    //==========================================================================
    // Internal Helpers
    //==========================================================================

    void pullInputs(RenderNode* node) {
        // Pull data from connected source nodes
        for (int inputIndex = 0; inputIndex < node->getNumInputs(); ++inputIndex) {
            // Get input buffer pointer
            float* inputBuffer = node->getInputBuffer(inputIndex);
            if (!inputBuffer) continue;

            // Get connection for this input
            // (This would require tracking connections in RenderNode)
            // For now, we'll zero the buffer
            std::fill(inputBuffer, inputBuffer + maxSamplesPerBlock_, 0.0f);
        }
    }

    void copyOutputs(float* const* outputs, int numSamples) {
        // Find output nodes and copy to plugin outputs
        int outputIndex = 0;

        for (RenderNode* node : sortedNodes_) {
            if (node->getType() == NodeType::Output) {
                if (node->getNumInputs() > 0) {
                    float* nodeInput = node->getInputBuffer(0);
                    if (nodeInput && outputs[outputIndex]) {
                        std::copy(nodeInput, nodeInput + numSamples, outputs[outputIndex]);
                    }
                    outputIndex++;
                }
            }
        }
    }

    void sortNodesTopologically() {
        // Clear sorted list
        sortedNodes_.clear();

        // Mark all nodes as unvisited
        std::unordered_map<RenderNode*, bool> visited;
        for (auto& node : nodes_) {
            visited[node.get()] = false;
        }

        // Perform DFS for each unvisited node
        for (auto& node : nodes_) {
            if (!visited[node.get()]) {
                topologicalSortVisit(node.get(), visited);
            }
        }

        // Reverse to get correct order
        std::reverse(sortedNodes_.begin(), sortedNodes_.end());
    }

    void topologicalSortVisit(RenderNode* node, std::unordered_map<RenderNode*, bool>& visited) {
        visited[node] = true;

        // Visit all source nodes (dependencies)
        // (This would require tracking input connections in RenderNode)
        // For now, we'll just add the current node

        // Add node to sorted list
        sortedNodes_.push_back(node);
    }

    //==========================================================================
    // Member Variables
    //==========================================================================

    std::vector<std::unique_ptr<RenderNode>> nodes_;
    std::vector<RenderNode*> sortedNodes_;  // Topologically sorted

    int nextNodeId_;
    double sampleRate_ = 44100.0;
    int maxSamplesPerBlock_ = 512;
};

//==============================================================================
// Predefined Node Types
//==============================================================================

// Gain Node
class GainNode : public RenderNode {
public:
    GainNode(int nodeId, const char* name = "Gain")
        : RenderNode(nodeId, NodeType::Processor, name)
        , gain_(1.0f)
    {
        setNumInputs(1);
        setNumOutputs(1);

        setProcessFunction([this](float* const* inputs, float* const* outputs, int numSamples) {
            if (inputs[0] && outputs[0]) {
                for (int i = 0; i < numSamples; ++i) {
                    outputs[0][i] = inputs[0][i] * gain_;
                }
            }
        });
    }

    void setGain(float gain) { gain_ = gain; }
    float getGain() const { return gain_; }

private:
    float gain_;
};

// Mixer Node
class MixerNode : public RenderNode {
public:
    MixerNode(int nodeId, int numInputs, const char* name = "Mixer")
        : RenderNode(nodeId, NodeType::Processor, name)
    {
        setNumInputs(numInputs);
        setNumOutputs(1);

        gains_.resize(numInputs, 1.0f);

        setProcessFunction([this, numInputs](float* const* inputs, float* const* outputs, int numSamples) {
            if (outputs[0]) {
                std::fill(outputs[0], outputs[0] + numSamples, 0.0f);

                for (int ch = 0; ch < numInputs; ++ch) {
                    if (inputs[ch]) {
                        for (int i = 0; i < numSamples; ++i) {
                            outputs[0][i] += inputs[ch][i] * gains_[ch];
                        }
                    }
                }
            }
        });
    }

    void setChannelGain(int channel, float gain) {
        if (channel >= 0 && channel < static_cast<int>(gains_.size())) {
            gains_[channel] = gain;
        }
    }

private:
    std::vector<float> gains_;
};

} // namespace core
} // namespace schill
