/*
 * SongModelAdapter.h
 *
 * Adapter for SDK SongModel → JUCE backend
 *
 * Purpose: Accept SongModel from SDK and translate to audio engine commands
 *
 * Design Constraints:
 *  - No UI coupling (pure data translation)
 *  - Real-time safe (no allocations during playback)
 *  - Deterministic (same SongModel = same behavior)
 *
 * Created: December 30, 2025
 * Source: JUCE Backend Handoff Directive
 */

#ifndef SONG_MODEL_ADAPTER_H_INCLUDED
#define SONG_MODEL_ADAPTER_H_INCLUDED

#include <cstdint>
#include <vector>
#include <string>
#include <memory>
#include "SongModel_v1.h"
#include "AudioGraph.h"

namespace Integration {

/**
 * @brief Track information extracted from SongModel
 */
struct TrackInfo {
    std::string id;
    std::string name;
    int trackIndex;              // Position in song
    bool isMuted;
    bool isSoloed;
    double volume;               // dB
    double pan;                  // -1.0 to +1.0

    // Instrument
    std::string instrumentId;    // "NexSynth", "SamSampler", etc.
    std::string instrumentPreset; // Preset name (if loaded)

    // Sends
    struct SendInfo {
        int busIndex;
        double amount;           // 0.0 to 1.0
        bool preFader;
    };
    std::vector<SendInfo> sends;

    // Inserts (optional, for future use)
    std::vector<std::string> insertEffectIds;
};

/**
 * @brief Bus information extracted from SongModel
 */
struct BusInfo {
    std::string id;
    std::string name;
    int busIndex;
    double volume;               // dB
    std::vector<std::string> effectIds;  // Bus effects
};

/**
 * @brief Adapter for SongModel
 *
 * Accepts SongModel from SDK and provides access methods for
 * the audio engine. Does no processing itself, just translation.
 *
 * Responsibilities:
 *  - Load SongModel from SDK
 *  - Extract track/bus information
 *  - Validate SongModel structure
 *  - Provide methods for engine to query song structure
 *
 * Usage:
 *   SongModelAdapter adapter;
 *   if (adapter.loadSongModel(songModel)) {
 *       int numTracks = adapter.getTrackCount();
 *       TrackInfo track0 = adapter.getTrackInfo(0);
 *   }
 */
class SongModelAdapter {
public:
    SongModelAdapter();
    ~SongModelAdapter();

    /**
     * @brief Load SongModel from SDK
     *
     * Parses SongModel and extracts all track/bus information.
     * Validates structure before returning.
     *
     * @param model Song model from SDK
     * @return true if load succeeded, false on validation error
     */
    bool loadSongModel(const SongModel_v1& model);

    /**
     * @brief Unload current SongModel
     *
     * Clears all stored data and resets to empty state.
     */
    void unload();

    /**
     * @brief Check if SongModel is loaded
     *
     * @return true if SongModel is loaded and valid
     */
    bool isLoaded() const;

    /**
     * @brief Validate SongModel structure
     *
     * Checks for:
     *  - At least one track
     *  - Master bus exists
     *  - All track/bus references are valid
     *  - No cycles in graph
     *
     * @param model Song model to validate
     * @return true if valid
     */
    bool validate(const SongModel_v1& model) const;

    // Track queries
    int getTrackCount() const;
    TrackInfo getTrackInfo(int trackIndex) const;
    TrackInfo getTrackById(const std::string& trackId) const;

    // Bus queries
    int getBusCount() const;
    BusInfo getBusInfo(int busIndex) const;
    BusInfo getBusById(const std::string& busId) const;

    // Master bus
    BusInfo getMasterBus() const;

    // Tempo and time signature
    double getTempo() const;
    int getTimeSignatureUpper() const;
    int getTimeSignatureLower() const;

    // Song length
    double getDuration() const;  // In seconds

    /**
     * @brief Get last error message
     *
     * Returns human-readable error if loadSongModel() failed.
     *
     * @return Error message, or empty string if no error
     */
    std::string getLastError() const;

private:
    bool loaded_;
    std::string lastError_;

    // Cached song data
    std::vector<TrackInfo> tracks_;
    std::vector<BusInfo> buses_;
    BusInfo masterBus_;
    double tempo_;
    int timeSigUpper_;
    int timeSigLower_;
    double duration_;

    // Parsing helpers
    void extractTracks(const SongModel_v1& model);
    void extractBuses(const SongModel_v1& model);
    void extractMasterBus(const SongModel_v1& model);
    void extractTempo(const SongModel_v1& model);
    void extractTimeSignature(const SongModel_v1& model);
    void extractDuration(const SongModel_v1& model);

    // Validation helpers
    bool validateTracks(const SongModel_v1& model) const;
    bool validateBuses(const SongModel_v1& model) const;
    bool validateConnections(const SongModel_v1& model) const;
    bool validateMaster(const SongModel_v1& model) const;

    // Extraction helpers
    static int getBusIndexById(const SongModel_v1& model, const std::string& busId);
};

/**
 * @brief Translate SongModel to audio graph
 *
 * Helper function that builds audio graph from SongModel.
 * Uses GraphBuilder internally.
 *
 * @param adapter SongModelAdapter with loaded SongModel
 * @return Audio graph (check isValid() before use)
 */
AudioGraph buildGraphFromSongModel(const SongModelAdapter& adapter);

} // namespace Integration

#endif // SONG_MODEL_ADAPTER_H_INCLUDED
