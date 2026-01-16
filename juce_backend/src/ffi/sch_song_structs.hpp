//
//  sch_song_structs.hpp
//  White Room JUCE FFI
//
//  C++ struct definitions for Schillinger song types
//  Mirrors TypeScript SDK types from @white-room/core
//
//  Design Principles:
//  - Plain Old Data (POD) types for C ABI compatibility
//  - Fixed-size arrays where possible (no dynamic allocation)
//  - Explicit lengths for strings (null-terminated)
//

#pragma once

#include <cstdint>
#include <cstddef>
#include <cstring>  // For memcpy, memcmp, strncpy

namespace schillinger {
namespace ffi {

// =============================================================================
// CORE TYPES
// =============================================================================

// UUID (36 chars + null terminator)
using sch_uuid_t = char[37];

// String with ownership transfer
struct sch_string_t {
    char* data;
    size_t length;
};

// Generic array (with count)
template <typename T>
struct sch_array_t {
    T* items;
    size_t count;
};

// =============================================================================
// IDENTITY TYPES
// =============================================================================

// SchillingerSong_v1 - Core theory object
struct sch_song_t {
    sch_uuid_t song_id;
    char schema_version[16];  // "1.0"

    // Global parameters
    struct {
        double tempo;
        int32_t time_signature_numerator;
        int32_t time_signature_nenominator;
        int32_t key;  // Pitch class 0-11
    } globals;

    // Systems (arrays with counts)
    sch_array_t<sch_uuid_t> rhythm_system_ids;
    sch_array_t<sch_uuid_t> melody_system_ids;
    sch_array_t<sch_uuid_t> harmony_system_ids;
    sch_uuid_t form_system_id;  // Empty UUID if null
    sch_uuid_t orchestration_system_id;

    // Ensemble model
    struct {
        char version[16];  // "1.0"
        sch_uuid_t ensemble_id;
        sch_array_t<sch_uuid_t> voice_ids;
        int32_t voice_count;
    } ensemble_model;

    // Bindings (simplified for FFI)
    sch_array_t<sch_uuid_t> role_rhythm_binding_ids;
    sch_array_t<sch_uuid_t> role_melody_binding_ids;
    sch_array_t<sch_uuid_t> role_harmony_binding_ids;
    sch_array_t<sch_uuid_t> role_ensemble_binding_ids;

    // Constraints
    sch_array_t<sch_uuid_t> constraint_ids;

    // Provenance
    struct {
        char created_at[32];   // ISO 8601 timestamp
        char created_by[128];  // User/system ID
        char modified_at[32];  // ISO 8601 timestamp
        sch_array_t<sch_uuid_t> derivation_chain;
    } provenance;
};

// =============================================================================
// SONG MODEL (REALIZED NOTES)
// =============================================================================

// Note event (from SongModel_v1)
struct sch_note_t {
    sch_uuid_t note_id;
    sch_uuid_t voice_id;
    double start_time;  // In beats
    double duration;    // In beats
    int32_t pitch;      // MIDI note number 0-127
    int32_t velocity;   // 0-127
    sch_uuid_t derivation_source_id;  // System ID that generated this note
};

// Event (from SongModel_v1)
struct sch_event_t {
    sch_uuid_t event_id;
    sch_uuid_t voice_id;
    double time;  // In beats
    int32_t type;  // 0=dynamic, 1=articulation, 2=other
    // Note: value field omitted for simplicity (type-specific)
};

// Voice assignment (from SongModel_v1)
struct sch_voice_assignment_t {
    sch_uuid_t voice_id;
    sch_uuid_t role_id;
    sch_array_t<sch_uuid_t> system_ids;
};

// Section boundary (from SongModel_v1)
struct sch_section_t {
    sch_uuid_t section_id;
    char name[64];  // "A", "B", "C", etc.
    double start_time;  // In beats
    double duration;    // In beats
};

// Tempo change
struct sch_tempo_change_t {
    double time;   // In beats
    double tempo;  // New tempo
};

// SongModel_v1 - Executable song representation
struct sch_song_model_t {
    sch_uuid_t song_id;
    char schema_version[16];  // "1.0"
    sch_uuid_t derivation_id;

    // Musical content
    sch_array_t<sch_note_t> notes;
    sch_array_t<sch_event_t> events;
    sch_array_t<sch_voice_assignment_t> voice_assignments;

    // Timing
    double duration;  // Total duration in beats
    sch_array_t<sch_tempo_change_t> tempo_changes;

    // Structure
    sch_array_t<sch_section_t> sections;

    // Transport properties (derived from SchillingerSong.globals)
    double tempo;
    int32_t time_signature_numerator;
    int32_t time_signature_nenominator;
    int32_t key;

