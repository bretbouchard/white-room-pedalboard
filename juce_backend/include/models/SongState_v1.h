/*
  SongState_v1.h - JUCE C++ implementation

  This file defines the SongState_v1 structure for the JUCE backend,
  matching SongModel_v1.schema.json for cross-platform compatibility.

  SongState represents the derived executable song with notes, timeline,
  and performance parameters. Supports multiple performance interpretations.
*/

#pragma once

#include <string>
#include <vector>
#include <map>
#include <optional>
#include "PerformanceState_v1.h"

namespace white_room {
namespace models {

// =============================================================================
// Forward Declarations
// =============================================================================

struct SongStateV1;
struct NoteEvent;
struct Timeline;
struct TimelineSection;
struct Automation;
struct AutomationPoint;
struct VoiceAssignment;
struct PresetAssignment;
struct ConsoleModel;
struct Bus;
struct EffectSlot;
struct SendEffect;
struct Send;
struct RoutingMatrix;
struct Route;
struct MeteringConfig;

// =============================================================================
// Note Event
// =============================================================================

/**
 Note event - Represents a single musical note
 */
struct NoteEvent {
    std::string id;
    std::string voiceId;
    double startTime;                    // In samples
    double duration;                     // In samples
    int pitch;                           // MIDI note number (0-127)
    int velocity;                        // MIDI velocity (0-127)

    // Optional derivation tracking
    std::optional<std::string> systemType;     // 'rhythm' | 'melody' | 'harmony'
    std::optional<std::string> systemId;       // Source system ID
    std::optional<double> confidence;          // 0-1
    std::optional<std::map<std::string, std::string>> metadata;

    // JSON serialization
    std::string toJson() const;
    static NoteEvent fromJson(const std::string& json);

    // Validation
    bool isValid() const {
        return !id.empty() &&
               !voiceId.empty() &&
               startTime >= 0.0 &&
               duration > 0.0 &&
               pitch >= 0 && pitch <= 127 &&
               velocity >= 0 && velocity <= 127;
    }
};

// =============================================================================
// Timeline Section
// =============================================================================

/**
 Timeline section - A named section of the song
 */
struct TimelineSection {
    std::string id;
    std::string name;
    double startTime;                    // In samples
    double duration;                     // In samples
    double tempo;                        // BPM
    std::pair<int, int> timeSignature;   // {numerator, denominator}

    // JSON serialization
    std::string toJson() const;
    static TimelineSection fromJson(const std::string& json);
};

// =============================================================================
// Timeline
// =============================================================================

/**
 Timeline - Overall song timeline structure
 */
struct Timeline {
    std::vector<TimelineSection> sections;
    double tempo;                        // BPM
    std::pair<int, int> timeSignature;   // {numerator, denominator}

    // JSON serialization
    std::string toJson() const;
    static Timeline fromJson(const std::string& json);
};

// =============================================================================
// Automation Point
// =============================================================================

/**
 Automation point - A single point in an automation curve
 */
struct AutomationPoint {
    double time;                         // In samples
    double value;
    std::optional<std::string> curve;    // 'linear' | 'exponential' | 'step'

    // JSON serialization
    std::string toJson() const;
    static AutomationPoint fromJson(const std::string& json);
};

// =============================================================================
// Automation
// =============================================================================

/**
 Automation - Parameter automation curve
 */
struct Automation {
    std::string id;
    std::string parameter;               // Parameter ID
    std::vector<AutomationPoint> points;

    // JSON serialization
    std::string toJson() const;
    static Automation fromJson(const std::string& json);
};

// =============================================================================
// Voice Assignment
// =============================================================================

/**
 Voice assignment - Maps voices to instruments
 */
struct VoiceAssignment {
    std::string voiceId;
    std::string instrumentId;
    std::string presetId;
    std::string busId;

    // JSON serialization
    std::string toJson() const;
    static VoiceAssignment fromJson(const std::string& json);

    // Validation
    bool isValid() const {
        return !voiceId.empty() &&
               !instrumentId.empty() &&
               !busId.empty();
    }
};

// =============================================================================
// Preset Assignment
// =============================================================================

/**
 Preset assignment - Maps instrument types to presets
 */
struct PresetAssignment {
    std::string instrumentType;
    std::string presetId;

