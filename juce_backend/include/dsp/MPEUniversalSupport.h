/*
  ==============================================================================

   MPESupport.h
   Universal MPE (MIDI Polyphonic Expression) Support for All Giant Instruments

   Provides:
   - MPE zone detection and configuration
   - Per-note gesture mapping (Pressure→Force, Timbre→Speed, Bend→Roughness)
   - Smooth parameter transitions
   - Works with all giant instruments through shared gesture system

   Benefits per instrument:
   - Giant Strings: Per-note pluck intensity, velocity, finger texture
   - Giant Drums: Per-note strike force, stick speed, stick hardness
   - Giant Voice: Per-note breath pressure, articulation, vocal texture
   - Giant Horns: Per-note lip pressure, attack speed, breath turbulence
   - Giant Percussion: Per-note strike force, mallet speed, mallet hardness

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <vector>
#include <map>
#include <memory>

//==============================================================================
/**
 * MPE zone configuration
 */
struct MPEZone
{
    bool isActive = false;
    int masterChannel = 0;
    int numMemberChannels = 0;     // Number of channels in zone
    int pitchBendRange = 48;       // Semitones (default for MPE)

    // Zone bounds
    int lowerChannel = 0;
    int upperChannel = 0;

    bool isValid() const
    {
        return isActive && numMemberChannels > 0 && numMemberChannels <= 16;
    }
};

//==============================================================================
/**
 * Per-note MPE state
 *
 * Tracks MPE values for each active note across all instruments
 */
struct MPENoteState
{
    int midiNote = -1;
    int midiChannel = 0;
    float velocity = 0.0f;

    // MPE values
    float pitchBend = 0.0f;        // -1.0 to 1.0 (normalized)
    float pressure = 0.0f;          // 0.0 to 1.0
    float timbre = 0.0f;            // 0.0 to 1.0

    // Smoothed values (for zipper-free modulation)
    float smoothedPitchBend = 0.0f;
    float smoothedPressure = 0.0f;
    float smoothedTimbre = 0.0f;

    // Gesture mapping output
    struct GestureValues
    {
        float force = 0.5f;
        float speed = 0.5f;
        float contactArea = 0.5f;
        float roughness = 0.3f;
    };

    GestureValues gestures;

    bool isActive = false;

    //==============================================================================
    void updateGestures(const struct MPEGestureMapping& mapping);

    void smoothValues(float smoothingTime, double sampleRate);

    //==============================================================================
    // Voice tracking
    int voiceId = -1;               // Associated voice ID (if assigned)
    double startTime = 0.0;        // When note started
};

//==============================================================================
/**
 * MPE gesture mapping configuration
 *
 * Defines how MPE messages map to giant instrument gestures
 */
struct MPEGestureMapping
{
    // Direct mappings
    float pressureToForce = 1.0f;           // Pressure → Force
    float pressureToContactArea = 0.0f;      // Pressure → Contact Area (optional)

    float timbreToSpeed = 0.5f;              // Timbre → Speed
    float timbreToContactArea = 0.0f;        // Timbre → Contact Area (optional)

    float pitchBendToRoughness = 0.3f;       // Pitch Bend → Roughness
    float pitchBendToForce = 0.0f;           // Pitch Bend → Force (optional)

    bool invertPressure = false;
    bool invertTimbre = false;
    bool invertPitchBend = false;

    // Smoothing
    float pressureSmoothing = 0.02f;         // Seconds
    float timbreSmoothing = 0.02f;           // Seconds
    float pitchBendSmoothing = 0.01f;        // Seconds

    //==============================================================================
    // Apply mapping from MPE state to gestures
    MPENoteState::GestureValues applyMapping(const MPENoteState& noteState) const
    {
        MPENoteState::GestureValues g;

        // Pressure mappings
        float p = noteState.smoothedPressure;
        if (invertPressure) p = 1.0f - p;

        g.force = p * pressureToForce;
        g.contactArea = 0.5f * (1.0f - pressureToForce) + p * pressureToContactArea;

        // Timbre mappings
        float t = noteState.smoothedTimbre;
        if (invertTimbre) t = 1.0f - t;

        g.speed = t * timbreToSpeed;
        g.contactArea += t * timbreToContactArea;

        // Pitch bend mappings
        float b = std::abs(noteState.smoothedPitchBend);
        if (invertPitchBend) b = 1.0f - b;

        g.roughness = b * pitchBendToRoughness;
        g.force += b * pitchBendToForce;

        // Clamp values
        g.force = juce::jlimit(0.0f, 1.0f, g.force);
        g.speed = juce::jlimit(0.0f, 1.0f, g.speed);
        g.contactArea = juce::jlimit(0.0f, 1.0f, g.contactArea);
        g.roughness = juce::jlimit(0.0f, 1.0f, g.roughness);

        return g;
    }
};

