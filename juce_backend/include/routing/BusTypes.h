/*
  ==============================================================================

    BusTypes.h
    Created: December 30, 2025
    Author: Bret Bouchard

    Audio routing and bus type definitions

  ==============================================================================
*/

#ifndef BUS_TYPES_H_INCLUDED
#define BUS_TYPES_H_INCLUDED

#include <string>
#include <vector>

namespace Routing {

/**
 * @brief Bus type
 *
 * Defines the purpose of a mix bus.
 */
enum class BusType {
    MASTER,      // Final output (always index 0)
    AUX,         // Effects bus (reverb, delay, etc.)
    GROUP,       // Submix bus (drums, vocals, etc.)
    OUTPUT       // Direct output (no processing)
};

/**
 * @brief Bus information
 */
struct BusInfo {
    std::string id;
    std::string name;
    int busIndex;
    BusType type;
    double volume;  // dB

    BusInfo()
        : busIndex(-1), type(BusType::OUTPUT), volume(0.0)
    {}

    BusInfo(const std::string& id_, const std::string& name_,
            int index, BusType type_, double vol = 0.0)
        : id(id_), name(name_), busIndex(index), type(type_), volume(vol)
    {}
};

/**
 * @brief Send connection
 *
 * Represents a send from a track to a bus.
 */
struct SendConnection {
    std::string sourceTrackId;
    std::string destinationBusId;
    double amount;   // 0.0 to 1.0
    bool preFader;   // true = pre-fader, false = post-fader

    SendConnection()
        : amount(0.0), preFader(false)
    {}

    SendConnection(const std::string& source, const std::string& dest,
                  double amt, bool pre)
        : sourceTrackId(source), destinationBusId(dest)
        , amount(amt), preFader(pre)
    {}
};

/**
 * @brief Audio processing node
 *
 * Represents a node in the audio processing graph.
 */
struct AudioGraphNode {
    std::string id;
    std::string name;

    enum class Type {
        TRACK,      // Instrument track
        BUS,        // Mix bus
        OUTPUT      // Final output
    };

    Type type;
    int index;  // Track index or bus index

    // Inputs (for graph topological sort)
    std::vector<std::string> inputIds;
    std::vector<std::string> outputIds;

    AudioGraphNode()
        : type(Type::TRACK), index(-1)
    {}

    AudioGraphNode(const std::string& id_, const std::string& name_, Type t, int idx)
        : id(id_), name(name_), type(t), index(idx)
    {}
};

/**
 * @brief Audio graph topology
 *
 * Defines the complete audio processing graph including
 * all tracks, buses, and connections.
 */
struct AudioGraphTopology {
    std::vector<AudioGraphNode> nodes;
    std::vector<SendConnection> sends;

    /// Validate graph structure
    bool isValid() const {
        // Check for cycles
        // Check for disconnected nodes
        // Check master bus exists
        // Check no sends TO master
        return true;  // TODO: Implement validation
    }

    /// Get processing order (topological sort)
    std::vector<std::string> getProcessingOrder() const {
        std::vector<std::string> order;
        // TODO: Implement topological sort
        return order;
    }
};

/**
 * @brief Helper functions
 */
inline const char* busTypeToString(BusType type) {
    switch (type) {
        case BusType::MASTER: return "MASTER";
        case BusType::AUX: return "AUX";
        case BusType::GROUP: return "GROUP";
        case BusType::OUTPUT: return "OUTPUT";
        default: return "UNKNOWN";
    }
}

inline BusType stringToBusType(const std::string& str) {
    if (str == "MASTER") return BusType::MASTER;
    if (str == "AUX") return BusType::AUX;
    if (str == "GROUP") return BusType::GROUP;
    if (str == "OUTPUT") return BusType::OUTPUT;
    return BusType::OUTPUT;  // Default
}

} // namespace Routing

#endif // BUS_TYPES_H_INCLUDED