    // JSON serialization
    std::string toJson() const;
    static PresetAssignment fromJson(const std::string& json);
};

// =============================================================================
// Console Model Types
// =============================================================================

/**
 Bus type enum
 */
enum class BusType {
    VOICE,
    MIX,
    MASTER
};

/**
 Convert BusType to string
 */
inline std::string busTypeToString(BusType type) {
    switch (type) {
        case BusType::VOICE: return "voice";
        case BusType::MIX: return "mix";
        case BusType::MASTER: return "master";
        default: return "voice";
    }
}

/**
 Convert string to BusType
 */
inline BusType stringToBusType(const std::string& str) {
    if (str == "voice") return BusType::VOICE;
    if (str == "mix") return BusType::MIX;
    if (str == "master") return BusType::MASTER;
    return BusType::VOICE;
}

/**
 Effect slot - Insert effect on a bus
 */
struct EffectSlot {
    std::string id;
    std::string effectType;
    bool enabled;
    bool bypassed;
    std::map<std::string, double> parameters;
    std::optional<std::string> automation;

    // JSON serialization
    std::string toJson() const;
    static EffectSlot fromJson(const std::string& json);
};

/**
 Bus - Audio bus (voice, mix, or master)
 */
struct Bus {
    std::string id;
    std::string name;
    BusType type;
    std::vector<EffectSlot> inserts;
    double gain;                         // Decibels
    double pan;                          // -1 to 1
    bool muted;
    bool solo;

    // JSON serialization
    std::string toJson() const;
    static Bus fromJson(const std::string& json);
};

/**
 Send - Aux send level
 */
struct Send {
    std::string sourceBusId;
    double level;                        // Decibels
    double pan;                          // -1 to 1

    // JSON serialization
    std::string toJson() const;
    static Send fromJson(const std::string& json);
};

/**
 Route - Routing matrix entry
 */
struct Route {
    std::string sourceBusId;
    std::string destinationBusId;
    double level;                        // Decibels
    bool enabled;

    // JSON serialization
    std::string toJson() const;
    static Route fromJson(const std::string& json);
};

/**
 Routing matrix - Bus routing configuration
 */
struct RoutingMatrix {
    std::vector<Route> routes;

    // JSON serialization
    std::string toJson() const;
    static RoutingMatrix fromJson(const std::string& json);
};

/**
 Metering configuration
 */
struct MeteringConfig {
    bool enabled;
    double refreshRate;                  // Hz
    std::string meterType;               // 'peak' | 'rms' | 'both'
    double holdTime;                     // Milliseconds

    // JSON serialization
    std::string toJson() const;
    static MeteringConfig fromJson(const std::string& json);
};

/**
 Send effect - Effect on aux bus
 */
struct SendEffect {
    std::string id;
    std::string busId;
    std::string effectType;
    bool enabled;
    std::map<std::string, double> parameters;
    std::vector<Send> sends;

    // JSON serialization
    std::string toJson() const;
    static SendEffect fromJson(const std::string& json);
};

/**
 Console model - Complete mixing console configuration
 */
struct ConsoleModel {
    std::string version = "1.0";
    std::string id;
    std::vector<Bus> voiceBusses;
    std::vector<Bus> mixBusses;
    Bus masterBus;
    std::vector<SendEffect> sendEffects;
    RoutingMatrix routing;
    MeteringConfig metering;

    // JSON serialization
    std::string toJson() const;
    static ConsoleModel fromJson(const std::string& json);

    // Validation
    bool isValid() const {
        return version == "1.0" &&
               !id.empty() &&
               !masterBus.id.empty();
    }
};

// =============================================================================
// Song State V1
// =============================================================================

/**
 SongStateV1 - Derived musical state from SongContract

 This represents the derived executable song with notes, timeline,
 and performance parameters. Supports multiple performance interpretations.

 Matches SongModel_v1.schema.json
 */
struct SongStateV1 {
    // Required fields
    std::string version = "1.0";
    std::string id;
    std::string sourceContractId;
    std::string derivationId;
    Timeline timeline;
    std::vector<NoteEvent> notes;
    std::vector<Automation> automations;
    double duration;                     // In samples
    double tempo;                        // BPM
    std::pair<int, int> timeSignature;   // {numerator, denominator}
    double sampleRate;
    std::vector<VoiceAssignment> voiceAssignments;
    ConsoleModel console;
    std::vector<PresetAssignment> presets;
    long long derivedAt;                 // Unix timestamp (ms)

    // Multiple performances support
    std::vector<PerformanceState_v1> performances;
    std::string activePerformanceId;

    // Default constructor
    SongStateV1() = default;

    // JSON serialization
    std::string toJson() const;
    static SongStateV1 fromJson(const std::string& json);