//==============================================================================
/**
 * MPE Zone Detector and Manager
 *
 * Handles MPE zone configuration via RPN messages
 * Tracks which channels belong to which zone
 */
class MPEZoneDetector
{
public:
    MPEZoneDetector();
    ~MPEZoneDetector() = default;

    //==============================================================================
    /** Reset all zones to inactive state */
    void reset();

    /** Process RPN/NRPN messages to detect MPE zone configuration */
    void processMIDI(const juce::MidiMessage& msg);

    /** Check if a channel is in an MPE zone */
    bool isInMPEZone(int channel) const;

    /** Get zone for a channel */
    const MPEZone* getZoneForChannel(int channel) const;

    //==============================================================================
    /** Get lower zone (if active) */
    const MPEZone& getLowerZone() const { return lowerZone; }

    /** Get upper zone (if active) */
    const MPEZone& getUpperZone() const { return upperZone; }

    /** Check if any MPE zones are active */
    bool hasActiveMPEZones() const { return lowerZone.isActive || upperZone.isActive; }

private:
    MPEZone lowerZone;
    MPEZone upperZone;

    // RPN parsing state per channel
    struct RPNState
    {
        bool isRPN = true;
        int parameterMSB = 0;
        int parameterLSB = 0;
        int valueMSB = 0;
        int valueLSB = 0;
    };

    std::map<int, RPNState> rpnStates;

    //==============================================================================
    // RPN numbers for MPE
    enum RPNParameters
    {
        MPE_ZONE_LAYOUT_RPN = 0x0006
    };

    // Zone layout values
    enum ZoneLayoutValues
    {
        ZONE_LAYOUT_LOWER = 0x0000,
        ZONE_LAYOUT_UPPER = 0x0001,
        ZONE_LAYOUT_UPPER_AND_LOWER = 0x0002
    };

    void parseRPN(int channel, int parameterMSB, int parameterLSB,
                  int valueMSB, int valueLSB);
    void configureZone(bool isUpper, int numMemberChannels, int pitchBendRange);
};

//==============================================================================
/**
 * MPE Note Tracker
 *
 * Tracks per-note MPE state for all active notes
 */
class MPENoteTracker
{
public:
    MPENoteTracker();
    ~MPENoteTracker() = default;

    //==============================================================================
    /** Reset all note states */
    void reset();

    /** Process MIDI message and update note states */
    void processMIDI(const juce::MidiMessage& msg, const MPEZoneDetector& zoneDetector);

    /** Get state for a note */
    const MPENoteState* getNoteState(int noteNumber, int midiChannel) const;

    /** Get all active note states */
    const std::vector<MPENoteState>& getActiveNotes() const { return activeNotes; }

    /** Remove a note (when note off) */
    void removeNote(int noteNumber, int midiChannel);

    //==============================================================================
    /** Set gesture mapping */
    void setGestureMapping(const MPEGestureMapping& mapping) { gestureMapping = mapping; }

    /** Get gesture mapping */
    const MPEGestureMapping& getGestureMapping() const { return gestureMapping; }

    //==============================================================================
    /** Update smoothed values (call once per block) */
    void updateSmoothing(double sampleRate, int samplesPerBlock);

private:
    std::vector<MPENoteState> activeNotes;
    MPEGestureMapping gestureMapping;

    MPENoteState* findOrCreateNoteState(int noteNumber, int midiChannel);
    MPENoteState* findNoteState(int noteNumber, int midiChannel);
    const MPENoteState* findNoteState(int noteNumber, int midiChannel) const;

    void processNoteOn(const juce::MidiMessage& msg);
    void processNoteOff(const juce::MidiMessage& msg);
    void processPitchBend(const juce::MidiMessage& msg);
    void processChannelPressure(const juce::MidiMessage& msg);
    void processController(const juce::MidiMessage& msg);
};