    // Additional properties
    sch_uuid_t source_song_id;
    char created_at[32];  // ISO 8601 timestamp
};

// =============================================================================
// BINARY SERIALIZATION FORMAT
// =============================================================================

#pragma pack(push, 1)

// Binary header (16 bytes)
struct sch_binary_header_t {
    uint8_t magic[4];      // "WRSM" (White Room Song Model)
    uint32_t version;      // Format version (1)
    uint32_t flags;        // Flags (reserved)
    uint32_t reserved;     // Reserved for future use
};

// Note entry (fixed size for performance)
struct sch_binary_note_entry_t {
    uint8_t note_id[16];     // UUID
    uint8_t voice_id[16];    // UUID
    uint8_t source_id[16];   // Derivation source UUID
    double start_time;
    double duration;
    uint16_t pitch;          // MIDI note 0-127
    uint16_t velocity;       // 0-127
    uint32_t flags;          // Reserved
};

// Event entry
struct sch_binary_event_entry_t {
    uint8_t event_id[16];
    uint8_t voice_id[16];
    double time;
    uint32_t type;
    uint32_t data_offset;    // Offset to type-specific data
    uint32_t data_length;
};

#pragma pack(pop)

// =============================================================================
// PERFORMANCE STATE (REAL-TIME)
// =============================================================================

// Performance state (atomic, poll from Swift)
struct sch_performance_state_t {
    sch_uuid_t performance_a_id;
    sch_uuid_t performance_b_id;
    double blend_value;
    double tempo;
    double position;
    bool is_playing;
    uint32_t active_voice_count;
};

// =============================================================================
// RHYTHM SYSTEM (Book I)
// =============================================================================

// Generator
struct sch_generator_t {
    double period;  // Period in beats (1-16)
    double phase;   // Phase offset in beats (0 to period-1)
    double weight;  // Relative weight (0.1-2.0)
};

// Resultant selection
struct sch_resultant_selection_t {
    int32_t method;  // 0=interference, 1=modulo, 2=custom
    double target_period;  // For resultant selection
};

// Rhythm system (simplified)
struct sch_rhythm_system_t {
    sch_uuid_t system_id;
    sch_array_t<sch_generator_t> generators;
    sch_resultant_selection_t resultant_selection;
    // Note: Permutations, accent displacement, constraints omitted for brevity
};

// =============================================================================
// MELODY SYSTEM (Book II)
// =============================================================================

struct sch_melody_system_t {
    sch_uuid_t system_id;
    int32_t cycle_length;  // mod N (2-24)
    sch_array_t<int32_t> interval_seed;  // Ordered intervals (-12 to +12)
    // Note: Transformations, constraints omitted for brevity
};

// =============================================================================
// HARMONY SYSTEM (Book III)
// =============================================================================

struct sch_harmony_system_t {
    sch_uuid_t system_id;
    sch_array_t<double> distribution;  // Interval weights (intervals 1-12)
    sch_uuid_t rhythm_binding_id;  // RhythmSystem ID
    // Note: Voice leading, resolution omitted for brevity
};

// =============================================================================
// ORCHESTRATION SYSTEM (Book V)
// =============================================================================

struct sch_role_t {
    sch_uuid_t role_id;
    char role_name[64];  // "bass", "melody", etc.
    int32_t priority;    // 0=primary, 1=secondary, 2=tertiary
    int32_t functional_class;  // 0=foundation, 1=motion, 2=ornament, 3=reinforcement
    sch_array_t<sch_uuid_t> yield_to_role_ids;
};

struct sch_orchestration_system_t {
    sch_uuid_t system_id;
    sch_array_t<sch_role_t> roles;
    // Note: Register, spacing, density, doubling omitted for brevity
};

// =============================================================================
// ENSEMBLE MODEL
// =============================================================================

struct sch_voice_t {
    sch_uuid_t voice_id;
    char voice_name[64];
    sch_array_t<int32_t> role_pools;  // Role types
    sch_array_t<sch_uuid_t> group_ids;
    int32_t min_pitch;  // MIDI note (optional)
    int32_t max_pitch;  // MIDI note (optional)
};

struct sch_ensemble_model_t {
    char version[16];  // "1.0"
    sch_uuid_t ensemble_id;
    sch_array_t<sch_voice_t> voices;
    int32_t voice_count;
    // Note: Groups, balance omitted for brevity
};

// =============================================================================
// BINDINGS
// =============================================================================

struct sch_role_rhythm_binding_t {
    sch_uuid_t binding_id;
    sch_uuid_t role_id;
    sch_uuid_t rhythm_system_id;
    sch_uuid_t voice_id;
    int32_t priority;  // 1-10
};

struct sch_role_melody_binding_t {
    sch_uuid_t binding_id;
    sch_uuid_t role_id;
    sch_uuid_t melody_system_id;
    sch_uuid_t voice_id;
    int32_t priority;
};

struct sch_role_harmony_binding_t {
    sch_uuid_t binding_id;
    sch_uuid_t role_id;
    sch_uuid_t harmony_system_id;
    sch_array_t<sch_uuid_t> voice_ids;  // Multiple voices for harmony
    int32_t priority;
};

// =============================================================================
// CONSTRAINTS
// =============================================================================

struct sch_constraint_t {
    sch_uuid_t constraint_id;
    char type[64];  // "density", "register", "contour", etc.
    int32_t scope;  // 0=global, 1=system, 2=voice
    sch_uuid_t target_id;  // System/voice ID if scoped
    // Note: Parameters omitted (type-specific)
    bool enabled;
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

inline bool uuid_is_empty(const sch_uuid_t& uuid) {
    return uuid[0] == '\0';
}

inline void uuid_copy(sch_uuid_t& dest, const sch_uuid_t& src) {
    std::memcpy(dest, src, sizeof(sch_uuid_t));
}

inline bool uuid_equals(const sch_uuid_t& a, const sch_uuid_t& b) {
    return std::memcmp(a, b, sizeof(sch_uuid_t)) == 0;
}

} // namespace ffi
} // namespace schillinger
