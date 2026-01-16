/*
  PerformanceState_v1.h - JUCE C++ implementation

  This file defines the PerformanceState_v1 structure for the JUCE backend,
  matching PerformanceState_v1.schema.json for cross-platform compatibility.

  PerformanceState represents how a song is realized (solo piano, SATB,
  ambient techno, etc.) - one of many parallel performance universes.
*/

#pragma once

#include <string>
#include <map>
#include <vector>
#include <optional>
#include <chrono>

namespace white_room {
namespace models {

// =============================================================================
// Forward Declarations
// =============================================================================

struct PerformanceState_v1;
struct InstrumentAssignment;
struct MixTarget;

// =============================================================================
// Enums
// =============================================================================

/**
 Arrangement style enum

 Matches PerformanceState_v1.schema.json enum values
 */
enum class ArrangementStyle {
    SOLO_PIANO,
    SATB,
    CHAMBER_ENSEMBLE,
    FULL_ORCHESTRA,
    JAZZ_COMBO,
    JAZZ_TRIO,
    ROCK_BAND,
    AMBIENT_TECHNO,
    ELECTRONIC,
    ACAPPELLA,
    STRING_QUARTET,
    CUSTOM
};

/**
 Convert ArrangementStyle to string
 */
inline std::string arrangementStyleToString(ArrangementStyle style) {
    switch (style) {
        case ArrangementStyle::SOLO_PIANO: return "SOLO_PIANO";
        case ArrangementStyle::SATB: return "SATB";
        case ArrangementStyle::CHAMBER_ENSEMBLE: return "CHAMBER_ENSEMBLE";
        case ArrangementStyle::FULL_ORCHESTRA: return "FULL_ORCHESTRA";
        case ArrangementStyle::JAZZ_COMBO: return "JAZZ_COMBO";
        case ArrangementStyle::JAZZ_TRIO: return "JAZZ_TRIO";
        case ArrangementStyle::ROCK_BAND: return "ROCK_BAND";
        case ArrangementStyle::AMBIENT_TECHNO: return "AMBIENT_TECHNO";
        case ArrangementStyle::ELECTRONIC: return "ELECTRONIC";
        case ArrangementStyle::ACAPPELLA: return "ACAPPELLA";
        case ArrangementStyle::STRING_QUARTET: return "STRING_QUARTET";
        case ArrangementStyle::CUSTOM: return "CUSTOM";
        default: return "CUSTOM";
    }
}

/**
 Convert string to ArrangementStyle
 */
inline ArrangementStyle stringToArrangementStyle(const std::string& str) {
    if (str == "SOLO_PIANO") return ArrangementStyle::SOLO_PIANO;
    if (str == "SATB") return ArrangementStyle::SATB;
    if (str == "CHAMBER_ENSEMBLE") return ArrangementStyle::CHAMBER_ENSEMBLE;
    if (str == "FULL_ORCHESTRA") return ArrangementStyle::FULL_ORCHESTRA;
    if (str == "JAZZ_COMBO") return ArrangementStyle::JAZZ_COMBO;
    if (str == "JAZZ_TRIO") return ArrangementStyle::JAZZ_TRIO;
    if (str == "ROCK_BAND") return ArrangementStyle::ROCK_BAND;
    if (str == "AMBIENT_TECHNO") return ArrangementStyle::AMBIENT_TECHNO;
    if (str == "ELECTRONIC") return ArrangementStyle::ELECTRONIC;
    if (str == "ACAPPELLA") return ArrangementStyle::ACAPPELLA;
    if (str == "STRING_QUARTET") return ArrangementStyle::STRING_QUARTET;
    return ArrangementStyle::CUSTOM;
}

// =============================================================================
// Instrument Assignment
// =============================================================================

/**
 Instrument assignment

 Maps roles or track IDs to instrument assignments
 */
struct InstrumentAssignment {
    std::string instrumentId;                     // Required
    std::optional<std::string> presetId;          // Optional
    std::optional<std::map<std::string, double>> parameters;  // Optional

    // JSON serialization
    std::string toJson() const;
    static InstrumentAssignment fromJson(const std::string& json);

    // Validation
    bool isValid() const {
        return !instrumentId.empty();
    }
};

// =============================================================================
// Mix Target
// =============================================================================

/**
 Mix target

 Per-role or per-track gain/pan targets
 */
struct MixTarget {
    double gain;                      // Required: Gain in decibels
    double pan;                       // Required: Pan position (-1 to 1)
    bool stereo;                      // Optional: Whether stereo (default true)

    MixTarget() : gain(0.0), pan(0.0), stereo(true) {}

    MixTarget(double g, double p, bool s = true)
        : gain(g), pan(p), stereo(s) {}

    // JSON serialization
    std::string toJson() const;
    static MixTarget fromJson(const std::string& json);

    // Validation
    bool isValid() const {
        return pan >= -1.0 && pan <= 1.0;
    }
};

// =============================================================================
// Performance State V1
// =============================================================================

/**
 PerformanceState_v1 - Performance realization lens

 Represents how a song is realized (solo piano, SATB, ambient techno, etc.)
 - one of many parallel performance universes for a single song.

 Matches PerformanceState_v1.schema.json
 */
struct PerformanceState_v1 {
    // Required fields
    std::string version = "1";                         // Must be "1"
    std::string id;                                    // UUID
    std::string name;                                  // 1-256 characters
    ArrangementStyle arrangementStyle;                 // Enum value