//==============================================================================
/**
 * Universal MPE Support Class
 *
 * Integrates MPE zone detection, note tracking, and gesture mapping
 * for all giant instruments.
 */
class MPEUniversalSupport
{
public:
    MPEUniversalSupport();
    ~MPEUniversalSupport() = default;

    //==============================================================================
    /** Initialize MPE support */
    void prepare(double sampleRate);

    /** Reset all MPE state */
    void reset();

    //==============================================================================
    /** Process MIDI messages and update MPE state */
    void processMIDI(const juce::MidiBuffer& midiMessages);

    /** Update smoothing (call once per audio block) */
    void updateSmoothing(double sampleRate, int samplesPerBlock);

    //==============================================================================
    /** Get gesture values for a note */
    MPENoteState::GestureValues getGestureValues(int noteNumber, int midiChannel) const;

    /** Check if MPE is active */
    bool isActive() const;

    //==============================================================================
    /** Configure gesture mapping */
    void setGestureMapping(const MPEGestureMapping& mapping);
    MPEGestureMapping getGestureMapping() const;

    //==============================================================================
    /** Get zone detector (for querying) */
    const MPEZoneDetector& getZoneDetector() const { return zoneDetector; }

    /** Get note tracker (for querying) */
    const MPENoteTracker& getNoteTracker() const { return noteTracker; }

private:
    MPEZoneDetector zoneDetector;
    MPENoteTracker noteTracker;

    double sampleRate = 48000.0;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MPEUniversalSupport)
};

//==============================================================================
// MPEZoneDetector Implementation
//==============================================================================

inline MPEZoneDetector::MPEZoneDetector()
{
    reset();
}

inline void MPEZoneDetector::reset()
{
    lowerZone.isActive = false;
    lowerZone.masterChannel = 0;
    lowerZone.numMemberChannels = 0;
    lowerZone.lowerChannel = 0;
    lowerZone.upperChannel = 0;

    upperZone.isActive = false;
    upperZone.masterChannel = 15;
    upperZone.numMemberChannels = 0;
    upperZone.lowerChannel = 0;
    upperZone.upperChannel = 0;

    rpnStates.clear();
}

inline void MPEZoneDetector::processMIDI(const juce::MidiMessage& msg)
{
    if (!msg.isController() && !msg.isPitchWheel())
        return;

    int channel = msg.getChannel() - 1; // 0-indexed

    // Initialize RPN state for this channel if needed
    if (rpnStates.find(channel) == rpnStates.end())
    {
        rpnStates[channel] = RPNState();
    }

    auto& state = rpnStates[channel];

    // Process CC messages for RPN
    if (msg.isController())
    {
        int ccNumber = msg.getControllerNumber();
        int ccValue = msg.getControllerValue();

        switch (ccNumber)
        {
            case 101: // RPN MSB
                state.isRPN = true;
                state.parameterMSB = ccValue;
                break;

            case 100: // RPN LSB
                state.parameterLSB = ccValue;
                break;

            case 6: // Data Entry MSB
                state.valueMSB = ccValue;
                parseRPN(channel, state.parameterMSB, state.parameterLSB,
                        state.valueMSB, state.valueLSB);
                break;

            case 38: // Data Entry LSB
                state.valueLSB = ccValue;
                break;

            case 98: // NRPN LSB
                state.isRPN = false;
                state.parameterLSB = ccValue;
                break;

            case 99: // NRPN MSB
                state.isRPN = false;
                state.parameterMSB = ccValue;
                break;
        }
    }
}

inline bool MPEZoneDetector::isInMPEZone(int channel) const
{
    return getZoneForChannel(channel) != nullptr;
}

inline const MPEZone* MPEZoneDetector::getZoneForChannel(int channel) const
{
    if (lowerZone.isActive && channel >= lowerZone.lowerChannel &&
        channel <= lowerZone.upperChannel)
        return &lowerZone;

    if (upperZone.isActive && channel >= upperZone.lowerChannel &&
        channel <= upperZone.upperChannel)
        return &upperZone;

    return nullptr;
}

