/*
 * GraphBuilder.h
 *
 * Builds audio graph from SongModel
 *
 * Purpose: Deterministic graph construction from SongModel.mixGraph
 *          No hard-coded routing, all from SongModel
 *
 * Design Constraints:
 *  - Deterministic output (same SongModel = same graph)
 *  - No cycles in graph (validation required)
 *  - No ad-hoc connections (only from graph definition)
 *  - Real-time safe (no allocations during processing)
 *
 * Created: December 30, 2025
 * Source: JUCE Backend Handoff Directive
 */

#ifndef GRAPH_BUILDER_H_INCLUDED
#define GRAPH_BUILDER_H_INCLUDED

#include <cstdint>
#include <vector>
#include <string>
#include <memory>

namespace Routing {

// Forward declarations
class AudioGraph;
struct SongModel_v1;

/**
 * @brief Node types in audio graph
 */
enum class NodeType : uint32_t {
    TRACK,              // Audio/MIDI track
    BUS,                // Mix bus (return channel)
    MASTER,             // Master output
    SEND,               // Send node (source track side)
    RETURN,             // Return node (bus input side)
    EFFECT_INSERT       // Insert effect (series processing)
};

/**
 * @brief Graph node (track, bus, effect, etc.)
 */
struct GraphNode {
    std::string id;                    // Unique identifier
    NodeType type;                     // Node type
    std::vector<std::string> inputs;   // Input connections
    std::vector<std::string> outputs;  // Output connections

    // Processing parameters
    double sampleRate;
    int maxBlockSize;

    // State
    void* dspProcessor;                // Opaque pointer to DSP (InstrumentDSP, ConsoleChannelDSP, etc.)
    bool enabled;                      // Bypass toggle

    GraphNode() : type(NodeType::TRACK), sampleRate(48000.0), maxBlockSize(512),
                  dspProcessor(nullptr), enabled(true) {}
};

/**
 * @brief Connection between two nodes
 */
struct GraphConnection {
    std::string sourceId;              // Source node ID
    std::string destId;                // Destination node ID
    uint32_t sourceChannel;            // Source channel (0 = left, 1 = right, etc.)
    uint32_t destChannel;              // Destination channel
    float gain;                        // Connection gain (0.0 to 1.0)

    GraphConnection() : sourceChannel(0), destChannel(0), gain(1.0f) {}
};

/**
 * @brief Audio graph topology
 *
 * Defines the complete signal flow:
 *   Tracks → Sends → Buses → Master
 */
struct AudioGraph {
    std::vector<GraphNode> nodes;
    std::vector<GraphConnection> connections;

    // Master node (always present)
    std::string masterId;

    // Validate graph
    bool isValid() const;

    // Check for cycles
    bool hasCycles() const;

    // Get node by ID
    GraphNode* getNode(const std::string& id);
    const GraphNode* getNode(const std::string& id) const;

    // Get all inputs for a node
    std::vector<GraphConnection> getInputConnections(const std::string& nodeId) const;

    // Get all outputs for a node
    std::vector<GraphConnection> getOutputConnections(const std::string& nodeId) const;
};

/**
 * @brief Builds audio graph from SongModel
 *
 * Responsibilities:
 *  - Parse SongModel.mixGraph
 *  - Validate topology (no cycles, all connections valid)
 *  - Create AudioGraph structure
 *  - Instantiate DSP processors for each node
 *  - Connect nodes according to graph definition
 *
 * Usage:
 *   GraphBuilder builder;
 *   AudioGraph graph = builder.buildFrom(songModel);
 *   if (graph.isValid()) {
 *       // Process audio
 *   }
 */
class GraphBuilder {
public:
    GraphBuilder();
    ~GraphBuilder();

    /**
     * @brief Build audio graph from SongModel
     *
     * Parses SongModel.mixGraph and creates complete audio graph.
     * Validates graph structure before returning.
     *
     * @param model Song model from SDK
     * @return Complete audio graph (check isValid() before use)
     */
    AudioGraph buildFrom(const SongModel_v1& model);

    /**
     * @brief Rebuild graph (hot reload)
     *
     * Called when SongModel changes. Attempts to preserve
     * existing DSP processors where possible.
     *
     * @param model Updated song model
     * @param previousGraph Previous graph (for preserving state)
     * @return New audio graph
     */
    AudioGraph rebuildFrom(const SongModel_v1& model, const AudioGraph& previousGraph);

    /**
     * @brief Validate graph structure
     *
     * Checks for:
     *  - No cycles
     *  - All connections valid (nodes exist)
     *  - Master node present
     *  - No disconnected nodes (except optional sends)
     *
     * @param graph Graph to validate
     * @return true if graph is valid
     */
    bool validate(const AudioGraph& graph) const;

    /**
     * @brief Get last build error
     *
     * Returns human-readable error message if buildFrom() failed.
     *
     * @return Error message, or empty string if no error
     */
    std::string getLastError() const;

private:
    std::string lastError_;

    // Build helpers
    GraphNode createTrackNode(const SongModel_v1& model, int trackIndex);
    GraphNode createBusNode(const SongModel_v1& model, int busIndex);
    GraphNode createMasterNode(const SongModel_v1& model);
    GraphConnection createSendConnection(const SongModel_v1& model, int trackIndex, int busIndex);

    // Validation helpers
    bool checkForCycles(const AudioGraph& graph) const;
    bool checkAllConnectionsValid(const AudioGraph& graph) const;
    bool checkMasterExists(const AudioGraph& graph) const;
    void dfsCycleDetect(const AudioGraph& graph, const std::string& nodeId,
                       std::set<std::string>& visited, std::set<std::string>& recStack, bool& hasCycle) const;
};

} // namespace Routing

#endif // GRAPH_BUILDER_H_INCLUDED
