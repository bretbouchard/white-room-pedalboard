/*
  ==============================================================================

    SongModel_v1.h
    Created: December 30, 2025
    Author: Bret Bouchard

    SDK SongModel structure definition

    This file defines the SongModel_v1 data structure that the Schillinger SDK
    passes to the JUCE backend for playback.

  ==============================================================================
*/

#ifndef SONG_MODEL_V1_H_INCLUDED
#define SONG_MODEL_V1_H_INCLUDED

#include <cstdint>
#include <vector>
#include <string>

namespace Integration {

/**
 * @brief Note event data from SDK
 */
struct NoteData {
    double startTime;      // In seconds
    double duration;       // In seconds
    int midiNote;          // 0-127
    double velocity;       // 0.0 to 1.0
};

/**
 * @brief Automation point for parameters
 */
struct AutomationPoint {
    double time;           // In seconds
    double value;          // Parameter value
};

/**
 * @brief Track definition from SDK
 */
struct Track {
    std::string id;
    std::string name;
    int trackIndex;

    // Instrument assignment
    std::string instrumentId;
    std::string instrumentPreset;

    // Mixer settings
    bool isMuted;
    bool isSoloed;
    double volume;         // dB
    double pan;            // -1.0 to +1.0

    // Events
    std::vector<NoteData> notes;

    // Automation
    std::string parameterId;
    std::vector<AutomationPoint> automation;
};

/**
 * @brief Bus definition from SDK
 */
struct Bus {
    std::string id;
    std::string name;
    int busIndex;
    double volume;         // dB

    // Effects (bus inserts)
    std::vector<std::string> effectIds;
};

/**
 * @brief Mix graph connections
 */
struct MixGraph {
    struct SendConnection {
        std::string sourceTrackId;
        std::string destinationBusId;
        double amount;      // 0.0 to 1.0
        bool preFader;
    };

    std::vector<SendConnection> sends;
};

/**
 * @brief Time signature change event
 */
struct TimeSignatureEvent {
    double time;           // In seconds
    int upper;             // Numerator (e.g., 3 for 3/4)
    int lower;             // Denominator (e.g., 4 for 3/4)
};

/**
 * @brief Tempo change event
 */
struct TempoEvent {
    double time;           // In seconds
    double bpm;            // Beats per minute
};

/**
 * @brief SongModel v1 from SDK
 *
 * This structure represents a complete song from the Schillinger SDK.
 * It contains all tracks, buses, mix information, and timing data.
 */
struct SongModel_v1 {
    // Song metadata
    std::string id;
    std::string name;
    double duration;       // In seconds

    // Timing
    double tempo;          // Default BPM
    int timeSigUpper;      // Default time signature numerator
    int timeSigLower;      // Default time signature denominator

    // Timeline events
    std::vector<TempoEvent> tempoChanges;
    std::vector<TimeSignatureEvent> timeSignatureChanges;

    // Structure
    std::vector<Track> tracks;
    std::vector<Bus> buses;
    MixGraph mixGraph;

    // Master bus (always index 0)
    std::string masterBusId;
};

} // namespace Integration

#endif // SONG_MODEL_V1_H_INCLUDED