inline void MPEZoneDetector::parseRPN(int channel, int parameterMSB,
                                      int parameterLSB, int valueMSB, int valueLSB)
{
    juce::ignoreUnused(channel, valueLSB);

    int parameter = (parameterMSB << 7) | parameterLSB;

    if (parameter == MPE_ZONE_LAYOUT_RPN)
    {
        switch (valueMSB)
        {
            case ZONE_LAYOUT_LOWER:
                configureZone(false, 0, 48); // Default lower zone settings
                break;

            case ZONE_LAYOUT_UPPER:
                configureZone(true, 0, 48); // Default upper zone settings
                break;

            case ZONE_LAYOUT_UPPER_AND_LOWER:
                configureZone(false, 0, 48); // Configure both
                configureZone(true, 0, 48);
                break;
        }
    }
}

inline void MPEZoneDetector::configureZone(bool isUpper, int numMemberChannels,
                                          int pitchBendRange)
{
    auto& zone = isUpper ? upperZone : lowerZone;

    zone.isActive = (numMemberChannels > 0);
    zone.numMemberChannels = juce::jlimit(0, 16, numMemberChannels);
    zone.pitchBendRange = pitchBendRange;

    if (isUpper)
    {
        zone.masterChannel = 15;
        zone.lowerChannel = 15 - numMemberChannels;
        zone.upperChannel = 15;
    }
    else
    {
        zone.masterChannel = 0;
        zone.lowerChannel = 0;
        zone.upperChannel = numMemberChannels;
    }
}

//==============================================================================
// MPENoteTracker Implementation
//==============================================================================

inline MPENoteTracker::MPENoteTracker()
{
    reset();
}

inline void MPENoteTracker::reset()
{
    activeNotes.clear();
}

inline void MPENoteTracker::processMIDI(const juce::MidiMessage& msg,
                                       const MPEZoneDetector& zoneDetector)
{
    if (msg.isNoteOn())
    {
        processNoteOn(msg);
    }
    else if (msg.isNoteOff())
    {
        processNoteOff(msg);
    }
    else if (msg.isPitchWheel())
    {
        processPitchBend(msg);
    }
    else if (msg.isChannelPressure())
    {
        processChannelPressure(msg);
    }
    else if (msg.isController())
    {
        processController(msg);
    }
}

inline const MPENoteState* MPENoteTracker::getNoteState(int noteNumber,
                                                        int midiChannel) const
{
    return findNoteState(noteNumber, midiChannel);
}

inline void MPENoteTracker::removeNote(int noteNumber, int midiChannel)
{
    auto it = std::remove_if(activeNotes.begin(), activeNotes.end(),
        [&](const MPENoteState& state) {
            return state.midiNote == noteNumber && state.midiChannel == midiChannel;
        });

    activeNotes.erase(it, activeNotes.end());
}

inline void MPENoteTracker::updateSmoothing(double sampleRate, int samplesPerBlock)
{
    float smoothingTime = gestureMapping.pressureSmoothing;
    float timePerSample = 1.0f / static_cast<float>(sampleRate);

    for (auto& note : activeNotes)
    {
        note.smoothValues(smoothingTime, sampleRate);
        note.updateGestures(gestureMapping);
    }

    juce::ignoreUnused(samplesPerBlock);
}

inline MPENoteState* MPENoteTracker::findOrCreateNoteState(int noteNumber,
                                                           int midiChannel)
{
    auto* existing = findNoteState(noteNumber, midiChannel);
    if (existing)
        return existing;

    activeNotes.push_back(MPENoteState());
    auto& note = activeNotes.back();

    note.midiNote = noteNumber;
    note.midiChannel = midiChannel;
    note.velocity = 0.0f;
    note.pitchBend = 0.0f;
    note.pressure = 0.0f;
    note.timbre = 0.0f;
    note.smoothedPitchBend = 0.0f;
    note.smoothedPressure = 0.0f;
    note.smoothedTimbre = 0.0f;
    note.isActive = true;
    note.voiceId = -1;
    note.startTime = 0.0;

    return &note;
}

inline MPENoteState* MPENoteTracker::findNoteState(int noteNumber, int midiChannel)
{
    for (auto& note : activeNotes)
    {
        if (note.midiNote == noteNumber && note.midiChannel == midiChannel)
            return &note;
    }
    return nullptr;
}

inline const MPENoteState* MPENoteTracker::findNoteState(int noteNumber, int midiChannel) const
{
    for (const auto& note : activeNotes)
    {
        if (note.midiNote == noteNumber && note.midiChannel == midiChannel)
            return &note;
    }
    return nullptr;
}

