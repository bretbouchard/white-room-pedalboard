/*
  ffi_bridge.cpp - FFI bridge for SongModel transfer

  This file provides C functions that can be called from Swift/TypeScript
  to transfer SongModel data to the JUCE backend via FFI.

  Architecture:
    Swift/TypeScript → FFI Bridge → C++ ProjectionEngine
*/

#include "../include/projection_engine.h"
#include "../include/models/SongState_v1.h"
#include <juce_core/juce_core.h>
#include <cstring>
#include <memory>

// =============================================================================
// Global Projection Engine Instance
// =============================================================================

namespace {
    std::unique_ptr<white_room::audio::ProjectionEngine> globalProjectionEngine;
}

// =============================================================================
// FFI Functions - Song Management
// =============================================================================

extern "C" {

/**
 Initialize the ProjectionEngine

 Returns: 1 on success, 0 on failure
 */
int WR_Initialize() {
    try {
        if (!globalProjectionEngine) {
            globalProjectionEngine = std::make_unique<white_room::audio::ProjectionEngine>();
            globalProjectionEngine->prepare(44100.0, 512, 2);
            return 1;
        }
        return 1;  // Already initialized
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to initialize ProjectionEngine: " + std::string(e.what()));
        return 0;
    }
}

/**
 Load a SongState from JSON string

 Parameters:
   - songJson: JSON string representing SongState_v1

 Returns: 1 on success, 0 on failure
 */
int WR_LoadSongFromJson(const char* songJson) {
    if (!globalProjectionEngine) {
        juce::Logger::writeToLog("ProjectionEngine not initialized");
        return 0;
    }

    if (!songJson) {
        juce::Logger::writeToLog("Invalid JSON string");
        return 0;
    }

    try {
        std::string jsonStr(songJson);
        return globalProjectionEngine->loadSongFromJson(jsonStr) ? 1 : 0;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to load song: " + std::string(e.what()));
        return 0;
    }
}

/**
 Get current song ID

 Parameters:
   - buffer: Output buffer for song ID
   - bufferSize: Size of output buffer

 Returns: Number of bytes written, or -1 on error
 */
int WR_GetCurrentSongId(char* buffer, int bufferSize) {
    if (!globalProjectionEngine) {
        return -1;
    }

    try {
        std::string songId = globalProjectionEngine->getCurrentSongId();
        if (songId.empty()) {
            return 0;
        }

        int bytesToWrite = static_cast<int>(songId.length());
        if (bytesToWrite >= bufferSize) {
            bytesToWrite = bufferSize - 1;
        }

        std::memcpy(buffer, songId.c_str(), bytesToWrite);
        buffer[bytesToWrite] = '\0';

        return bytesToWrite;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to get song ID: " + std::string(e.what()));
        return -1;
    }
}

/**
 Clear current song
 */
void WR_ClearSong() {
    if (globalProjectionEngine) {
        globalProjectionEngine->clearSong();
    }
}

// =============================================================================
// FFI Functions - Performance Management
// =============================================================================

/**
 Switch to a different performance

 Parameters:
   - performanceId: ID of performance to switch to

 Returns: 1 on success, 0 on failure
 */
int WR_SwitchPerformance(const char* performanceId) {
    if (!globalProjectionEngine) {
        return 0;
    }

    if (!performanceId) {
        return 0;
    }

    try {
        std::string perfId(performanceId);
        return globalProjectionEngine->switchPerformance(perfId) ? 1 : 0;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to switch performance: " + std::string(e.what()));
        return 0;
    }
}

/**
 Get active performance ID

 Parameters:
   - buffer: Output buffer for performance ID
   - bufferSize: Size of output buffer

 Returns: Number of bytes written, or -1 on error
 */
int WR_GetActivePerformanceId(char* buffer, int bufferSize) {
    if (!globalProjectionEngine) {
        return -1;
    }

    try {
        std::string perfId = globalProjectionEngine->getActivePerformanceId();
        if (perfId.empty()) {
            return 0;
        }

        int bytesToWrite = static_cast<int>(perfId.length());
        if (bytesToWrite >= bufferSize) {
            bytesToWrite = bufferSize - 1;
        }

        std::memcpy(buffer, perfId.c_str(), bytesToWrite);
        buffer[bytesToWrite] = '\0';

        return bytesToWrite;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to get performance ID: " + std::string(e.what()));
        return -1;
    }
}

/**
 Get list of available performance IDs

 Parameters:
   - buffer: Output buffer for comma-separated performance IDs
   - bufferSize: Size of output buffer

 Returns: Number of bytes written, or -1 on error
 */
int WR_GetAvailablePerformanceIds(char* buffer, int bufferSize) {
    if (!globalProjectionEngine) {
        return -1;
    }

    try {
        std::vector<std::string> perfIds = globalProjectionEngine->getAvailablePerformanceIds();

        // Join with commas
        std::string result;
        for (size_t i = 0; i < perfIds.size(); ++i) {
            if (i > 0) result += ",";
            result += perfIds[i];
        }

        if (result.empty()) {
            return 0;
        }

        int bytesToWrite = static_cast<int>(result.length());
        if (bytesToWrite >= bufferSize) {
            bytesToWrite = bufferSize - 1;
        }

        std::memcpy(buffer, result.c_str(), bytesToWrite);
        buffer[bytesToWrite] = '\0';

        return bytesToWrite;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to get performance IDs: " + std::string(e.what()));
        return -1;
    }
}

// =============================================================================
// FFI Functions - Transport Control
// =============================================================================

/**
 Start playback

 Parameters:
   - startPosition: Start position in samples (0 for beginning)
 */
void WR_Play(double startPosition) {
    if (globalProjectionEngine) {
        globalProjectionEngine->play(startPosition);
    }
}

/**
 Stop playback
 */
void WR_Stop() {
    if (globalProjectionEngine) {
        globalProjectionEngine->stop();
    }
}

/**
 Pause playback
 */
void WR_Pause() {
    if (globalProjectionEngine) {
        globalProjectionEngine->pause();
    }
}

/**
 Resume playback
 */
void WR_Resume() {
    if (globalProjectionEngine) {
        globalProjectionEngine->resume();
    }
}

/**
 Set playback position

 Parameters:
   - position: Position in samples
 */
void WR_SetPosition(double position) {
    if (globalProjectionEngine) {
        globalProjectionEngine->setPosition(position);
    }
}

/**
 Get current playback position

 Returns: Current position in samples, or -1 on error
 */
double WR_GetPosition() {
    if (globalProjectionEngine) {
        return globalProjectionEngine->getPosition();
    }
    return -1.0;
}

/**
 Check if playing

 Returns: 1 if playing, 0 if not
 */
int WR_IsPlaying() {
    if (globalProjectionEngine) {
        return globalProjectionEngine->isPlaying() ? 1 : 0;
    }
    return 0;
}

// =============================================================================
// FFI Functions - Real-time Parameters
// =============================================================================

/**
 Set master gain

 Parameters:
   - gainDecibels: Gain in decibels
 */
void WR_SetMasterGain(double gainDecibels) {
    if (globalProjectionEngine) {
        globalProjectionEngine->setMasterGain(gainDecibels);
    }
}

/**
 Get master gain

 Returns: Current master gain in decibels, or -INFINITY on error
 */
double WR_GetMasterGain() {
    if (globalProjectionEngine) {
        return globalProjectionEngine->getMasterGain();
    }
    return -std::numeric_limits<double>::infinity();
}

/**
 Set tempo multiplier

 Parameters:
   - multiplier: Tempo multiplier (1.0 = normal, 0.5 = half, 2.0 = double)
 */
void WR_SetTempoMultiplier(double multiplier) {
    if (globalProjectionEngine) {
        globalProjectionEngine->setTempoMultiplier(multiplier);
    }
}

/**
 Get tempo multiplier

 Returns: Current tempo multiplier, or -1 on error
 */
double WR_GetTempoMultiplier() {
    if (globalProjectionEngine) {
        return globalProjectionEngine->getTempoMultiplier();
    }
    return -1.0;
}

// =============================================================================
// FFI Functions - Audio Processing
// =============================================================================

/**
 Process audio block

 This function is called from the audio thread.

 Parameters:
   - channels: Array of pointers to channel data
   - numChannels: Number of audio channels
   - numSamples: Number of samples per channel
 */
void WR_ProcessAudio(float** channels, int numChannels, int numSamples) {
    if (!globalProjectionEngine) {
        // Clear output if engine not initialized
        for (int ch = 0; ch < numChannels; ++ch) {
            juce::FloatVectorOperations::clear(channels[ch], numSamples);
        }
        return;
    }

    // Wrap channels in JUCE AudioBuffer
    juce::AudioBuffer<float> buffer(channels, numChannels, numSamples);

    // Process audio
    globalProjectionEngine->process(buffer);
}

/**
 Prepare for playback with new audio settings

 Parameters:
   - sampleRate: Sample rate in Hz
   - samplesPerBlock: Block size
   - numChannels: Number of channels
 */
void WR_Prepare(double sampleRate, int samplesPerBlock, int numChannels) {
    if (globalProjectionEngine) {
        globalProjectionEngine->prepare(sampleRate, samplesPerBlock, numChannels);
    }
}

/**
 Reset audio processing
 */
void WR_Reset() {
    if (globalProjectionEngine) {
        globalProjectionEngine->reset();
    }
}

// =============================================================================
// FFI Functions - State Query
// =============================================================================

/**
 Get current SongState as JSON

 Parameters:
   - buffer: Output buffer for JSON string
   - bufferSize: Size of output buffer

 Returns: Number of bytes written, or -1 on error
 */
int WR_GetSongStateJson(char* buffer, int bufferSize) {
    if (!globalProjectionEngine) {
        return -1;
    }

    try {
        auto songState = globalProjectionEngine->getCurrentSongState();
        if (!songState.has_value()) {
            return 0;
        }

        std::string json = songState.value().toJson();

        int bytesToWrite = static_cast<int>(json.length());
        if (bytesToWrite >= bufferSize) {
            bytesToWrite = bufferSize - 1;
        }

        std::memcpy(buffer, json.c_str(), bytesToWrite);
        buffer[bytesToWrite] = '\0';

        return bytesToWrite;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to get SongState JSON: " + std::string(e.what()));
        return -1;
    }
}

/**
 Get render statistics

 Parameters:
   - totalNotes: Output pointer for total note count
   - activeNotes: Output pointer for active note count
   - currentPosition: Output pointer for current position
   - tempo: Output pointer for tempo
   - beatsPerBar: Output pointer for beats per bar

 Returns: 1 on success, 0 on failure
 */
int WR_GetRenderStats(
    int* totalNotes,
    int* activeNotes,
    double* currentPosition,
    double* tempo,
    int* beatsPerBar
) {
    if (!globalProjectionEngine) {
        return 0;
    }

    try {
        auto stats = globalProjectionEngine->getRenderStats();

        if (totalNotes) *totalNotes = static_cast<int>(stats.totalNotes);
        if (activeNotes) *activeNotes = static_cast<int>(stats.activeNotes);
        if (currentPosition) *currentPosition = stats.currentPosition;
        if (tempo) *tempo = stats.tempo;
        if (beatsPerBar) *beatsPerBar = stats.beatsPerBar;

        return 1;
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to get render stats: " + std::string(e.what()));
        return 0;
    }
}

} // extern "C"
