/*
 * SendReturnManager.h
 *
 * Manages send/return topology for effects
 *
 * Purpose: Handle pre-fader and post-fader sends, return channels
 *
 * Design Constraints:
 *  - Pre-fader sends (for sidechaining, monitoring)
 *  - Post-fader sends (for reverb, delay)
 *  - Configurable send level
 *  - Real-time safe (no allocations during processing)
 *
 * Created: December 30, 2025
 * Source: JUCE Backend Handoff Directive
 */

#ifndef SEND_RETURN_MANAGER_H_INCLUDED
#define SEND_RETURN_MANAGER_H_INCLUDED

#include <cstdint>
#include <vector>
#include <string>
#include <memory>

namespace Routing {

/**
 * @brief Send type (pre or post fader)
 */
enum class SendType : uint32_t {
    PRE_FADER,    // Before channel fader (for sidechaining, monitoring)
    POST_FADER    // After channel fader (for reverb, delay, parallel effects)
};

/**
 * @brief Send from track to bus
 */
struct Send {
    std::string sourceTrackId;    // Track sending from
    std::string destBusId;        // Bus receiving (return channel)
    SendType type;                // Pre or post fader
    float amount;                 // Send level (0.0 to 1.0)
    bool enabled;                 // Enable/disable

    // Pan for stereo sends (optional)
    float pan;                    // -1.0 (left) to +1.0 (right)

    Send() : type(SendType::POST_FADER), amount(0.0f), enabled(false), pan(0.0f) {}
};

/**
 * @brief Return channel (bus input)
 */
struct Return {
    std::string busId;            // Bus ID (matches send destBusId)
    std::string returnNodeId;     // Return node ID in graph

    // Return processing
    float* returnBuffer;          // Accumulated return audio
    uint32_t returnChannels;      // Number of channels (typically 2)
    uint32_t returnBufferSize;    // Buffer size in samples

    // Level control
    float returnGain;             // Return gain (0.0 to 2.0, 1.0 = unity)
    bool returnEnabled;           // Enable/disable

    Return() : returnBuffer(nullptr), returnChannels(2), returnBufferSize(0),
               returnGain(1.0f), returnEnabled(true) {}
};

/**
 * @brief Manages all sends and returns in the graph
 *
 * Responsibilities:
 *  - Track all sends from tracks to buses
 *  - Mix send signals into return buffers
 *  - Apply send levels and pan
 *  - Handle pre/post fader distinction
 *  - Real-time safe (no allocations during audio process)
 *
 * Signal Flow:
 *   Track → [Pre/Post-fader send] → Bus → [Bus effects] → Master
 */
class SendReturnManager {
public:
    SendReturnManager();
    ~SendReturnManager();

    /**
     * @brief Initialize send/return manager
     *
     * Allocate return buffers and initialize state.
     *
     * @param maxSends Maximum number of sends
     * @param maxReturns Maximum number of returns (buses)
     * @param maxBufferSize Maximum buffer size in samples
     * @param sampleRate Sample rate in Hz
     * @return true if initialization succeeded
     */
    bool initialize(int maxSends, int maxReturns, int maxBufferSize, double sampleRate);

    /**
     * @brief Reset all sends and returns
     *
     * Clear all return buffers, reset send levels.
     */
    void reset();

    /**
     * @brief Add a send from track to bus
     *
     * @param sourceTrackId Source track ID
     * @param destBusId Destination bus ID
     * @param type Pre or post fader
     * @param amount Send level (0.0 to 1.0)
     * @return Send ID (for later modification), or -1 on failure
     */
    int addSend(const std::string& sourceTrackId, const std::string& destBusId,
                SendType type, float amount);

    /**
     * @brief Remove a send
     *
     * @param sendId Send ID (returned by addSend)
     * @return true if send was removed
     */
    bool removeSend(int sendId);

    /**
     * @brief Update send amount
     *
     * @param sendId Send ID
     * @param amount New send level (0.0 to 1.0)
     */
    void setSendAmount(int sendId, float amount);

    /**
     * @brief Enable/disable send
     *
     * @param sendId Send ID
     * @param enabled Enable state
     */
    void setSendEnabled(int sendId, bool enabled);

    /**
     * @brief Add a return (bus)
     *
     * @param busId Bus ID
     * @param returnNodeId Return node ID in graph
     * @return Return ID, or -1 on failure
     */
    int addReturn(const std::string& busId, const std::string& returnNodeId);

    /**
     * @brief Remove a return
     *
     * @param returnId Return ID
     * @return true if return was removed
     */
    bool removeReturn(int returnId);

    /**
     * @brief Set return gain
     *
     * @param returnId Return ID
     * @param gain Return gain (0.0 to 2.0)
     */
    void setReturnGain(int returnId, float gain);

    /**
     * @brief Enable/disable return
     *
     * @param returnId Return ID
     * @param enabled Enable state
     */
    void setReturnEnabled(int returnId, bool enabled);

    /**
     * @brief Process audio through sends
     *
     * For each send, mix source audio into return buffer.
     * Call this for each track in the graph.
     *
     * @param trackId Track ID (to find sends)
     * @param audio Audio buffer [numChannels][numSamples]
     * @param numChannels Number of channels
     * @param numSamples Number of samples
     * @param trackFaderLevel Current track fader level (for post-fader sends)
     *
     * Thread safety: Called from audio thread only.
     */
    void processSends(const std::string& trackId, float** audio,
                      int numChannels, int numSamples, float trackFaderLevel);

    /**
     * @brief Get return buffer for a bus
     *
     * Returns the accumulated return audio for the specified bus.
     * Call this after processing all sends to get return audio.
     *
     * @param busId Bus ID
     * @param numChannels Number of channels requested
     * @return Return buffer [numChannels], or nullptr if bus not found
     *
     * Thread safety: Called from audio thread only.
     * Note: Buffer is valid until next clearReturns() call.
     */
    float** getReturnBuffer(const std::string& busId, int& numChannels);

    /**
     * @brief Clear all return buffers
     *
     * Call this at the start of each process cycle to clear return buffers.
     *
     * Thread safety: Called from audio thread only.
     */
    void clearReturns();

    /**
     * @brief Get send by ID
     *
     * @param sendId Send ID
     * @return Send pointer, or nullptr if not found
     */
    const Send* getSend(int sendId) const;

    /**
     * @brief Get return by ID
     *
     * @param returnId Return ID
     * @return Return pointer, or nullptr if not found
     */
    const Return* getReturn(int returnId) const;

    /**
     * @brief Get all sends for a track
     *
     * @param trackId Track ID
     * @return Vector of send IDs
     */
    std::vector<int> getSendsForTrack(const std::string& trackId) const;

    /**
     * @brief Get return ID for bus
     *
     * @param busId Bus ID
     * @return Return ID, or -1 if not found
     */
    int getReturnForBus(const std::string& busId) const;

private:
    std::vector<Send> sends_;
    std::vector<Return> returns_;

    // Buffer management
    std::vector<float*> returnBuffers_;
    int maxSends_;
    int maxReturns_;
    int maxBufferSize_;
    double sampleRate_;

    // Helper methods
    float* allocateReturnBuffer(int numChannels, int numSamples);
    void deallocateReturnBuffers();
    void mixSendToReturn(float* source, int sourceChannels,
                        float* dest, int destChannels,
                        int numSamples, float amount, float pan);
};

} // namespace Routing

#endif // SEND_RETURN_MANAGER_H_INCLUDED