inline void MPENoteTracker::processNoteOn(const juce::MidiMessage& msg)
{
    int note = msg.getNoteNumber();
    int channel = msg.getChannel();
    float velocity = msg.getVelocity() / 127.0f;

    auto* noteState = findOrCreateNoteState(note, channel);
    noteState->velocity = velocity;
    noteState->isActive = true;
}

inline void MPENoteTracker::processNoteOff(const juce::MidiMessage& msg)
{
    removeNote(msg.getNoteNumber(), msg.getChannel());
}

inline void MPENoteTracker::processPitchBend(const juce::MidiMessage& msg)
{
    int channel = msg.getChannel();
    int pitchBendValue = msg.getPitchWheelValue();
    float normalizedPitchBend = (pitchBendValue - 8192) / 8192.0f;

    // Update all notes on this channel
    for (auto& note : activeNotes)
    {
        if (note.midiChannel == channel)
        {
            note.pitchBend = normalizedPitchBend;
        }
    }
}

inline void MPENoteTracker::processChannelPressure(const juce::MidiMessage& msg)
{
    int channel = msg.getChannel();
    float pressure = msg.getChannelPressureValue() / 127.0f;

    // Update all notes on this channel
    for (auto& note : activeNotes)
    {
        if (note.midiChannel == channel)
        {
            note.pressure = pressure;
        }
    }
}

inline void MPENoteTracker::processController(const juce::MidiMessage& msg)
{
    // CC 74 is timbre in MPE spec
    if (msg.getControllerNumber() == 74)
    {
        int channel = msg.getChannel();
        float timbre = msg.getControllerValue() / 127.0f;

        for (auto& note : activeNotes)
        {
            if (note.midiChannel == channel)
            {
                note.timbre = timbre;
            }
        }
    }
}

//==============================================================================
// MPEUniversalSupport Implementation
//==============================================================================

inline MPEUniversalSupport::MPEUniversalSupport()
{
}

inline void MPEUniversalSupport::prepare(double sampleRate)
{
    this->sampleRate = sampleRate;
    zoneDetector.reset();
    noteTracker.reset();
}

inline void MPEUniversalSupport::reset()
{
    zoneDetector.reset();
    noteTracker.reset();
}

inline void MPEUniversalSupport::processMIDI(const juce::MidiBuffer& midiMessages)
{
    for (const auto& metadata : midiMessages)
    {
        const auto msg = metadata.getMessage();
        zoneDetector.processMIDI(msg);
        noteTracker.processMIDI(msg, zoneDetector);
    }
}

inline void MPEUniversalSupport::updateSmoothing(double sampleRate, int samplesPerBlock)
{
    noteTracker.updateSmoothing(sampleRate, samplesPerBlock);
}

inline MPENoteState::GestureValues MPEUniversalSupport::getGestureValues(
    int noteNumber, int midiChannel) const
{
    const auto* noteState = noteTracker.getNoteState(noteNumber, midiChannel);
    if (noteState)
    {
        return noteState->gestures;
    }

    // Return default gestures if note not found
    MPENoteState::GestureValues defaults;
    return defaults;
}

inline bool MPEUniversalSupport::isActive() const
{
    return zoneDetector.hasActiveMPEZones();
}

inline void MPEUniversalSupport::setGestureMapping(const MPEGestureMapping& mapping)
{
    noteTracker.setGestureMapping(mapping);
}

inline MPEGestureMapping MPEUniversalSupport::getGestureMapping() const
{
    return noteTracker.getGestureMapping();
}

//==============================================================================
// Inline function implementations
//==============================================================================

inline void MPENoteState::updateGestures(const MPEGestureMapping& mapping)
{
    gestures = mapping.applyMapping(*this);
}

inline void MPENoteState::smoothValues(float smoothingTime, double sampleRate)
{
    // Calculate smoothing coefficients
    float coef = smoothingTime > 0.0001f ?
        std::exp(-1.0f / (smoothingTime * sampleRate)) : 0.0f;

    // Smooth towards target values
    smoothedPitchBend = smoothedPitchBend * (1.0f - coef) + pitchBend * coef;
    smoothedPressure = smoothedPressure * (1.0f - coef) + pressure * coef;
    smoothedTimbre = smoothedTimbre * (1.0f - coef) + timbre * coef;
}
