/*
  ==============================================================================

    EngineController.h
    Created: December 30, 2025
    Author: Bret Bouchard

    Main controller for audio engine integration

    Coordinates SongModel, instruments, event queue, and transport.

  ==============================================================================
*/

#ifndef ENGINE_CONTROLLER_H_INCLUDED
#define ENGINE_CONTROLLER_H_INCLUDED

#include "SongModelAdapter.h"
#include "EventQueue.h"
#include "dsp/InstrumentDSP.h"

#include <memory>
#include <string>
#include <map>
#include <vector>

namespace Integration {

/**
 * @brief Transport state
 */
enum class TransportState {
    STOPPED,
    PLAYING,
    PAUSED
};

/**
 * @brief Engine configuration
 */
struct EngineConfig {
    double sampleRate = 48000.0;
    int blockSize = 512;
    int numOutputChannels = 2;
    int numInputChannels = 0;  // No input for now

    // Transport
    double tempo = 120.0;
    int timeSigUpper = 4;
    int timeSigLower = 4;

    // Looping (optional, for future use)
    bool loopEnabled = false;
    double loopStart = 0.0;
    double loopEnd = 0.0;
};

/**
 * @brief Main engine controller
 *
 * Coordinates:
 * - SongModel (song structure from SDK)
 * - Instruments (DSP instances)
 * - EventQueue (event scheduling)
 * - Transport (play/stop/seek)
 *
 * Thread safety:
 * - Audio thread: process(), handleEvents()
 * - Message thread: loadSong(), transport control
 * - UI thread: queries only (no mutations)
 */
class EngineController {
public:
    EngineController();
    ~EngineController();

    /**
     * @brief Initialize engine with configuration
     *
     * @param config Engine configuration
     * @return true if initialization succeeded
     */
    bool initialize(const EngineConfig& config);

    /**
     * @brief Shutdown engine
     *
     * Releases all resources and clears state.
     */
    void shutdown();

    /**
     * @brief Load SongModel from SDK
     *
     * Parses SongModel and creates all necessary instruments.
     * Events are scheduled in EventQueue.
     *
     * @param songModel Song model from SDK
     * @return true if load succeeded
     */
    bool loadSong(const SongModel_v1& songModel);

    /**
     * @brief Unload current song
     *
     * Stops playback and releases all instruments.
     */
    void unloadSong();

    /**
     * @brief Check if song is loaded
     *
     * @return true if song is loaded and ready
     */
    bool isSongLoaded() const;

    //==========================================================================
    // Transport Control
    //==========================================================================

    /**
     * @brief Start playback
     *
     * @return true if playback started
     */
    bool play();

    /**
     * @brief Stop playback
     *
     * @return true if playback stopped
     */
    bool stop();

    /**
     * @brief Pause playback
     *
     * @return true if playback paused
     */
    bool pause();

    /**
     * @brief Seek to position
     *
     * @param position Position in seconds
     * @return true if seek succeeded
     */
    bool seek(double position);

    /**
     * @brief Get current transport state
     *
     * @return Current transport state
     */
    TransportState getTransportState() const;

    /**
     * @brief Get current playhead position
     *
     * @return Position in seconds
     */
    double getCurrentPosition() const;

    //==========================================================================
    // Audio Processing (Real-time)
    //==========================================================================

    /**
     * @brief Process audio block
     *
     * Called from audio thread. Processes events and generates audio.
     *
     * @param outputs Output buffers [numChannels][numSamples]
     * @param numChannels Number of output channels
     * @param numSamples Number of samples to process
     *
     * Thread safety: Called from audio thread only.
     * Must not allocate memory.
     */
    void process(float** outputs, int numChannels, int numSamples);

    //==========================================================================
    // Information Queries
    //==========================================================================

    /**
     * @brief Get tempo
     *
     * @return Tempo in BPM
     */
    double getTempo() const;

    /**
     * @brief Set tempo
     *
     * @param tempo New tempo in BPM
     */
    void setTempo(double tempo);

    /**
     * @brief Get time signature
     *
     * @param upper Numerator (output)
     * @param lower Denominator (output)
     */
    void getTimeSignature(int& upper, int& lower) const;

    /**
     * @brief Get song duration
     *
     * @return Duration in seconds
     */
    double getSongDuration() const;

    /**
     * @brief Get track count
     *
     * @return Number of tracks
     */
    int getTrackCount() const;

    /**
     * @brief Get track info
     *
     * @param trackIndex Track index
     * @return Track information
     */
    TrackInfo getTrackInfo(int trackIndex) const;

    //==========================================================================
    // Instrument Access
    //==========================================================================

    /**
     * @brief Get instrument by track ID
     *
     * @param trackId Track identifier
     * @return Instrument pointer (do not delete), or nullptr
     */
    DSP::InstrumentDSP* getInstrument(const std::string& trackId);

    /**
     * @brief Get all instruments
     *
     * @return Map of track ID to instrument
     */
    const std::map<std::string, DSP::InstrumentDSP*>& getAllInstruments();

    //==========================================================================
    // Error Reporting
    //==========================================================================

    /**
     * @brief Get last error message
     *
     * @return Error message, or empty string if no error
     */
    std::string getLastError() const;

private:
    // Configuration
    EngineConfig config_;

    // Song model adapter
    std::unique_ptr<SongModelAdapter> songAdapter_;

    // Instruments (track ID -> DSP instance)
    std::map<std::string, DSP::InstrumentDSP*> instruments_;

    // Event queue
    std::unique_ptr<EventQueue> eventQueue_;

    // Transport state
    TransportState transportState_;
    double currentPosition_;  // In seconds
    double startPosition_;   // Where playback started (for loop)

    // Error reporting
    std::string lastError_;

    // Helper methods
    bool createInstruments();
    void destroyInstruments();
    void scheduleAllEvents();
    void advanceTime(double deltaTime);
};

} // namespace Integration

#endif // ENGINE_CONTROLLER_H_INCLUDED
