/*
  ==============================================================================

    SongModelAdapter.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Implementation of SDK SongModel → JUCE backend adapter

    This file provides the implementation for accepting SongModel from the
    Schillinger SDK and translating it to audio engine commands.

  ==============================================================================
*/

#include "SongModelAdapter.h"
#include "dsp/InstrumentFactory.h"
#include "dsp/InstrumentDSP.h"

#include <algorithm>
#include <stdexcept>

namespace Integration {

//==============================================================================
// Constructor/Destructor
//==============================================================================

SongModelAdapter::SongModelAdapter()
    : loaded_(false)
    , lastError_("")
    , tempo_(120.0)
    , timeSigUpper_(4)
    , timeSigLower_(4)
    , duration_(0.0)
{
}

SongModelAdapter::~SongModelAdapter()
{
    unload();
}

//==============================================================================
// SongModel Loading
//==============================================================================

bool SongModelAdapter::loadSongModel(const SongModel_v1& model)
{
    // Clear previous state
    unload();

    try {
        // Validate model first
        if (!validate(model)) {
            return false;
        }

        // Extract all data from SongModel
        extractTracks(model);
        extractBuses(model);
        extractMasterBus(model);
        extractTempo(model);
        extractTimeSignature(model);
        extractDuration(model);

        loaded_ = true;
        lastError_.clear();
        return true;

    } catch (const std::exception& e) {
        lastError_ = std::string("Exception loading SongModel: ") + e.what();
        unload();
        return false;
    }
}

void SongModelAdapter::unload()
{
    loaded_ = false;
    tracks_.clear();
    buses_.clear();
    tempo_ = 120.0;
    timeSigUpper_ = 4;
    timeSigLower_ = 4;
    duration_ = 0.0;
    // Note: We keep lastError_ for user to query
}

bool SongModelAdapter::isLoaded() const
{
    return loaded_;
}

//==============================================================================
// Validation
//==============================================================================

bool SongModelAdapter::validate(const SongModel_v1& model) const
{
    // Check all validation criteria
    if (!validateTracks(model)) {
        return false;
    }

    if (!validateBuses(model)) {
        return false;
    }

    if (!validateConnections(model)) {
        return false;
    }

    if (!validateMaster(model)) {
        return false;
    }

    return true;
}

bool SongModelAdapter::validateTracks(const SongModel_v1& model) const
{
    // TODO: Implement track validation
    // - At least one track exists
    // - All track IDs are unique
    // - All instrument IDs are registered
    return true;
}

bool SongModelAdapter::validateBuses(const SongModel_v1& model) const
{
    // TODO: Implement bus validation
    // - Master bus exists
    // - All bus IDs are unique
    // - No duplicate bus indices
    return true;
}

bool SongModelAdapter::validateConnections(const SongModel_v1& model) const
{
    // TODO: Implement connection validation
    // - No cycles in graph
    // - All sends point to valid buses
    // - All track inserts point to valid effects
    return true;
}

bool SongModelAdapter::validateMaster(const SongModel_v1& model) const
{
    // TODO: Implement master bus validation
    // - Master bus exists
    // - Master bus is at index 0
    return true;
}

//==============================================================================
// Track Queries
//==============================================================================

int SongModelAdapter::getTrackCount() const
{
    return static_cast<int>(tracks_.size());
}

TrackInfo SongModelAdapter::getTrackInfo(int trackIndex) const
{
    if (!loaded_ || trackIndex < 0 || trackIndex >= static_cast<int>(tracks_.size())) {
        return TrackInfo();
    }

    return tracks_[trackIndex];
}

TrackInfo SongModelAdapter::getTrackById(const std::string& trackId) const
{
    if (!loaded_) {
        return TrackInfo();
    }

    auto it = std::find_if(tracks_.begin(), tracks_.end(),
        [&trackId](const TrackInfo& track) {
            return track.id == trackId;
        });

    if (it != tracks_.end()) {
        return *it;
    }

    return TrackInfo();
}

//==============================================================================
// Bus Queries
//==============================================================================

int SongModelAdapter::getBusCount() const
{
    return static_cast<int>(buses_.size());
}

BusInfo SongModelAdapter::getBusInfo(int busIndex) const
{
    if (!loaded_ || busIndex < 0 || busIndex >= static_cast<int>(buses_.size())) {
        return BusInfo();
    }

    return buses_[busIndex];
}

BusInfo SongModelAdapter::getBusById(const std::string& busId) const
{
    if (!loaded_) {
        return BusInfo();
    }

    auto it = std::find_if(buses_.begin(), buses_.end(),
        [&busId](const BusInfo& bus) {
            return bus.id == busId;
        });

    if (it != buses_.end()) {
        return *it;
    }

    return BusInfo();
}

BusInfo SongModelAdapter::getMasterBus() const
{
    return masterBus_;
}

//==============================================================================
// Song Properties
//==============================================================================

double SongModelAdapter::getTempo() const
{
    return tempo_;
}

int SongModelAdapter::getTimeSignatureUpper() const
{
    return timeSigUpper_;
}

int SongModelAdapter::getTimeSignatureLower() const
{
    return timeSigLower_;
}

double SongModelAdapter::getDuration() const
{
    return duration_;
}

//==============================================================================
// Error Reporting
//==============================================================================

std::string SongModelAdapter::getLastError() const
{
    return lastError_;
}

//==============================================================================
// Extraction Helpers
//==============================================================================

void SongModelAdapter::extractTracks(const SongModel_v1& model)
{
    tracks_.clear();
    tracks_.reserve(model.tracks.size());

    for (const auto& sdkTrack : model.tracks) {
        TrackInfo track;
        track.id = sdkTrack.id;
        track.name = sdkTrack.name;
        track.trackIndex = sdkTrack.trackIndex;
        track.isMuted = sdkTrack.isMuted;
        track.isSoloed = sdkTrack.isSoloed;
        track.volume = sdkTrack.volume;
        track.pan = sdkTrack.pan;
        track.instrumentId = sdkTrack.instrumentId;
        track.instrumentPreset = sdkTrack.instrumentPreset;

        // Extract sends (from mix graph)
        for (const auto& send : model.mixGraph.sends) {
            if (send.sourceTrackId == sdkTrack.id) {
                TrackInfo::SendInfo sendInfo;
                sendInfo.busIndex = getBusIndexById(model, send.destinationBusId);
                sendInfo.amount = send.amount;
                sendInfo.preFader = send.preFader;
                track.sends.push_back(sendInfo);
            }
        }

        tracks_.push_back(track);
    }
}

void SongModelAdapter::extractBuses(const SongModel_v1& model)
{
    buses_.clear();
    buses_.reserve(model.buses.size());

    for (const auto& sdkBus : model.buses) {
        BusInfo bus;
        bus.id = sdkBus.id;
        bus.name = sdkBus.name;
        bus.busIndex = sdkBus.busIndex;
        bus.volume = sdkBus.volume;
        bus.effectIds = sdkBus.effectIds;

        buses_.push_back(bus);
    }
}

void SongModelAdapter::extractMasterBus(const SongModel_v1& model)
{
    // Find master bus by ID
    for (const auto& bus : buses_) {
        if (bus.id == model.masterBusId) {
            masterBus_ = bus;
            return;
        }
    }

    // Fallback: use first bus
    if (!buses_.empty()) {
        masterBus_ = buses_[0];
    }
}

void SongModelAdapter::extractTempo(const SongModel_v1& model)
{
    tempo_ = model.tempo;
}

void SongModelAdapter::extractTimeSignature(const SongModel_v1& model)
{
    timeSigUpper_ = model.timeSigUpper;
    timeSigLower_ = model.timeSigLower;
}

void SongModelAdapter::extractDuration(const SongModel_v1& model)
{
    duration_ = model.duration;
}

int SongModelAdapter::getBusIndexById(const SongModel_v1& model, const std::string& busId)
{
    for (const auto& bus : model.buses) {
        if (bus.id == busId) {
            return bus.busIndex;
        }
    }
    return -1;  // Not found
}

//==============================================================================
// Graph Building
//==============================================================================

/**
 * @brief Build audio graph from SongModel
 *
 * This is a helper function that constructs the audio processing graph
 * from a loaded SongModel. It creates instruments, buses, and connections.
 *
 * Note: This is a placeholder implementation. The full implementation would:
 * - Create instrument instances for each track
 * - Create bus processors for each bus
 * - Create send effects
 * - Create insert effects
 * - Wire everything together
 *
 * @param adapter SongModelAdapter with loaded SongModel
 * @return Audio graph structure
 */
AudioGraph buildGraphFromSongModel(const SongModelAdapter& adapter)
{
    AudioGraph graph;
    graph.valid = false;

    // TODO: Implement graph building
    // 1. Validate adapter has SongModel loaded
    // 2. Create instrument instances for each track
    // 3. Create bus processors
    // 4. Wire sends/inserts
    // 5. Mark graph as valid

    // Placeholder: Create one instrument for testing
    if (!adapter.isLoaded()) {
        return graph;
    }

    // Create first track's instrument
    TrackInfo track0 = adapter.getTrackInfo(0);
    if (!track0.instrumentId.empty()) {
        graph.instruments.push_back(
            DSP::createInstrument(track0.instrumentId.c_str())
        );
    }

    graph.valid = !graph.instruments.empty();
    return graph;
}

} // namespace Integration