    // Validation
    bool isValid() const {
        // Version must be "1.0"
        if (version != "1.0") return false;

        // Required fields must not be empty
        if (id.empty() || sourceContractId.empty() || derivationId.empty()) {
            return false;
        }

        // Duration must be positive
        if (duration <= 0.0) return false;

        // Tempo must be reasonable
        if (tempo <= 0.0 || tempo > 300.0) return false;

        // Sample rate must be valid
        if (sampleRate <= 0.0) return false;

        // Time signature must be valid
        if (timeSignature.first <= 0 || timeSignature.second <= 0) return false;

        // Console must be valid
        if (!console.isValid()) return false;

        // At least one performance
        if (performances.empty()) return false;

        // Active performance ID must be valid
        if (activePerformanceId.empty()) return false;

        // Active performance ID must reference an existing performance
        bool activePerfExists = false;
        for (const auto& perf : performances) {
            if (perf.id == activePerformanceId) {
                activePerfExists = true;
                break;
            }
        }
        if (!activePerfExists) return false;

        return true;
    }

    /**
     Get the active performance
     */
    std::optional<PerformanceState_v1> getActivePerformance() const {
        for (const auto& perf : performances) {
            if (perf.id == activePerformanceId) {
                return perf;
            }
        }
        return std::nullopt;
    }

    /**
     Create a minimal valid SongState for testing
     */
    static SongStateV1 createMinimal(
        const std::string& contractId = "test-contract",
        const std::string& songId = ""
    ) {
        SongStateV1 state;

        // Basic metadata
        state.version = "1.0";
        state.id = songId.empty() ? "song-" + std::to_string(std::time(nullptr)) : songId;
        state.sourceContractId = contractId;
        state.derivationId = "derivation-" + std::to_string(std::time(nullptr));

        // Timeline
        state.timeline = Timeline{
            .sections = {},
            .tempo = 120.0,
            .timeSignature = {4, 4}
        };

        // Notes and automations
        state.notes = {};
        state.automations = {};

        // Duration and tempo
        state.duration = 44100.0 * 8.0;  // 8 seconds at 44.1kHz
        state.tempo = 120.0;
        state.timeSignature = {4, 4};
        state.sampleRate = 44100.0;

        // Voice assignments
        state.voiceAssignments = {};

        // Console
        state.console = ConsoleModel{
            .version = "1.0",
            .id = "console-default",
            .voiceBusses = {},
            .mixBusses = {},
            .masterBus = Bus{
                .id = "master",
                .name = "Master",
                .type = BusType::MASTER,
                .inserts = {},
                .gain = 0.0,
                .pan = 0.0,
                .muted = false,
                .solo = false
            },
            .sendEffects = {},
            .routing = RoutingMatrix{.routes = {}},
            .metering = MeteringConfig{
                .enabled = false,
                .refreshRate = 30.0,
                .meterType = "peak",
                .holdTime = 1000.0
            }
        };

        // Presets
        state.presets = {};

        // Derived timestamp
        state.derivedAt = std::time(nullptr) * 1000;

        // Create default performance
        PerformanceState_v1 defaultPerf = PerformanceState_v1::createMinimal(
            "perf-default",
            "Default Performance"
        );
        state.performances = {defaultPerf};
        state.activePerformanceId = defaultPerf.id;

        return state;
    }

    /**
     Apply a performance lens to filter and transform notes
     This is a core operation for the ProjectionEngine
     */
    std::vector<NoteEvent> applyPerformanceLens(const PerformanceState_v1& performance) const {
        std::vector<NoteEvent> filteredNotes = notes;

        // Apply density filtering
        if (performance.density.has_value()) {
            double density = performance.density.value();
            if (density < 1.0) {
                // Filter out notes based on density
                size_t targetNoteCount = static_cast<size_t>(filteredNotes.size() * density);
                if (targetNoteCount < filteredNotes.size()) {
                    // Keep every Nth note to achieve target density
                    size_t step = filteredNotes.size() / targetNoteCount;
                    std::vector<NoteEvent> temp;
                    temp.reserve(targetNoteCount);
                    for (size_t i = 0; i < filteredNotes.size() && temp.size() < targetNoteCount; i += step) {
                        temp.push_back(filteredNotes[i]);
                    }
                    filteredNotes = std::move(temp);
                }
            }
        }

        // Apply instrumentation mapping
        if (performance.instrumentationMap.has_value()) {
            const auto& instMap = performance.instrumentationMap.value();
            for (auto& note : filteredNotes) {
                // Find instrument assignment for this voice
                auto it = instMap.find(note.voiceId);
                if (it != instMap.end()) {
                    // Update note based on instrumentation
                    // (In full implementation, this would change presets, parameters, etc.)
                }
            }
        }

        // Apply groove/template timing modifications
        if (performance.grooveProfileId.has_value()) {
            const std::string& grooveId = performance.grooveProfileId.value();
            if (grooveId != "default") {
                // Apply groove template to note timing
                // (In full implementation, this would shift start times)
            }
        }

        return filteredNotes;
    }
};

} // namespace models
} // namespace white_room