    // Optional fields
    std::optional<double> density;                     // 0-1, default 1
    std::optional<std::string> grooveProfileId;        // default "default"
    std::optional<std::map<std::string, InstrumentAssignment>> instrumentationMap;
    std::optional<std::string> consoleXProfileId;      // default "default"
    std::optional<std::map<std::string, MixTarget>> mixTargets;
    std::optional<std::string> createdAt;              // ISO 8601
    std::optional<std::string> modifiedAt;             // ISO 8601
    std::optional<std::map<std::string, std::string>> metadata;

    // Default constructor
    PerformanceState_v1() = default;

    // Constructor with required fields
    PerformanceState_v1(
        const std::string& id,
        const std::string& name,
        ArrangementStyle style
    ) : id(id), name(name), arrangementStyle(style) {}

    // JSON serialization
    std::string toJson() const;
    static PerformanceState_v1 fromJson(const std::string& json);

    // Validation
    bool isValid() const {
        // Version must be "1"
        if (version != "1") return false;

        // ID must not be empty
        if (id.empty()) return false;

        // Name must be 1-256 characters
        if (name.empty() || name.length() > 256) return false;

        // Density must be 0-1 if present
        if (density.has_value() && (density.value() < 0.0 || density.value() > 1.0)) {
            return false;
        }

        return true;
    }

    /**
     Create a minimal valid PerformanceState for testing
     */
    static PerformanceState_v1 createMinimal(
        const std::string& id = "",
        const std::string& name = "Default Performance"
    ) {
        PerformanceState_v1 state;
        state.version = "1";
        state.id = id.empty() ? generateUUID() : id;
        state.name = name;
        state.arrangementStyle = ArrangementStyle::SOLO_PIANO;
        state.density = 1.0;
        state.grooveProfileId = "default";
        state.consoleXProfileId = "default";
        state.instrumentationMap = std::map<std::string, InstrumentAssignment>();
        state.mixTargets = std::map<std::string, MixTarget>();
        state.createdAt = getCurrentISO8601();
        state.modifiedAt = getCurrentISO8601();
        return state;
    }

    /**
     Create PerformanceState for solo piano
     */
    static PerformanceState_v1 createSoloPiano(
        const std::string& id = "",
        const std::string& name = "Solo Piano"
    ) {
        auto state = createMinimal(id, name);
        state.arrangementStyle = ArrangementStyle::SOLO_PIANO;
        state.density = 0.35;

        std::map<std::string, InstrumentAssignment> instMap;
        InstrumentAssignment assignment;
        assignment.instrumentId = "LocalGal";
        assignment.presetId = "grand_piano";
        instMap["primary"] = assignment;
        state.instrumentationMap = instMap;

        std::map<std::string, MixTarget> mixMap;
        mixMap["primary"] = MixTarget(-3.0, 0.0, true);
        state.mixTargets = mixMap;

        return state;
    }

    /**
     Create PerformanceState for SATB choir
     */
    static PerformanceState_v1 createSATB(
        const std::string& id = "",
        const std::string& name = "SATB Choir"
    ) {
        auto state = createMinimal(id, name);
        state.arrangementStyle = ArrangementStyle::SATB;
        state.density = 0.55;

        std::map<std::string, InstrumentAssignment> instMap;
        instMap["soprano"] = {"NexSynth", "choir_soprano", std::nullopt};
        instMap["alto"] = {"NexSynth", "choir_alto", std::nullopt};
        instMap["tenor"] = {"NexSynth", "choir_tenor", std::nullopt};
        instMap["bass"] = {"NexSynth", "choir_bass", std::nullopt};
        state.instrumentationMap = instMap;

        std::map<std::string, MixTarget> mixMap;
        mixMap["soprano"] = MixTarget(-6.0, -0.3, true);
        mixMap["alto"] = MixTarget(-6.0, 0.3, true);
        mixMap["tenor"] = MixTarget(-6.0, -0.2, true);
        mixMap["bass"] = MixTarget(-6.0, 0.2, true);
        state.mixTargets = mixMap;

        return state;
    }

    /**
     Create PerformanceState for ambient techno
     */
    static PerformanceState_v1 createAmbientTechno(
        const std::string& id = "",
        const std::string& name = "Ambient Techno"
    ) {
        auto state = createMinimal(id, name);
        state.arrangementStyle = ArrangementStyle::AMBIENT_TECHNO;
        state.density = 0.8;
        state.grooveProfileId = "swing";

        std::map<std::string, InstrumentAssignment> instMap;
        instMap["pulse"] = {"DrumMachine", "techno_kick", std::nullopt};
        instMap["foundation"] = {"KaneMarcoAether", "deep_bass", std::nullopt};
        instMap["texture"] = {"NexSynth", "ambient_pad", std::nullopt};
        instMap["voice"] = {"KaneMarcoAetherString", "ethereal_lead", std::nullopt};
        state.instrumentationMap = instMap;

        std::map<std::string, MixTarget> mixMap;
        mixMap["pulse"] = MixTarget(-2.0, 0.0, false);
        mixMap["foundation"] = MixTarget(-6.0, 0.0, true);
        mixMap["texture"] = MixTarget(-12.0, 0.0, true);
        mixMap["voice"] = MixTarget(-3.0, 0.0, true);
        state.mixTargets = mixMap;

        return state;
    }

private:
    // Helper: Generate UUID (simplified)
    static std::string generateUUID() {
        // In production, use a proper UUID library
        return "perf-" + std::to_string(
            std::chrono::system_clock::now().time_since_epoch().count()
        );
    }

    // Helper: Get current ISO 8601 timestamp
    static std::string getCurrentISO8601() {
        // In production, use a proper date/time library
        auto now = std::chrono::system_clock::now();
        auto timestamp = std::chrono::system_clock::to_time_t(now);
        return std::string(std::ctime(&timestamp));
    }
};

} // namespace models
} // namespace white_room
