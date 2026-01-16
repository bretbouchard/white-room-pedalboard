/*
  ==============================================================================

    EngineController.cpp
    Created: December 30, 2025
    Author: Bret Bouchard

    Implementation of main audio engine controller

  ==============================================================================
*/

#include "EngineController.h"
#include "dsp/InstrumentFactory.h"

#include <algorithm>
#include <stdexcept>

namespace Integration {

//==============================================================================
// Constructor/Destructor
//==============================================================================

EngineController::EngineController()
    : songAdapter_(nullptr)
    , eventQueue_(nullptr)
    , transportState_(TransportState::STOPPED)
    , currentPosition_(0.0)
    , startPosition_(0.0)
{
}

EngineController::~EngineController()
{
    shutdown();
}

//==============================================================================
// Initialization
//==============================================================================

bool EngineController::initialize(const EngineConfig& config)
{
    // Validate configuration
    if (config.sampleRate <= 0.0 || config.blockSize <= 0) {
        lastError_ = "Invalid configuration (sample rate or block size)";
        return false;
    }

    config_ = config;

    // Create song adapter
    songAdapter_ = std::make_unique<SongModelAdapter>();
    if (!songAdapter_) {
        lastError_ = "Failed to create song adapter";
        return false;
    }

    // Create event queue
    eventQueue_ = std::make_unique<EventQueue>();
    if (!eventQueue_) {
        lastError_ = "Failed to create event queue";
        return false;
    }

    // Initialize event queue
    if (!eventQueue_->initialize(config_.sampleRate)) {
        lastError_ = "Failed to initialize event queue";
        return false;
    }

    lastError_.clear();
    return true;
}

void EngineController::shutdown()
{
    unloadSong();
    songAdapter_.reset();
    eventQueue_.reset();
}

//==============================================================================
// Song Loading
//==============================================================================

bool EngineController::loadSong(const SongModel_v1& songModel)
{
    // Unload previous song
    unloadSong();

    // Load song into adapter
    if (!songAdapter_->loadSongModel(songModel)) {
        lastError_ = "Failed to load SongModel: " + songAdapter_->getLastError();
        return false;
    }

    // Create instruments for tracks
    if (!createInstruments()) {
        lastError_ = "Failed to create instruments";
        unloadSong();
        return false;
    }

    // Schedule all events from song
    scheduleAllEvents();

    // Reset transport
    transportState_ = TransportState::STOPPED;
    currentPosition_ = 0.0;
    startPosition_ = 0.0;

    lastError_.clear();
    return true;
}

void EngineController::unloadSong()
{
    // Stop playback
    stop();

    // Destroy all instruments
    destroyInstruments();

    // Unload song adapter
    if (songAdapter_) {
        songAdapter_->unload();
    }

    // Clear event queue
    if (eventQueue_) {
        eventQueue_->clear();
    }
}

bool EngineController::isSongLoaded() const
{
    return songAdapter_ && songAdapter_->isLoaded();
}

//==============================================================================
// Transport Control
//==============================================================================

bool EngineController::play()
{
    if (!isSongLoaded()) {
        lastError_ = "No song loaded";
        return false;
    }

    transportState_ = TransportState::PLAYING;
    startPosition_ = currentPosition_;
    lastError_.clear();
    return true;
}

bool EngineController::stop()
{
    transportState_ = TransportState::STOPPED;
    currentPosition_ = 0.0;
    lastError_.clear();
    return true;
}

bool EngineController::pause()
{
    if (transportState_ == TransportState::PLAYING) {
        transportState_ = TransportState::PAUSED;
        lastError_.clear();
        return true;
    }

    lastError_ = "Cannot pause (not playing)";
    return false;
}

bool EngineController::seek(double position)
{
    if (position < 0.0 || position > getSongDuration()) {
        lastError_ = "Invalid seek position";
        return false;
    }

    currentPosition_ = position;

    // If we're seeking during playback, update start position
    if (transportState_ == TransportState::PLAYING) {
        startPosition_ = currentPosition_;
    }

    lastError_.clear();
    return true;
}

TransportState EngineController::getTransportState() const
{
    return transportState_;
}

double EngineController::getCurrentPosition() const
{
    return currentPosition_;
}

//==============================================================================
// Audio Processing
//==============================================================================

void EngineController::process(float** outputs, int numChannels, int numSamples)
{
    // Clear output buffers
    for (int ch = 0; ch < numChannels; ++ch) {
        if (outputs[ch]) {
            std::fill(outputs[ch], outputs[ch] + numSamples, 0.0f);
        }
    }

    // Only process if playing
    if (transportState_ != TransportState::PLAYING) {
        return;
    }

    // Calculate time for this block
    double blockDuration = static_cast<double>(numSamples) / config_.sampleRate;

    // Process events due in this time range
    eventQueue_->processEvents(currentPosition_, instruments_);

    // Process each instrument
    for (auto& pair : instruments_) {
        if (pair.second) {
            pair.second->process(outputs, numChannels, numSamples);
        }
    }

    // Advance time
    advanceTime(blockDuration);

    // Handle looping
    if (config_.loopEnabled && currentPosition_ >= config_.loopEnd) {
        currentPosition_ = config_.loopStart;
        startPosition_ = currentPosition_;
    }

    // Check for song end
    double duration = getSongDuration();
    if (duration > 0.0 && currentPosition_ >= duration) {
        transportState_ = TransportState::STOPPED;
        currentPosition_ = 0.0;
        startPosition_ = 0.0;
    }
}

//==============================================================================
// Information Queries
//==============================================================================

double EngineController::getTempo() const
{
    return songAdapter_ ? songAdapter_->getTempo() : config_.tempo;
}

void EngineController::setTempo(double tempo)
{
    if (tempo > 0.0 && tempo <= 300.0) {  // Reasonable range
        config_.tempo = tempo;
    }
}

void EngineController::getTimeSignature(int& upper, int& lower) const
{
    if (songAdapter_) {
        upper = songAdapter_->getTimeSignatureUpper();
        lower = songAdapter_->getTimeSignatureLower();
    } else {
        upper = config_.timeSigUpper;
        lower = config_.timeSigLower;
    }
}

double EngineController::getSongDuration() const
{
    return songAdapter_ ? songAdapter_->getDuration() : 0.0;
}

int EngineController::getTrackCount() const
{
    return songAdapter_ ? songAdapter_->getTrackCount() : 0;
}

TrackInfo EngineController::getTrackInfo(int trackIndex) const
{
    return songAdapter_ ? songAdapter_->getTrackInfo(trackIndex) : TrackInfo();
}

//==============================================================================
// Instrument Access
//==============================================================================

DSP::InstrumentDSP* EngineController::getInstrument(const std::string& trackId)
{
    auto it = instruments_.find(trackId);
    if (it != instruments_.end()) {
        return it->second;
    }
    return nullptr;
}

const std::map<std::string, DSP::InstrumentDSP*>& EngineController::getAllInstruments()
{
    return instruments_;
}

//==============================================================================
// Error Reporting
//==============================================================================

std::string EngineController::getLastError() const
{
    return lastError_;
}

//==============================================================================
// Helper Methods
//==============================================================================

bool EngineController::createInstruments()
{
    if (!songAdapter_ || !songAdapter_->isLoaded()) {
        return false;
    }

    int trackCount = songAdapter_->getTrackCount();

    for (int i = 0; i < trackCount; ++i) {
        TrackInfo track = songAdapter_->getTrackInfo(i);

        // Skip if no instrument assigned
        if (track.instrumentId.empty()) {
            continue;
        }

        // Create instrument
        DSP::InstrumentDSP* instrument = DSP::createInstrument(track.instrumentId.c_str());

        if (!instrument) {
            return false;
        }

        // Prepare instrument
        if (!instrument->prepare(config_.sampleRate, config_.blockSize)) {
            delete instrument;
            return false;
        }

        // Store instrument
        instruments_[track.id] = instrument;
    }

    return true;
}

void EngineController::destroyInstruments()
{
    for (auto& pair : instruments_) {
        if (pair.second) {
            delete pair.second;
            pair.second = nullptr;
        }
    }
    instruments_.clear();
}

void EngineController::scheduleAllEvents()
{
    if (!songAdapter_ || !eventQueue_) {
        return;
    }

    int trackCount = songAdapter_->getTrackCount();

    for (int i = 0; i < trackCount; ++i) {
        TrackInfo track = songAdapter_->getTrackInfo(i);

        // Schedule note events
        // Note: This is a placeholder - actual note data would come from SongModel
        // For now, we rely on the SDK to provide events via ScheduledEvent API

        // Future implementation will extract notes from SongModel tracks:
        // for (const auto& note : track.notes) {
        //     QueuedEvent noteOn;
        //     noteOn.time = note.startTime;
        //     noteOn.type = EventType::NOTE_ON;
        //     noteOn.targetTrackId = track.id;
        //     noteOn.data.note.midiNote = note.midiNote;
        //     noteOn.data.note.velocity = note.velocity;
        //     eventQueue_->scheduleEvent(noteOn);
        //
        //     QueuedEvent noteOff;
        //     noteOff.time = note.startTime + note.duration;
        //     noteOff.type = EventType::NOTE_OFF;
        //     noteOff.targetTrackId = track.id;
        //     noteOff.data.note.midiNote = note.midiNote;
        //     noteOff.data.note.velocity = 0.0f;
        //     eventQueue_->scheduleEvent(noteOff);
        // }
    }
}

void EngineController::advanceTime(double deltaTime)
{
    currentPosition_ += deltaTime;
}

} // namespace Integration
